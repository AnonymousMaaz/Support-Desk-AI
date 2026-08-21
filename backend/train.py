"""Train and Evaluate the SupportDesk AI NLP model."""

from pathlib import Path
import json

import joblib
import pandas as pd

from sklearn.feature_extraction.text import (
    TfidfVectorizer,
)
from sklearn.linear_model import (
    LogisticRegression,
)
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
)
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent

DATA_DIRECTORY = ROOT / "data"
ARTIFACT_DIRECTORY = ROOT / "artifacts"

TRAIN_FILE = DATA_DIRECTORY / "train.csv"
TEST_FILE = DATA_DIRECTORY / "test.csv"

MODEL_FILE = ARTIFACT_DIRECTORY / "supportdesk_bundle.joblib"

METRICS_FILE = ARTIFACT_DIRECTORY / "metrics.json"


def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load, validate, and clean both dataset splits."""

    if not TRAIN_FILE.exists():
        raise FileNotFoundError(
            "train.csv was not found. " "Run download_data.py first."
        )
    if not TEST_FILE.exists():
        raise FileNotFoundError(
            "test.csv was not found. " "Run download_data.py first."
        )

    train = pd.read_csv(TRAIN_FILE)
    test = pd.read_csv(TEST_FILE)

    required_columns = {
        "text",
        "category",
    }

    if not required_columns.issubset(train.columns):
        raise ValueError("Training data must contain " "text and category columns.")

    train = train.dropna(subset=["text", "category"]).copy()

    test = test.dropna(subset=["text", "category"]).copy()

    for dataframe in [train, test]:
        dataframe["text"] = dataframe["text"].astype(str).str.strip()

        dataframe["category"] = (
            dataframe["category"].astype(str).str.strip().str.lower()
        )

    return train, test


def build_pipeline() -> Pipeline:
    """Create the preprocessing and model pipeline."""

    vectorizer = TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.98,
        max_features=40_000,
        sublinear_tf=True,
    )

    classifier = LogisticRegression(
        C=4.0,
        max_iter=2_000,
        class_weight="balanced",
        solver="lbfgs",
    )

    return Pipeline(
        steps=[
            ("tfidf", vectorizer),
            ("classifier", classifier),
        ]
    )


def evaluate_model(
    model: Pipeline,
    test: pd.DataFrame,
) -> dict:
    """Evaluate the model on untouched test data."""

    actual_categories = test["category"]

    predicted_categories = model.predict(test["text"])

    accuracy = accuracy_score(
        actual_categories,
        predicted_categories,
    )

    macro_f1 = f1_score(
        actual_categories,
        predicted_categories,
        average="macro",
    )

    report = classification_report(
        actual_categories,
        predicted_categories,
        output_dict=True,
        zero_division=0,
    )

    return {
        "accuracy": float(accuracy),
        "macro_f1": float(macro_f1),
        "classification_report": report,
    }


def main() -> None:
    """Train, evaluate, and save the application artifacts."""

    ARTIFACT_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    train, test = load_data()

    print(f"Training examples: {len(train):,}")

    print(f"Testing examples: {len(test):,}")

    print("Number of intents: " f"{train['category'].nunique()}")

    model = build_pipeline()

    print("Training the model...")

    model.fit(
        train["text"],
        train["category"],
    )

    print("Evaluating on the official test set...")

    evaluation = evaluate_model(
        model=model,
        test=test,
    )

    print("Accuracy: " f"{evaluation['accuracy']:.4f}")

    print("Macro F1: " f"{evaluation['macro_f1']:.4f}")

    vectorizer = model.named_steps["tfidf"]

    training_matrix = vectorizer.transform(train["text"])

    category_distribution = (
        train["category"].value_counts().sort_values(ascending=False).to_dict()
    )

    metrics = {
        **evaluation,
        "training_examples": int(len(train)),
        "testing_examples": int(len(test)),
        "number_of_intents": int(train["category"].nunique()),
        "category_distribution": {
            str(category): int(count)
            for category, count in category_distribution.items()
        },
    }

    bundle = {
        "pipeline": model,
        "training_matrix": training_matrix,
        "training_texts": (train["text"].tolist()),
        "training_labels": (train["category"].tolist()),
        "metrics": metrics,
    }

    joblib.dump(
        bundle,
        MODEL_FILE,
        compress=3,
    )

    METRICS_FILE.write_text(
        json.dumps(
            metrics,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Saved model bundle to {MODEL_FILE}")

    print(f"Saved metrics to {METRICS_FILE}")


if __name__ == "__main__":
    main()
