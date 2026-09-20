import os

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# ---------------------------------------------------------------------------
# Cognitive-state model
# ---------------------------------------------------------------------------
# Features (in order): typing_speed, deletions, run_count, idle_time
#
# Instead of fitting on four hardcoded prototype rows at every import, we
# generate a synthetic training set by sampling with Gaussian noise around
# each class prototype, train a RandomForest once, and persist it with
# joblib. On subsequent startups the persisted model is loaded instead of
# being refit.
# ---------------------------------------------------------------------------

# Bump this when the training scheme changes so a stale cache is discarded.
MODEL_VERSION = 2
SAMPLES_PER_CLASS = 150
RANDOM_SEED = 42

_HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_HERE, "cognitive_model.joblib")

# Class prototypes: [typing_speed, deletions, run_count, idle_time]
PROTOTYPES = {
    "confused":   [5, 20, 10, 30],
    "confident":  [30, 2, 1, 2],
    "struggling": [10, 15, 8, 20],
    "expert":     [40, 1, 1, 1],
}

# Per-feature noise scale (standard deviation) used when sampling around a
# prototype. Chosen to be modest relative to the spread between classes so
# the classes stay separable while still producing realistic variation.
FEATURE_STD = np.array([4.0, 3.0, 2.0, 4.0])


def _build_dataset(rng):
    """Generate a noisy synthetic dataset around the class prototypes."""
    X_parts, y_parts = [], []
    for label, proto in PROTOTYPES.items():
        proto = np.array(proto, dtype=float)
        samples = rng.normal(
            loc=proto,
            scale=FEATURE_STD,
            size=(SAMPLES_PER_CLASS, len(proto)),
        )
        # Behavioral signals are non-negative counts / rates.
        samples = np.clip(samples, 0, None)
        X_parts.append(samples)
        y_parts.extend([label] * SAMPLES_PER_CLASS)
    return np.vstack(X_parts), np.array(y_parts)


def _train_model():
    rng = np.random.default_rng(RANDOM_SEED)
    X, y = _build_dataset(rng)
    clf = RandomForestClassifier(n_estimators=100, random_state=RANDOM_SEED)
    clf.fit(X, y)
    return clf


def _load_or_train():
    """Load a persisted model if present and current, else train and persist."""
    if os.path.exists(MODEL_PATH):
        try:
            cached = joblib.load(MODEL_PATH)
            if cached.get("version") == MODEL_VERSION:
                return cached["model"]
        except Exception:
            # Corrupt / incompatible cache — fall through and retrain.
            pass

    clf = _train_model()
    try:
        joblib.dump({"version": MODEL_VERSION, "model": clf}, MODEL_PATH)
    except Exception:
        # Persistence is best-effort; a read-only FS shouldn't break startup.
        pass
    return clf


model = _load_or_train()


def predict_state(typing_speed, deletions, run_count, idle_time):
    features = np.array([[typing_speed, deletions, run_count, idle_time]])
    return model.predict(features)[0]
