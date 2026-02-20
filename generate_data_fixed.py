import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
import os

TOTAL_RECORDS = 500000
ANOMALY_RATIO = 0.07
RANDOM_SEED   = 42
OUTPUT_DIR    = "data/raw"

ZONES = ["engineering", "hr", "finance", "marketing", "logistics", "it", "server_room", "executive"]

ZONE_DISTANCES = {
    "engineering": {"engineering": 0.0, "hr": 0.3, "finance": 0.5, "marketing": 0.4, "logistics": 0.6, "it": 0.2, "server_room": 0.8, "executive": 0.9},
    "hr": {"engineering": 0.3, "hr": 0.0, "finance": 0.4, "marketing": 0.3, "logistics": 0.5, "it": 0.4, "server_room": 0.7, "executive": 0.6},
    "finance": {"engineering": 0.5, "hr": 0.4, "finance": 0.0, "marketing": 0.4, "logistics": 0.6, "it": 0.5, "server_room": 0.9, "executive": 0.3},
    "marketing": {"engineering": 0.4, "hr": 0.3, "finance": 0.4, "marketing": 0.0, "logistics": 0.4, "it": 0.3, "server_room": 0.8, "executive": 0.7},
    "logistics": {"engineering": 0.6, "hr": 0.5, "finance": 0.6, "marketing": 0.4, "logistics": 0.0, "it": 0.5, "server_room": 1.0, "executive": 0.9},
    "it": {"engineering": 0.2, "hr": 0.4, "finance": 0.5, "marketing": 0.3, "logistics": 0.5, "it": 0.0, "server_room": 0.6, "executive": 0.8},
    "server_room": {"engineering": 0.8, "hr": 0.7, "finance": 0.9, "marketing": 0.8, "logistics": 1.0, "it": 0.6, "server_room": 0.0, "executive": 0.4},
    "executive": {"engineering": 0.9, "hr": 0.6, "finance": 0.3, "marketing": 0.7, "logistics": 0.9, "it": 0.8, "server_room": 0.4, "executive": 0.0},
}

RESTRICTED_ZONES = {"server_room", "executive"}
CLEARANCE_REQUIREMENTS = {
    "server_room": 3,
    "executive": 3,
    "finance": 2,
}

FEATURE_COLS = [
    "hour", "day_of_week", "is_weekend", "access_frequency_24h",
    "time_since_last_access_min", "location_match", "role_level",
    "is_restricted_area", "is_first_access_today", "sequential_zone_violation",
    "access_attempt_count", "time_of_week", "hour_deviation_from_norm",
    "distance_between_scans_km", "velocity_km_per_min", "geographic_impossibility",
    "zone_clearance_mismatch", "department_zone_mismatch", "concurrent_session_detected"
]

os.makedirs(OUTPUT_DIR, exist_ok=True)
np.random.seed(RANDOM_SEED)


def build_user_profiles(num_users: int = 500) -> list[dict]:
    """
    Build user profiles with:
    - 5x more users (500 vs 100) for better diversity
    - Per-user hour_std variation (some people are rigid, others flexible)
    - Power-law activity_weight so a minority of users generate most access events
    """
    profiles = []
    for user_id in range(num_users):
        role_level = np.random.choice([1, 2, 3], p=[0.60, 0.30, 0.10])
        
        if role_level == 3:
            clearance = 3
            usual_hour = np.random.randint(7, 18)
            usual_days = [0, 1, 2, 3, 4, 5, 6]
            usual_hour_std = round(np.random.uniform(2.0, 4.0), 2)
        elif role_level == 2:
            clearance = 2
            usual_hour = np.random.randint(8, 10)
            usual_days = [0, 1, 2, 3, 4]
            usual_hour_std = round(np.random.uniform(1.0, 2.5), 2)
        else:
            clearance = 1
            usual_hour = np.random.randint(7, 12)
            usual_days = [0, 1, 2, 3, 4]
            usual_hour_std = round(np.random.uniform(0.5, 1.5), 2)

        department = np.random.choice(
            ["engineering", "hr", "finance", "marketing", "logistics", "it"],
            p=[0.25, 0.15, 0.15, 0.15, 0.15, 0.15]
        )
        usual_zone = department  # Users typically work in their department zone
        
        activity_weight = float(np.random.pareto(1.5) + 1.0)

        profiles.append({
            "user_id": user_id,
            "role_level": role_level,
            "clearance": clearance,
            "department": department,
            "usual_hour_mean": usual_hour,
            "usual_hour_std": usual_hour_std,
            "usual_days": usual_days,
            "usual_zone": usual_zone,
            "activity_weight": activity_weight,
        })
    return profiles


USER_PROFILES = build_user_profiles(500)
_PROFILE_WEIGHTS = np.array([p["activity_weight"] for p in USER_PROFILES], dtype=float)
_PROFILE_WEIGHTS /= _PROFILE_WEIGHTS.sum()


def _sample_user() -> dict:
    return USER_PROFILES[np.random.choice(len(USER_PROFILES), p=_PROFILE_WEIGHTS)]


def _normalize_zone(zone: str) -> str:
    """Normalize zone names - replace hyphens with underscores."""
    return zone.strip().lower().replace("-", "_")


def _time_of_week(day: int, hour: int) -> int:
    return day * 24 + hour


def _zone_clearance_req(zone: str) -> int:
    zone = _normalize_zone(zone)
    return CLEARANCE_REQUIREMENTS.get(zone, 1)


def _compute_dept_zone_mismatch(user: dict, current_zone: str, is_anomaly: bool) -> int:
    """
    Compute dept_zone_mismatch consistently from actual zone vs department.
    Normal records: allow 15% legitimate cross-department exceptions.
    Anomaly records: always reflect the true computed value.
    """
    current_zone = _normalize_zone(current_zone)
    mismatch = int(current_zone != user["department"])
    if mismatch and not is_anomaly:
        if np.random.random() < 0.15:
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
    role: int,
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
        "role_level": role,
        "is_restricted_area": restr,
        "is_first_access_today": is_first,
        "sequential_zone_violation": seq_viol,
        "access_attempt_count": attempts,
        "time_of_week": _time_of_week(day, hour),
        "hour_deviation_from_norm": round(hour_dev, 3),
        "geographic_impossibility": geo_impossible,
        "distance_between_scans_km": round(distance_km, 3),
        "velocity_km_per_min": round(velocity, 3),
        "zone_clearance_mismatch": zone_clear_mismatch,
        "department_zone_mismatch": dept_zone_mismatch,
        "concurrent_session_detected": concurrent,
        "label": label,
    }


def generate_normal(n: int, prev_zone_by_user: dict) -> list[dict]:
    """Generate normal access records."""
    records = []
    for _ in range(n):
        user = _sample_user()
        role = user["role_level"]
        user_id = user["user_id"]

        hour = int(np.clip(
            np.random.normal(user["usual_hour_mean"], user["usual_hour_std"]),
            6, 20
        ))
        day = np.random.choice(user["usual_days"])
        time_s = int(np.clip(np.random.exponential(45), 5, 300))
        loc = np.random.choice([1, 0], p=[0.85, 0.15])

        current_zone = (
            user["usual_zone"]
            if loc == 1
            else np.random.choice([z for z in ZONES if z != user["usual_zone"]])
        )
        current_zone = _normalize_zone(current_zone)

        prev_zone = prev_zone_by_user.get(user_id)
        distance_km = ZONE_DISTANCES[prev_zone][current_zone] if prev_zone is not None else 0.0
        velocity = distance_km / max(time_s, 1) if distance_km > 0 else 0.0
        prev_zone_by_user[user_id] = current_zone

        freq = int(np.clip(np.random.normal(3, 1.2), 1, 8))
        zone_clear_mismatch = int(user["clearance"] < _zone_clearance_req(current_zone))
        dept_zone_mismatch = _compute_dept_zone_mismatch(user, current_zone, is_anomaly=False)

        restr = (
            int(np.random.choice([1, 0], p=[0.30, 0.70]))
            if role == 3
            else int(np.random.choice([1, 0], p=[0.07, 0.93]))
            if role == 2
            else 0
        )

        is_first = np.random.choice([1, 0], p=[0.30, 0.70])
        seq_violation = 0
        attempt_count = np.random.choice([0, 1], p=[0.95, 0.05])

        records.append(_record_common(
            user, hour, day, freq, time_s, loc, restr, is_first, seq_violation,
            attempt_count, role, distance_km, velocity, 0,
            zone_clear_mismatch, dept_zone_mismatch, 0, 0
        ))
    return records


def generate_single_anomaly(atype: str, prev_zone_by_user: dict) -> dict:
    """Generate a single anomalous record."""
    user = _sample_user()
    user_id = user["user_id"]

    if atype == "badge_cloning":
        hour = np.random.randint(8, 18)
        day = np.random.randint(0, 5)
        freq = np.random.randint(15, 35)
        time_s = np.random.randint(0, 3)

        distant_zones = sorted(
            [z for z in ZONES if z != user["usual_zone"]],
            key=lambda z: ZONE_DISTANCES[user["usual_zone"]][z],
            reverse=True,
        )
        current_zone = _normalize_zone(distant_zones[np.random.randint(0, min(3, len(distant_zones)))])

        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = float(np.random.uniform(5, 100))
        velocity = distance_km / max(time_s, 0.1)
        prev_zone_by_user[user_id] = current_zone

        zone_clear_mismatch = int(user["clearance"] < _zone_clearance_req(current_zone))
        dept_zone_mismatch = _compute_dept_zone_mismatch(user, current_zone, is_anomaly=True)

        return _record_common(
            user, hour, day, freq, time_s,
            loc=0, restr=1, is_first=0, seq_viol=1,
            attempts=np.random.randint(5, 12), role=user["role_level"],
            distance_km=distance_km, velocity=velocity, geo_impossible=1,
            zone_clear_mismatch=zone_clear_mismatch,
            dept_zone_mismatch=dept_zone_mismatch,
            concurrent=int(np.random.choice([0, 1], p=[0.3, 0.7])),
            label=1,
        )

    if atype == "unauthorized_zone":
        hour = np.random.randint(8, 18)
        day = np.random.randint(0, 5)
        freq = np.random.randint(3, 10)
        time_s = np.random.randint(30, 120)

        restricted_targets = [z for z in ZONES if _zone_clearance_req(z) > user["clearance"]]
        current_zone = _normalize_zone(
            np.random.choice(restricted_targets)
            if restricted_targets
            else np.random.choice([z for z in ZONES if z != user["usual_zone"]])
        )

        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
        velocity = distance_km / max(time_s, 1)
        prev_zone_by_user[user_id] = current_zone

        zone_clear_mismatch = int(user["clearance"] < _zone_clearance_req(current_zone))
        dept_zone_mismatch = _compute_dept_zone_mismatch(user, current_zone, is_anomaly=True)

        return _record_common(
            user, hour, day, freq, time_s,
            loc=0, restr=1,
            is_first=int(np.random.choice([0, 1])),
            seq_viol=1, attempts=np.random.randint(2, 6),
            role=user["role_level"],
            distance_km=distance_km, velocity=velocity,
            geo_impossible=int(velocity > 1.0),
            zone_clear_mismatch=zone_clear_mismatch,
            dept_zone_mismatch=dept_zone_mismatch,
            concurrent=0,
            label=1,
        )

    if atype == "restricted_area":
        hour = int(np.random.choice(list(range(0, 5)) + list(range(22, 24))))
        day = np.random.randint(0, 7)
        freq = np.random.randint(5, 15)
        time_s = np.random.randint(2, 20)

        current_zone = _normalize_zone(np.random.choice(list(RESTRICTED_ZONES)))

        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
        velocity = distance_km / max(time_s, 1)
        prev_zone_by_user[user_id] = current_zone

        zone_clear_mismatch = int(user["clearance"] < _zone_clearance_req(current_zone))
        dept_zone_mismatch = _compute_dept_zone_mismatch(user, current_zone, is_anomaly=True)

        return _record_common(
            user, int(hour), int(day), int(freq), int(time_s),
            loc=0, restr=1, is_first=0, seq_viol=1,
            attempts=int(np.random.randint(3, 8)),
            role=user["role_level"],
            distance_km=distance_km, velocity=velocity,
            geo_impossible=int(velocity > 1.0),
            zone_clear_mismatch=zone_clear_mismatch,
            dept_zone_mismatch=dept_zone_mismatch,
            concurrent=0,
            label=1,
        )

    if atype == "high_frequency":
        hour = np.random.randint(8, 18)
        day = np.random.randint(0, 5)
        freq = np.random.randint(25, 40)
        time_s = np.random.randint(1, 5)

        current_zone = _normalize_zone(
            user["usual_zone"]
            if np.random.random() < 0.6
            else np.random.choice(ZONES)
        )

        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
        velocity = distance_km / max(time_s, 1)
        prev_zone_by_user[user_id] = current_zone

        zone_clear_mismatch = int(user["clearance"] < _zone_clearance_req(current_zone))
        dept_zone_mismatch = _compute_dept_zone_mismatch(user, current_zone, is_anomaly=True)

        return _record_common(
            user, int(hour), int(day), int(freq), int(time_s),
            loc=int(np.random.choice([0, 1], p=[0.7, 0.3])),
            restr=int(np.random.choice([0, 1], p=[0.4, 0.6])),
            is_first=0, seq_viol=1,
            attempts=int(np.random.randint(3, 8)),
            role=user["role_level"],
            distance_km=distance_km, velocity=velocity,
            geo_impossible=int(velocity > 1.0),
            zone_clear_mismatch=zone_clear_mismatch,
            dept_zone_mismatch=dept_zone_mismatch,
            concurrent=0,
            label=1,
        )

    if atype == "location_mismatch":
        hour = int(np.random.choice(list(range(0, 6)) + list(range(21, 24))))
        day = np.random.randint(0, 7)
        freq = np.random.randint(8, 18)
        time_s = np.random.randint(2, 15)

        far_zones = [z for z in ZONES if ZONE_DISTANCES[user["usual_zone"]][z] >= 0.5]
        current_zone = _normalize_zone(
            np.random.choice(far_zones) if far_zones else np.random.choice(ZONES)
        )

        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
        velocity = distance_km / max(time_s, 1)
        prev_zone_by_user[user_id] = current_zone

        zone_clear_mismatch = int(user["clearance"] < _zone_clearance_req(current_zone))
        dept_zone_mismatch = _compute_dept_zone_mismatch(user, current_zone, is_anomaly=True)

        return _record_common(
            user, int(hour), int(day), int(freq), int(time_s),
            loc=0, restr=1, is_first=0, seq_viol=1,
            attempts=int(np.random.randint(2, 5)),
            role=user["role_level"],
            distance_km=distance_km, velocity=velocity,
            geo_impossible=int(velocity > 1.0),
            zone_clear_mismatch=zone_clear_mismatch,
            dept_zone_mismatch=dept_zone_mismatch,
            concurrent=0,
            label=1,
        )

    # unusual_hour or weekend_access
    is_unusual_hour = atype == "unusual_hour"
    hour = int(np.random.choice(list(range(0, 4)) if is_unusual_hour else list(range(0, 6))))
    day = int(np.random.randint(0, 7) if is_unusual_hour else np.random.choice([5, 6]))
    freq = np.random.randint(8, 20) if is_unusual_hour else np.random.randint(10, 25)
    time_s = np.random.randint(2, 20) if is_unusual_hour else np.random.randint(2, 15)

    current_zone = _normalize_zone(user["usual_zone"])

    prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
    distance_km = ZONE_DISTANCES[prev_zone][current_zone]
    velocity = distance_km / max(time_s, 1)
    prev_zone_by_user[user_id] = current_zone

    zone_clear_mismatch = int(user["clearance"] < _zone_clearance_req(current_zone))
    dept_zone_mismatch = _compute_dept_zone_mismatch(user, current_zone, is_anomaly=True)

    return _record_common(
        user, int(hour), int(day), int(freq), int(time_s),
        loc=0,
        restr=int(np.random.choice([0, 1], p=[0.3, 0.7])),
        is_first=0, seq_viol=1,
        attempts=int(np.random.randint(2, 6)),
        role=user["role_level"],
        distance_km=distance_km, velocity=velocity,
        geo_impossible=int(velocity > 1.0),
        zone_clear_mismatch=zone_clear_mismatch,
        dept_zone_mismatch=dept_zone_mismatch,
        concurrent=0,
        label=1,
    )


def generate_anomalous(n: int, prev_zone_by_user: dict) -> list[dict]:
    """Generate anomalous records with weighted distribution."""
    anomaly_weights = {
        "unusual_hour": 0.10,
        "weekend_access": 0.10,
        "restricted_area": 0.15,
        "high_frequency": 0.10,
        "badge_cloning": 0.25,
        "location_mismatch": 0.20,
        "unauthorized_zone": 0.10,
    }

    type_counts = {k: int(n * v) for k, v in anomaly_weights.items()}
    remaining = n - sum(type_counts.values())
    type_counts["badge_cloning"] += remaining

    records = []
    for atype, count in type_counts.items():
        for _ in range(count):
            records.append(generate_single_anomaly(atype, prev_zone_by_user))
    return records


def main() -> None:
    """Generate synthetic access records and persist train/test/raw datasets."""
    normal_count = int(TOTAL_RECORDS * (1 - ANOMALY_RATIO))
    anomaly_count = TOTAL_RECORDS - normal_count
    print(f"Generating {normal_count} normal + {anomaly_count} anomalous records...")
    print(f"User profiles: {len(USER_PROFILES)}")

    prev_zone_by_user: dict = {}

    normal_records = generate_normal(normal_count, prev_zone_by_user)
    anomaly_records = generate_anomalous(anomaly_count, prev_zone_by_user)
    df = pd.DataFrame(normal_records + anomaly_records)

    df = df[FEATURE_COLS + ["label"]].sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)

    access_data_path = os.path.join(OUTPUT_DIR, "access_data.csv")
    train_path = os.path.join(OUTPUT_DIR, "train.csv")
    test_path = os.path.join(OUTPUT_DIR, "test.csv")

    df.to_csv(access_data_path, index=False)
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=RANDOM_SEED, stratify=df["label"])
    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"Total    : {len(df)}")
    print(f"Normal   : {int((df['label'] == 0).sum())}")
    print(f"Anomalous: {int((df['label'] == 1).sum())}")
    print(f"Features : {len(FEATURE_COLS)}")
    print("Done!")


if __name__ == "__main__":
    main()
