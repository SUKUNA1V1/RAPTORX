import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"]  = "2"  # hides info messages
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import time
import warnings
from model_registry import register_model_version
warnings.filterwarnings("ignore")

# ============================================================
# CONFIGURATION
# ============================================================
# Purpose: Define paths, reproducibility settings, and feature columns for training.
PROCESSED_DIR = "data/processed"
MODELS_DIR    = "ml/models"
RESULTS_DIR   = "ml/results/autoencoder"
RANDOM_SEED   = 42

os.makedirs(MODELS_DIR,  exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

np.random.seed(RANDOM_SEED)

# NEW — 13 features
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

# ============================================================
# STEP 1 — INSTALL CHECK
# ============================================================
# Purpose: Verify TensorFlow is available before loading data and training.
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    print(f"TensorFlow version: {tf.__version__}")
except ImportError:
    print("TensorFlow not found. Run: pip install tensorflow")
    exit()

# ============================================================
# STEP 2 — LOAD DATA
# ============================================================
# Purpose: Load scaled datasets and prepare train/validation/test splits.
print("\n" + "=" * 60)
print("STEP 2 — Loading preprocessed data")
print("=" * 60)

train_df = pd.read_csv(os.path.join(PROCESSED_DIR, "train_scaled.csv"))
test_df  = pd.read_csv(os.path.join(PROCESSED_DIR, "test_scaled.csv"))

# Autoencoder trains ONLY on normal records
train_normal = train_df[train_df["label"] == 0][FEATURE_COLS].values
X_test       = test_df[FEATURE_COLS].values
y_test       = test_df["label"].values

# Split normal into 90% train / 10% validation
split_idx    = int(len(train_normal) * 0.9)
X_train      = train_normal[:split_idx]
X_val        = train_normal[split_idx:]

print(f"Normal training set : {X_train.shape}")
print(f"Validation set      : {X_val.shape}")
print(f"Test set            : {X_test.shape}")
print(f"Anomaly ratio test  : {y_test.mean() * 100:.2f}%")

# ============================================================
# STEP 3 — BUILD AUTOENCODER ARCHITECTURE
# ============================================================
# Purpose: Build the neural network used to reconstruct normal behavior patterns.
print("\n" + "=" * 60)
print("STEP 3 — Building Autoencoder architecture")
print("=" * 60)

n_features = len(FEATURE_COLS)  # 8 features

# NEW — built for 13 features
def build_autoencoder(n_features, learning_rate=0.001):
    inputs   = keras.Input(shape=(n_features,), name="input")

    # Encoder — larger because more features
    x        = layers.Dense(32, activation="relu", name="encoder_1")(inputs)
    x        = layers.Dense(16, activation="relu", name="encoder_2")(x)
    x        = layers.Dense(8,  activation="relu", name="encoder_3")(x)

    # Bottleneck
    encoded  = layers.Dense(4,  activation="relu", name="bottleneck")(x)

    # Decoder
    x        = layers.Dense(8,  activation="relu", name="decoder_1")(encoded)
    x        = layers.Dense(16, activation="relu", name="decoder_2")(x)
    x        = layers.Dense(32, activation="relu", name="decoder_3")(x)

    # Output
    outputs  = layers.Dense(n_features, activation="sigmoid", name="output")(x)

    autoencoder = keras.Model(inputs, outputs, name="Autoencoder")
    autoencoder.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss="mse"
    )
    return autoencoder

model = build_autoencoder(n_features)
model.summary()

# ============================================================
# STEP 4 — HYPERPARAMETER TUNING
# ============================================================
# Purpose: Evaluate parameter combinations and select the strongest configuration.
print("\n" + "=" * 60)
print("STEP 4 — Hyperparameter tuning")
print("=" * 60)

from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score

param_grid = [
    {"epochs": 30,  "batch_size": 32, "lr": 0.001},
    {"epochs": 50,  "batch_size": 32, "lr": 0.001},
    {"epochs": 50,  "batch_size": 64, "lr": 0.001},
    {"epochs": 50,  "batch_size": 32, "lr": 0.0001},
]

tuning_results = []

print(f"\n{'epochs':>8} {'batch':>7} {'lr':>8} {'Precision':>10} {'Recall':>8} {'F1':>8} {'AUC':>8}")
print("-" * 65)

for params in param_grid:
    tf.random.set_seed(RANDOM_SEED)
    m = build_autoencoder(n_features, learning_rate=params["lr"])

    early_stop = keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True,
        verbose=0
    )

    m.fit(
        X_train, X_train,
        validation_data=(X_val, X_val),
        epochs=params["epochs"],
        batch_size=params["batch_size"],
        callbacks=[early_stop],
        verbose=0
    )

    # Reconstruction error on test set
    X_test_reconstructed = m.predict(X_test, verbose=0)
    recon_errors         = np.mean(np.power(X_test - X_test_reconstructed, 2), axis=1)

    # Threshold = 95th percentile of normal validation reconstruction errors
    X_val_reconstructed  = m.predict(X_val, verbose=0)
    val_errors           = np.mean(np.power(X_val - X_val_reconstructed, 2), axis=1)
    threshold            = np.percentile(val_errors, 95)

    y_pred  = (recon_errors > threshold).astype(int)
    auc     = roc_auc_score(y_test, recon_errors)
    prec    = precision_score(y_test, y_pred, zero_division=0)
    rec     = recall_score(y_test, y_pred, zero_division=0)
    f1      = f1_score(y_test, y_pred, zero_division=0)

    tuning_results.append({
        **params,
        "threshold": round(threshold, 6),
        "precision": round(prec, 4),
        "recall":    round(rec,  4),
        "f1_score":  round(f1,   4),
        "auc_roc":   round(auc,  4),
    })

    print(f"{params['epochs']:>8} {params['batch_size']:>7} {params['lr']:>8} "
          f"{prec:>10.4f} {rec:>8.4f} {f1:>8.4f} {auc:>8.4f}")

tuning_df = pd.DataFrame(tuning_results)
tuning_df.to_csv(os.path.join(RESULTS_DIR, "tuning_results.csv"), index=False)
print(f"\nTuning results saved")

# ============================================================
# STEP 5 — TRAIN FINAL MODEL WITH BEST PARAMS
# ============================================================
# Purpose: Train the final autoencoder using the best hyperparameters.
print("\n" + "=" * 60)
print("STEP 5 — Training final model")
print("=" * 60)

best_row    = tuning_df.loc[tuning_df["f1_score"].idxmax()]
best_params = {
    "epochs":     100,  # Use full training for final model
    "batch_size": int(best_row["batch_size"]),
    "lr":         float(best_row["lr"]),
}
print(f"Best params  : {best_params}")
print(f"Best F1      : {best_row['f1_score']:.4f}")
print(f"Best AUC-ROC : {best_row['auc_roc']:.4f}")

tf.random.set_seed(RANDOM_SEED)
final_model = build_autoencoder(n_features, learning_rate=best_params["lr"])

early_stop = keras.callbacks.EarlyStopping(
    monitor="val_loss",
    patience=8,
    restore_best_weights=True,
    verbose=1
)

start_time = time.time()
history = final_model.fit(
    X_train, X_train,
    validation_data=(X_val, X_val),
    epochs=best_params["epochs"],
    batch_size=best_params["batch_size"],
    callbacks=[early_stop],
    verbose=1
)
training_time = time.time() - start_time
print(f"\nTraining completed in {training_time:.2f} seconds")

# ============================================================
# STEP 6 — DETERMINE ANOMALY THRESHOLD
# ============================================================
# Purpose: Find the threshold that best separates normal and anomalous records.
print("\n" + "=" * 60)
print("STEP 6 — Determining anomaly threshold")
print("=" * 60)

# Reconstruction errors on validation (normal only)
X_val_reconstructed = final_model.predict(X_val, verbose=0)
val_errors          = np.mean(np.power(X_val - X_val_reconstructed, 2), axis=1)

mean_error = val_errors.mean()
std_error  = val_errors.std()

# Three threshold strategies
threshold_p95  = np.percentile(val_errors, 95)
threshold_p99  = np.percentile(val_errors, 99)
threshold_2std = mean_error + 2 * std_error
threshold_3std = mean_error + 3 * std_error

print(f"Validation reconstruction errors:")
print(f"  Mean      : {mean_error:.6f}")
print(f"  Std Dev   : {std_error:.6f}")
print(f"  95th pct  : {threshold_p95:.6f}")
print(f"  99th pct  : {threshold_p99:.6f}")
print(f"  mean+2std : {threshold_2std:.6f}")
print(f"  mean+3std : {threshold_3std:.6f}")

# Evaluate each threshold strategy on test set
X_test_reconstructed = final_model.predict(X_test, verbose=0)
test_errors          = np.mean(np.power(X_test - X_test_reconstructed, 2), axis=1)

threshold_strategies = {
    "95th percentile": threshold_p95,
    "99th percentile": threshold_p99,
    "mean + 2*std":    threshold_2std,
    "mean + 3*std":    threshold_3std,
}

print(f"\n{'Strategy':<20} {'Threshold':>12} {'Precision':>10} {'Recall':>8} {'F1':>8}")
print("-" * 65)

best_f1         = 0
best_threshold  = threshold_p95
best_strategy   = "95th percentile"

for strategy_name, threshold in threshold_strategies.items():
    y_pred  = (test_errors > threshold).astype(int)
    prec    = precision_score(y_test, y_pred, zero_division=0)
    rec     = recall_score(y_test, y_pred, zero_division=0)
    f1      = f1_score(y_test, y_pred, zero_division=0)
    print(f"{strategy_name:<20} {threshold:>12.6f} {prec:>10.4f} {rec:>8.4f} {f1:>8.4f}")

    if f1 > best_f1:
        best_f1        = f1
        best_threshold = threshold
        best_strategy  = strategy_name

print(f"\nBest threshold strategy : {best_strategy}")
print(f"Best threshold value    : {best_threshold:.6f}")

# ============================================================
# STEP 7 — FINAL EVALUATION
# ============================================================
# Purpose: Compute core detection metrics and runtime characteristics.
print("\n" + "=" * 60)
print("STEP 7 — Final evaluation metrics")
print("=" * 60)

from sklearn.metrics import confusion_matrix, roc_curve, ConfusionMatrixDisplay

y_pred      = (test_errors > best_threshold).astype(int)

# Convert reconstruction error to 0-1 risk score
min_err     = test_errors.min()
max_err     = test_errors.max()
risk_scores = (test_errors - min_err) / (max_err - min_err)

precision   = precision_score(y_test, y_pred, zero_division=0)
recall      = recall_score(y_test, y_pred, zero_division=0)
f1          = f1_score(y_test, y_pred, zero_division=0)
auc         = roc_auc_score(y_test, risk_scores)
cm          = confusion_matrix(y_test, y_pred)
tn, fp, fn, tp = cm.ravel()
fpr         = fp / (fp + tn) if (fp + tn) > 0 else 0

# Inference speed
start = time.time()
for _ in range(1000):
    final_model.predict(X_test[:1], verbose=0)
inf_time = (time.time() - start) / 1000 * 1000

print(f"\nConfusion Matrix:")
print(f"  True Negatives  (normal  → normal)  : {tn}")
print(f"  False Positives (normal  → anomaly) : {fp}")
print(f"  False Negatives (anomaly → normal)  : {fn}")
print(f"  True Positives  (anomaly → anomaly) : {tp}")
print(f"\nMetrics:")
print(f"  Precision          : {precision:.4f}  ({precision*100:.2f}%)")
print(f"  Recall             : {recall:.4f}  ({recall*100:.2f}%)")
print(f"  F1-Score           : {f1:.4f}")
print(f"  AUC-ROC            : {auc:.4f}")
print(f"  False Positive Rate: {fpr:.4f}  ({fpr*100:.2f}%)")
print(f"  Training time      : {training_time:.2f}s")
print(f"  Inference time     : {inf_time:.3f}ms per sample")

metrics = {
    "model":               "Autoencoder",
    "epochs":              best_params["epochs"],
    "batch_size":          best_params["batch_size"],
    "learning_rate":       best_params["lr"],
    "threshold_strategy":  best_strategy,
    "threshold_value":     round(best_threshold, 6),
    "precision":           round(precision, 4),
    "recall":              round(recall,    4),
    "f1_score":            round(f1,        4),
    "auc_roc":             round(auc,       4),
    "false_positive_rate": round(fpr,       4),
    "training_time_sec":   round(training_time, 3),
    "inference_ms":        round(inf_time,  3),
    "true_negatives":      int(tn),
    "false_positives":     int(fp),
    "false_negatives":     int(fn),
    "true_positives":      int(tp),
}
pd.DataFrame([metrics]).to_csv(os.path.join(RESULTS_DIR, "metrics.csv"), index=False)

# ============================================================
# STEP 8 — VISUALIZATIONS
# ============================================================
# Purpose: Generate plots for training behavior and anomaly separation quality.
print("\n" + "=" * 60)
print("STEP 8 — Creating visualizations")
print("=" * 60)

# --- Plot 1: Training Loss Curve ---
plt.figure(figsize=(10, 5))
plt.plot(history.history["loss"],     label="Training Loss",   color="steelblue", lw=2)
plt.plot(history.history["val_loss"], label="Validation Loss", color="tomato",    lw=2)
plt.xlabel("Epoch")
plt.ylabel("Loss (MSE)")
plt.title("Autoencoder — Training Loss Curve")
plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, "training_loss.png"), dpi=150)
print("Saved: training_loss.png")

# --- Plot 2: Confusion Matrix ---
plt.figure(figsize=(7, 6))
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["Normal", "Anomaly"])
disp.plot(cmap="Oranges", colorbar=False)
plt.title("Autoencoder — Confusion Matrix")
plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, "confusion_matrix.png"), dpi=150)
print("Saved: confusion_matrix.png")

# --- Plot 3: ROC Curve ---
fpr_curve, tpr_curve, _ = roc_curve(y_test, risk_scores)
plt.figure(figsize=(8, 6))
plt.plot(fpr_curve, tpr_curve, color="tomato", lw=2, label=f"Autoencoder (AUC = {auc:.4f})")
plt.plot([0, 1], [0, 1], color="gray", linestyle="--", lw=1, label="Random Classifier")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("Autoencoder — ROC Curve")
plt.legend(loc="lower right")
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, "roc_curve.png"), dpi=150)
print("Saved: roc_curve.png")

# --- Plot 4: Reconstruction Error Distribution ---
plt.figure(figsize=(10, 6))
plt.hist(test_errors[y_test == 0], bins=50, alpha=0.7,
         label="Normal",    color="steelblue", edgecolor="white", density=True)
plt.hist(test_errors[y_test == 1], bins=50, alpha=0.7,
         label="Anomalous", color="tomato",    edgecolor="white", density=True)
plt.axvline(x=best_threshold, color="black", linestyle="--", lw=2,
            label=f"Threshold ({best_strategy} = {best_threshold:.4f})")
plt.xlabel("Reconstruction Error (MSE)")
plt.ylabel("Density")
plt.title("Autoencoder — Reconstruction Error Distribution")
plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, "reconstruction_error_dist.png"), dpi=150)
print("Saved: reconstruction_error_dist.png")

# --- Plot 5: Reconstructed vs Original (3 anomalous samples) ---
anomaly_indices = np.where(y_test == 1)[0][:3]
fig, axes       = plt.subplots(1, 3, figsize=(15, 5))
for i, idx in enumerate(anomaly_indices):
    original      = X_test[idx]
    reconstructed = X_test_reconstructed[idx]
    x             = np.arange(len(FEATURE_COLS))
    axes[i].bar(x - 0.2, original,      0.4, label="Original",      color="steelblue", alpha=0.8)
    axes[i].bar(x + 0.2, reconstructed, 0.4, label="Reconstructed", color="tomato",    alpha=0.8)
    axes[i].set_xticks(x)
    axes[i].set_xticklabels(FEATURE_COLS, rotation=45, ha="right", fontsize=8)
    axes[i].set_title(f"Anomaly Sample {i+1}\nError: {test_errors[idx]:.4f}")
    axes[i].legend(fontsize=8)
    axes[i].set_ylim(0, 1.1)
plt.suptitle("Autoencoder — Original vs Reconstructed (Anomalous Samples)", fontsize=13)
plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, "reconstruction_comparison.png"), dpi=150)
print("Saved: reconstruction_comparison.png")

# ============================================================
# STEP 9 — SAVE MODEL + CONFIG
# ============================================================
# Purpose: Persist the trained model and metadata used at inference time.
print("\n" + "=" * 60)
print("STEP 9 — Saving model and config")
print("=" * 60)

import joblib

model_path  = os.path.join(MODELS_DIR, "autoencoder.keras")
config_path = os.path.join(MODELS_DIR, "autoencoder_config.pkl")

final_model.save(model_path)

config = {
    "threshold":          best_threshold,
    "threshold_strategy": best_strategy,
    "min_error":          float(min_err),
    "max_error":          float(max_err),
    "feature_cols":       FEATURE_COLS,
    "metrics":            metrics
}
joblib.dump(config, config_path)
register_model_version("autoencoder", [model_path, config_path], MODELS_DIR)

print(f"Model saved  : {model_path}")
print(f"Config saved : {config_path}")
print("Autoencoder version registered")

# ============================================================
# FINAL SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("Phase 4.4 COMPLETE — Final Results")
print("=" * 60)
print(f"  Precision          : {precision*100:.2f}%")
print(f"  Recall             : {recall*100:.2f}%")
print(f"  F1-Score           : {f1:.4f}")
print(f"  AUC-ROC            : {auc:.4f}")
print(f"  False Positive Rate: {fpr*100:.2f}%")
print(f"  Best threshold     : {best_threshold:.6f} ({best_strategy})")
print(f"  Training time      : {training_time:.2f}s")
print(f"  Inference time     : {inf_time:.3f}ms per sample")
print(f"\nFiles saved:")
print(f"  Model  → {model_path}")
print(f"  Config → {config_path}")
print(f"  Charts → {RESULTS_DIR}/*.png")
print(f"\nReady for Phase 4.5 — Compare both models + build Ensemble!")