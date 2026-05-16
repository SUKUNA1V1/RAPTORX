import os
import argparse
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

DEFAULT_TOTAL_RECORDS = 500_000
DEFAULT_ANOMALY_RATIO = 0.05  # Reduced from 0.07 for more realistic overlap
DEFAULT_RANDOM_SEED = 42
OUTPUT_DIR = "data/raw"

# University departments mapping
DEPARTMENTS = {
    "computer_science": ["cs_lab", "cs_office", "cs_servers_room", "cs_library"],
    "economy": ["economy_library", "economy_office"],
    "business": ["business_office", "business_library"],
    "research_labs": ["research_lab", "research_office", "research_storage"],
    "social_sciences": ["social_sciences_library", "social_sciences_office"],
    "sports": ["sports_GYM", "sports_office", "sports_storage", "sports_library"],
}

SHARED_ZONES = ["main_entrance", "admin_building", "security_office", "restaurant", "parking_lot_student", "parking_lot_staff"]

ZONES = []
for dept_zones in DEPARTMENTS.values():
    ZONES.extend(dept_zones)
ZONES.extend(SHARED_ZONES)

RESTRICTED_ZONES = {"cs_servers_room", "research_lab", "research_office", "research_storage", "security_office"}
RESEARCHER_ONLY_ZONES = {"research_lab", "research_office", "research_storage"}

CLEARANCE_REQUIREMENTS = {
    "cs_lab": 2,
    "cs_office": 2,
    "cs_servers_room": 3,
    "cs_library": 1,
    "economy_library": 1,
    "economy_office": 2,
    "business_office": 2,
    "business_library": 1,
    "research_lab": 3,
    "research_office": 3,
    "research_storage": 3,
    "social_sciences_library": 1,
    "social_sciences_office": 2,
    "sports_GYM": 1,
    "sports_office": 2,
    "sports_storage": 2,
    "sports_library": 1,
    "main_entrance": 1,
    "admin_building": 2,
    "security_office": 3,
    "restaurant": 1,
    "parking_lot_student": 1,
    "parking_lot_staff": 2,
}

DEFAULT_NUM_USERS = 1000  # IMPROVED: University-scale user base

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
    "hour_deviation_from_norm",
    "geographic_impossibility",
    "distance_between_scans_km",
    "velocity_km_per_min",
    "zone_clearance_mismatch",
    "department_zone_mismatch",
    "concurrent_session_detected",
]

os.makedirs(OUTPUT_DIR, exist_ok=True)

PROFILE_DEFAULTS = {
    "dev": 0.05,    # Reduced from 0.07 for more challenging data
    "prod": 0.012,  # Reduced from 0.015 for production realism
}


def _build_zone_distances() -> dict[str, dict[str, float]]:
    """
    Generate zone distances based on realistic departmental clustering.
    Each department occupies a geographic cluster, zones within department are close.
    """
    np.random.seed(42)
    
    # Department cluster centers (simulated building layout)
    dept_centers = {
        "computer_science": (2.0, 2.0),
        "economy": (7.0, 2.0),
        "business": (8.5, 3.5),
        "research_labs": (7.0, 8.0),
        "social_sciences": (2.0, 7.0),
        "sports": (5.0, 9.5),
    }
    
    # Shared zones cluster (central area)
    shared_centers = {
        "main_entrance": (5.0, 5.0),
        "admin_building": (5.2, 5.2),
        "security_office": (4.8, 4.8),
        "restaurant": (5.0, 5.5),
        "parking_lot_student": (0.5, 0.5),
        "parking_lot_staff": (9.5, 9.5),
    }
    
    # Assign coordinates: each zone is near its department center
    coords = {}
    
    # Departmental zones - place within 1km of department center
    for dept, dept_zones in DEPARTMENTS.items():
        center_x, center_y = dept_centers[dept]
        for zone in dept_zones:
            offset_x = np.random.uniform(-0.8, 0.8)
            offset_y = np.random.uniform(-0.8, 0.8)
            coords[zone] = (center_x + offset_x, center_y + offset_y)
    
    # Shared zones - place at fixed central/edge locations
    for zone, (x, y) in shared_centers.items():
        if zone in SHARED_ZONES:
            coords[zone] = (x, y)
    
    # Calculate Euclidean distances between all zone pairs
    out: dict[str, dict[str, float]] = {}
    for a in ZONES:
        out[a] = {}
        for b in ZONES:
            if a == b:
                out[a][b] = 0.0
            else:
                ax, ay = coords[a]
                bx, by = coords[b]
                # Distance in km (scale: 1 unit = ~1km)
                out[a][b] = round(float(np.hypot(ax - bx, ay - by)), 3)
    
    return out


ZONE_DISTANCES = {}


def build_user_profiles(num_users: int = DEFAULT_NUM_USERS) -> list[dict]:
    """Build user profiles for university: students, teachers, researchers, admin (low/high), security"""
    profiles = []
    dept_list = list(DEPARTMENTS.keys())
    
    role_config = {
        "students": {"distribution": 0.50, "clearance": 1, "hours": (8, 17), "days": [0, 1, 2, 3, 4, 5, 6]},
        "teachers": {"distribution": 0.15, "clearance": 2, "hours": (7, 18), "days": [0, 1, 2, 3, 4]},
        "researchers": {"distribution": 0.10, "clearance": 3, "hours": (0, 24), "days": [0, 1, 2, 3, 4, 5, 6]},
        "admin_low": {"distribution": 0.10, "clearance": 2, "hours": (8, 17), "days": [0, 1, 2, 3, 4]},
        "admin_high": {"distribution": 0.08, "clearance": 3, "hours": (7, 22), "days": [0, 1, 2, 3, 4, 5, 6]},
        "security": {"distribution": 0.07, "clearance": 3, "hours": (0, 24), "days": [0, 1, 2, 3, 4, 5, 6]},
    }
    
    role_list = list(role_config.keys())
    user_count = 0
    
    for role_name, role_data in role_config.items():
        count = int(num_users * role_data["distribution"])
        for _ in range(count):
            department = str(np.random.choice(dept_list)) if role_name != "researchers" else "research_labs"
            usual_zone = str(np.random.choice(DEPARTMENTS[department]))
            
            hours_start, hours_end = role_data["hours"]
            usual_hour = int(np.random.randint(hours_start, hours_end))
            usual_hour_std = round(float(np.random.uniform(1.0, 3.0)), 2)
            activity_weight = float(np.random.pareto(1.2) + 1.0)
            
            profiles.append({
                "user_id": user_count,
                "role": role_name,
                "clearance": role_data["clearance"],
                "department": department,
                "usual_hour_mean": usual_hour,
                "usual_hour_std": usual_hour_std,
                "usual_days": role_data["days"],
                "usual_zone": usual_zone,
                "activity_weight": activity_weight,
            })
            user_count += 1
    
    return profiles


USER_PROFILES = []
_PROFILE_WEIGHTS = np.array([], dtype=float)


def initialize_generation_state(seed: int, num_users: int) -> None:
    global ZONE_DISTANCES, USER_PROFILES, _PROFILE_WEIGHTS

    np.random.seed(seed)
    ZONE_DISTANCES = _build_zone_distances()
    USER_PROFILES = build_user_profiles(num_users)
    _PROFILE_WEIGHTS = np.array([p["activity_weight"] for p in USER_PROFILES], dtype=float)
    _PROFILE_WEIGHTS /= _PROFILE_WEIGHTS.sum()


initialize_generation_state(seed=DEFAULT_RANDOM_SEED, num_users=DEFAULT_NUM_USERS)


def _sample_user() -> dict:
    return USER_PROFILES[int(np.random.choice(len(USER_PROFILES), p=_PROFILE_WEIGHTS))]


def _time_of_week(day: int, hour: int) -> int:
    return day * 24 + hour


def _zone_clearance_req(zone: str) -> int:
    return CLEARANCE_REQUIREMENTS.get(zone, 1)


def _compute_dept_zone_mismatch(user: dict, current_zone: str, is_anomaly: bool) -> int:
    mismatch = int(current_zone != user["department"])
    if mismatch and not is_anomaly and np.random.random() < 0.15:
        mismatch = 0
    return mismatch


def _record_common(
    user: dict,
    hour: int,
    day: int,
    freq: int,
    time_s: int,
    loc: int,
    restr: int,
    is_first: int,
    seq_viol: int,
    attempts: int,
    clearance: int,
    distance_km: float,
    velocity: float,
    geo_impossible: int,
    zone_clear_mismatch: int,
    dept_zone_mismatch: int,
    concurrent: int,
    label: int,
) -> dict:
    hour_dev = abs(hour - user["usual_hour_mean"]) / max(user["usual_hour_std"], 1)
    return {
        "hour": hour,
        "day_of_week": day,
        "is_weekend": 1 if day >= 5 else 0,
        "access_frequency_24h": freq,
        "time_since_last_access_min": time_s,
        "location_match": loc,
        "role_level": clearance,
        "is_restricted_area": restr,
        "is_first_access_today": is_first,
        "sequential_zone_violation": seq_viol,
        "access_attempt_count": attempts,
        "time_of_week": _time_of_week(day, hour),
        "hour_deviation_from_norm": round(float(hour_dev), 3),
        "geographic_impossibility": geo_impossible,
        "distance_between_scans_km": round(float(distance_km), 3),
        "velocity_km_per_min": round(float(velocity), 3),
        "zone_clearance_mismatch": zone_clear_mismatch,
        "department_zone_mismatch": dept_zone_mismatch,
        "concurrent_session_detected": concurrent,
        "label": label,
    }


def generate_normal(n: int, prev_zone_by_user: dict[int, str]) -> list[dict]:
    records = []

    for _ in range(n):
        user = _sample_user()
        clearance = int(user["clearance"])
        user_id = int(user["user_id"])

        hour = int(np.clip(np.random.normal(user["usual_hour_mean"], user["usual_hour_std"]), 6, 23))
        day = int(np.random.choice(user["usual_days"]))
        loc = int(np.random.choice([1, 0], p=[0.90, 0.10]))
        time_s = int(np.random.randint(5, 240))
        freq = int(np.clip(np.random.normal(3, 1.2), 1, 8))

        current_zone = user["usual_zone"] if loc == 1 else str(np.random.choice([z for z in ZONES if z != user["usual_zone"]]))

        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
        velocity = distance_km / max(time_s, 1)
        prev_zone_by_user[user_id] = current_zone

        zone_clear_mismatch = int(user["clearance"] < _zone_clearance_req(current_zone))
        dept_zone_mismatch = _compute_dept_zone_mismatch(user, current_zone, is_anomaly=False)

        # Restricted area access probability by role
        is_restricted = current_zone in RESTRICTED_ZONES
        if is_restricted and clearance < 3:
            restr = 1  # Violation
        else:
            restr = int(np.random.choice([1, 0], p=[0.10, 0.90])) if is_restricted else 0

        records.append(
            _record_common(
                user=user,
                hour=hour,
                day=day,
                freq=freq,
                time_s=time_s,
                loc=loc,
                restr=restr,
                is_first=int(np.random.choice([1, 0], p=[0.08, 0.92])),
                seq_viol=0,
                attempts=int(np.random.choice([0, 1], p=[0.95, 0.05])),
                clearance=clearance,
                distance_km=distance_km,
                velocity=velocity,
                geo_impossible=int(velocity > 1.0),
                zone_clear_mismatch=zone_clear_mismatch,
                dept_zone_mismatch=dept_zone_mismatch,
                concurrent=0,
                label=0,
            )
        )
    return records


def generate_single_anomaly(atype: str, prev_zone_by_user: dict[int, str]) -> dict:
    user = _sample_user()
    user_id = int(user["user_id"])

    if atype == "badge_cloning":
        # Badge cloning: blend off-hours and work hours (more realistic)
        # 70% off-hours, 30% during work hours to overlap with legitimate activity
        if np.random.random() < 0.7:
            hour = int(np.random.choice(list(range(0, 6)) + list(range(20, 24))))  # Late night/early morning
        else:
            hour = int(np.random.choice(list(range(10, 22))))  # Work hours
        day = int(np.random.randint(0, 7))  # Any day
        freq, time_s = int(np.random.randint(10, 25)), int(np.random.randint(15, 45))
        distant_zones = sorted([z for z in ZONES if z != user["usual_zone"]], key=lambda z: ZONE_DISTANCES[user["usual_zone"]][z], reverse=True)
        current_zone = str(distant_zones[int(np.random.randint(0, min(3, len(distant_zones))))])
        distance_km = float(np.random.uniform(2, 8))  # More realistic distances
    elif atype == "unauthorized_zone":
        # Unauthorized zone: some off-hours, some during work (employees sometimes work late)
        if np.random.random() < 0.6:
            hour = int(np.random.choice(list(range(0, 6)) + list(range(20, 24))))
        else:
            hour = int(np.random.choice(list(range(8, 20))))
        day = int(np.random.randint(0, 7))
        freq, time_s = int(np.random.randint(2, 8)), int(np.random.randint(45, 150))
        restricted_targets = [z for z in ZONES if _zone_clearance_req(z) > user["clearance"]]
        current_zone = str(np.random.choice(restricted_targets if restricted_targets else [z for z in ZONES if z != user["usual_zone"]]))
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
    elif atype == "restricted_area":
        # Restricted area: mostly off-hours but some during late work
        if np.random.random() < 0.75:
            hour = int(np.random.choice(list(range(0, 6)) + list(range(21, 24))))
        else:
            hour = int(np.random.choice(list(range(18, 22))))
        day = int(np.random.randint(0, 7))
        freq, time_s = int(np.random.randint(3, 12)), int(np.random.randint(5, 40))
        current_zone = str(np.random.choice(list(RESTRICTED_ZONES)))
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
    elif atype == "high_frequency":
        # High frequency: can happen during business hours (busy day) or off-hours
        if np.random.random() < 0.5:
            hour = int(np.random.choice(list(range(0, 6)) + list(range(20, 24))))
        else:
            hour = int(np.random.choice(list(range(9, 18))))  # Busy business hours
        day = int(np.random.randint(0, 7))
        freq, time_s = int(np.random.randint(18, 35)), int(np.random.randint(20, 80))
        current_zone = user["usual_zone"] if np.random.random() < 0.7 else str(np.random.choice(ZONES))
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
    elif atype == "location_mismatch":
        # Location mismatch: blend work and off-hours
        if np.random.random() < 0.6:
            hour = int(np.random.choice(list(range(0, 6)) + list(range(20, 24))))
        else:
            hour = int(np.random.choice(list(range(8, 20))))
        day = int(np.random.randint(0, 7))
        freq, time_s = int(np.random.randint(6, 16)), int(np.random.randint(5, 30))
        far_zones = [z for z in ZONES if ZONE_DISTANCES[user["usual_zone"]][z] >= 0.3]  # Slightly lower threshold
        current_zone = str(np.random.choice(far_zones if far_zones else ZONES))
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
    elif atype == "data_exfiltration":
        # Data exfiltration: more common off-hours but some during business (e.g., lunch time)
        if np.random.random() < 0.8:
            hour = int(np.random.choice(list(range(0, 6)) + list(range(21, 24))))
        else:
            hour = int(np.random.choice(list(range(12, 15))))  # Lunch time sometimes
        day = int(np.random.randint(0, 7))
        freq = int(np.random.randint(10, 22))  # Slightly lower frequency for subtle patterns
        time_s = int(np.random.randint(40, 150))  # Longer sessions
        current_zone = str(np.random.choice(list(RESTRICTED_ZONES)))
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
    else:  # unusual_hour / weekend_access - more subtle
        is_unusual_hour = atype == "unusual_hour"
        if is_unusual_hour:
            hour = int(np.random.choice(list(range(0, 7)) + list(range(21, 24))))  # Extended off-hours
        else:
            hour = int(np.random.choice(list(range(8, 22))))  # Weekends often have daytime access
        day = int(np.random.randint(0, 7) if is_unusual_hour else np.random.choice([5, 6]))
        freq = int(np.random.randint(6, 16))  # Lower frequency for subtlety
        time_s = int(np.random.randint(5, 30))
        current_zone = user["usual_zone"]
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]

    velocity = distance_km / max(time_s, 0.1)
    prev_zone_by_user[user_id] = current_zone

    zone_clear_mismatch = int(user["clearance"] < _zone_clearance_req(current_zone))
    dept_zone_mismatch = _compute_dept_zone_mismatch(user, current_zone, is_anomaly=True)

    # Make anomaly indicators HIGHLY probabilistic (more realistic overlap)
    # Most anomalies have just 1-2 suspicious features, not all of them
    restr_prob = 0.40  # Only 40% have restricted access (not 75%)
    seq_viol_prob = 0.35  # Only 35% have sequential violation (not 70%)
    attempts_range = (0, 3)  # Very few extra attempts
    loc_match_prob = 0.65  # 65% match location (looks normal!)

    return _record_common(
        user=user,
        hour=hour,
        day=day,
        freq=freq,
        time_s=time_s,
        loc=int(np.random.choice([0, 1], p=[1-loc_match_prob, loc_match_prob])),  # Mostly matches
        restr=int(np.random.choice([0, 1], p=[1-restr_prob, restr_prob])),
        is_first=int(np.random.choice([0, 1], p=[0.70, 0.30])),  # Often first access
        seq_viol=int(np.random.choice([0, 1], p=[1-seq_viol_prob, seq_viol_prob])),
        attempts=int(np.random.randint(attempts_range[0], attempts_range[1])),
        clearance=int(user["clearance"]),
        distance_km=distance_km,
        velocity=velocity,
        geo_impossible=int(velocity > 1.5),  # Higher threshold (easier to pass)
        zone_clear_mismatch=zone_clear_mismatch,
        dept_zone_mismatch=dept_zone_mismatch,
        concurrent=int(np.random.choice([0, 1], p=[0.90, 0.10])),  # Rarely concurrent
        label=1,
    )


def generate_anomalous(n: int, prev_zone_by_user: dict[int, str]) -> list[dict]:
    anomaly_weights = {
        "unusual_hour": 0.08,
        "weekend_access": 0.08,
        "restricted_area": 0.12,
        "high_frequency": 0.08,
        "badge_cloning": 0.23,
        "location_mismatch": 0.15,
        "unauthorized_zone": 0.08,
        "data_exfiltration": 0.18,  # NEW: Data theft patterns (off-hours, frequent server room access)
    }

    type_counts = {k: int(n * v) for k, v in anomaly_weights.items()}
    type_counts["badge_cloning"] += n - sum(type_counts.values())

    records = []
    for atype, count in type_counts.items():
        for _ in range(count):
            records.append(generate_single_anomaly(atype, prev_zone_by_user))
    return records


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic RaptorX access data")
    parser.add_argument("--profile", choices=["dev", "prod", "custom"], default=os.getenv("RAPTORX_DATA_PROFILE", "dev"))
    parser.add_argument("--total-records", type=int, default=None)
    parser.add_argument("--anomaly-ratio", type=float, default=None)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--num-users", type=int, default=None)
    return parser.parse_args()


def main() -> None:
    args = _parse_args()

    total_records = args.total_records or int(os.getenv("RAPTORX_TOTAL_RECORDS", DEFAULT_TOTAL_RECORDS))
    seed = args.seed or int(os.getenv("RAPTORX_RANDOM_SEED", DEFAULT_RANDOM_SEED))
    num_users = args.num_users or int(os.getenv("RAPTORX_NUM_USERS", DEFAULT_NUM_USERS))

    env_ratio = os.getenv("RAPTORX_ANOMALY_RATIO")
    if args.anomaly_ratio is not None:
        anomaly_ratio = args.anomaly_ratio
    elif env_ratio is not None:
        anomaly_ratio = float(env_ratio)
    else:
        anomaly_ratio = PROFILE_DEFAULTS.get(args.profile, DEFAULT_ANOMALY_RATIO)

    if not (0.0 < anomaly_ratio < 0.5):
        raise ValueError(f"Invalid anomaly ratio {anomaly_ratio}; expected 0 < ratio < 0.5")
    if total_records < 10_000:
        raise ValueError(f"Invalid total records {total_records}; expected >= 10000")
    if num_users < 10:
        raise ValueError(f"Invalid num users {num_users}; expected >= 10")

    initialize_generation_state(seed=seed, num_users=num_users)

    normal_count = int(total_records * (1 - anomaly_ratio))
    anomaly_count = total_records - normal_count

    print(f"Generating {normal_count} normal + {anomaly_count} anomalous records...")
    print(f"Profile      : {args.profile}")
    print(f"Anomaly ratio: {anomaly_ratio:.4f} ({anomaly_ratio * 100:.2f}%)")
    print(f"Seed         : {seed}")
    print(f"User profiles: {len(USER_PROFILES)}")

    prev_zone_by_user: dict[int, str] = {}
    normal_records = generate_normal(normal_count, prev_zone_by_user)
    anomaly_records = generate_anomalous(anomaly_count, prev_zone_by_user)

    df = pd.DataFrame(normal_records + anomaly_records)
    df = df[FEATURE_COLS + ["label"]].sample(frac=1, random_state=seed).reset_index(drop=True)

    access_data_path = os.path.join(OUTPUT_DIR, "access_data.csv")
    train_path = os.path.join(OUTPUT_DIR, "train.csv")
    test_path = os.path.join(OUTPUT_DIR, "test.csv")

    df.to_csv(access_data_path, index=False)

    train_df, test_df = train_test_split(
        df, test_size=0.2, random_state=seed, stratify=df["label"]
    )
    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"Total    : {len(df)}")
    print(f"Normal   : {int((df['label'] == 0).sum())}")
    print(f"Anomalous: {int((df['label'] == 1).sum())}")
    print(f"Features : {len(FEATURE_COLS)}")
    print("Done!")


if __name__ == "__main__":
    main()
