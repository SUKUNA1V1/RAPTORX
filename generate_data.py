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
# ZONE DISTANCE MATRIX (km between zones)
# ============================================================
ZONES = ["engineering", "hr", "finance", "marketing", "logistics", "it"]
ZONE_DISTANCES = {
    ("engineering", "engineering"): 0.0,
    ("engineering", "hr"): 0.15,
    ("engineering", "finance"): 0.25,
    ("engineering", "marketing"): 0.20,
    ("engineering", "logistics"): 0.30,
    ("engineering", "it"): 0.10,
    ("hr", "hr"): 0.0,
    ("hr", "finance"): 0.12,
    ("hr", "marketing"): 0.18,
    ("hr", "logistics"): 0.35,
    ("hr", "it"): 0.22,
    ("finance", "finance"): 0.0,
    ("finance", "marketing"): 0.15,
    ("finance", "logistics"): 0.28,
    ("finance", "it"): 0.30,
    ("marketing", "marketing"): 0.0,
    ("marketing", "logistics"): 0.20,
    ("marketing", "it"): 0.25,
    ("logistics", "logistics"): 0.0,
    ("logistics", "it"): 0.40,
    ("it", "it"): 0.0,
}

# Make distance matrix symmetric
for (z1, z2), dist in list(ZONE_DISTANCES.items()):
    ZONE_DISTANCES[(z2, z1)] = dist

def get_zone_distance(zone1, zone2):
    """Get distance between two zones in km"""
    if zone1 == zone2:
        return 0.0
    return ZONE_DISTANCES.get((zone1, zone2), 0.15)  # default 150m

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
    
    # Map zone to department (for zone_clearance_mismatch)
    zone_to_dept = {
        "engineering": "engineering",
        "hr": "hr",
        "finance": "finance",
        "marketing": "marketing",
        "logistics": "logistics",
        "it": "it"
    }
    department = zone_to_dept[zone]
    
    # Clearance level matches role: 1=employee, 2=manager, 3=admin
    clearance_level = role

    user_profiles.append({
        "user_id":         user_id,
        "role_level":      role,
        "clearance_level": clearance_level,
        "department":      department,
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
    prev_zone = {}  # Track previous zone per user
    prev_timestamp = {}  # Track previous timestamp per user
    
    for _ in range(n):
        # Pick a random user
        user    = user_profiles[np.random.randint(0, NUM_USERS)]
        role    = user["role_level"]
        user_id = user["user_id"]

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

        # Normal time since last access - FIXED: minimum 10 minutes
        time_s  = int(np.clip(np.random.normal(150, 60), 10, 480))

        # Almost always in correct zone - FIXED: reduce from 3% to 0.5%
        loc     = np.random.choice([1, 0], p=[0.995, 0.005])
        
        # Current zone (usually their usual zone)
        current_zone = user["usual_zone"]
        if np.random.random() < 0.1:  # 10% chance to visit other zone
            current_zone = np.random.choice(ZONES)

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
        
        # NEW FEATURES
        # Calculate distance and velocity from previous access
        if user_id in prev_zone and user_id in prev_timestamp:
            distance_km = get_zone_distance(prev_zone[user_id], current_zone)
            velocity = distance_km / max(time_s, 1) if time_s > 0 else 0
            # Geographic impossibility: velocity > 1 km/min (60 km/h) is suspicious
            geographic_impossibility = 1 if velocity > 1.0 else 0
        else:
            distance_km = 0.0
            velocity = 0.0
            geographic_impossibility = 0
        
        # Zone clearance mismatch: always 0 for normal (correct clearance)
        zone_clearance_mismatch = 0
        
        # Department zone mismatch: 0 for normal (in correct department zone)
        department_zone_mismatch = 0
        
        # Concurrent session: never for normal users
        concurrent_session_detected = 0
        
        # Update tracking
        prev_zone[user_id] = current_zone
        prev_timestamp[user_id] = time_s

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
            "geographic_impossibility":   geographic_impossibility,
            "distance_between_scans_km":  round(distance_km, 3),
            "velocity_km_per_min":        round(velocity, 4),
            "zone_clearance_mismatch":    zone_clearance_mismatch,
            "department_zone_mismatch":   department_zone_mismatch,
            "concurrent_session_detected": concurrent_session_detected,
            "label":                      0
        })
    return records

# ============================================================
# GENERATE ANOMALOUS RECORDS
# ============================================================
def generate_anomalous(n):
    records      = []
    
    # Weighted anomaly distribution for better detection
    anomaly_types = [
        "badge_cloning",      # 25%
        "badge_cloning",
        "badge_cloning",
        "badge_cloning",
        "restricted_area",    # 20%
        "restricted_area",
        "restricted_area",
        "location_mismatch",  # 20%
        "location_mismatch",
        "location_mismatch",
        "unusual_hour",       # 15%
        "unusual_hour",
        "weekend_access",     # 10%
        "high_frequency",     # 10%
    ]
    
    prev_zone = {}
    prev_timestamp = {}

    for i in range(n):
        atype   = anomaly_types[i % len(anomaly_types)]
        user    = user_profiles[np.random.randint(0, NUM_USERS)]
        user_id = user["user_id"]

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
            current_zone = np.random.choice(ZONES)
            zone_clear_mismatch = 1 if restr else 0
            dept_mismatch = 1
            concurrent = 0

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
            current_zone = np.random.choice(ZONES)
            zone_clear_mismatch = 1
            dept_mismatch = 1
            concurrent = 0

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
            current_zone = np.random.choice(ZONES)
            zone_clear_mismatch = 1  # Low clearance in restricted area
            dept_mismatch = 1
            concurrent = 0

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
            current_zone = np.random.choice(ZONES)
            zone_clear_mismatch = 0
            dept_mismatch = np.random.choice([0, 1])
            concurrent = 0

        elif atype == "badge_cloning":
            # FIXED: Make badge cloning MUCH more distinct
            hour       = np.random.randint(6, 22)             # can be any hour
            day        = np.random.randint(0, 7)
            is_wknd    = 1 if day >= 5 else 0
            freq       = np.random.randint(15, 30)            # HIGHER frequency (15-30)
            time_s     = np.random.randint(0, 2)              # VERY SHORT gaps (0-2 min)
            loc        = 0                                     # ALWAYS different location
            restr      = 1                                     # ALWAYS restricted
            role       = 1
            is_first   = 0
            seq_viol   = 1
            attempts   = np.random.randint(5, 10)             # MORE attempts (5-10)
            current_zone = np.random.choice(ZONES)
            zone_clear_mismatch = 1
            dept_mismatch = 1
            concurrent = 1  # Badge used in two places at once

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
            current_zone = np.random.choice(ZONES)
            zone_clear_mismatch = 1
            dept_mismatch = 1
            concurrent = 0

        time_of_week   = day * 24 + hour
        hour_deviation = abs(hour - user["usual_hour_mean"]) / max(user["usual_hour_std"], 1)
        # Anomalies always deviate a lot from user's norm
        hour_deviation = max(hour_deviation, 3.0)
        
        # NEW FEATURES - Calculate distance and velocity
        if user_id in prev_zone and user_id in prev_timestamp:
            distance_km = get_zone_distance(prev_zone[user_id], current_zone)
            velocity = distance_km / max(time_s, 1) if time_s > 0 else 0
            # For badge cloning, make velocity physically impossible
            if atype == "badge_cloning":
                velocity = np.random.uniform(2.0, 5.0)  # 120-300 km/h - impossible!
                geographic_impossibility = 1
            else:
                geographic_impossibility = 1 if velocity > 1.0 else 0
        else:
            distance_km = get_zone_distance(user["usual_zone"], current_zone)
            velocity = distance_km / max(time_s, 1) if time_s > 0 else 0
            if atype == "badge_cloning":
                velocity = np.random.uniform(2.0, 5.0)
                geographic_impossibility = 1
            else:
                geographic_impossibility = 1 if velocity > 1.0 else 0
        
        # Update tracking
        prev_zone[user_id] = current_zone
        prev_timestamp[user_id] = time_s

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
            "geographic_impossibility":   geographic_impossibility,
            "distance_between_scans_km":  round(distance_km, 3),
            "velocity_km_per_min":        round(velocity, 4),
            "zone_clearance_mismatch":    zone_clear_mismatch,
            "department_zone_mismatch":   dept_mismatch,
            "concurrent_session_detected": concurrent,
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
print(f"✅ Features : {len(df.columns)-1}")  # 19 features now
print(f"\n🎉 Done!")