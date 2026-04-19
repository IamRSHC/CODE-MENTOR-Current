import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# temporary training data
X = np.array([
    [5, 20, 10, 30],   # confused
    [30, 2, 1, 2],     # confident
    [10, 15, 8, 20],   # struggling
    [40, 1, 1, 1],     # expert
])

y = ["confused", "confident", "struggling", "expert"]

model = RandomForestClassifier()
model.fit(X, y)

def predict_state(typing_speed, deletions, run_count, idle_time):
    features = np.array([[typing_speed, deletions, run_count, idle_time]])
    return model.predict(features)[0]
