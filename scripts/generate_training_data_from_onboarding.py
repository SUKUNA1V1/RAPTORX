"""
Generate training data for ML models based on organization onboarding configuration.

This script creates synthetic training data customized to the client's infrastructure
as defined during the onboarding wizard.
"""

import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any
import os


def load_config(config_file: str) -> Dict[str, Any]:
    """Load organization configuration from JSON file."""
    with open(config_file, 'r') as f:
        return json.load(f)


def extract_zones_from_config(config: Dict) -> List[str]:
    """Extract unique zone names from building hierarchy."""
    zones = set()
    for building in config.get("buildings", []):
        for floor in building.get("floors", []):
            for zone in floor.get("zones", []):
                zones.add(zone.get("name", "unknown"))
    
    if not zones:
        # Fallback to default zones if none configured
        zones = {"engineering", "hr", "finance", "marketing", "logistics", "it", "server_room", "executive"}
    
    return sorted(list(zones))


def extract_access_points_from_config(config: Dict) -> List[Dict]:
    """Extract access point details from configuration."""
    access_points = []
    for ap in config.get("access_points", []):
        access_points.append({
            "id": ap.get("id", "ap_unknown"),
            "name": ap.get("name", "unknown"),
            "type": ap.get("type", "door"),
            "zone_id": ap.get("zone_id", 1),
            "building_id": ap.get("building_id", 1),
            "is_restricted": ap.get("is_restricted", False),
            "required_clearance": ap.get("required_clearance", 1),
        })
    return access_points


def extract_policies_from_config(config: Dict) -> List[Dict]:
    """Extract policy details from configuration."""
    policies = []
    for policy in config.get("policies", []):
        policies.append({
            "id": policy.get("id", "policy_unknown"),
            "name": policy.get("name", "default"),
            "allowed_zones": policy.get("allowed_zones", []),
            "allowed_days": policy.get("allowed_days", [0, 1, 2, 3, 4, 5, 6]),
            "time_start": policy.get("time_start", "08:00"),
            "time_end": policy.get("time_end", "18:00"),
            "deny_overrides_allow": policy.get("deny_overrides_allow", False),
        })
    return policies


def extract_admins_from_config(config: Dict) -> List[Dict]:
    """Extract admin user profiles from configuration."""
    admins = []
    for admin in config.get("admins", []):
        admins.append({
            "id": admin.get("id", "user_unknown"),
            "email": admin.get("email", "unknown@example.com"),
            "name": admin.get("name", "Admin"),
            "role": admin.get("role", "admin"),
        })
    return admins


def build_zone_distances(zones: List[str]) -> Dict[str, Dict[str, float]]:
    """Build distance matrix between zones."""
    np.random.seed(42)
    coords = {z: (np.random.uniform(0, 10), np.random.uniform(0, 10)) for z in zones}
    distances: Dict[str, Dict[str, float]] = {}
    
    for a in zones:
        distances[a] = {}
        for b in zones:
            if a == b:
                distances[a][b] = 0.0
            else:
                ax, ay = coords[a]
                bx, by = coords[b]
                distances[a][b] = round(float(np.hypot(ax - bx, ay - by)), 3)
    
    return distances


def build_user_profiles(
    zones: List[str],
    policies: List[Dict],
    num_users: int = 100,
    admins: List[Dict] = None
) -> List[Dict]:
    """Build user profiles based on configuration."""
    if admins is None:
        admins = []
    
    profiles = []
    departments = zones[:6] if len(zones) >= 6 else zones
    
    # Add admin users
    for admin in admins:
        profiles.append({
            "user_id": admin.get("id", f"ADMIN_{len(profiles)}"),
            "role_level": 3,  # Super admin
            "clearance": 3,
            "department": "administration",
            "usual_zone": zones[0] if zones else "main",
            "usual_hour": int(np.random.randint(7, 18)),
            "usual_days": [0, 1, 2, 3, 4, 5, 6],
            "usual_hour_std": round(float(np.random.uniform(2.0, 4.0)), 2),
            "access_velocity_km_per_min_threshold": 0.5,
        })
    
    # Add regular users
    for user_id in range(num_users):
        role_level = int(np.random.choice([1, 2, 3], p=[0.60, 0.30, 0.10]))
        clearance = role_level
        department = str(np.random.choice(departments)) if departments else "general"
        usual_zone = department
        
        if role_level == 3:
            usual_hour = int(np.random.randint(7, 18))
            usual_days = [0, 1, 2, 3, 4, 5, 6]
            usual_hour_std = round(float(np.random.uniform(2.0, 4.0)), 2)
        elif role_level == 2:
            usual_hour = int(np.random.randint(8, 10))
            usual_days = [0, 1, 2, 3, 4]
            usual_hour_std = round(float(np.random.uniform(1.0, 3.0)), 2)
        else:
            usual_hour = int(np.random.randint(9, 17))
            usual_days = [0, 1, 2, 3, 4]
            usual_hour_std = round(float(np.random.uniform(1.5, 3.0)), 2)
        
        profiles.append({
            "user_id": f"USER_{org_id}_{user_id:05d}" if 'org_id' in globals() else f"USER_{user_id:05d}",
            "role_level": role_level,
            "clearance": clearance,
            "department": department,
            "usual_zone": usual_zone,
            "usual_hour": usual_hour,
            "usual_days": usual_days,
            "usual_hour_std": usual_hour_std,
            "access_velocity_km_per_min_threshold": 0.5 + (0.2 * role_level),
        })
    
    return profiles


def generate_records(
    zones: List[str],
    access_points: List[Dict],
    user_profiles: List[Dict],
    zone_distances: Dict,
    policies: List[Dict],
    total_records: int = 500_000,
    anomaly_ratio: float = 0.07,
    org_id: int = 1
) -> pd.DataFrame:
    """Generate synthetic training data records."""
    
    np.random.seed(42)
    
    FEATURE_COLS = [
        "hour", "day_of_week", "is_weekend", "access_frequency_24h",
        "time_since_last_access_min", "location_match", "role_level",
        "is_restricted_area", "is_first_access_today", "sequential_zone_violation",
        "access_attempt_count", "time_of_week", "hour_deviation_from_norm",
        "geographic_impossibility", "distance_between_scans_km",
        "velocity_km_per_min", "zone_clearance_mismatch",
        "department_zone_mismatch", "concurrent_session_detected", "anomaly"
    ]
    
    records = []
    num_users = len(user_profiles)
    num_zones = len(zones)
    num_anomalies = int(total_records * anomaly_ratio)
    num_normal = total_records - num_anomalies
    
    # Generate normal records
    for _ in range(num_normal):
        user = np.random.choice(user_profiles)
        hour = int(np.random.normal(user["usual_hour"], user["usual_hour_std"]))
        hour = max(0, min(23, hour))
        
        day_of_week = int(np.random.choice(user["usual_days"]))
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # More likely to be in usual zone
        zone = user["usual_zone"] if np.random.random() < 0.7 else np.random.choice(zones)
        last_zone = user["usual_zone"] if np.random.random() < 0.8 else np.random.choice(zones)
        
        location_match = 1.0 if zone == user["usual_zone"] else 0.3
        
        # Calculate distance between zones
        try:
            distance = zone_distances.get(last_zone, {}).get(zone, 0.0)
        except:
            distance = 0.0
        
        # Time between accesses (minutes)
        time_since_last = int(np.random.exponential(60))
        
        # Calculate velocity
        velocity = (distance / max(1, time_since_last / 60.0)) if time_since_last > 0 else 0.0
        velocity = round(velocity, 3)
        
        record = {
            "user_id": user["user_id"],
            "zone": zone,
            "hour": hour,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "access_frequency_24h": int(np.random.exponential(5)) + 1,
            "time_since_last_access_min": time_since_last,
            "location_match": location_match,
            "role_level": user["role_level"],
            "is_restricted_area": 1 if zone in ["server_room", "executive"] else 0,
            "is_first_access_today": 1 if np.random.random() < 0.1 else 0,
            "sequential_zone_violation": 0,
            "access_attempt_count": int(np.random.exponential(2)) + 1,
            "time_of_week": day_of_week * 24 + hour,
            "hour_deviation_from_norm": round(abs(hour - user["usual_hour"]), 2),
            "geographic_impossibility": 0,
            "distance_between_scans_km": distance,
            "velocity_km_per_min": velocity,
            "zone_clearance_mismatch": 1 if user["clearance"] < 2 and zone == "server_room" else 0,
            "department_zone_mismatch": 0 if zone == user["department"] else 1,
            "concurrent_session_detected": 0,
            "anomaly": 0
        }
        records.append(record)
    
    # Generate anomaly records
    for _ in range(num_anomalies):
        user = np.random.choice(user_profiles)
        anomaly_type = np.random.choice([
            "impossible_travel",
            "off_hours",
            "restricted_area",
            "sequential_violation",
            "concurrent_session"
        ])
        
        if anomaly_type == "impossible_travel":
            # Huge distance in very short time
            last_zone = np.random.choice(zones)
            zone = np.random.choice(zones)
            distance = zone_distances.get(last_zone, {}).get(zone, 1.0)
            time_since_last = int(np.random.uniform(0.5, 5))  # 0.5 - 5 minutes
            velocity = (distance / max(0.1, time_since_last / 60.0))
        elif anomaly_type == "off_hours":
            hour = int(np.random.choice([0, 1, 2, 3, 4, 5, 22, 23]))
            zone = user["usual_zone"]
            distance = 0.0
            time_since_last = int(np.random.exponential(120))
            velocity = 0.0
        elif anomaly_type == "restricted_area":
            if user["clearance"] < 2:
                zone = "server_room"
            else:
                zone = np.random.choice(zones)
            hour = int(np.random.randint(0, 24))
            distance = 0.0
            time_since_last = int(np.random.exponential(60))
            velocity = 0.0
        elif anomaly_type == "sequential_violation":
            zone = np.random.choice(zones)
            hour = int(np.random.randint(0, 24))
            distance = zone_distances.get(zone, {}).get(zone, 0.0)
            time_since_last = 1
            velocity = 0.0
        else:  # concurrent_session
            zone = user["usual_zone"]
            hour = int(np.random.randint(0, 24))
            distance = 0.0
            time_since_last = 0
            velocity = 0.0
        
        day_of_week = int(np.random.randint(0, 7))
        is_weekend = 1 if day_of_week >= 5 else 0
        
        record = {
            "user_id": user["user_id"],
            "zone": zone,
            "hour": hour,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "access_frequency_24h": int(np.random.exponential(8)) + 1,
            "time_since_last_access_min": time_since_last,
            "location_match": 0.1 if anomaly_type == "off_hours" else 0.3,
            "role_level": user["role_level"],
            "is_restricted_area": 1 if anomaly_type == "restricted_area" else 0,
            "is_first_access_today": 1 if np.random.random() < 0.3 else 0,
            "sequential_zone_violation": 1 if anomaly_type == "sequential_violation" else 0,
            "access_attempt_count": int(np.random.exponential(3)) + 1,
            "time_of_week": day_of_week * 24 + hour,
            "hour_deviation_from_norm": round(abs(hour - user["usual_hour"]), 2),
            "geographic_impossibility": 1 if anomaly_type == "impossible_travel" else 0,
            "distance_between_scans_km": distance,
            "velocity_km_per_min": velocity if anomaly_type != "impossible_travel" else 5.0 + np.random.random() * 5,
            "zone_clearance_mismatch": 1 if user["clearance"] < 2 and zone == "server_room" else 0,
            "department_zone_mismatch": 1 if zone != user["department"] else 0,
            "concurrent_session_detected": 1 if anomaly_type == "concurrent_session" else 0,
            "anomaly": 1
        }
        records.append(record)
    
    # Shuffle records
    np.random.shuffle(records)
    
    return pd.DataFrame(records)


def generate_data_from_config(
    config_file: str,
    output_file: str,
    org_id: int = 1,
    total_records: int = 500_000
):
    """Main function to generate training data from onboarding configuration."""
    
    print(f"[Training Data Generation] Loading configuration from {config_file}")
    config = load_config(config_file)
    
    print(f"[Training Data Generation] Extracting infrastructure details...")
    zones = extract_zones_from_config(config)
    access_points = extract_access_points_from_config(config)
    policies = extract_policies_from_config(config)
    admins = extract_admins_from_config(config)
    
    print(f"[Training Data Generation] Found {len(zones)} zones, {len(access_points)} access points, {len(policies)} policies")
    print(f"[Training Data Generation] Zones: {', '.join(zones)}")
    
    print(f"[Training Data Generation] Building zone distance matrix...")
    zone_distances = build_zone_distances(zones)
    
    print(f"[Training Data Generation] Building user profiles...")
    user_profiles = build_user_profiles(zones, policies, num_users=100, admins=admins)
    
    print(f"[Training Data Generation] Generating {total_records} training records...")
    df = generate_records(
        zones=zones,
        access_points=access_points,
        user_profiles=user_profiles,
        zone_distances=zone_distances,
        policies=policies,
        total_records=total_records,
        anomaly_ratio=0.07,
        org_id=org_id
    )
    
    # Split into train/test
    print(f"[Training Data Generation] Splitting data into train/test sets...")
    from sklearn.model_selection import train_test_split
    train, test = train_test_split(df, test_size=0.2, random_state=42)
    
    # Save to files
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    train_file = output_file.replace(".csv", "_train.csv")
    test_file = output_file.replace(".csv", "_test.csv")
    
    train.to_csv(train_file, index=False)
    test.to_csv(test_file, index=False)
    
    print(f"[Training Data Generation] Training data saved to {train_file}")
    print(f"[Training Data Generation] Test data saved to {test_file}")
    print(f"[Training Data Generation] ✅ Generation complete!")
    print(f"[Training Data Generation] Records generated: {len(df)}")
    print(f"[Training Data Generation] Normal records: {len(df[df['anomaly'] == 0])}")
    print(f"[Training Data Generation] Anomalies: {len(df[df['anomaly'] == 1])}")
    
    return train, test


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python generate_training_data_from_onboarding.py <config_file> <output_file>")
        sys.exit(1)
    
    config_file = sys.argv[1]
    output_file = sys.argv[2]
    
    generate_data_from_config(config_file, output_file)
