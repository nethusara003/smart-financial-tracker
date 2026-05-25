import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Transaction from "./models/Transaction.js";
import User from "./models/User.js";
import { generateExpenseForecast } from "./Services/forecastingService.js";
import { runMonteCarloSimulation } from "./modules/retirement/retirement.simulation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

async function evaluate() {
  try {
    await mongoose.connect(process.env.PROD_MONGO_URI);
    console.log("Connected to DB.");

    // 1. DATASET DETAILS
    const totalTransactions = await Transaction.countDocuments();
    const allUsersCount = await User.countDocuments();
    const oldestTx = await Transaction.findOne().sort({ date: 1 });
    const newestTx = await Transaction.findOne().sort({ date: -1 });
    
    let timePeriodMonths = 0;
    if (oldestTx && newestTx) {
      const msDiff = newestTx.date.getTime() - oldestTx.date.getTime();
      timePeriodMonths = msDiff / (1000 * 60 * 60 * 24 * 30.44);
    }
    
    console.log("=== 2. DATASET DETAILS ===");
    console.log(`Total Transactions in DB: ${totalTransactions}`);
    console.log(`Users in DB: ${allUsersCount}`);
    console.log(`Time Period Covered: ~${timePeriodMonths.toFixed(1)} months`);
    if (oldestTx && newestTx) {
        console.log(`From: ${oldestTx.date.toISOString()} To: ${newestTx.date.toISOString()}`);
    }

    // Find a user with the most transactions
    const topUsers = await Transaction.aggregate([
      { $group: { _id: "$user", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    if (topUsers.length > 0 && topUsers[0].count > 0) {
      const targetUserId = String(topUsers[0]._id);
      console.log(`\nEvaluating User ID: ${targetUserId} (Has ${topUsers[0].count} transactions)`);

      // 2. FORECASTING ERROR VALUES
      const forecast = await generateExpenseForecast(targetUserId, 3);
      console.log("\n=== 1. FORECASTING ERROR VALUES ===");
      if (forecast.summary && forecast.summary.backtestQuality) {
        console.log(`MAE: ${forecast.summary.backtestQuality.mae}`);
        console.log(`RMSE: ${forecast.summary.backtestQuality.rmse}`);
        console.log(`MAPE: ${forecast.summary.backtestQuality.mape}%`);
        console.log(`Windows Tested: ${forecast.summary.backtestQuality.windows}`);
      } else {
        console.log("Not enough data to run backtesting metrics for this user.");
      }

      // 3. CONFIDENCE SCORING
      console.log("\n=== 5. CONFIDENCE SCORING OUTCOMES ===");
      let high = 0, medium = 0, low = 0;
      if (forecast.categoryForecasts) {
          forecast.categoryForecasts.forEach(cf => {
              if (cf.insights.reliability === "High") high++;
              else if (cf.insights.reliability === "Medium") medium++;
              else low++;
          });
          const total = high + medium + low;
          console.log(`Categories evaluated: ${total}`);
          console.log(`High Confidence: ${high} (${((high/total)*100).toFixed(1)}%)`);
          console.log(`Medium Confidence: ${medium} (${((medium/total)*100).toFixed(1)}%)`);
          console.log(`Low Confidence: ${low} (${((low/total)*100).toFixed(1)}%)`);
      }

    } else {
      console.log("\nNo transactions found to evaluate forecasting.");
    }

    // 4. RETIREMENT PLANNING
    console.log("\n=== 3. RETIREMENT PLANNING / MONTE CARLO ===");
    const years = 20;
    const income = Array(years).fill(50000).map((v, i) => v * Math.pow(1.03, i));
    const expenses = Array(years).fill(30000).map((v, i) => v * Math.pow(1.025, i));
    
    const mcResults = runMonteCarloSimulation({
      currentSavings: 10000,
      monthlySavings: 500,
      years: years,
      predictedIncome: income,
      predictedExpenses: expenses,
      targetAmount: 500000,
      config: { simulations: 1000 }
    });
    
    console.log(`Probability of Success (hitting 500k target): ${(mcResults.probabilityOfSuccess * 100).toFixed(1)}%`);
    console.log(`Median Projected Outcome: ${mcResults.median}`);
    console.log(`10th Percentile (Worst Case): ${mcResults.percentile10}`);
    console.log(`90th Percentile (Best Case): ${mcResults.percentile90}`);

  } catch (error) {
    console.error("Error running evaluation:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from DB.");
  }
}

evaluate();
