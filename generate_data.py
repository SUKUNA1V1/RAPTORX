import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
import os

TOTAL_RECORDS = 50000
ANOMALY_RATIO = 0.07
RANDOM_SEED   = 42
OUTPUT_DIR    = "data/raw"

os.makedirs(OUTPUT_DIR, exist_ok=True)
np.random.seed(RANDOM_SEED)

normal_count  = int(TOTAL_RECORDS * (1 - ANOMALY_RATIO))
anomaly_count = TOTAL_RECORDS - normal_count

print(f"Generating {normal_count} normal + {anomaly_count} anomalous records...")

# ============================================================
# SIMULATE 100 USERS with individual behavioral profiles
# ============================================================
NUM_USERS = 100
user_profiles = []

for user_id in range(NUM_USERS):
    role = np.random.choice([1, 2, 3], p=[0.60, 0.30, 0.10])

    # Each user has their OWN usual hour (some come early, some late)
    if role == 3:   # admin — can come anytime
        usual_hour = np.random.randint(7, 18)
    elif role == 2: # manager — business hours
        usual_hour = np.random.randint(8, 10)
    else:           # employee — varied
        usual_hour = np.random.randint(7, 12)

    # Each user has their OWN usual days
    if role == 3:
        usual_days = [0, 1, 2, 3, 4, 5, 6]  # admin works any day
    else:
        usual_days = [0, 1, 2, 3, 4]         # employee weekdays only

    # Each user has their OWN usual zone
    zone = np.random.choice(
        ["engineering", "hr", "finance", "marketing", "logistics", "it"],
        p=[0.25, 0.15, 0.15, 0.15, 0.15, 0.15]
    )

    user_profiles.append({
        "user_id":         user_id,
        "role_level":      role,
        "usual_hour_mean": usual_hour,
        "usual_hour_std":  1.5,
        "usual_days":      usual_days,
        "usual_zone":      zone,
        "days_since_created": np.random.randint(30, 1000)
    })

# ============================================================
# GENERATE NORMAL RECORDS
# ============================================================
def generate_normal(n):
    records = []
    for _ in range(n):
        # Pick a random user
        user    = user_profiles[np.random.randint(0, NUM_USERS)]
        role    = user["role_level"]

        # Access hour close to THIS user's usual hour
        hour    = int(np.clip(
            np.random.normal(user["usual_hour_mean"], user["usual_hour_std"]),
            6, 20
        ))

        # Access day from THIS user's usual days
        day     = np.random.choice(user["usual_days"])
        is_wknd = 1 if day >= 5 else 0

        # Normal frequency for this user
        freq    = int(np.clip(np.random.normal(3, 1.2), 1, 8))

        # Normal time since last access
        time_s  = int(np.clip(np.random.normal(150, 60), 30, 480))

        # Almost always in correct zone
        loc     = np.random.choice([1, 0], p=[0.97, 0.03])

        # Restricted only for high roles
        if role == 3:
            restr = np.random.choice([1, 0], p=[0.30, 0.70])
        elif role == 2:
            restr = np.random.choice([1, 0], p=[0.07, 0.93])
        else:
            restr = 0

        # New features
        is_first       = np.random.choice([1, 0], p=[0.30, 0.70])
        seq_violation  = 0  # normal users don't violate zone sequences
        attempt_count  = np.random.choice([0, 1], p=[0.95, 0.05])
        time_of_week   = day * 24 + hour  # 0-167

        # Per-user deviation
        hour_deviation = abs(hour - user["usual_hour_mean"]) / max(user["usual_hour_std"], 1)

        records.append({
            "hour":                       hour,
            "day_of_week":                day,
            "is_weekend":                 is_wknd,
            "access_frequency_24h":       freq,
            "time_since_last_access_min": time_s,
            "location_match":             loc,
            "role_level":                 role,
            "is_restricted_area":         restr,
            "is_first_access_today":      is_first,
            "sequential_zone_violation":  seq_violation,
            "access_attempt_count":       attempt_count,
            "time_of_week":               time_of_week,
            "hour_deviation_from_norm":   round(hour_deviation, 3),
            "label":                      0
        })
    return records

# ============================================================
# GENERATE ANOMALOUS RECORDS
# ============================================================
def generate_anomalous(n):
    records      = []
    anomaly_types = [
        "unusual_hour",
        "weekend_access",
        "restricted_area",
        "high_frequency",
        "badge_cloning",
        "location_mismatch"
    ]

    for i in range(n):
        atype   = anomaly_types[i % len(anomaly_types)]
        user    = user_profiles[np.random.randint(0, NUM_USERS)]

        # Every anomaly ALWAYS violates at least 3 features simultaneously
        # This is the key change — no more single-feature anomalies

        if atype == "unusual_hour":
            hour       = np.random.choice(list(range(0, 4)))  # strictly 0-3AM
            day        = np.random.randint(0, 7)
            is_wknd    = 1 if day >= 5 else 0
            freq       = np.random.randint(8, 20)             # also high freq
            time_s     = np.random.randint(2, 20)             # also short gaps
            loc        = 0                                     # also wrong zone
            restr      = np.random.choice([0, 1], p=[0.3, 0.7])  # often restricted
            role       = 1
            is_first   = 0
            seq_viol   = 1
            attempts   = np.random.randint(2, 5)

        elif atype == "weekend_access":
            hour       = np.random.choice(list(range(0, 6)))  # very late/early
            day        = np.random.choice([5, 6])
            is_wknd    = 1
            freq       = np.random.randint(10, 25)            # high freq
            time_s     = np.random.randint(2, 15)
            loc        = 0                                     # wrong zone
            restr      = 1                                     # always restricted
            role       = 1
            is_first   = 0
            seq_viol   = 1
            attempts   = np.random.randint(2, 6)

        elif atype == "restricted_area":
            hour       = np.random.choice(list(range(0, 5)) + list(range(22, 24)))
            day        = np.random.randint(0, 7)
            is_wknd    = 1 if day >= 5 else 0
            freq       = np.random.randint(5, 15)
            time_s     = np.random.randint(2, 20)
            loc        = 0                                     # wrong zone
            restr      = 1                                     # restricted
            role       = 1                                     # low clearance
            is_first   = 0
            seq_viol   = 1
            attempts   = np.random.randint(3, 8)              # many attempts

        elif atype == "high_frequency":
            hour       = np.random.randint(8, 18)             # normal hour
            day        = np.random.randint(0, 5)
            is_wknd    = 0
            freq       = np.random.randint(25, 40)            # extremely high
            time_s     = np.random.randint(1, 5)              # very short gaps
            loc        = np.random.choice([0, 1], p=[0.7, 0.3])
            restr      = np.random.choice([0, 1], p=[0.4, 0.6])
            role       = 1
            is_first   = 0
            seq_viol   = 1
            attempts   = np.random.randint(3, 8)

        elif atype == "badge_cloning":
            hour       = np.random.randint(8, 18)             # normal hour
            day        = np.random.randint(0, 5)
            is_wknd    = 0
            freq       = np.random.randint(10, 20)            # high freq
            time_s     = np.random.randint(1, 3)              # under 3 minutes!
            loc        = 0                                     # different location
            restr      = np.random.choice([0, 1], p=[0.5, 0.5])
            role       = 1
            is_first   = 0
            seq_viol   = 1
            attempts   = np.random.randint(2, 5)

        elif atype == "location_mismatch":
            hour       = np.random.choice(list(range(0, 6)) + list(range(21, 24)))
            day        = np.random.randint(0, 7)
            is_wknd    = 1 if day >= 5 else 0
            freq       = np.random.randint(8, 18)
            time_s     = np.random.randint(2, 15)
            loc        = 0                                     # wrong zone
            restr      = 1                                     # restricted
            role       = 1
            is_first   = 0
            seq_viol   = 1
            attempts   = np.random.randint(2, 5)

        time_of_week   = day * 24 + hour
        hour_deviation = abs(hour - user["usual_hour_mean"]) / max(user["usual_hour_std"], 1)
        # Anomalies always deviate a lot from user's norm
        hour_deviation = max(hour_deviation, 3.0)

        records.append({
            "hour":                       hour,
            "day_of_week":                day,
            "is_weekend":                 is_wknd,
            "access_frequency_24h":       freq,
            "time_since_last_access_min": time_s,
            "location_match":             loc,
            "role_level":                 role,
            "is_restricted_area":         restr,
            "is_first_access_today":      is_first,
            "sequential_zone_violation":  seq_viol,
            "access_attempt_count":       attempts,
            "time_of_week":               time_of_week,
            "hour_deviation_from_norm":   round(hour_deviation, 3),
            "label":                      1
        })
    return records

# ============================================================
# BUILD + SAVE
# ============================================================
normal_records  = generate_normal(normal_count)
anomaly_records = generate_anomalous(anomaly_count)
all_records     = normal_records + anomaly_records

df = pd.DataFrame(all_records)
df = df.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)

df.to_csv(os.path.join(OUTPUT_DIR, "access_data.csv"), index=False)

train_df, test_df = train_test_split(
    df, test_size=0.2, random_state=RANDOM_SEED, stratify=df["label"]
)
train_df.to_csv(os.path.join(OUTPUT_DIR, "train.csv"), index=False)
test_df.to_csv(os.path.join(OUTPUT_DIR,  "test.csv"),  index=False)

print(f"✅ Total    : {len(df)}")
print(f"✅ Normal   : {len(df[df.label==0])}")
print(f"✅ Anomalous: {len(df[df.label==1])}")
print(f"✅ Features : {len(df.columns)-1}")
print(f"\n🎉 Done!")