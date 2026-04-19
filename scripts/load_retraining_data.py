"""
Load real access log data from database for model retraining.

Used for automatic retraining (every 40 days) to use only real production data,
excluding generated synthetic data from initial training.
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
import joblib

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
]

RANDOM_SEED = 42


def load_real_access_logs_from_db(db_session, org_id: int = None, min_records: int = 1000):
    """
    Load real access logs from database for retraining.
    
    Args:
        db_session: SQLAlchemy database session
        org_id: Optional organization ID to filter logs (for multi-tenant)
        min_records: Minimum number of records required (raise error if fewer)
    
    Returns:
        DataFrame with access logs including features and label
    
    Raises:
        ValueError: If insufficient data available for retraining
    """
    from sqlalchemy import and_
    from app.models import AccessLog, User
    
    try:
        # Query access logs
        query = db_session.query(AccessLog)
        
        if org_id:
            # Filter by organization if needed
            # This assumes users have org_id field or there's an org relationship
            pass
        
        # Fetch all access logs
        access_logs = query.all()
        
        if len(access_logs) < min_records:
            raise ValueError(
                f"Insufficient real data for retraining: {len(access_logs)} records, "
                f"need at least {min_records}"
            )
        
        # Convert to DataFrame
        data = []
        for log in access_logs:
            row = {
                "hour": log.hour,
                "day_of_week": log.day_of_week,
                "is_weekend": int(log.is_weekend) if log.is_weekend is not None else 0,
                "access_frequency_24h": log.access_frequency_24h or 0,
                "time_since_last_access_min": log.time_since_last_access_min or 0,
                "location_match": int(log.location_match) if log.location_match is not None else 0,
                "role_level": log.role_level or 1,
                "is_restricted_area": int(log.is_restricted_area) if log.is_restricted_area is not None else 0,
                "is_first_access_today": int(log.is_first_access_today) if log.is_first_access_today is not None else 0,
                "sequential_zone_violation": int(log.sequential_zone_violation) if log.sequential_zone_violation is not None else 0,
                "access_attempt_count": log.access_attempt_count or 0,
                "time_of_week": log.time_of_week or 0,
                "hour_deviation_from_norm": log.hour_deviation_from_norm or 0.0,
                # Label: 1 if anomaly (risk_score > 0.5 or decision != "granted"), else 0
                "label": 1 if log.risk_score > 0.5 or log.decision != "granted" else 0,
            }
            data.append(row)
        
        df = pd.DataFrame(data)
        
        print(f"✓ Loaded {len(df)} real access logs from database")
        print(f"  - Normal records: {(df['label'] == 0).sum()}")
        print(f"  - Anomalies: {(df['label'] == 1).sum()}")
        print(f"  - Anomaly ratio: {df['label'].mean() * 100:.2f}%")
        
        return df
    
    except Exception as e:
        print(f"✗ Error loading access logs from database: {e}")
        raise


def prepare_retraining_data(
    df: pd.DataFrame,
    output_dir: str = "data/processed",
    test_size: float = 0.2
) -> tuple[str, str]:
    """
    Prepare real access logs for retraining: scale and split.
    
    Args:
        df: DataFrame with access logs
        output_dir: Where to save processed files
        test_size: Fraction for test set (e.g., 0.2 = 80/20 split)
    
    Returns:
        Tuple of (train_file_path, test_file_path)
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Split into train/test
    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        random_state=RANDOM_SEED,
        stratify=df["label"] if (df["label"] == 1).sum() > 0 else None
    )
    
    # Scale features (fit scaler on train data only)
    scaler = MinMaxScaler()
    X_train = train_df[FEATURE_COLS].copy()
    X_test = test_df[FEATURE_COLS].copy()
    
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Convert back to DataFrames
    train_scaled_df = pd.DataFrame(X_train_scaled, columns=FEATURE_COLS)
    train_scaled_df["label"] = train_df["label"].values
    
    test_scaled_df = pd.DataFrame(X_test_scaled, columns=FEATURE_COLS)
    test_scaled_df["label"] = test_df["label"].values
    
    # Save files
    train_path = os.path.join(output_dir, "retrain_train.csv")
    test_path = os.path.join(output_dir, "retrain_test.csv")
    scaler_path = os.path.join(output_dir, "retrain_scaler.pkl")
    
    train_scaled_df.to_csv(train_path, index=False)
    test_scaled_df.to_csv(test_path, index=False)
    joblib.dump(scaler, scaler_path)
    
    print(f"✓ Prepared retraining data:")
    print(f"  - Train: {train_path} ({len(train_scaled_df)} records)")
    print(f"  - Test: {test_path} ({len(test_scaled_df)} records)")
    print(f"  - Scaler: {scaler_path}")
    
    return train_path, test_path


if __name__ == "__main__":
    # This file is meant to be imported, not run directly
    print("This module should be imported by the retraining pipeline")
    print("Example usage:")
    print("  from load_retraining_data import load_real_access_logs_from_db, prepare_retraining_data")
    print("  df = load_real_access_logs_from_db(db_session)")
    print("  train_path, test_path = prepare_retraining_data(df)")
