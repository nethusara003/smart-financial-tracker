import axios from "axios";
import mongoose from "mongoose";
import Transaction from "../../models/Transaction.js";

const ML_SERVICE_URL = (process.env.RETIREMENT_ML_SERVICE_URL || "http://127.0.0.1:5055").replace(
  /\/+$/,
  ""
);
const ML_SERVICE_TIMEOUT_MS = Number.parseInt(process.env.RETIREMENT_ML_TIMEOUT_MS || "25000", 10);
const RETIREMENT_HISTORY_MONTHS = Number.parseInt(
  process.env.RETIREMENT_HISTORY_MONTHS || "24",
  10
);
const RETIREMENT_REQUIRE_ML = String(process.env.RETIREMENT_REQUIRE_ML || "false") === "true";

class RetirementMlError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = "RetirementMlError";
    this.statusCode = statusCode;
  }
}

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeSeries = (values, expectedLength) => {
  const normalized = Array.isArray(values)
    ? values.map((entry) => Math.max(0, toSafeNumber(entry, 0)))
    : [];

  if (normalized.length === 0) {
    return Array.from({ length: expectedLength }, () => 0);
  }

  if (normalized.length >= expectedLength) {
    return normalized.slice(0, expectedLength);
  }

  const lastValue = normalized[normalized.length - 1];
  while (normalized.length < expectedLength) {
    normalized.push(lastValue);
  }

  return normalized;
};

const resolveUserRef = (userId) => {
  if (userId instanceof mongoose.Types.ObjectId) {
    return userId;
  }

  if (typeof userId === "string" && mongoose.Types.ObjectId.isValid(userId)) {
    return new mongoose.Types.ObjectId(userId);
  }

  return userId;
};

const getMonthlyTotals = async (userId, type, monthsWindow) => {
  const safeMonths = Math.max(3, Number.parseInt(String(monthsWindow || RETIREMENT_HISTORY_MONTHS), 10));
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - safeMonths);

  const results = await Transaction.aggregate([
    {
      $match: {
        user: resolveUserRef(userId),
        type,
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        total: { $sum: "$amount" },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
  ]);

  return results.map((row) => ({
    year: row._id.year,
    month: row._id.month,
    total: Math.max(0, toSafeNumber(row.total, 0)),
  }));
};

const calculateSlope = (values) => {
  if (!Array.isArray(values) || values.length < 2) {
    return 0;
  }

  const n = values.length;
  const indices = Array.from({ length: n }, (_, idx) => idx);
  const sumX = indices.reduce((sum, value) => sum + value, 0);
  const sumY = values.reduce((sum, value) => sum + value, 0);
  const sumXY = indices.reduce((sum, value, idx) => sum + value * values[idx], 0);
  const sumX2 = indices.reduce((sum, value) => sum + value * value, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (!Number.isFinite(denominator) || Math.abs(denominator) < Number.EPSILON) {
    return 0;
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  return Number.isFinite(slope) ? slope : 0;
};

const buildSeasonalityFactors = (monthlyTotals) => {
  const monthlyBuckets = new Map();

  for (const row of monthlyTotals) {
    const existing = monthlyBuckets.get(row.month) || [];
    existing.push(row.total);
    monthlyBuckets.set(row.month, existing);
  }

  const allValues = monthlyTotals.map((row) => row.total);
  const average = allValues.length
    ? allValues.reduce((sum, value) => sum + value, 0) / allValues.length
    : 0;

  if (!Number.isFinite(average) || average <= 0) {
    return new Map();
  }

  const factors = new Map();

  for (let month = 1; month <= 12; month += 1) {
    const values = monthlyBuckets.get(month) || [];
    if (values.length === 0) {
      factors.set(month, 1);
      continue;
    }

    const monthAverage = values.reduce((sum, value) => sum + value, 0) / values.length;
    const factor = Math.min(1.35, Math.max(0.65, monthAverage / average));
    factors.set(month, Number.isFinite(factor) ? factor : 1);
  }

  return factors;
};

const heuristicForecast = (monthlyTotals, monthsAhead) => {
  const safeMonthsAhead = Math.max(1, Number.parseInt(String(monthsAhead || 1), 10));

  if (!Array.isArray(monthlyTotals) || monthlyTotals.length === 0) {
    return Array.from({ length: safeMonthsAhead }, () => 0);
  }

  const history = monthlyTotals.map((row) => Math.max(0, toSafeNumber(row.total, 0)));
  const recent = history.slice(-6);
  const baseline = recent.reduce((sum, value) => sum + value, 0) / Math.max(1, recent.length);
  const slope = calculateSlope(recent);
  const seasonalityFactors = buildSeasonalityFactors(monthlyTotals);

  const startDate = new Date();
  const predictions = [];

  for (let idx = 0; idx < safeMonthsAhead; idx += 1) {
    const trendValue = Math.max(0, baseline + slope * (idx + 1));
    const nextMonthDate = new Date(startDate.getFullYear(), startDate.getMonth() + idx + 1, 1);
    const monthIndex = nextMonthDate.getMonth() + 1;
    const seasonalFactor = seasonalityFactors.get(monthIndex) || 1;
    const predicted = Math.max(0, trendValue * seasonalFactor);
    predictions.push(Number(predicted.toFixed(2)));
  }

  return predictions;
};

const callMlService = async (userId, monthsAhead) => {
  const response = await axios.post(
    `${ML_SERVICE_URL}/predict`,
    {
      userId: String(userId),
      monthsAhead,
    },
    {
      timeout: ML_SERVICE_TIMEOUT_MS,
    }
  );

  const payload = response?.data || {};
  const predictedIncome = normalizeSeries(payload.predictedIncome, monthsAhead);
  const predictedExpenses = normalizeSeries(payload.predictedExpenses, monthsAhead);

  if (predictedIncome.length !== monthsAhead || predictedExpenses.length !== monthsAhead) {
    throw new Error("ML service returned malformed prediction arrays");
  }

  return {
    predictedIncome,
    predictedExpenses,
    source: "ml-service",
    fallbackUsed: false,
    mlMeta: payload?.meta || null,
  };
};

const runFallbackPrediction = async (userId, monthsAhead) => {
  const [incomeHistory, expenseHistory] = await Promise.all([
    getMonthlyTotals(userId, "income", RETIREMENT_HISTORY_MONTHS),
    getMonthlyTotals(userId, "expense", RETIREMENT_HISTORY_MONTHS),
  ]);

  return {
    predictedIncome: heuristicForecast(incomeHistory, monthsAhead),
    predictedExpenses: heuristicForecast(expenseHistory, monthsAhead),
    source: "history-fallback",
    fallbackUsed: true,
  };
};

export async function getPredictions({ userId, monthsAhead }) {
  const safeMonthsAhead = Math.max(12, Number.parseInt(String(monthsAhead || 12), 10));

  try {
    return await callMlService(userId, safeMonthsAhead);
  } catch (error) {
    if (RETIREMENT_REQUIRE_ML) {
      throw new RetirementMlError(
        `ML prediction is required but unavailable: ${error?.message || "unknown error"}`
      );
    }

    const fallback = await runFallbackPrediction(userId, safeMonthsAhead);
    return {
      ...fallback,
      fallbackReason: error?.message || "ML service unavailable",
    };
  }
}

export { RetirementMlError };
export default getPredictions;
