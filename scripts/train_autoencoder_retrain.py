"""
Train Autoencoder using REAL retraining data.

Called during auto-retrain (every 40 days) using production access logs.
Uses: data/processed/retrain_train.csv (loaded from database)
"""

import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    print(f"TensorFlow version: {tf.__version__}")
except ImportError:
    print("TensorFlow not found. Run: pip install tensorflow")
    exit(1)

import pandas as pd
import numpy as np
import joblib
import time

# Check if we're in retrain mode
RETRAIN_MODE = os.getenv("RETRAIN_MODE", "true").lower() == "true"

# Use retrain data if available
PROCESSED_DIR = "data/processed"
MODELS_DIR = "ml/models"
RESULTS_DIR = "ml/results/autoencoder"
RANDOM_SEED = 42

FEATURE_COLS = [
    "hour",
    "day_of_week",
    "is_weekend",
    "access_frequency_24h",
    "time_since_last_access_min",
    "location_match",
    "role_level",
    "is_restricted_area",
    "is_first_access_today",
    "sequential_zone_violation",
    "access_attempt_count",
    "time_of_week",
    "hour_deviation_from_norm"
]

np.random.seed(RANDOM_SEED)

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

# Determine which data to use
if RETRAIN_MODE:
    train_file = os.path.join(PROCESSED_DIR, "retrain_train.csv")
    test_file = os.path.join(PROCESSED_DIR, "retrain_test.csv")
    print("🔄 RETRAIN MODE: Using real production data from access logs")
else:
    train_file = os.path.join(PROCESSED_DIR, "train_scaled.csv")
    test_file = os.path.join(PROCESSED_DIR, "test_scaled.csv")
    print("📊 TRAINING MODE: Using generated synthetic data")

# Always save with same name so retrained models REPLACE old ones
model_name = "autoencoder.keras"
config_name = "autoencoder_config.pkl"

print("=" * 60)
print("AUTOENCODER TRAINING")
print("=" * 60)
print()

# Load data
print(f"Loading training data: {train_file}")
train_df = pd.read_csv(train_file)
test_df = pd.read_csv(test_file)

# Autoencoder trains only on normal records
train_normal = train_df[train_df["label"] == 0][FEATURE_COLS].values
X_test = test_df[FEATURE_COLS].values
y_test = test_df["label"].values

# Split normal into 90% train / 10% validation
split_idx = int(len(train_normal) * 0.9)
X_train = train_normal[:split_idx]
X_val = train_normal[split_idx:]

print(f"Normal training set : {X_train.shape}")
print(f"Validation set      : {X_val.shape}")
print(f"Test set            : {X_test.shape}")
print(f"Anomaly ratio test  : {y_test.mean() * 100:.2f}%")
print()

# Build model
print("Building Autoencoder...")
n_features = len(FEATURE_COLS)

inputs = keras.Input(shape=(n_features,), name="input")

# Encoder
x = layers.Dense(32, activation="relu", name="encoder_1")(inputs)
x = layers.Dense(16, activation="relu", name="encoder_2")(x)
x = layers.Dense(8, activation="relu", name="encoder_3")(x)

# Bottleneck
encoded = layers.Dense(4, activation="relu", name="bottleneck")(x)

# Decoder
x = layers.Dense(8, activation="relu", name="decoder_1")(encoded)
x = layers.Dense(16, activation="relu", name="decoder_2")(x)
x = layers.Dense(32, activation="relu", name="decoder_3")(x)

# Output
outputs = layers.Dense(n_features, activation="sigmoid", name="output")(x)

autoencoder = keras.Model(inputs, outputs, name="Autoencoder")
autoencoder.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss="mse"
)

print(autoencoder.summary())
print()

# Train
print("Training Autoencoder...")
start_time = time.time()

history = autoencoder.fit(
    X_train, X_train,
    validation_data=(X_val, X_val),
    epochs=50,
    batch_size=32,
    verbose=1,
    shuffle=True
)

elapsed = time.time() - start_time
print(f"Training time: {elapsed:.1f}s")
print()

# Evaluate
print("Evaluating on test set...")
X_test_recon = autoencoder.predict(X_test, verbose=0)
X_test_errors = np.mean(np.power(X_test - X_test_recon, 2), axis=1)

min_error = X_test_errors.min()
max_error = X_test_errors.max()

print(f"Reconstruction error - min: {min_error:.4f}, max: {max_error:.4f}")
print()

# Save model
model_path = os.path.join(MODELS_DIR, model_name)
autoencoder.save(model_path)

# Save config
config = {
    "min_error": float(min_error),
    "max_error": float(max_error),
    "epochs": 50,
    "batch_size": 32,
}

config_path = os.path.join(MODELS_DIR, config_name)
joblib.dump(config, config_path)

print(f"✓ Model saved: {model_path}")
print(f"✓ Config saved: {config_path}")
print()
