import time

from flask import Flask, jsonify, request

from predict import predict_future

app = Flask(__name__)


@app.get("/health")
def health():
    return jsonify({"status": "healthy"}), 200


@app.post("/predict")
def predict():
    started_at = time.perf_counter()

    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("userId", "")).strip()
    months_ahead = payload.get("monthsAhead", 12)

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    try:
        safe_months = max(1, int(months_ahead))
    except (TypeError, ValueError):
        return jsonify({"error": "monthsAhead must be a positive integer"}), 400

    try:
        result = predict_future(user_id, safe_months)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    latency_ms = round((time.perf_counter() - started_at) * 1000, 2)

    return (
        jsonify(
            {
                "predictedExpenses": result["predictedExpenses"],
                "predictedIncome": result["predictedIncome"],
                "meta": {
                    "monthsAhead": safe_months,
                    "latencyMs": latency_ms,
                },
            }
        ),
        200,
    )


if __name__ == "__main__":
    try:
        from predict import load_all_models, get_mongo_client
        load_all_models()
        get_mongo_client().admin.command("ping")
        print("Pre-warming complete: Models loaded and MongoDB connection established.")
    except Exception as exc:
        print(f"Pre-warming warning: {exc}")

    app.run(host="0.0.0.0", port=5055)
