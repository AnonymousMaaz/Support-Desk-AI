"""Flask REST API for SupportDesk AI."""

from datetime import (
    datetime,
    timezone,
)
from pathlib import Path
import json
import uuid

import joblib
import numpy as np

from flask import (
    Flask,
    jsonify,
    request,
)
from flask_cors import CORS
from sklearn.metrics.pairwise import (
    cosine_similarity,
)

ROOT = Path(__file__).resolve().parent

MODEL_FILE = ROOT / "artifacts" / "supportdesk_bundle.joblib"

FEEDBACK_FILE = ROOT / "data" / "feedback.jsonl"

MAX_MESSAGE_LENGTH = 1_000
LOW_CONFIDENCE_THRESHOLD = 0.35


app = Flask(__name__)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
            ]
        }
    },
)


if not MODEL_FILE.exists():
    raise RuntimeError(
        "The model artifact does not exist. " "Run download_data.py and train.py first."
    )


bundle = joblib.load(MODEL_FILE)

pipeline = bundle["pipeline"]

training_matrix = bundle["training_matrix"]

training_texts = bundle["training_texts"]

training_labels = bundle["training_labels"]

metrics = bundle["metrics"]


def readable_name(
    category: str,
) -> str:
    """Convert a machine label into display text."""

    return category.replace("_", " ").replace("?", "").strip().title()


def select_team(
    category: str,
) -> str:
    """Map a predicted category to a support team."""

    category = category.lower()

    if any(
        word in category
        for word in [
            "card",
            "pin",
            "cash_withdrawal",
            "atm",
        ]
    ):
        return "Cards & ATM"

    if any(
        word in category
        for word in [
            "transfer",
            "beneficiary",
            "receiving_money",
        ]
    ):
        return "Money Transfers"

    if any(
        word in category
        for word in [
            "top_up",
            "topping_up",
        ]
    ):
        return "Top-ups"

    if any(
        word in category
        for word in [
            "exchange",
            "currency",
        ]
    ):
        return "Foreign Exchange"

    if any(
        word in category
        for word in [
            "verify",
            "identity",
            "passcode",
            "personal_details",
            "compromised",
            "lost_or_stolen",
        ]
    ):
        return "Account Security"

    return "General Support"


def get_top_predictions(
    probabilities: np.ndarray,
    number_of_results: int = 3,
) -> list[dict]:
    """Return the highest-scoring intent predictions."""

    classifier = pipeline.named_steps["classifier"]

    classes = classifier.classes_

    sorted_indices = np.argsort(probabilities)[::-1]

    top_indices = sorted_indices[:number_of_results]

    return [
        {
            "category": str(classes[index]),
            "display_name": readable_name(str(classes[index])),
            "confidence": float(probabilities[index]),
        }
        for index in top_indices
    ]


def find_similar_cases(
    message: str,
    number_of_results: int = 3,
) -> list[dict]:
    """Retrieve similar training messages."""

    vectorizer = pipeline.named_steps["tfidf"]

    query_vector = vectorizer.transform([message])

    similarities = cosine_similarity(
        query_vector,
        training_matrix,
    ).ravel()

    sorted_indices = np.argsort(similarities)[::-1]

    top_indices = sorted_indices[:number_of_results]

    return [
        {
            "text": training_texts[index],
            "category": (training_labels[index]),
            "display_name": readable_name(training_labels[index]),
            "similarity": float(similarities[index]),
        }
        for index in top_indices
    ]


@app.get("/api/health")
def health():
    """Report whether the API and model are ready."""

    return jsonify(
        {
            "status": "healthy",
            "model_loaded": True,
            "number_of_intents": metrics["number_of_intents"],
        }
    )


@app.get("/api/analytics")
def analytics():
    """Return safe model-summary information."""

    return jsonify(
        {
            "accuracy": metrics["accuracy"],
            "macro_f1": metrics["macro_f1"],
            "training_examples": metrics["training_examples"],
            "testing_examples": metrics["testing_examples"],
            "number_of_intents": metrics["number_of_intents"],
        }
    )


@app.post("/api/predict")
def predict():
    """Classify one customer-support message."""

    payload = request.get_json(silent=True) or {}

    message = str(
        payload.get(
            "message",
            "",
        )
    ).strip()

    if not message:
        return jsonify({"error": ("Please enter a " "customer message.")}), 400

    if len(message) > MAX_MESSAGE_LENGTH:
        return (
            jsonify(
                {
                    "error": (
                        "The message must be "
                        f"{MAX_MESSAGE_LENGTH} "
                        "characters or fewer."
                    )
                }
            ),
            400,
        )

    probability_matrix = pipeline.predict_proba([message])

    probabilities = probability_matrix[0]

    predictions = get_top_predictions(
        probabilities=probabilities,
        number_of_results=3,
    )

    winning_prediction = predictions[0]

    human_review_required = winning_prediction["confidence"] < LOW_CONFIDENCE_THRESHOLD

    support_team = select_team(winning_prediction["category"])

    if human_review_required:
        recommendation = (
            "The model is uncertain. " "Send this ticket to a human " "triage queue."
        )
    else:
        recommendation = (
            f"Route this ticket to "
            f"{support_team}. A human agent "
            "should verify the classification "
            "before changing an account."
        )

    return jsonify(
        {
            "request_id": str(uuid.uuid4()),
            "message": message,
            "prediction": (winning_prediction),
            "alternatives": predictions[1:],
            "support_team": support_team,
            "human_review_required": (human_review_required),
            "recommendation": (recommendation),
            "similar_cases": (
                find_similar_cases(
                    message=message,
                    number_of_results=3,
                )
            ),
        }
    )


@app.post("/api/feedback")
def feedback():
    """Store feedback for future improvement."""

    payload = request.get_json(silent=True) or {}

    request_id = str(
        payload.get(
            "request_id",
            "",
        )
    ).strip()

    helpful = payload.get("helpful")

    if not request_id:
        return jsonify({"error": ("request_id is required.")}), 400

    if not isinstance(
        helpful,
        bool,
    ):
        return jsonify({"error": ("helpful must be " "true or false.")}), 400

    feedback_record = {
        "request_id": request_id,
        "helpful": helpful,
        "correct_category": payload.get("correct_category"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    FEEDBACK_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with FEEDBACK_FILE.open(
        "a",
        encoding="utf-8",
    ) as feedback_file:
        feedback_file.write(json.dumps(feedback_record) + "\n")

    return jsonify({"message": ("Feedback recorded.")}), 201


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )
