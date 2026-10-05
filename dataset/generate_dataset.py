#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

LABELS = ["normal", "peripheral", "central"]
FEATURE_NAMES = [
    "sp_pursuit_gain",
    "sp_position_rmse",
    "sp_position_correlation",
    "sp_usable_ratio",
    "sp_green_ratio",
    "sp_median_tracking_fps",
    "sp_gain_error_abs",
    "sp_low_quality_ratio",
    "hs_median_latency_ms",
    "hs_median_peak_velocity",
    "hs_endpoint_accuracy_percent",
    "hs_amplitude_ratio",
    "hs_overshoot_percent",
    "hs_direction_correct_percent",
    "hs_usable_ratio",
    "hs_green_ratio",
    "vs_median_latency_ms",
    "vs_median_peak_velocity",
    "vs_endpoint_accuracy_percent",
    "vs_amplitude_ratio",
    "vs_overshoot_percent",
    "vs_direction_correct_percent",
    "vs_usable_ratio",
    "vs_green_ratio",
    "as_median_latency_ms",
    "as_median_peak_velocity",
    "as_endpoint_accuracy_percent",
    "as_amplitude_ratio",
    "as_overshoot_percent",
    "as_direction_correct_percent",
    "as_error_rate_percent",
    "as_usable_ratio",
    "gen_mean_abs_spv",
    "gen_max_abs_spv",
    "gen_quick_phase_candidates_per_min",
    "gen_mean_position_error",
    "gen_usable_ratio",
    "gen_green_ratio",
    "gen_median_tracking_fps",
    "gen_spv_spread",
    "okn_directional_asymmetry_percent",
    "okn_right_spv",
    "okn_left_spv",
    "okn_right_agreement_percent",
    "okn_left_agreement_percent",
    "okn_quick_phase_candidates_per_min",
    "okn_usable_ratio",
    "okn_green_ratio",
]

CLASS_PROFILES = {
    "normal": {
        "sp": (0.92, 0.055, 0.90),
        "h": (190.0, 2.60, 96.0, 1.00, 7.0, 94.0),
        "v": (200.0, 2.40, 94.0, 0.98, 8.0, 92.0),
        "a": (240.0, 2.30, 92.0, 0.95, 8.0, 82.0),
        "gen": (0.020, 0.055, 8.0, 0.045),
        "okn": (7.0, 0.045, 0.043, 78.0, 77.0, 32.0),
    },
    "peripheral": {
        "sp": (0.80, 0.085, 0.80),
        "h": (205.0, 2.40, 92.0, 0.96, 10.0, 90.0),
        "v": (215.0, 2.20, 90.0, 0.94, 11.0, 88.0),
        "a": (250.0, 2.20, 90.0, 0.92, 10.0, 78.0),
        "gen": (0.045, 0.100, 22.0, 0.070),
        "okn": (26.0, 0.050, 0.027, 70.0, 55.0, 30.0),
    },
    "central": {
        "sp": (0.62, 0.130, 0.62),
        "h": (285.0, 1.80, 78.0, 0.82, 18.0, 72.0),
        "v": (300.0, 1.60, 75.0, 0.78, 20.0, 68.0),
        "a": (330.0, 1.60, 75.0, 0.78, 20.0, 48.0),
        "gen": (0.090, 0.180, 35.0, 0.120),
        "okn": (15.0, 0.028, 0.025, 50.0, 48.0, 22.0),
    },
}


def clip(value: float, low: float, high: float) -> float:
    return float(np.clip(value, low, high))


def sample_quality(rng: np.random.Generator, subject_shift: float = 0.0) -> tuple[float, float, float]:
    # Tracking quality is intentionally sampled independently from diagnostic class so
    # the classifier does not learn that a poor camera trace equals disease.
    usable = clip(rng.normal(0.84 + subject_shift, 0.08), 0.55, 0.98)
    green = clip(rng.normal(0.58 + subject_shift * 0.7, 0.16), 0.10, usable)
    fps = clip(rng.normal(28.0, 3.0), 18.0, 36.0)
    return usable, green, fps


def generate_saccade(
    rng: np.random.Generator,
    profile: tuple[float, float, float, float, float, float],
    label: str,
    severity: float,
    usable: float,
    green: float,
) -> list[float]:
    latency, peak_velocity, accuracy, amplitude, overshoot, direction_correct = profile
    latency_value = clip(
        rng.normal(latency + 8.0 * severity, 32.0 if label != "central" else 42.0),
        100.0,
        500.0,
    )
    peak_value = clip(rng.normal(peak_velocity - 0.08 * severity, 0.45), 0.4, 5.5)
    accuracy_value = clip(rng.normal(accuracy - 2.0 * severity, 8.0), 40.0, 125.0)
    amplitude_value = clip(rng.normal(amplitude - 0.025 * severity, 0.12), 0.35, 1.40)
    overshoot_value = clip(rng.normal(overshoot + 1.5 * severity, 7.0), 0.0, 60.0)
    direction_value = clip(rng.normal(direction_correct - 2.0 * severity, 9.0), 25.0, 100.0)
    usable_value = clip(usable + rng.normal(0.0, 0.04), 0.40, 0.99)
    green_value = clip(green + rng.normal(0.0, 0.07), 0.03, usable_value)
    return [
        latency_value,
        peak_value,
        accuracy_value,
        amplitude_value,
        overshoot_value,
        direction_value,
        usable_value,
        green_value,
    ]


def generate_example(
    rng: np.random.Generator,
    label: str,
    subject_latent: float,
) -> list[float]:
    severity = subject_latent + rng.normal(0.0, 0.18)
    quality_shift = rng.normal(0.0, 0.02)
    usable, green, fps = sample_quality(rng, quality_shift)
    profile = CLASS_PROFILES[label]

    # Smooth pursuit: six measured values plus two deterministic derivatives.
    pursuit_gain, pursuit_rmse, pursuit_corr = profile["sp"]
    gain = clip(rng.normal(pursuit_gain - 0.025 * severity, 0.07), 0.30, 1.25)
    rmse = clip(rng.normal(pursuit_rmse + 0.012 * severity, 0.025), 0.01, 0.25)
    corr = clip(rng.normal(pursuit_corr - 0.025 * severity, 0.08), -0.20, 1.00)
    sp_usable = clip(usable + rng.normal(0.0, 0.03), 0.45, 0.99)
    sp_green = clip(green + rng.normal(0.0, 0.05), 0.05, sp_usable)
    sp_fps = clip(fps + rng.normal(0.0, 1.0), 16.0, 40.0)
    smooth = [gain, rmse, corr, sp_usable, sp_green, sp_fps, abs(1.0 - gain), 1.0 - sp_usable]

    horizontal = generate_saccade(rng, profile["h"], label, severity, usable, green)
    vertical = generate_saccade(rng, profile["v"], label, severity, usable, green)

    # Anti-saccade includes the directly measured error-rate feature.
    anti_latency, anti_peak, anti_accuracy, anti_amplitude, anti_overshoot, anti_correct = profile["a"]
    anti_latency_value = clip(
        rng.normal(anti_latency + 10.0 * severity, 40.0 if label != "central" else 50.0),
        120.0,
        600.0,
    )
    anti_peak_value = clip(rng.normal(anti_peak - 0.07 * severity, 0.45), 0.4, 5.0)
    anti_accuracy_value = clip(rng.normal(anti_accuracy - 2.0 * severity, 9.0), 35.0, 125.0)
    anti_amplitude_value = clip(rng.normal(anti_amplitude - 0.02 * severity, 0.13), 0.30, 1.40)
    anti_overshoot_value = clip(rng.normal(anti_overshoot + 1.7 * severity, 8.0), 0.0, 70.0)
    anti_correct_value = clip(rng.normal(anti_correct - 3.0 * severity, 10.0), 15.0, 100.0)
    anti_error_value = clip(100.0 - anti_correct_value + rng.normal(0.0, 2.5), 0.0, 100.0)
    anti_usable_value = clip(usable + rng.normal(0.0, 0.04), 0.40, 0.99)
    anti = [
        anti_latency_value,
        anti_peak_value,
        anti_accuracy_value,
        anti_amplitude_value,
        anti_overshoot_value,
        anti_correct_value,
        anti_error_value,
        anti_usable_value,
    ]

    # Gaze-evoked nystagmus.
    gen_mean, gen_max, gen_quick, gen_position = profile["gen"]
    gen_mean_value = clip(rng.normal(gen_mean + 0.005 * severity, 0.018), 0.0, 0.25)
    gen_max_value = clip(rng.normal(gen_max + 0.010 * severity, 0.035), gen_mean_value, 0.40)
    gen_quick_value = clip(rng.normal(gen_quick + 2.0 * severity, 9.0), 0.0, 80.0)
    gen_position_value = clip(rng.normal(gen_position + 0.008 * severity, 0.025), 0.005, 0.30)
    gen_usable_value = clip(usable + rng.normal(0.0, 0.04), 0.40, 0.99)
    gen_green_value = clip(green + rng.normal(0.0, 0.07), 0.03, gen_usable_value)
    gen_fps_value = clip(fps + rng.normal(0.0, 1.2), 16.0, 40.0)
    gen = [
        gen_mean_value,
        gen_max_value,
        gen_quick_value,
        gen_position_value,
        gen_usable_value,
        gen_green_value,
        gen_fps_value,
        max(0.0, gen_max_value - gen_mean_value),
    ]

    # Optokinetic nystagmus. Peripheral synthetic profiles randomly choose a stronger side.
    asymmetry, right_spv, left_spv, right_agreement, left_agreement, quick_rate = profile["okn"]
    if label == "peripheral" and rng.random() < 0.5:
        right_spv, left_spv = left_spv, right_spv
        right_agreement, left_agreement = left_agreement, right_agreement

    okn_asymmetry = clip(rng.normal(asymmetry + 1.5 * severity, 8.0), 0.0, 60.0)
    okn_right_spv = clip(rng.normal(right_spv + 0.002 * severity, 0.014), 0.003, 0.12)
    okn_left_spv = clip(rng.normal(left_spv + 0.002 * severity, 0.014), 0.003, 0.12)
    okn_right_agreement = clip(rng.normal(right_agreement - 2.0 * severity, 12.0), 20.0, 100.0)
    okn_left_agreement = clip(rng.normal(left_agreement - 2.0 * severity, 12.0), 20.0, 100.0)
    okn_quick_rate = clip(rng.normal(quick_rate + 2.0 * severity, 10.0), 0.0, 80.0)
    okn_usable = clip(usable + rng.normal(0.0, 0.04), 0.40, 0.99)
    okn_green = clip(green + rng.normal(0.0, 0.07), 0.03, okn_usable)
    okn = [
        okn_asymmetry,
        okn_right_spv,
        okn_left_spv,
        okn_right_agreement,
        okn_left_agreement,
        okn_quick_rate,
        okn_usable,
        okn_green,
    ]

    features = smooth + horizontal + vertical + anti + gen + okn
    if len(features) != len(FEATURE_NAMES):
        raise RuntimeError(f"Expected {len(FEATURE_NAMES)} features, got {len(features)}")
    return [float(value) for value in features]


def create_dataset(seed: int = 8042026) -> dict:
    rng = np.random.default_rng(seed)
    examples: list[dict] = []

    for label in LABELS:
        for subject in range(18):
            subject_key = f"08d-synthetic-{label}-{subject:02d}"
            subject_latent = float(rng.normal(0.0, 0.55))
            for repeat in range(2):
                examples.append(
                    {
                        "exampleId": f"08d-{label}-{subject:02d}-{repeat}",
                        "subjectKey": subject_key,
                        "label": label,
                        "groundTruthSource": "synthetic-demo-only",
                        "features": generate_example(rng, label, subject_latent),
                    }
                )

    return {
        "schemaVersion": 2,
        "purpose": "student-project-demo-training-only",
        "featureSchema": "08d-real-metric-full-battery-v1",
        "featureNames": FEATURE_NAMES,
        "examples": examples,
        "provenance": {
            "phase": "08D",
            "source": "synthetic-metric-demo-only",
            "realPatientData": False,
            "clinicalGroundTruth": False,
            "inferenceInput": "real metrics measured by the six-test full battery",
            "intendedUse": "student-project-demo-and-software-pipeline-verification-only",
        },
    }


def validate(dataset: dict) -> None:
    if len(dataset["featureNames"]) != 48:
        raise RuntimeError("Expected 48 features")
    if len(dataset["examples"]) != 108:
        raise RuntimeError("Expected 108 examples")
    if dataset["provenance"]["realPatientData"] is not False:
        raise RuntimeError("Synthetic provenance guard failed")
    for label in LABELS:
        subjects = {
            row["subjectKey"]
            for row in dataset["examples"]
            if row["label"] == label
        }
        if len(subjects) != 18:
            raise RuntimeError(f"Expected 18 synthetic subjects for {label}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--seed", type=int, default=8042026)
    args = parser.parse_args()

    dataset = create_dataset(args.seed)
    validate(dataset)
    target = Path(args.output).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("08D SYNTHETIC METRIC DATASET: PASS")
    print(f"Examples: {len(dataset['examples'])} · features: {len(dataset['featureNames'])} · subjects: 54")
    print("Input schema: real full-battery metric names · labels remain synthetic demo labels")
    print(f"Dataset: {target}")


if __name__ == "__main__":
    main()
