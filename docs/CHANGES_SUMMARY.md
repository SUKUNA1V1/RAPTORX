# Summary of Changes to Fix ML Model Feature Mismatch

## Problem Report
```
IF scoring failed: X has 19 features, but IsolationForest is expecting 13 features.
AE scoring failed: expected shape=(None, 13), found shape=(1, 19)
ML scoring failed, falling back to rule-based: too many values to unpack (expected 13)
```

## Root Cause
Models were trained on **13 features** but code was passing **all 19 features**. The 6 additional features (velocity, distance, geographic_impossibility, etc.) should only be used for hard rules, not passed to the ML models.

---

## Files Modified

### 1. backend/app/services/ml_service.py

**Change 1: FEATURE_COLS reverted to 13 features**
- **Lines 20-33**
- Removed 6 hard rule features from FEATURE_COLS
- Added new HARD_RULE_FEATURES list with 6 features
- Added explanatory comments

**Change 2: Return full raw dict (all 19 features)**
- **Line 398**
- Changed `return {"raw": clipped, ...}` → `return {"raw": raw, ...}`
- Ensures hard rule features available in returned dict

**Change 3: Scaler loading priority updated**
- **Line 165**
- Prioritize scaler_13.pkl (matches 13-feature FEATURE_COLS)
- Fallback to scaler_19.pkl if needed

### 2. backend/app/routes/access.py

**Change: Construct 19-element feature list before calling decision_engine**
- **Lines 480-500**
- Create features_19 = [13 scaled] + [6 hard rule features]
- Pass complete 19-element list to engine.decide()

### 3. test_ml_fixes.py

**Change: Updated test to verify correct feature split**
- **Lines 22-36**
- Check FEATURE_COLS has 13 features
- Check HARD_RULE_FEATURES has 6 features
- Updated summary comments

---

## Feature Architecture (Now Correct)

```
All 19 Features
├── 13 ML Features (FEATURE_COLS) - Scaled, passed to models
│   ├── hour
│   ├── day_of_week
│   ├── is_weekend
│   ├── access_frequency_24h
│   ├── time_since_last_access_min
│   ├── location_match
│   ├── role_level
│   ├── is_restricted_area
│   ├── is_first_access_today
│   ├── sequential_zone_violation
│   ├── access_attempt_count
│   ├── time_of_week
│   └── hour_deviation_from_norm
│
└── 6 Hard Rule Features (HARD_RULE_FEATURES) - Raw, used for rules only
    ├── geographic_impossibility (velocity > 1.0 km/min)
    ├── distance_between_scans_km
    ├── velocity_km_per_min
    ├── zone_clearance_mismatch (role + restricted area)
    ├── department_zone_mismatch
    └── concurrent_session_detected (<2 min at 2 zones)
```

---

## Verification

The fix ensures:
✅ Models receive exactly 13 features (as trained)
✅ Hard rules access full 19 features from raw dict
✅ Decision engine properly handles 19-element feature list
✅ Scaler matches feature count (13 features → scaler_13)
✅ No unpacking errors or shape mismatches

---

## To Deploy

1. Copy updated files to your system:
   - `backend/app/services/ml_service.py`
   - `backend/app/routes/access.py`

2. Test with fixed code:
   ```powershell
   python test_ml_fixes.py
   cd backend && python startup_backend.py
   ```

3. Run API tests (in new terminal):
   ```powershell
   python test_api_with_login.py
   ```

Expected: All tests pass, no feature mismatch errors.
