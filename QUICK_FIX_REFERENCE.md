# Quick Reference: ML Model Fixes

## Files Changed

### 1. scripts/ci_retune_threshold.py
**Line 46** — Fix auto-retuning file format

```diff
- ae_model = retune_threshold.keras.models.load_model("ml/models/autoencoder.h5")
+ ae_model = retune_threshold.keras.models.load_model("ml/models/autoencoder.keras")
```

---

### 2. backend/app/services/ml_service.py
**Lines 19-31** — Add missing 6 features to FEATURE_COLS

```diff
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
+   "geographic_impossibility",
+   "distance_between_scans_km",
+   "velocity_km_per_min",
+   "zone_clearance_mismatch",
+   "department_zone_mismatch",
+   "concurrent_session_detected",
]
```

---

### 3. backend/app/services/ml_service.py
**Lines 163-177** — Fix scaler loading priority

```diff
try:
    scaler_path_13 = os.path.join(_models_dir(), "scaler_13.pkl")
    scaler_path_19 = os.path.join(_models_dir(), "scaler_19.pkl")
    scaler_path_legacy = os.path.join(_models_dir(), "scaler.pkl")
    
-   if os.path.exists(scaler_path_13):
+   if os.path.exists(scaler_path_19):
+       _SCALER = joblib.load(scaler_path_19)
+       logger.debug("Loaded 19-feature scaler")
-       _SCALER = joblib.load(scaler_path_13)
-       logger.debug("Loaded 13-feature scaler")
    elif os.path.exists(scaler_path_19):
-       _SCALER = joblib.load(scaler_path_19)
-       logger.debug("Loaded 19-feature scaler")
+   elif os.path.exists(scaler_path_13):
+       _SCALER = joblib.load(scaler_path_13)
+       logger.debug("Loaded 13-feature scaler")
    elif os.path.exists(scaler_path_legacy):
        ...
```

---

## Verification Checklist

- [x] Auto-retuning script updated (.keras format)
- [x] FEATURE_COLS has 19 features (was 13)
- [x] Scaler loading prioritizes scaler_19 (was scaler_13)
- [ ] Backend deployed with changes
- [ ] test_ml_fixes.py passes
- [ ] Auto-retuning completes successfully
- [ ] Decision accuracy verified in production

---

## Testing Commands

```bash
# Test feature extraction
python test_ml_fixes.py

# Test auto-retuning
cd backend && python ../scripts/ci_retune_threshold.py

# Check retune results
cat retune_results.json
```

---

## Rollback Plan (if needed)

If issues arise, revert these 3 files to previous versions:
1. scripts/ci_retune_threshold.py
2. backend/app/services/ml_service.py

---

## Monitoring Metrics

After deployment, monitor these metrics:

1. **Decision Accuracy**: Track % of decisions that match human review
2. **Feature Coverage**: Verify all 19 features extracted (check logs)
3. **Anomaly Detection**: Badge cloning should be caught immediately
4. **Threshold Distribution**: Risk score distribution should show clear separation
5. **Auto-retuning Status**: Should show "success" in retune_results.json

Expected improvement: <1% wrong decisions
