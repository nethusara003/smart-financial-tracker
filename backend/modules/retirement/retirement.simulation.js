const DEFAULT_MONTE_CARLO_RUNS = Number.parseInt(process.env.RETIREMENT_MC_SIMULATIONS || "1000", 10);
const DEFAULT_RETURN_MEAN = Number.parseFloat(process.env.RETIREMENT_RETURN_MEAN || "0.08");
const DEFAULT_RETURN_STD_DEV = Number.parseFloat(process.env.RETIREMENT_RETURN_STD_DEV || "0.03");
const DEFAULT_INCOME_VARIATION = Number.parseFloat(process.env.RETIREMENT_INCOME_VARIATION || "0.10");
const DEFAULT_EXPENSE_VARIATION = Number.parseFloat(process.env.RETIREMENT_EXPENSE_VARIATION || "0.08");

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toCurrency = (value) => Number(toSafeNumber(value, 0).toFixed(2));

const getYearValue = (series, index, fallback = 0) => {
  if (!Array.isArray(series) || series.length === 0) {
    return toSafeNumber(fallback, 0);
  }

  if (Number.isFinite(Number(series[index]))) {
    return toSafeNumber(series[index], fallback);
  }

  return toSafeNumber(series[series.length - 1], fallback);
};

const randomBetween = (min, max) => min + Math.random() * (max - min);

const randomNormal = (mean, stdDev) => {
  // Box-Muller transform for a normally distributed return rate.
  const u1 = Math.max(Number.EPSILON, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
};

const percentile = (sorted, p) => {
  if (!sorted.length) {
    return 0;
  }

  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1))));
  return sorted[index];
};

export function runMonteCarloSimulation({
  currentSavings,
  monthlySavings,
  years,
  predictedIncome,
  predictedExpenses,
  targetAmount,
  config = /** @type {any} */ ({}),
}) {
  const safeYears = Math.max(1, Number.parseInt(String(years || 0), 10));
  const safeMonthlySavings = toSafeNumber(monthlySavings, 0);
  const safeCurrentSavings = toSafeNumber(currentSavings, 0);
  const safeTargetAmount = toSafeNumber(targetAmount, 0);

  const simulationRuns = Math.max(
    10,
    Number.parseInt(String(config.simulations ?? DEFAULT_MONTE_CARLO_RUNS), 10) || DEFAULT_MONTE_CARLO_RUNS
  );

  const meanReturn = toSafeNumber(config.returnMean, DEFAULT_RETURN_MEAN);
  const returnStdDev = Math.max(0, toSafeNumber(config.returnStdDev, DEFAULT_RETURN_STD_DEV));
  const incomeVariation = Math.max(0, toSafeNumber(config.incomeVariation, DEFAULT_INCOME_VARIATION));
  const expenseVariation = Math.max(0, toSafeNumber(config.expenseVariation, DEFAULT_EXPENSE_VARIATION));

  const outcomes = [];
  let successCount = 0;

  for (let simulation = 0; simulation < simulationRuns; simulation += 1) {
    let savings = safeCurrentSavings;

    for (let yearIndex = 0; yearIndex < safeYears; yearIndex += 1) {
      const baseIncome = getYearValue(predictedIncome, yearIndex, 0);
      const baseExpense = getYearValue(predictedExpenses, yearIndex, 0);

      const incomeFactor = randomBetween(1 - incomeVariation, 1 + incomeVariation);
      const expenseFactor = randomBetween(1 - expenseVariation, 1 + expenseVariation);
      const yearlyIncome = baseIncome * incomeFactor;
      const yearlyExpenses = baseExpense * expenseFactor;

      // Mirror the cap from the deterministic engine: predicted expenses can
      // never produce a net contribution worse than -(monthlySavings * 12),
      // preventing ML outliers from causing unbounded-negative outcomes.
      const incomeExpenseDelta = Math.max(
        -(safeMonthlySavings * 12),
        yearlyIncome - yearlyExpenses
      );
      const sampledReturnRate = Math.max(-0.95, randomNormal(meanReturn, returnStdDev));
      savings += safeMonthlySavings * 12 + incomeExpenseDelta;
      savings *= 1 + sampledReturnRate;

      if (!Number.isFinite(savings)) {
        savings = 0;
      }
    }

    if (savings >= safeTargetAmount) {
      successCount += 1;
    }

    outcomes.push(toCurrency(savings));
  }

  const sortedOutcomes = [...outcomes].sort((a, b) => a - b);
  const mean = toCurrency(outcomes.reduce((sum, value) => sum + value, 0) / outcomes.length);
  const median = toCurrency(percentile(sortedOutcomes, 0.5));
  const percentile10 = toCurrency(percentile(sortedOutcomes, 0.1));
  const percentile90 = toCurrency(percentile(sortedOutcomes, 0.9));

  return {
    mean,
    median,
    percentile10,
    percentile90,
    probabilityOfSuccess: Number((successCount / outcomes.length).toFixed(4)),
    allSimulations: outcomes,
  };
}

export default runMonteCarloSimulation;
