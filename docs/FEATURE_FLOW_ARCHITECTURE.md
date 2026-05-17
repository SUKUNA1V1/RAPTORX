# Feature Flow Architecture - Before and After Fixes

## System Overview

Your RaptorX system has 3 layers of access decision-making:

```
┌─────────────────────────────────────────────────────────┐
│ LAYER 1: Hard Rules                                      │
│ (Badge cloning, impossible velocity, concurrent session)│
│ Uses all 19 features (especially velocity/distance)    │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 2: ML Models (Isolation Forest + Autoencoder)    │
│ Uses first 13 features (core behavioral features)      │
│ Weighted: IF=0.3, AE=0.7                               │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 3: Decision Thresholds                            │
│ Grant: risk < 0.22                                      │
│ Delayed: 0.22 ≤ risk < 0.47                             │
│ Denied: risk ≥ 0.47                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔴 BEFORE FIXES: Feature Flow (Broken)

```
User Access Request
└─ badge_id = "E12345"
└─ access_point = "Engineering Zone"
└─ timestamp = "2026-05-16 09:30:00"

         ↓

1. FEATURE EXTRACTION (ml_service.py)
   └─ extract_features(user, access_point, timestamp, db)
       ├─ Compute all 19 features:
       │  ├─ [0-12] Core features
       │  └─ [13-18] VELOCITY/DISTANCE/CLONING features ⚠️ COMPUTED BUT UNUSED
       │
       ├─ Dictionary created:
       │  └─ raw = {
       │       "hour": 9,
       │       "access_frequency_24h": 2,
       │       ...
       │       "velocity_km_per_min": 2.5,        ⚠️ Computed
       │       "geographic_impossibility": 1,     ⚠️ Computed  
       │       "concurrent_session_detected": 0,  ⚠️ Computed
       │       ...all 19 values present
       │     }
       │
       ├─ ❌ PROBLEM: FEATURE_COLS only has 13 names
       │  └─ clipped = {name: raw[name] for name in FEATURE_COLS[:13]}
       │     Selects only first 13, ignores velocity/distance!
       │
       └─ Returns:
          └─ {"raw": {19 features}, "list": [13 scaled values]}

         ↓

2. DECISION ENGINE (decision_engine.py)
   └─ engine.decide(features["list"])  ← Only 13 values!
       ├─ Models trained on: 19 features
       ├─ Models receive: 13 features
       └─ ❌ INPUT MISMATCH!
           Models: "I was trained on 19 features"
           Runtime: "Here are 13 features"
           Result: Unpredictable predictions

         ↓

3. HARD RULES (badge_cloning detector)
   └─ detect_badge_cloning(features) ← Tries to access indices 13-18
       ├─ velocity_km_per_min = features[15]  ← Index error or None!
       └─ ❌ Can't detect badge cloning properly

         ↓

4. DECISION
   └─ ❌ WRONG DECISION (missing key information)
```

---

## ✅ AFTER FIXES: Feature Flow (Correct)

```
User Access Request
└─ badge_id = "E12345"
└─ access_point = "Engineering Zone"
└─ timestamp = "2026-05-16 09:30:00"

         ↓

1. FEATURE EXTRACTION (ml_service.py)
   └─ extract_features(user, access_point, timestamp, db)
       ├─ Compute all 19 features:
       │  ├─ [0-12] Core features
       │  └─ [13-18] VELOCITY/DISTANCE/CLONING features ✅ COMPUTED AND USED
       │
       ├─ Dictionary created:
       │  └─ raw = {
       │       "hour": 9,
       │       "access_frequency_24h": 2,
       │       ...
       │       "velocity_km_per_min": 2.5,        ✅ Computed
       │       "geographic_impossibility": 1,     ✅ Computed
       │       "concurrent_session_detected": 0,  ✅ Computed
       │       ...all 19 values present
       │     }
       │
       ├─ ✅ FIXED: FEATURE_COLS now has 19 features
       │  └─ clipped = {name: raw[name] for name in FEATURE_COLS[:19]}
       │     Selects all 19 features!
       │
       ├─ ✅ FIXED: Scaler priority corrected
       │  └─ scaler = get_scaler()
       │     ├─ First tries: scaler_19.pkl ✅ (19-feature scaler)
       │     └─ Falls back to: scaler_13.pkl (13-feature scaler)
       │
       └─ Returns:
          └─ {"raw": {19 features}, "list": [19 scaled values]}

         ↓

2. DECISION ENGINE (decision_engine.py)
   └─ engine.decide(features["list"])  ← All 19 values!
       ├─ Hard rules layer (uses all 19 features):
       │  ├─ Check velocity > 1.0 km/min?
       │  │  └─ features[15] = 2.5 → YES, IMPOSSIBLE VELOCITY
       │  ├─ Check concurrent_session?
       │  │  └─ features[18] = 0 → No
       │  ├─ Check geographic_impossibility?
       │  │  └─ features[13] = 1 → YES, Physical impossibility
       │  └─ Result: HARD RULE VIOLATION → DENIED immediately
       │
       ├─ If no hard rules triggered, ML layer (uses first 13):
       │  ├─ Isolation Forest: features[0-12] → score 0.6
       │  ├─ Autoencoder: features[0-12] → score 0.7
       │  ├─ Ensemble: 0.3*0.6 + 0.7*0.7 = 0.67
       │  └─ Risk score = 0.67
       │
       └─ ✅ INPUT MATCH: Models trained on 19 features, receive 19 features

         ↓

3. THRESHOLD APPLICATION
   └─ Apply decision thresholds:
       ├─ risk_score = 0.67
       ├─ grant_threshold = 0.22
       ├─ deny_threshold = 0.47
       └─ 0.67 >= 0.47 → DENIED

         ↓

4. DECISION
   └─ ✅ CORRECT DECISION: DENIED
       Reason: Impossible velocity (2.5 km/min) indicates badge cloning
```

---

## Feature Sets Comparison

### Core 13 Features (used for ML models)

```python
[0]  hour                      # Hour of day (0-23)
[1]  day_of_week               # Day of week (0-6)
[2]  is_weekend                # Binary: weekend?
[3]  access_frequency_24h      # Accesses in last 24h
[4]  time_since_last_access_min # Minutes since last access
[5]  location_match            # Binary: zone matches department?
[6]  role_level                # User role (1-3: employee, manager, admin)
[7]  is_restricted_area        # Binary: restricted zone?
[8]  is_first_access_today     # Binary: first access today?
[9]  sequential_zone_violation # Binary: zone-to-zone too fast?
[10] access_attempt_count      # Failed access attempts
[11] time_of_week              # Hours since Monday midnight
[12] hour_deviation_from_norm  # How far from user's normal hour?
```

### Additional 6 Features (used for hard rules + badge cloning detection)

```python
[13] geographic_impossibility    # Velocity > 1.0 km/min?
[14] distance_between_scans_km  # Travel distance (km)
[15] velocity_km_per_min        # Speed between accesses (km/min)
[16] zone_clearance_mismatch    # User clearance < zone requirement?
[17] department_zone_mismatch   # User department != zone type?
[18] concurrent_session_detected # Badge used in <2 min at different zones?
```

---

## Why This Bug Was Silent

✗ Models trained on: 19 features  
✗ Test set features: 19 (matches training)  
✗ Test accuracy: 95% (excellent)  
✗ Runtime features: 13 (WRONG!)  
✗ Production accuracy: LOW (no one noticed because...?)

**The bug was silent because:**

1. **Test-to-production gap** — Tests used 19 features, production used 13
2. **Feature redundancy** — Some anomalies visible in 13 features anyway
3. **Model robustness** — Even with wrong input, IF and AE caught some anomalies
4. **Threshold conservatism** — 0.47 threshold is high, catches obvious cases

**But the system missed subtle attacks** that required velocity/distance features:
- Badge cloning (subtle timing, same-zone attacks)
- Privilege escalation (gradual zone escalation)
- Cross-department access (systematic exploration)

---

## Data Types and Scaling

After fixes, the complete feature vector looks like:

```python
# Raw (unscaled) values from feature extraction:
raw_features = [9, 1, 0, 2, 60.0, 1, 2, 0, 0, 0, 1, 34, 0.5,
                 0, 0.2, 0.002, 0, 0, 0]

# After StandardScaler (using scaler_19.pkl):
scaled_features = [0.45, 0.17, 0.0, 0.05, 0.125, 1.0, 0.67, 0.0, 0.0, 0.0, 0.125, 0.204, 0.05,
                   0.0, 0.002, 0.000002, 0.0, 0.0, 0.0]

# Model 1 (Isolation Forest) sees: scaled_features[0:13]
# Model 2 (Autoencoder) sees: scaled_features[0:13]
# Hard rules see: all scaled_features[0:19]
```

---

## Summary

The 3 critical bugs created a **feature extraction gap**:

```
Training pipeline:    [19 features] → Train models
Test pipeline:        [19 features] → Test models (95% accuracy)
Production pipeline:  [13 features] → Run models ❌ WRONG!
```

After fixes:

```
Training pipeline:    [19 features] → Train models
Test pipeline:        [19 features] → Test models (95% accuracy)
Production pipeline:  [19 features] → Run models ✅ CORRECT!
```

This closes the gap and allows models to perform as designed.
