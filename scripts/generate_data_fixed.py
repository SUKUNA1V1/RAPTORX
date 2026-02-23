import os
import argparse
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

DEFAULT_TOTAL_RECORDS = 500_000
DEFAULT_ANOMALY_RATIO = 0.07
DEFAULT_RANDOM_SEED = 42
OUTPUT_DIR = "data/raw"

RESTRICTED_ZONES = {"server_room", "executive"}
CLEARANCE_REQUIREMENTS = {
    "server_room": 3,
    "executive": 3,
    "finance": 2,
}

ZONES = ["engineering", "hr", "finance", "marketing", "logistics", "it", "server_room", "executive"]
DEFAULT_NUM_USERS = 500  # IMPROVED: 5x more users for better diversity and generalization

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
    "dev": 0.07,
    "prod": 0.015,
}


def _build_zone_distances() -> dict[str, dict[str, float]]:
    coords = {z: (np.random.uniform(0, 10), np.random.uniform(0, 10)) for z in ZONES}
    out: dict[str, dict[str, float]] = {}
    for a in ZONES:
        out[a] = {}
        for b in ZONES:
            if a == b:
                out[a][b] = 0.0
            else:
                ax, ay = coords[a]
                bx, by = coords[b]
                out[a][b] = round(float(np.hypot(ax - bx, ay - by)), 3)
    return out


ZONE_DISTANCES = {}


def build_user_profiles(num_users: int = DEFAULT_NUM_USERS) -> list[dict]:
    """IMPROVED: Enhanced user profiles with better role-based distributions"""
    profiles = []
    departments = ["engineering", "hr", "finance", "marketing", "logistics", "it"]

    for user_id in range(num_users):
        # IMPROVED: Better role distribution (more realistic organizational hierarchy)
        role_level = int(np.random.choice([1, 2, 3], p=[0.70, 0.20, 0.10]))
        clearance = role_level
        department = str(np.random.choice(departments))
        usual_zone = department

        if role_level == 3:  # Executives/Senior staff - most variable hours
            usual_hour = int(np.random.randint(6, 19))
            usual_days = [0, 1, 2, 3, 4, 5, 6]
            # IMPROVED: More sophisticated variation for senior roles
            usual_hour_std = round(float(np.random.uniform(2.5, 5.5)), 2)
        elif role_level == 2:  # Mid-level - moderate variation
            usual_hour = int(np.random.randint(7, 11))
            usual_days = [0, 1, 2, 3, 4]
            # IMPROVED: Better calibration for mid-level roles
            usual_hour_std = round(float(np.random.uniform(1.5, 3.5)), 2)
        else:  # Junior/Regular staff - most consistent
            usual_hour = int(np.random.randint(7, 12))
            usual_days = [0, 1, 2, 3, 4]
            # IMPROVED: Better consistency for junior roles
            usual_hour_std = round(float(np.random.uniform(0.7, 2.0)), 2)

        # IMPROVED: Better power-law distribution for realistic activity patterns
        # Most users have low activity, few have high activity (like real organizations)
        activity_weight = float(np.random.pareto(1.2) + 1.0)

        profiles.append(
            {
                "user_id": user_id,
                "role_level": role_level,
                "clearance": clearance,
                "department": department,
                "usual_hour_mean": usual_hour,
                "usual_hour_std": usual_hour_std,
                "usual_days": usual_days,
                "usual_zone": usual_zone,
                "activity_weight": activity_weight,
            }
        )
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
        role = int(user["role_level"])
        user_id = int(user["user_id"])

        hour = int(np.clip(np.random.normal(user["usual_hour_mean"], user["usual_hour_std"]), 6, 20))
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

        restr = (
            int(np.random.choice([1, 0], p=[0.30, 0.70])) if role == 3
            else int(np.random.choice([1, 0], p=[0.07, 0.93])) if role == 2
            else 0
        )

        records.append(
            _record_common(
                user=user,
                hour=hour,
                day=day,
                freq=freq,
                time_s=time_s,
                loc=loc,
                restr=restr,
                is_first=int(np.random.choice([1, 0], p=[0.30, 0.70])),
                seq_viol=0,
                attempts=int(np.random.choice([0, 1], p=[0.95, 0.05])),
                role=role,
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
        hour, day = int(np.random.randint(8, 18)), int(np.random.randint(0, 5))
        freq, time_s = int(np.random.randint(15, 35)), int(np.random.randint(0, 3))
        distant_zones = sorted([z for z in ZONES if z != user["usual_zone"]], key=lambda z: ZONE_DISTANCES[user["usual_zone"]][z], reverse=True)
        current_zone = str(distant_zones[int(np.random.randint(0, min(3, len(distant_zones))))])
        distance_km = float(np.random.uniform(5, 100))
    elif atype == "unauthorized_zone":
        hour, day = int(np.random.randint(8, 18)), int(np.random.randint(0, 5))
        freq, time_s = int(np.random.randint(3, 10)), int(np.random.randint(30, 120))
        restricted_targets = [z for z in ZONES if _zone_clearance_req(z) > user["clearance"]]
        current_zone = str(np.random.choice(restricted_targets if restricted_targets else [z for z in ZONES if z != user["usual_zone"]]))
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
    elif atype == "restricted_area":
        hour = int(np.random.choice(list(range(0, 5)) + list(range(22, 24))))
        day, freq, time_s = int(np.random.randint(0, 7)), int(np.random.randint(5, 15)), int(np.random.randint(2, 20))
        current_zone = str(np.random.choice(list(RESTRICTED_ZONES)))
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
    elif atype == "high_frequency":
        hour, day = int(np.random.randint(8, 18)), int(np.random.randint(0, 5))
        freq, time_s = int(np.random.randint(25, 40)), int(np.random.randint(1, 5))
        current_zone = user["usual_zone"] if np.random.random() < 0.6 else str(np.random.choice(ZONES))
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
    elif atype == "location_mismatch":
        hour = int(np.random.choice(list(range(0, 6)) + list(range(21, 24))))
        day, freq, time_s = int(np.random.randint(0, 7)), int(np.random.randint(8, 18)), int(np.random.randint(2, 15))
        far_zones = [z for z in ZONES if ZONE_DISTANCES[user["usual_zone"]][z] >= 0.5]
        current_zone = str(np.random.choice(far_zones if far_zones else ZONES))
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]
    else:  # unusual_hour / weekend_access
        is_unusual_hour = atype == "unusual_hour"
        hour = int(np.random.choice(list(range(0, 4)) if is_unusual_hour else list(range(0, 6))))
        day = int(np.random.randint(0, 7) if is_unusual_hour else np.random.choice([5, 6]))
        freq = int(np.random.randint(8, 20) if is_unusual_hour else np.random.randint(10, 25))
        time_s = int(np.random.randint(2, 20) if is_unusual_hour else np.random.randint(2, 15))
        current_zone = user["usual_zone"]
        prev_zone = prev_zone_by_user.get(user_id, user["usual_zone"])
        distance_km = ZONE_DISTANCES[prev_zone][current_zone]

    velocity = distance_km / max(time_s, 0.1)
    prev_zone_by_user[user_id] = current_zone

    zone_clear_mismatch = int(user["clearance"] < _zone_clearance_req(current_zone))
    dept_zone_mismatch = _compute_dept_zone_mismatch(user, current_zone, is_anomaly=True)

    return _record_common(
        user=user,
        hour=hour,
        day=day,
        freq=freq,
        time_s=time_s,
        loc=0,
        restr=1,
        is_first=0,
        seq_viol=1,
        attempts=int(np.random.randint(2, 8)),
        role=int(user["role_level"]),
        distance_km=distance_km,
        velocity=velocity,
        geo_impossible=int(velocity > 1.0),
        zone_clear_mismatch=zone_clear_mismatch,
        dept_zone_mismatch=dept_zone_mismatch,
        concurrent=int(np.random.choice([0, 1], p=[0.7, 0.3])),
        label=1,
    )


def generate_anomalous(n: int, prev_zone_by_user: dict[int, str]) -> list[dict]:
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
