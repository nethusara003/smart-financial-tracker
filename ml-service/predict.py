import os
from collections import defaultdict
from datetime import datetime
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MODEL_EXPENSE_PATH = os.path.join(os.path.dirname(__file__), "model_expense.pkl")
MODEL_INCOME_PATH = os.path.join(os.path.dirname(__file__), "model_income.pkl")


def resolve_db_name(mongo_uri: str) -> str:
    configured = os.getenv("MONGO_DB_NAME", "").strip()
    if configured:
        return configured

    tail = mongo_uri.rsplit("/", 1)[-1] if "/" in mongo_uri else ""
    return (tail.split("?")[0] if tail else "") or "smart_financial_tracker"


# Cache client and models globally
_mongo_client = None
_expense_model = None
_income_model = None
_models_loaded = False


def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or "mongodb://127.0.0.1:27017/smart_financial_tracker"
        _mongo_client = MongoClient(mongo_uri)
    return _mongo_client


def connect_transactions_collection():
    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or "mongodb://127.0.0.1:27017/smart_financial_tracker"
    client = get_mongo_client()
    db_name = resolve_db_name(mongo_uri)
    return client[db_name]["transactions"]


def load_model(path: str):
    if not os.path.exists(path):
        return None

    bundle = joblib.load(path)
    return bundle.get("pipeline") if isinstance(bundle, dict) else bundle


def load_all_models():
    global _expense_model, _income_model, _models_loaded
    if not _models_loaded:
        _expense_model = load_model(MODEL_EXPENSE_PATH)
        _income_model = load_model(MODEL_INCOME_PATH)
        if _expense_model is not None:
            try:
                _expense_model.named_steps["model"].n_jobs = 1
            except Exception:
                pass
        if _income_model is not None:
            try:
                _income_model.named_steps["model"].n_jobs = 1
            except Exception:
                pass
        _models_loaded = True
    return _expense_model, _income_model


def fetch_user_monthly_category_totals(user_id: str, transaction_type: str) -> pd.DataFrame:
    collection = connect_transactions_collection()

    try:
        db_user_id = ObjectId(user_id) if len(user_id) == 24 else user_id
    except Exception:
        db_user_id = user_id

    query = {
        "user": db_user_id,
        "type": transaction_type,
    }

    records = list(
        collection.find(
            query,
            {
                "_id": 0,
                "amount": 1,
                "category": 1,
                "date": 1,
            },
        )
    )

    if not records:
        return pd.DataFrame(columns=["category", "year", "month", "amount"])

    frame = pd.DataFrame(records)
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame = frame.dropna(subset=["date"])
    frame["amount"] = pd.to_numeric(frame["amount"], errors="coerce").fillna(0)
    frame["category"] = frame["category"].astype(str).fillna("unknown")
    frame["year"] = frame["date"].dt.year
    frame["month"] = frame["date"].dt.month

    monthly = (
        frame.groupby(["category", "year", "month"], as_index=False)["amount"]
        .sum()
        .sort_values(["category", "year", "month"])
    )

    return monthly


def compute_recent_monthly_totals(monthly_category_totals: pd.DataFrame) -> List[float]:
    if monthly_category_totals.empty:
        return []

    monthly_totals = (
        monthly_category_totals.groupby(["year", "month"], as_index=False)["amount"]
        .sum()
        .sort_values(["year", "month"])
    )

    return monthly_totals["amount"].tolist()


def naive_forecast(history: List[float], months_ahead: int) -> List[float]:
    """
    Statistical Trend Analysis via Linear Regression.
    Used as a safety net when ML models have insufficient data.
    """
    if months_ahead <= 0:
        return []

    if not history:
        return [0.0 for _ in range(months_ahead)]

    # Take the last 6 months to establish a recent trend baseline
    tail = history[-6:]

    # Calculate the linear trendline using Least Squares Regression
    # polyfit finds the 'm' (slope) that minimizes the error
    if len(tail) > 1:
        slope = float(np.polyfit(np.arange(len(tail)), np.array(tail), 1)[0])
    else:
        slope = 0.0

    baseline = float(np.mean(tail))

    # Project the trendline into future intervals
    return [round(max(0.0, baseline + slope * i), 2) for i in range(1, months_ahead + 1)]


def forecast_with_model(
    user_id: str,
    monthly_category_totals: pd.DataFrame,
    months_ahead: int,
    model,
) -> List[float]:
    if months_ahead <= 0:
        return []

    if model is None or monthly_category_totals.empty:
        return naive_forecast(compute_recent_monthly_totals(monthly_category_totals), months_ahead)

    by_category = defaultdict(list)

    for _, row in monthly_category_totals.iterrows():
        by_category[row["category"]].append(float(row["amount"]))

    if not by_category:
        return [0.0 for _ in range(months_ahead)]

    rolling_previous = {
        category: values[-1] if values else 0.0 for category, values in by_category.items()
    }

    predictions = []
    now = datetime.utcnow()

    try:
        # Extract preprocessor steps to bypass Pipeline overhead inside loop
        preprocessor = model.named_steps["preprocessor"]
        ohe = preprocessor.named_transformers_["cat"]
        rf = model.named_steps["model"]

        categories = list(by_category.keys())
        n_categories = len(categories)

        # Pre-transform static categorical columns
        cat_df = pd.DataFrame({"category": categories, "userId": [user_id] * n_categories})
        cat_encoded = ohe.transform(cat_df).toarray()

        # Allocate array for num_features (month, year, previous_value)
        num_features = np.empty((n_categories, 3))

        prev = [rolling_previous[cat] for cat in categories]

        for month_index in range(1, months_ahead + 1):
            future_date = datetime(now.year + (now.month + month_index - 1) // 12, ((now.month + month_index - 1) % 12) + 1, 1)

            num_features[:, 0] = future_date.month
            num_features[:, 1] = future_date.year
            num_features[:, 2] = prev

            x_input = np.hstack((cat_encoded, num_features))
            category_predictions = rf.predict(x_input)

            total = 0.0
            for idx, category in enumerate(categories):
                value = max(0.0, float(category_predictions[idx]))
                rolling_previous[category] = value
                total += value
                prev[idx] = value

            predictions.append(round(total, 2))

    except Exception as e:
        # Fallback to standard path if anything goes wrong
        rolling_previous = {
            category: values[-1] if values else 0.0 for category, values in by_category.items()
        }
        predictions = []
        for month_index in range(1, months_ahead + 1):
            future_date = datetime(now.year + (now.month + month_index - 1) // 12, ((now.month + month_index - 1) % 12) + 1, 1)
            rows = []

            for category in by_category.keys():
                rows.append(
                    {
                        "month": future_date.month,
                        "year": future_date.year,
                        "category": category,
                        "userId": user_id,
                        "previous_value": rolling_previous.get(category, 0.0),
                    }
                )

            feature_frame = pd.DataFrame(rows)
            category_predictions = model.predict(feature_frame)

            total = 0.0
            for idx, category in enumerate(by_category.keys()):
                value = max(0.0, float(category_predictions[idx]))
                rolling_previous[category] = value
                total += value

            predictions.append(round(total, 2))

    return predictions


def predict_future(user_id: str, months_ahead: int) -> Dict[str, List[float]]:
    safe_months = max(1, int(months_ahead))

    expense_model, income_model = load_all_models()

    monthly_expenses = fetch_user_monthly_category_totals(user_id, "expense")
    monthly_income = fetch_user_monthly_category_totals(user_id, "income")

    predicted_expenses = forecast_with_model(user_id, monthly_expenses, safe_months, expense_model)
    predicted_income = forecast_with_model(user_id, monthly_income, safe_months, income_model)

    if len(predicted_expenses) != safe_months:
        predicted_expenses = naive_forecast(compute_recent_monthly_totals(monthly_expenses), safe_months)

    if len(predicted_income) != safe_months:
        predicted_income = naive_forecast(compute_recent_monthly_totals(monthly_income), safe_months)

    return {
        "predictedExpenses": predicted_expenses,
        "predictedIncome": predicted_income,
    }


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Predict user income and expenses")
    parser.add_argument("user_id", type=str)
    parser.add_argument("months_ahead", type=int)
    args = parser.parse_args()

    result = predict_future(args.user_id, args.months_ahead)
    print(json.dumps(result, indent=2))
