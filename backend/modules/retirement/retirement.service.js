import RetirementPlan from "../../models/RetirementPlan.js";
import Transaction from "../../models/Transaction.js";
import Wallet from "../../models/Wallet.js";
import { runMonteCarloSimulation } from "./retirement.simulation.js";
import { getPredictions } from "./retirement.ml.js";
import { generateAdvice } from "../../Services/ai.service.js";

const DEFAULT_RETURN_RATE = Number.parseFloat(process.env.RETIREMENT_RETURN_RATE || "0.08");
const DEFAULT_INFLATION_RATE = Number.parseFloat(process.env.RETIREMENT_INFLATION_RATE || "0.03");
const DEFAULT_SALARY_GROWTH_RATE = Number.parseFloat(process.env.RETIREMENT_SALARY_GROWTH_RATE || "0.04");
const PROFILE_MONTHS_WINDOW = Number.parseInt(process.env.RETIREMENT_PROFILE_MONTHS_WINDOW || "6", 10);

const LEGACY_WALLET_CATEGORIES = [
  "wallet_deposit",
  "wallet_withdrawal",
  "transfer_sent",
  "transfer_received",
  "wallet_transfer_sent",
  "wallet_transfer_received",
  "wallet_transfer_reversal_in",
  "wallet_transfer_reversal_out",
];

class RetirementInputError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "RetirementInputError";
    this.statusCode = statusCode;
  }
}

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toCurrency = (value) => Number(toSafeNumber(value, 0).toFixed(2));

const toSerializablePlan = (plan) => {
  if (!plan) {
    return null;
  }

  return {
    id: String(plan._id),
    name: plan.name || "Retirement Plan",
    sourceInput: plan.sourceInput || {},
    computedInput: plan.computedInput || null,
    projectedFund: toSafeNumber(plan.projectedFund, 0),
    probability: toSafeNumber(plan.probability, 0),
    scenarios: Array.isArray(plan.scenarios) ? plan.scenarios : [],
    deterministic: plan.deterministic || null,
    predictions: plan.predictions || null,
    simulation: plan.simulation || null,
    advice: plan.advice || null,
    lastRefreshedAt: plan.lastRefreshedAt || plan.createdAt || null,
    createdAt: plan.createdAt || null,
    updatedAt: plan.updatedAt || null,
  };
};

const buildPlanName = (input = {}) => {
  const retirementAge = parseYears(input.retirementAge);
  if (retirementAge) {
    return `Retirement Plan to Age ${retirementAge}`;
  }

  return "Retirement Plan";
};

const normalizeRate = (value, fallback) => {
  const parsed = toSafeNumber(value, fallback);
  const decimalRate = parsed > 1 ? parsed / 100 : parsed;
  if (!Number.isFinite(decimalRate)) {
    return fallback;
  }

  return Math.max(-0.99, decimalRate);
};

const parseYears = (value) => {
  const years = Number.parseInt(String(value), 10);
  if (!Number.isFinite(years) || years <= 0) {
    return null;
  }

  return years;
};

const computeAgeFromDob = (dob) => {
  const parsedDob = new Date(dob);

  if (Number.isNaN(parsedDob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - parsedDob.getFullYear();
  const monthDifference = today.getMonth() - parsedDob.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < parsedDob.getDate())) {
    age -= 1;
  }

  return age > 0 ? age : null;
};

const resolvePlanningYears = (input) => {
  const directYears = parseYears(input.years);
  if (directYears) {
    return directYears;
  }

  const retirementAge = parseYears(input.retirementAge);
  const currentAge = parseYears(input.age) || computeAgeFromDob(input.dob);

  if (retirementAge && currentAge && retirementAge > currentAge) {
    return retirementAge - currentAge;
  }

  throw new RetirementInputError(
    "Unable to determine planning years. Provide years or valid age/DOB with retirementAge."
  );
};

const getMonthValue = (series, index) => {
  if (!Array.isArray(series) || series.length === 0) {
    return 0;
  }

  if (Number.isFinite(Number(series[index]))) {
    return Math.max(0, toSafeNumber(series[index], 0));
  }

  return Math.max(0, toSafeNumber(series[series.length - 1], 0));
};

const monthlyToYearlySeries = (monthlySeries, years) => {
  const yearly = [];

  for (let yearIndex = 0; yearIndex < years; yearIndex += 1) {
    let total = 0;

    for (let monthOffset = 0; monthOffset < 12; monthOffset += 1) {
      const monthIndex = yearIndex * 12 + monthOffset;
      total += getMonthValue(monthlySeries, monthIndex);
    }

    yearly.push(toCurrency(total));
  }

  return yearly;
};

const getYearValue = (series, index) => {
  if (!Array.isArray(series) || series.length === 0) {
    return 0;
  }

  if (Number.isFinite(Number(series[index]))) {
    return Math.max(0, toSafeNumber(series[index], 0));
  }

  return Math.max(0, toSafeNumber(series[series.length - 1], 0));
};

const buildSavingsScopeFilter = (userId) => ({
  user: userId,
  type: { $in: ["income", "expense"] },
  $or: [
    { scope: "savings" },
    {
      scope: { $exists: false },
      isTransfer: { $ne: true },
      category: { $nin: LEGACY_WALLET_CATEGORIES },
    },
  ],
});

const resolveAverageMonthlySavings = async (userId) => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - Math.max(3, PROFILE_MONTHS_WINDOW));

  const monthly = await Transaction.aggregate([
    {
      $match: {
        ...buildSavingsScopeFilter(userId),
        date: { $gte: startDate },
      },
    },
    {
      $project: {
        year: { $year: "$date" },
        month: { $month: "$date" },
        signedAmount: {
          $cond: [{ $eq: ["$type", "income"] }, "$amount", { $multiply: ["$amount", -1] }],
        },
      },
    },
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
        },
        netSavings: { $sum: "$signedAmount" },
      },
    },
    {
      $sort: {
        "_id.year": -1,
        "_id.month": -1,
      },
    },
    {
      $limit: Math.max(3, PROFILE_MONTHS_WINDOW),
    },
  ]);

  if (!monthly.length) {
    return 0;
  }

  const avg = monthly.reduce((sum, row) => sum + toSafeNumber(row.netSavings, 0), 0) / monthly.length;
  return Math.max(0, toCurrency(avg));
};

const resolveCurrentSavings = async (userId) => {
  const [netSavingsAgg, wallet] = await Promise.all([
    Transaction.aggregate([
      {
        $match: buildSavingsScopeFilter(userId),
      },
      {
        $group: {
          _id: null,
          signedTotal: {
            $sum: {
              $cond: [
                { $eq: ["$type", "income"] },
                "$amount",
                { $multiply: ["$amount", -1] },
              ],
            },
          },
        },
      },
    ]),
    Wallet.findOne({ user: userId }).select("balance").lean(),
  ]);

  const netSavings = netSavingsAgg.length ? toSafeNumber(netSavingsAgg[0].signedTotal, 0) : 0;
  const walletBalance = toSafeNumber(wallet?.balance, 0);
  return Math.max(0, toCurrency(netSavings + walletBalance));
};

const resolveSystemFinancialProfile = async (userId) => {
  const [currentSavings, monthlySavings] = await Promise.all([
    resolveCurrentSavings(userId),
    resolveAverageMonthlySavings(userId),
  ]);

  return {
    currentSavings,
    monthlySavings,
  };
};

export function calculateRetirement({
  currentSavings,
  monthlySavings,
  years,
  predictedIncome,
  predictedExpenses,
  returnRate,
  inflation,
  salaryGrowth,
}) {
  const safeYears = Math.max(1, parseYears(years) || 1);
  const safeCurrentSavings = toSafeNumber(currentSavings, 0);
  const safeMonthlySavings = toSafeNumber(monthlySavings, 0);
  const safeReturnRate = normalizeRate(returnRate, DEFAULT_RETURN_RATE);
  const safeInflation = normalizeRate(inflation, DEFAULT_INFLATION_RATE);
  const safeSalaryGrowth = normalizeRate(salaryGrowth, DEFAULT_SALARY_GROWTH_RATE);

  let savings = safeCurrentSavings;
  const yearlyBreakdown = [];

  for (let yearIndex = 0; yearIndex < safeYears; yearIndex += 1) {
    const rawIncome = getYearValue(predictedIncome, yearIndex);
    const rawExpenses = getYearValue(predictedExpenses, yearIndex);

    const income = rawIncome * Math.pow(1 + safeSalaryGrowth, yearIndex);
    const expenses = rawExpenses * Math.pow(1 + safeInflation, yearIndex);
    // Cap the net income/expense delta so that ML-predicted outliers in a
    // user's transaction history cannot produce unboundedly negative
    // contributions. If expenses exceed income the delta is negative but
    // should not exceed the monthly savings buffer in the negative direction.
    const incomeExpenseDelta = Math.max(
      -(safeMonthlySavings * 12),
      income - expenses
    );
    const annualContribution = safeMonthlySavings * 12 + incomeExpenseDelta;

    savings += annualContribution;
    savings *= 1 + safeReturnRate;

    if (!Number.isFinite(savings)) {
      savings = 0;
    }

    yearlyBreakdown.push({
      year: yearIndex + 1,
      income: toCurrency(income),
      expenses: toCurrency(expenses),
      annualContribution: toCurrency(annualContribution),
      endingBalance: toCurrency(savings),
    });
  }

  return {
    projectedFund: toCurrency(savings),
    yearlyBreakdown,
    assumptions: {
      returnRate: safeReturnRate,
      inflation: safeInflation,
      salaryGrowth: safeSalaryGrowth,
    },
  };
}

const buildPlanInput = async (input, userId) => {
  const years = resolvePlanningYears(input);
  const profile = await resolveSystemFinancialProfile(userId);
  const useAdvancedGrowth = Boolean(input.applyGrowthAdjustments);

  return {
    currentSavings:
      input.currentSavings === undefined || input.currentSavings === null
        ? profile.currentSavings
        : toSafeNumber(input.currentSavings, profile.currentSavings),
    monthlySavings:
      input.monthlySavings === undefined || input.monthlySavings === null
        ? profile.monthlySavings
        : toSafeNumber(input.monthlySavings, profile.monthlySavings),
    years,
    targetAmount: Math.max(0, toSafeNumber(input.targetAmount, 0)),
    returnRate: normalizeRate(input.returnRate, DEFAULT_RETURN_RATE),
    inflation: useAdvancedGrowth
      ? normalizeRate(input.inflationRate, DEFAULT_INFLATION_RATE)
      : 0,
    salaryGrowth: useAdvancedGrowth
      ? normalizeRate(input.salaryGrowthRate, DEFAULT_SALARY_GROWTH_RATE)
      : 0,
    applyGrowthAdjustments: useAdvancedGrowth,
    age: parseYears(input.age),
    retirementAge: parseYears(input.retirementAge),
    dob: input.dob || null,
    profileSource: "system-derived",
  };
};

async function runDeterministicPipeline(userId, payload) {
  const input = await buildPlanInput(payload || {}, userId);
  
  // Cap ML predictions to 12 months to prevent massive inference latency.
  // The base year will be extrapolated using salaryGrowth and inflation.
  const monthsAhead = Math.min(input.years * 12, 12);

  // Fetch ML predictions (may fall back to heuristic)
  const predictions = await getPredictions({
    userId,
    monthsAhead,
  });

  // --- Debugging & validation: ensure predictions are numeric arrays ---
  try {
    // Normalize monthly predictions: ensure numbers and non-negative
    const normalizeArray = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || Number.isNaN(n)) return 0;
        return Math.max(0, n);
      });
    };

    predictions.predictedIncome = normalizeArray(predictions.predictedIncome);
    predictions.predictedExpenses = normalizeArray(predictions.predictedExpenses);

    // Log brief snapshot for debugging when outputs are unexpected
    const samplePred = (arr, n = 6) => arr.slice(0, n).join(", ");
    console.debug("[retirement] input summary:", {
      userId: String(userId),
      years: input.years,
      currentSavings: input.currentSavings,
      monthlySavings: input.monthlySavings,
      targetAmount: input.targetAmount,
    });

    console.debug("[retirement] predictions (first values):", {
      incomeSample: samplePred(predictions.predictedIncome, 6),
      expenseSample: samplePred(predictions.predictedExpenses, 6),
      source: predictions.source || "unknown",
      fallbackUsed: Boolean(predictions.fallbackUsed),
    });

    // Detect and warn about unusually large numbers which may indicate unit/sign issues
    const maxIncome = Math.max(0, ...(predictions.predictedIncome.length ? predictions.predictedIncome : [0]));
    const maxExpense = Math.max(0, ...(predictions.predictedExpenses.length ? predictions.predictedExpenses : [0]));
    if (maxIncome > 1e9 || maxExpense > 1e9) {
      console.warn("[retirement] detected very large predicted values; check transaction units/scale", {
        maxIncome,
        maxExpense,
      });
    }
  } catch (e) {
    console.error("[retirement] prediction normalization error:", e);
  }

  // Generate a single baseline year. The calculateRetirement function will 
  // automatically reuse this base year and apply compounding growth rates.
  const yearlyIncome = monthlyToYearlySeries(predictions.predictedIncome, 1);
  const yearlyExpenses = monthlyToYearlySeries(predictions.predictedExpenses, 1);

  const deterministic = calculateRetirement({
    currentSavings: input.currentSavings,
    monthlySavings: input.monthlySavings,
    years: input.years,
    predictedIncome: yearlyIncome,
    predictedExpenses: yearlyExpenses,
    returnRate: input.returnRate,
    inflation: input.inflation,
    salaryGrowth: input.salaryGrowth,
  });

  return {
    input,
    deterministic,
    predictions: {
      ...predictions,
      yearlyIncome,
      yearlyExpenses,
    },
  };
}

export async function calculateRetirementPlan({ userId, payload }) {
  return runDeterministicPipeline(userId, payload);
}

export async function simulateRetirementPlan({ userId, payload }) {
  const deterministicResult = await runDeterministicPipeline(userId, payload);
  const { input, deterministic, predictions } = deterministicResult;

  const simulation = runMonteCarloSimulation({
    currentSavings: input.currentSavings,
    monthlySavings: input.monthlySavings,
    years: input.years,
    predictedIncome: predictions.yearlyIncome,
    predictedExpenses: predictions.yearlyExpenses,
    targetAmount: input.targetAmount,
  });

  return {
    input,
    deterministic,
    predictions,
    simulation,
  };
}

export async function adviseRetirementPlan({ userId, payload }) {
  const simulationPayload =
    payload?.simulation && payload?.deterministic
      ? {
          input: await buildPlanInput(payload, userId),
          deterministic: payload.deterministic,
          simulation: payload.simulation,
          predictions: payload.predictions || null,
          planId: payload.planId || null,
        }
      : await simulateRetirementPlan({ userId, payload });

  const advisoryData = {
    projectedRetirementFund: toSafeNumber(
      simulationPayload?.deterministic?.projectedFund,
      simulationPayload?.simulation?.median || 0
    ),
    probabilityOfSuccess: toSafeNumber(simulationPayload?.simulation?.probabilityOfSuccess, 0),
    targetAmount: toSafeNumber(simulationPayload?.input?.targetAmount, 0),
    simulationResults: {
      mean: toSafeNumber(simulationPayload?.simulation?.mean, 0),
      median: toSafeNumber(simulationPayload?.simulation?.median, 0),
      percentile10: toSafeNumber(simulationPayload?.simulation?.percentile10, 0),
      percentile90: toSafeNumber(simulationPayload?.simulation?.percentile90, 0),
    },
  };

  const advice = await generateAdvice(advisoryData);

  return {
    ...simulationPayload,
    advice,
  };
}

export async function saveRetirementPlan({ userId, payload }) {
  const workflow = await adviseRetirementPlan({ userId, payload });

  const persistedPlan = await RetirementPlan.create({
    userId,
    name: buildPlanName(workflow.input),
    sourceInput: payload || {},
    computedInput: workflow.input,
    projectedFund: workflow?.deterministic?.projectedFund || 0,
    probability: workflow?.simulation?.probabilityOfSuccess || 0,
    scenarios: workflow?.simulation?.allSimulations || [],
    deterministic: workflow.deterministic,
    predictions: workflow.predictions,
    simulation: workflow.simulation,
    advice: workflow.advice || null,
    lastRefreshedAt: new Date(),
    createdAt: new Date(),
  });

  return {
    ...workflow,
    plan: toSerializablePlan(persistedPlan),
  };
}

export async function listRetirementPlans({ userId }) {
  const plans = await RetirementPlan.find({ userId }).sort({ lastRefreshedAt: -1, createdAt: -1 }).lean();
  return plans.map((plan) => toSerializablePlan(plan));
}

export async function refreshRetirementPlan({ userId, planId }) {
  const existingPlan = await RetirementPlan.findOne({ _id: planId, userId });

  if (!existingPlan) {
    throw new RetirementInputError("Saved retirement plan not found", 404);
  }

  const workflow = await adviseRetirementPlan({
    userId,
    payload: existingPlan.sourceInput || {},
  });

  existingPlan.name = buildPlanName(workflow.input);
  existingPlan.sourceInput = existingPlan.sourceInput || {};
  existingPlan.computedInput = workflow.input;
  existingPlan.projectedFund = workflow?.deterministic?.projectedFund || 0;
  existingPlan.probability = workflow?.simulation?.probabilityOfSuccess || 0;
  existingPlan.scenarios = workflow?.simulation?.allSimulations || [];
  existingPlan.deterministic = workflow.deterministic;
  existingPlan.predictions = workflow.predictions;
  existingPlan.simulation = workflow.simulation;
  existingPlan.advice = workflow.advice || null;
  existingPlan.lastRefreshedAt = new Date();

  await existingPlan.save();

  return {
    ...workflow,
    plan: toSerializablePlan(existingPlan),
  };
}

export { RetirementInputError };
