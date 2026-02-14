import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import MinMaxScaler
import joblib
import os

# ============================================================
# CONFIGURATION
# ============================================================
RAW_DIR       = "data/raw"
PROCESSED_DIR = "data/processed"
MODELS_DIR    = "ml/models"

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(MODELS_DIR,    exist_ok=True)

FEATURE_COLS = [
    "hour",
    "day_of_week",
    "is_weekend",
    "access_frequency_24h",
    "time_since_last_access_min",
    "location_match",
    "role_level",
    "is_restricted_area"
]

# ============================================================
# STEP 1 — LOAD DATA
# ============================================================
print("=" * 50)
print("STEP 1 — Loading data")
print("=" * 50)

train_df = pd.read_csv(os.path.join(RAW_DIR, "train.csv"))
test_df  = pd.read_csv(os.path.join(RAW_DIR, "test.csv"))
full_df  = pd.read_csv(os.path.join(RAW_DIR, "access_data.csv"))

print(f"Train set : {train_df.shape}")
print(f"Test set  : {test_df.shape}")
print(f"Full set  : {full_df.shape}")

# ============================================================
# STEP 2 — CHECK MISSING VALUES
# ============================================================
print("\n" + "=" * 50)
print("STEP 2 — Missing values")
print("=" * 50)
print(full_df.isnull().sum())
print("\nNo missing values expected — all fields are generated.")

# ============================================================
# STEP 3 — BASIC STATISTICS
# ============================================================
print("\n" + "=" * 50)
print("STEP 3 — Basic statistics")
print("=" * 50)
print(full_df[FEATURE_COLS].describe().round(3))

print("\nLabel distribution:")
print(full_df["label"].value_counts())
print(f"Anomaly ratio: {full_df['label'].mean() * 100:.2f}%")

# ============================================================
# STEP 4 — VISUALIZATIONS
# ============================================================
print("\n" + "=" * 50)
print("STEP 4 — Creating visualizations")
print("=" * 50)

normal_df   = full_df[full_df["label"] == 0]
anomaly_df  = full_df[full_df["label"] == 1]

# --- Plot 1: Histogram of access hours ---
plt.figure(figsize=(12, 5))
plt.hist(normal_df["hour"],  bins=24, alpha=0.7, label="Normal",    color="steelblue", edgecolor="white")
plt.hist(anomaly_df["hour"], bins=24, alpha=0.7, label="Anomalous", color="tomato",    edgecolor="white")
plt.xlabel("Hour of Day")
plt.ylabel("Count")
plt.title("Access Hour Distribution — Normal vs Anomalous")
plt.xticks(range(0, 24))
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(PROCESSED_DIR, "plot_access_hours.png"), dpi=150)
plt.show()
print(" Saved: plot_access_hours.png")

# --- Plot 2: Box plot of access frequency ---
plt.figure(figsize=(8, 6))
full_df["label_name"] = full_df["label"].map({0: "Normal", 1: "Anomalous"})
sns.boxplot(
    data=full_df,
    x="label_name",
    y="access_frequency_24h",
    palette={"Normal": "steelblue", "Anomalous": "tomato"}
)
plt.xlabel("Record Type")
plt.ylabel("Access Frequency (24h)")
plt.title("Access Frequency — Normal vs Anomalous")
plt.tight_layout()
plt.savefig(os.path.join(PROCESSED_DIR, "plot_frequency_boxplot.png"), dpi=150)
plt.show()
print(" Saved: plot_frequency_boxplot.png")

# --- Plot 3: Correlation heatmap ---
plt.figure(figsize=(10, 8))
corr = full_df[FEATURE_COLS + ["label"]].corr()
sns.heatmap(
    corr,
    annot=True,
    fmt=".2f",
    cmap="coolwarm",
    center=0,
    square=True,
    linewidths=0.5
)
plt.title("Feature Correlation Heatmap")
plt.tight_layout()
plt.savefig(os.path.join(PROCESSED_DIR, "plot_correlation_heatmap.png"), dpi=150)
plt.show()
print(" Saved: plot_correlation_heatmap.png")

# ============================================================
# STEP 5 — NORMALIZE WITH MINMAXSCALER
# ============================================================
print("\n" + "=" * 50)
print("STEP 5 — Normalizing features with MinMaxScaler")
print("=" * 50)

# Separate features and labels
X_train = train_df[FEATURE_COLS].copy()
y_train = train_df["label"].copy()

X_test  = test_df[FEATURE_COLS].copy()
y_test  = test_df["label"].copy()

# Fit ONLY on training set — never on test set (prevents data leakage)
scaler  = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)   # fit + transform
X_test_scaled  = scaler.transform(X_test)         # transform only

print(f"Feature min after scaling: {X_train_scaled.min():.4f} (should be 0.0)")
print(f"Feature max after scaling: {X_train_scaled.max():.4f} (should be 1.0)")

# Convert back to DataFrames
train_scaled_df = pd.DataFrame(X_train_scaled, columns=FEATURE_COLS)
train_scaled_df["label"] = y_train.values

test_scaled_df  = pd.DataFrame(X_test_scaled,  columns=FEATURE_COLS)
test_scaled_df["label"]  = y_test.values

# ============================================================
# STEP 6 — SAVE PREPROCESSED DATA + SCALER
# ============================================================
print("\n" + "=" * 50)
print("STEP 6 — Saving preprocessed files")
print("=" * 50)

train_out = os.path.join(PROCESSED_DIR, "train_scaled.csv")
test_out  = os.path.join(PROCESSED_DIR, "test_scaled.csv")
scaler_out = os.path.join(MODELS_DIR,   "scaler.pkl")

train_scaled_df.to_csv(train_out,  index=False)
test_scaled_df.to_csv(test_out,    index=False)
joblib.dump(scaler, scaler_out)

print(f" Scaled train set saved : {train_out}")
print(f" Scaled test set saved  : {test_out}")
print(f" Scaler saved           : {scaler_out}")

print(f"\n🎉 Phase 4.2 DONE!")
print(f"\nFiles ready for ML training:")
print(f"  Training : {train_out}")
print(f"  Testing  : {test_out}")
print(f"  Scaler   : {scaler_out}")