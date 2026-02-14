import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
import os

# ============================================================
# CONFIGURATION
# ============================================================
TOTAL_RECORDS   = 30000   # change to 10000-50000 as needed
ANOMALY_RATIO   = 0.08    # 8% anomalous (between 5-10%)
RANDOM_SEED     = 42
OUTPUT_DIR      = "data/raw"

os.makedirs(OUTPUT_DIR, exist_ok=True)
np.random.seed(RANDOM_SEED)

normal_count  = int(TOTAL_RECORDS * (1 - ANOMALY_RATIO))
anomaly_count = TOTAL_RECORDS - normal_count

print(f"Generating {normal_count} normal records and {anomaly_count} anomalous records...")

# ============================================================
# GENERATE NORMAL RECORDS (90-95%)
# ============================================================
def generate_normal(n):
    records = []
    for _ in range(n):
        role_level    = np.random.choice([1, 1, 1, 2, 2, 3], p=[0.5, 0.0, 0.0, 0.3, 0.0, 0.2])
        # Working hours: 8AM-6PM with peak at 9AM and 2PM
        hour          = int(np.clip(np.random.normal(loc=np.random.choice([10, 14]), scale=2), 8, 18))
        # Weekdays mostly
        day_of_week   = np.random.choice([0,1,2,3,4,5,6], p=[0.22, 0.22, 0.22, 0.22, 0.10, 0.01, 0.01])
        is_weekend    = 1 if day_of_week >= 5 else 0
        # Normal frequency: 2-8 times per day
        access_frequency_24h        = int(np.clip(np.random.normal(loc=4, scale=2), 1, 8))
        # Normal time since last access: 30-480 minutes
        time_since_last_access_min  = int(np.clip(np.random.normal(loc=120, scale=60), 30, 480))
        # Usually in correct location
        location_match              = np.random.choice([1, 0], p=[0.95, 0.05])
        # Restricted area access only for high role levels
        if role_level == 3:
            is_restricted_area = np.random.choice([1, 0], p=[0.4, 0.6])
        elif role_level == 2:
            is_restricted_area = np.random.choice([1, 0], p=[0.1, 0.9])
        else:
            is_restricted_area = 0

        records.append({
            "hour":                       hour,
            "day_of_week":                day_of_week,
            "is_weekend":                 is_weekend,
            "access_frequency_24h":       access_frequency_24h,
            "time_since_last_access_min": time_since_last_access_min,
            "location_match":             location_match,
            "role_level":                 role_level,
            "is_restricted_area":         is_restricted_area,
            "label":                      0  # normal
        })
    return records

# ============================================================
# GENERATE ANOMALOUS RECORDS (5-10%)
# ============================================================
def generate_anomalous(n):
    records = []
    # 6 anomaly types — distribute evenly
    anomaly_types = [
        "unusual_hour",
        "weekend_access",
        "restricted_area",
        "high_frequency",
        "badge_cloning",
        "location_mismatch"
    ]

    for i in range(n):
        anomaly_type = anomaly_types[i % len(anomaly_types)]
        role_level   = np.random.choice([1, 2, 3], p=[0.6, 0.3, 0.1])

        # Default normal-ish values first
        hour                       = np.random.randint(8, 18)
        day_of_week                = np.random.randint(0, 5)
        is_weekend                 = 0
        access_frequency_24h       = np.random.randint(2, 8)
        time_since_last_access_min = np.random.randint(30, 480)
        location_match             = 1
        is_restricted_area         = 0

        # Now override based on anomaly type
        if anomaly_type == "unusual_hour":
            # Access between midnight and 5AM
            hour = np.random.randint(0, 5)

        elif anomaly_type == "weekend_access":
            # Weekend access for employee/contractor
            role_level  = np.random.choice([1, 2], p=[0.7, 0.3])
            day_of_week = np.random.choice([5, 6])
            is_weekend  = 1
            hour        = np.random.randint(0, 23)

        elif anomaly_type == "restricted_area":
            # Low clearance user accessing restricted area
            role_level         = 1
            is_restricted_area = 1
            hour               = np.random.randint(8, 18)

        elif anomaly_type == "high_frequency":
            # Too many accesses in 24h
            access_frequency_24h = np.random.randint(15, 30)

        elif anomaly_type == "badge_cloning":
            # Very short time since last access at different location
            time_since_last_access_min = np.random.randint(1, 5)
            location_match             = 0

        elif anomaly_type == "location_mismatch":
            # User in wrong department zone
            location_match     = 0
            is_restricted_area = np.random.choice([0, 1], p=[0.5, 0.5])

        records.append({
            "hour":                       hour,
            "day_of_week":                day_of_week,
            "is_weekend":                 is_weekend,
            "access_frequency_24h":       access_frequency_24h,
            "time_since_last_access_min": time_since_last_access_min,
            "location_match":             location_match,
            "role_level":                 role_level,
            "is_restricted_area":         is_restricted_area,
            "label":                      1  # anomalous
        })
    return records

# ============================================================
# BUILD FULL DATASET
# ============================================================
normal_records   = generate_normal(normal_count)
anomaly_records  = generate_anomalous(anomaly_count)
all_records      = normal_records + anomaly_records

df = pd.DataFrame(all_records)
df = df.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)  # shuffle

# ============================================================
# SAVE FULL DATASET
# ============================================================
full_path = os.path.join(OUTPUT_DIR, "access_data.csv")
df.to_csv(full_path, index=False)
print(f"\n Full dataset saved: {full_path}")
print(f"   Total records : {len(df)}")
print(f"   Normal        : {len(df[df.label == 0])}")
print(f"   Anomalous     : {len(df[df.label == 1])}")

# ============================================================
# SPLIT 80% TRAIN / 20% TEST
# ============================================================
train_df, test_df = train_test_split(
    df,
    test_size=0.2,
    random_state=RANDOM_SEED,
    stratify=df["label"]  # keep same ratio in both splits
)

train_path = os.path.join(OUTPUT_DIR, "train.csv")
test_path  = os.path.join(OUTPUT_DIR, "test.csv")

train_df.to_csv(train_path, index=False)
test_df.to_csv(test_path,  index=False)

print(f"\n Train set saved : {train_path}  ({len(train_df)} records)")
print(f" Test set saved  : {test_path}   ({len(test_df)} records)")
print("\n Phase 4.1 DONE!")