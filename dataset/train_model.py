#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.preprocessing import StandardScaler

LABELS = ["normal", "peripheral", "central"]


def grouped_holdout(examples: list[dict]) -> tuple[np.ndarray, np.ndarray]:
    # Deterministic subject-grouped holdout: last five subjects in each class.
    holdout_subjects: set[str] = set()
    for label in LABELS:
        keys = sorted({row["subjectKey"] for row in examples if row["label"] == label})
        holdout_subjects.update(keys[-5:])

    test_mask = np.array([row["subjectKey"] in holdout_subjects for row in examples], dtype=bool)
    return ~test_mask, test_mask


def train_classifier(x: np.ndarray, y: np.ndarray) -> tuple[StandardScaler, LogisticRegression]:
    scaler = StandardScaler().fit(x)
    model = LogisticRegression(
        max_iter=5000,
        class_weight="balanced",
        C=1.0,
        solver="lbfgs",
        random_state=42,
    )
    model.fit(scaler.transform(x), y)
    return scaler, model


def ordered_model_parameters(model: LogisticRegression) -> tuple[list[list[float]], list[float]]:
    class_to_index = {label: index for index, label in enumerate(model.classes_.tolist())}
    weights = [model.coef_[class_to_index[label]].astype(float).tolist() for label in LABELS]
    bias = [float(model.intercept_[class_to_index[label]]) for label in LABELS]
    return weights, bias


def write_runtime_ts(runtime: dict, target: Path) -> None:
    body = json.dumps(runtime, indent=2, ensure_ascii=False)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        "import type { AIClinicalResearchRuntimeModel } from '@/types/ai-clinical-research-runtime';\n\n"
        f"export const GENERATED_CLINICAL_RESEARCH_RUNTIME: AIClinicalResearchRuntimeModel = {body};\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--runtime", required=True)
    parser.add_argument("--summary", required=True)
    args = parser.parse_args()

    dataset_path = Path(args.dataset).resolve()
    dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    feature_names = dataset["featureNames"]
    examples = dataset["examples"]

    x = np.asarray([row["features"] for row in examples], dtype=float)
    y = np.asarray([row["label"] for row in examples], dtype=str)

    train_mask, test_mask = grouped_holdout(examples)
    eval_scaler, eval_model = train_classifier(x[train_mask], y[train_mask])
    eval_pred = eval_model.predict(eval_scaler.transform(x[test_mask]))

    held_out_accuracy = float(accuracy_score(y[test_mask], eval_pred))
    macro_f1 = float(f1_score(y[test_mask], eval_pred, average="macro"))
    confusion = confusion_matrix(y[test_mask], eval_pred, labels=LABELS).astype(int).tolist()

    # Fit the runtime model on the full synthetic dataset after the grouped evaluation.
    runtime_scaler, runtime_model = train_classifier(x, y)
    weights, bias = ordered_model_parameters(runtime_model)

    minimum = x.min(axis=0)
    maximum = x.max(axis=0)
    span = np.maximum(maximum - minimum, 1e-9)
    clip_min = (minimum - span * 0.10).astype(float).tolist()
    clip_max = (maximum + span * 0.10).astype(float).tolist()

    runtime = {
        "schemaVersion": "central-vestibular-clinical-research-runtime-v2",
        "phase": "08D",
        "status": "demo-metric-runtime",
        "generatedAt": "2026-10-05T00:00:00.000Z",
        "source": "synthetic-metric-demo-only",
        "featureSchema": dataset["featureSchema"],
        "featureNames": feature_names,
        "labels": LABELS,
        "algorithm": "class-weighted-multinomial-logistic-regression",
        "scaler": {
            "mean": runtime_scaler.mean_.astype(float).tolist(),
            "std": runtime_scaler.scale_.astype(float).tolist(),
        },
        "featureBounds": {"min": clip_min, "max": clip_max},
        "weights": weights,
        "bias": bias,
        "heldOutAccuracy": held_out_accuracy,
        "macroF1": macro_f1,
        "guard": {
            "demoOnly": True,
            "researchOnly": True,
            "clinicalReviewApproved": False,
            "externalValidationCompleted": False,
            "useForClinicalDiagnosis": False,
        },
    }

    summary = {
        "schemaVersion": "central-vestibular-ai-evidence-v2",
        "currentDemoClassifier": {
            "labels": ["Normal", "Peripheral", "Central"],
            "algorithm": "class-weighted multinomial logistic regression",
            "featureSchema": dataset["featureSchema"],
            "featureCount": len(feature_names),
            "dataset": "ai-training-dataset.json",
            "examples": len(examples),
            "syntheticSubjects": len({row["subjectKey"] for row in examples}),
            "subjectsPerClass": 18,
            "examplesPerSubject": 2,
            "heldOutExamples": int(test_mask.sum()),
            "heldOutSubjects": 15,
            "syntheticHeldOutAccuracy": held_out_accuracy,
            "syntheticMacroF1": macro_f1,
            "confusionMatrixLabelOrder": LABELS,
            "syntheticConfusionMatrix": confusion,
            "runtimeInput": "48 real metrics/derived values from the six-test Full Battery",
            "note": "Training labels remain synthetic demo labels. Held-out results are software/demo evidence, not clinical accuracy.",
        },
        "runtimeLocationInApp": [
            "src/ai/generated-clinical-research-runtime.ts",
            "src/services/ai-full-battery-features.service.ts",
            "src/services/ai-clinical-research-runtime.service.ts",
            "src/services/ai-integrated-result.service.ts",
            "src/components/ai/AIIntegratedAssistCard.tsx",
        ],
    }

    runtime_path = Path(args.runtime).resolve()
    summary_path = Path(args.summary).resolve()
    write_runtime_ts(runtime, runtime_path)
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print("08D MODEL TRAINING: PASS")
    print(f"Held-out subjects: 15 · examples: {int(test_mask.sum())}")
    print(f"Synthetic held-out accuracy: {held_out_accuracy:.3f}")
    print(f"Synthetic macro F1: {macro_f1:.3f}")
    print(f"Confusion matrix ({LABELS}): {confusion}")
    print("Final runtime refit on all 108 synthetic examples.")


if __name__ == "__main__":
    main()
