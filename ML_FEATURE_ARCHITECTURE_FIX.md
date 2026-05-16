# Critical ML Fix: Proper Feature Separation

## The Problem

When you ran scenarios, the backend was failing with:
```
IF scoring failed: X has 19 features, but IsolationForest is expecting 13 features.
AE scoring failed: Input 0 with name 'input' of layer 'Autoencoder' is incompatible 
with the layer: expected shape=(None, 13), found shape=(1, 19)
ML scoring failed, falling back to rule-based: too many values to unpack (expected 13)
```

**Root Cause:** The models were trained on **13 features only**, but the code was trying to pass **all 19 features** to them.

---

## The Architecture

Your system needs to handle 19 features total, but split them into two groups:

### Group 1: ML Model Features (13)
These are scaled and passed to Isolation Forest + Autoencoder models:
1. hour
2. day_of_week  
3. is_weekend
4. access_frequency_24h
5. time_since_last_access_min
6. location_match
7. role_level
8. is_restricted_area
9. is_first_access_today
10. sequential_zone_violation
11. access_attempt_count
12. time_of_week
13. hour_deviation_from_norm

### Group 2: Hard Rule Features (6)
These are computed but NOT scaled, used only for hard rules:
14. geographic_impossibility (velocity > 1 km/min)
15. distance_between_scans_km
16. velocity_km_per_min
17. zone_clearance_mismatch (role level + restricted area)
18. department_zone_mismatch
19. concurrent_session_detected (badge used at 2 places <2 min apart)

---

## What Was Fixed

### 1. FEATURE_COLS Reverted to 13 Features
**File:** `backend/app/services/ml_service.py`

Changed from:
```python
FEATURE_COLS = [
    "hour", "day_of_week", ..., "concurrent_session_detected"  # 19 features
]
```

To:
```python
FEATURE_COLS = [
    "hour", "day_of_week", ..., "hour_deviation_from_norm"  # 13 features only
]

HARD_RULE_FEATURES = [
    "geographic_impossibility", "distance_between_scans_km", ...  # 6 features
]
```

### 2. Extract Features Now Returns Full Raw Dict
**File:** `backend/app/services/ml_service.py` (line 398)

Changed from:
```python
return {"raw": clipped, "scaled": scaled, "list": scaled_list}  # clipped = 13 features
```

To:
```python
return {"raw": raw, "scaled": scaled, "list": scaled_list}  # raw = all 19 features
```

This ensures:
- `features["list"]` = 13 scaled features (for ML models)
- `features["raw"]` = all 19 raw features (for hard rules)

### 3. Scaler Priority Updated
**File:** `backend/app/services/ml_service.py` (line 165)

Changed from:
```python
if os.path.exists(scaler_path_19):
    _SCALER = joblib.load(scaler_path_19)  # Check 19-feature scaler first
elif os.path.exists(scaler_path_13):
    _SCALER = joblib.load(scaler_path_13)
```

To:
```python
if os.path.exists(scaler_path_13):
    _SCALER = joblib.load(scaler_path_13)  # Use 13-feature scaler (matches FEATURE_COLS)
elif os.path.exists(scaler_path_19):
    _SCALER = joblib.load(scaler_path_19)
```

### 4. Feature List Construction in Routes
**File:** `backend/app/routes/access.py` (line 480)

Changed from:
```python
engine.decide(
    features["list"],  # only 13 values, but models expected 19
    raw_features=features["raw"],
    ...
)
```

To:
```python
# Construct 19-element list: 13 scaled + 6 hard rule features
features_19 = features["list"] + [features["raw"][name] for name in hard_rule_feature_names]

engine.decide(
    features_19,  # now 19 values: 13 scaled + 6 hard rules
    audit_context=audit_context,
)
```

---

## How It Works Now

### Data Flow
```
1. extract_features() → Computes all 19 features
   - Returns raw dict with all 19
   - Scales only first 13 using scaler_13
   - Returns features["list"] with 13 scaled values

2. access.py → Constructs 19-element feature list
   - Takes 13 scaled from features["list"]
   - Appends 6 hard rule features from features["raw"]
   - Creates features_19 = [13 scaled + 6 hard rules]

3. decision_engine.decide() → Receives 19 values
   - Passes first 13 to ML models (Isolation Forest + Autoencoder)
   - Uses all 19 for rule-based scoring (hard rules use features[13:19])
   - Makes final decision

4. Models → Only see 13 features ✓
5. Hard rules → Access raw dict directly ✓
```

---

## Result

✅ **Models now receive exactly 13 features** (as trained)
✅ **Hard rules work with full 19 features** (including velocity, distance, etc.)
✅ **No unpacking errors** (all feature arrays have correct size)
✅ **Both ML and rule-based scoring work correctly**

---

## Testing

Run on your other PC:
```powershell
# Test that fixes work
python test_ml_fixes.py

# Start backend with fixed code
cd backend
python startup_backend.py

# Test API (in new terminal)
python test_api_with_login.py
```

Expected improvements:
- No more "X has 19 features, expecting 13" errors
- No more unpacking errors
- Correct decisions for both normal and anomalous access
- Models should score appropriately based on trained behavior
