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
ZONE_DISTANCES = {
    "engineering": {"engineering": 0, "hr": 0.5, "finance": 0.8, "marketing": 0.3, "logistics": 1.2, "it": 0.4, "server_room": 0.6, "executive": 0.7},
    "hr": {"engineering": 0.5, "hr": 0, "finance": 0.3, "marketing": 0.6, "logistics": 1.0, "it": 0.5, "server_room": 0.8, "executive": 0.4},
    "finance": {"engineering": 0.8, "hr": 0.3, "finance": 0, "marketing": 0.7, "logistics": 0.9, "it": 0.6, "server_room": 0.5, "executive": 0.2},
    "marketing": {"engineering": 0.3, "hr": 0.6, "finance": 0.7, "marketing": 0, "logistics": 1.5, "it": 0.4, "server_room": 0.9, "executive": 0.8},
    "logistics": {"engineering": 1.2, "hr": 1.0, "finance": 0.9, "marketing": 1.5, "logistics": 0, "it": 1.1, "server_room": 1.3, "executive": 1.0},
    "it": {"engineering": 0.4, "hr": 0.5, "finance": 0.6, "marketing": 0.4, "logistics": 1.1, "it": 0, "server_room": 0.2, "executive": 0.5},
    "server_room": {"engineering": 0.6, "hr": 0.8, "finance": 0.5, "marketing": 0.9, "logistics": 1.3, "it": 0.2, "server_room": 0, "executive": 0.4},
    "executive": {"engineering": 0.7, "hr": 0.4, "finance": 0.2, "marketing": 0.8, "logistics": 1.0, "it": 0.5, "server_room": 0.4, "executive": 0}
}

ZONES = list(ZONE_DISTANCES.keys())

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

    # Each user has their OWN usual zone and department
    zone = np.random.choice(
        ["engineering", "hr", "finance", "marketing", "logistics", "it"],
        p=[0.25, 0.15, 0.15, 0.15, 0.15, 0.15]
    )
    
    # Department typically matches zone
    department = zone if np.random.random() > 0.1 else np.random.choice(ZONES)
    
    # Clearance level (1=low, 2=medium, 3=high) - usually matches role
    clearance = role if np.random.random() > 0.05 else np.random.choice([1, 2, 3])

    user_profiles.append({
        "user_id":         user_id,
        "role_level":      role,
        "clearance":       clearance,
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
    prev_zones = {}  # Track previous zone per user for distance calculation
    
    for _ in range(n):
        # Pick a random user
        user    = user_profiles[np.random.randint(0, NUM_USERS)]
        role    = user["role_level"]
        clearance = user["clearance"]
        dept    = user["department"]

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

        # Normal time since last access (minimum 10 minutes, not <5)
        time_s  = int(np.clip(np.random.normal(150, 60), 10, 480))

        # Almost always in correct zone - REDUCED from 3% to 0.5% (Quick Win #2)
        loc     = np.random.choice([1, 0], p=[0.995, 0.005])

        # Determine current zone
        if loc == 1:
            current_zone = user["usual_zone"]
        else:
            # Occasionally in different zone (but still normal - e.g., meeting)
            current_zone = np.random.choice([z for z in ZONES if z != user["usual_zone"]])
        
        # Calculate distance from previous zone
        user_id = user["user_id"]
        if user_id in prev_zones:
            prev_zone = prev_zones[user_id]
            distance_km = ZONE_DISTANCES[prev_zone][current_zone]
        else:
            distance_km = 0  # First access of the day
        prev_zones[user_id] = current_zone
        
        # Calculate velocity (km/min)
        velocity = distance_km / max(time_s, 1) if time_s > 0 else 0
        
        # Geographic impossibility (normal users never have impossible travel)
        geo_impossible = 1 if velocity > 1.0 else 0  # > 60 km/h
        
        # Zone clearance mismatch (normal users typically have correct clearance)
        zone_clearance_req = 3 if current_zone in ["server_room", "executive"] else 2 if current_zone == "finance" else 1
        zone_clear_mismatch = 1 if clearance < zone_clearance_req else 0
        
        # Department zone mismatch (normal users typically in their department zones)
        dept_zone_mismatch = 0 if current_zone == dept else 1
        # But reduce mismatch rate for normal - meetings, etc. are okay
        if dept_zone_mismatch and np.random.random() < 0.7:
            dept_zone_mismatch = 0
        
        # Concurrent session (normal users never have concurrent sessions)
        concurrent = 0

        # Restricted only for high roles
        if role == 3:
            restr = np.random.choice([1, 0], p=[0.30, 0.70])
        elif role == 2:
            restr = np.random.choice([1, 0], p=[0.07, 0.93])
        else:
            restr = 0

        # New features
        is_first       = np.random.choice([1, 0], p=[0.30, 0.70])
        # Allow occasional sequential zone violations for realism (Quick Win #2)
        seq_violation  = np.random.choice([0, 1], p=[0.95, 0.05])
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
            # NEW FEATURES (Quick Win #1)
            "geographic_impossibility":   geo_impossible,
            "distance_between_scans_km":  round(distance_km, 3),
            "velocity_km_per_min":        round(velocity, 3),
            "zone_clearance_mismatch":    zone_clear_mismatch,
            "department_zone_mismatch":   dept_zone_mismatch,
            "concurrent_session_detected": concurrent,
            "label":                      0
        })
    return records

# ============================================================
# GENERATE ANOMALOUS RECORDS
# ============================================================
def generate_anomalous(n):
    """Generate anomalous records with weighted distribution (Quick Win #4)."""
    records = []
    
    # Weighted distribution - badge cloning gets 25%, unauthorized zone 10%
    anomaly_weights = {
        "unusual_hour": 0.10,        # 10%
        "weekend_access": 0.10,      # 10%
        "restricted_area": 0.15,     # 15%
        "high_frequency": 0.10,      # 10%
        "badge_cloning": 0.25,       # 25% - CRITICAL (Quick Win #4)
        "location_mismatch": 0.20,   # 20% - IMPORTANT
        "unauthorized_zone": 0.10,   # 10% - NEW TYPE
    }
    
    # Calculate counts per type
    type_counts = {k: int(n * v) for k, v in anomaly_weights.items()}
    
    # Ensure we generate exactly n records
    remaining = n - sum(type_counts.values())
    type_counts["badge_cloning"] += remaining  # Give extras to badge cloning
    
    for atype, count in type_counts.items():
        for _ in range(count):
            record = generate_single_anomaly(atype)
            records.append(record)
    
    return records

def generate_single_anomaly(atype):
    """Generate a single anomaly record of given type."""
    user = user_profiles[np.random.randint(0, NUM_USERS)]
    clearance = user["clearance"]
    dept = user["department"]

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
        
        # NEW FEATURES
        distance_km = np.random.uniform(0.1, 0.5)
        velocity = distance_km / max(time_s, 1)
        geo_impossible = 0  # Possible but suspicious
        zone_clear_mismatch = np.random.choice([0, 1], p=[0.5, 0.5])
        dept_zone_mismatch = np.random.choice([0, 1], p=[0.4, 0.6])
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
        
        # NEW FEATURES
        distance_km = np.random.uniform(0.1, 0.5)
        velocity = distance_km / max(time_s, 1)
        geo_impossible = 0
        zone_clear_mismatch = np.random.choice([0, 1], p=[0.3, 0.7])
        dept_zone_mismatch = np.random.choice([0, 1], p=[0.4, 0.6])
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
        
        # NEW FEATURES
        distance_km = np.random.uniform(0.1, 0.5)
        velocity = distance_km / max(time_s, 1)
        geo_impossible = 0
        zone_clear_mismatch = 1  # Always clearance mismatch
        dept_zone_mismatch = np.random.choice([0, 1], p=[0.4, 0.6])
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
        
        # NEW FEATURES
        distance_km = np.random.uniform(0.1, 0.5)
        velocity = distance_km / max(time_s, 1)
        geo_impossible = 0
        zone_clear_mismatch = np.random.choice([0, 1], p=[0.5, 0.5])
        dept_zone_mismatch = np.random.choice([0, 1], p=[0.5, 0.5])
        concurrent = 0

    elif atype == "badge_cloning":
        # IMPROVED: Make badge cloning VERY distinct (Quick Win #4)
        hour       = np.random.randint(8, 18)             # normal hour
        day        = np.random.randint(0, 5)
        is_wknd    = 0
        freq       = np.random.randint(15, 35)            # HIGHER frequency
        time_s     = np.random.randint(0, 3)              # 0-2 min gap (IMPOSSIBLE)
        loc        = 0                                     # ALWAYS wrong location
        restr      = 1                                     # ALWAYS restricted
        role       = 1
        is_first   = 0
        seq_viol   = 1
        attempts   = np.random.randint(5, 12)             # MORE attempts
        
        # NEW FEATURES - badge cloning specific (Quick Win #1)
        distance_km = np.random.uniform(5, 100)           # 5-100 km apart
        velocity = distance_km / max(time_s, 0.1)
        geo_impossible = 1                                 # ALWAYS impossible
        zone_clear_mismatch = np.random.choice([0, 1], p=[0.3, 0.7])
        dept_zone_mismatch = np.random.choice([0, 1], p=[0.4, 0.6])
        concurrent = np.random.choice([0, 1], p=[0.3, 0.7])  # 70% concurrent

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
        
        # NEW FEATURES
        distance_km = np.random.uniform(0.5, 3)
        velocity = distance_km / max(time_s, 1)
        geo_impossible = 1 if velocity > 1.0 else 0
        zone_clear_mismatch = np.random.choice([0, 1], p=[0.5, 0.5])
        dept_zone_mismatch = np.random.choice([0, 1], p=[0.4, 0.6])
        concurrent = 0
    
    elif atype == "unauthorized_zone":
        # NEW anomaly type: legitimate user, wrong zone for their role (Quick Win #4)
        hour       = np.random.randint(8, 18)             # Normal hours
        day        = np.random.randint(0, 5)
        is_wknd    = 0
        freq       = np.random.randint(3, 10)             # Normal frequency
        time_s     = np.random.randint(30, 120)           # Normal time gap
        loc        = 0                                     # Wrong location
        restr      = 1                                     # Restricted area
        role       = 1                                     # Low clearance
        is_first   = np.random.choice([0, 1])
        seq_viol   = 1
        attempts   = np.random.randint(2, 6)
        
        # NEW FEATURES
        distance_km = np.random.uniform(0.1, 0.5)
        velocity = distance_km / max(time_s, 1)
        geo_impossible = 0                                 # Travel is possible
        zone_clear_mismatch = 1                            # ALWAYS clearance mismatch
        dept_zone_mismatch = 1                             # ALWAYS department mismatch
        concurrent = 0

    time_of_week   = day * 24 + hour
    hour_deviation = abs(hour - user["usual_hour_mean"]) / max(user["usual_hour_std"], 1)
    # Anomalies always deviate a lot from user's norm
    hour_deviation = max(hour_deviation, 3.0)

    return {
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
        # NEW FEATURES (Quick Win #1)
        "geographic_impossibility":   geo_impossible,
        "distance_between_scans_km":  round(distance_km, 3),
        "velocity_km_per_min":        round(velocity, 3),
        "zone_clearance_mismatch":    zone_clear_mismatch,
        "department_zone_mismatch":   dept_zone_mismatch,
        "concurrent_session_detected": concurrent,
        "label":                      1
    }

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
print(f"✅ Features : {len(df.columns)-1} (was 13, now 19)")
print(f"\n🎉 Done!")