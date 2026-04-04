# RaptorX Simulator: Test Scenarios for False Positive/Negative Detection

## Purpose
This guide explains the enhanced simulator scenarios designed to identify potential false positives (legitimate access denied) and false negatives (malicious access granted).

---

## Scenario Overview

### 1. **Repeated Normal Access** 
**Goal**: Verify consistent behavior for legitimate repeated access

- **Test Pattern**: Same user accesses same location 5 times over 2 hours
- **Expected Result**: 100% GRANTED with LOW/CONSISTENT risk scores
- **False Positive Sign**: If any are DENIED or DELAYED
- **Why Test**: Reveals if the system is too sensitive to frequency anomalies

**Examples**:
- Employee returning to office building multiple times during work hours
- Regular restroom/common area visits
- Repeated access to personal desk location

---

### 2. **Weekend Normal Access**
**Goal**: Test legitimate weekend work patterns

- **Test Pattern**: Regular employee accessing normal areas on Saturday/Sunday
- **Expected Result**: GRANTED or slight elevation in risk (not DENIED)
- **False Positive Sign**: DENIED status for regular employee weekend work
- **Why Test**: Reveals if weekend flag is too aggressive

**Examples**:
- Researcher working Saturday morning
- IR team on-call weekend work
- Maintenance staff scheduled weekend

---

### 3. **Cross-Department Manager Access**
**Goal**: Verify managers can access other departments

- **Test Pattern**: High-clearance user (manager/director) accessing multiple departments
- **Expected Result**: GRANTED for all departments (authority-based)
- **False Negative Sign**: Manager correctly accessing other departments but always GRANTED
- **Why Test**: Reveals if role-based access control is properly implemented

**Examples**:
- Director visiting Finance department
- HR manager accessing Engineering office
- Security manager touring restricted areas

---

### 4. **Sequential Restricted Access**
**Goal**: Detect suspicious pattern of accessing multiple secure areas rapidly

- **Test Pattern**: Low-clearance user attempts 3 restricted areas within 15 minutes
- **Expected Result**: All should be DENIED
- **False Negative Sign**: Any GRANTED decisions for restricted areas
- **Why Test**: Reveals if sequential pattern detection works

**Examples**:
- Same user trying server room, vault, and executive offices
- Rapid movement through multiple security zones
- Lateral movement attack pattern

---

### 5. **Early Morning Access** 
**Goal**: Test edge case of legitimate early shift (6-7 AM)

- **Test Pattern**: Regular employee accesses at 6-7 AM
- **Expected Result**: GRANTED (should not flag as "unusual hours")
- **False Positive Sign**: DELAYED or DENIED for known employee at 6-7 AM
- **Why Test**: Reveals if hour boundaries are realistic

**Examples**:
- First shift starting 6 AM
- Early morning commute through building
- Cleaning crew starting shift

---

### 6. **Unusual Hours** (Original)
**Goal**: Verify off-hours anomaly detection

- **Test Pattern**: Access attempts at 2-4 AM and 11 PM
- **Expected Result**: Higher risk scores, DENIED for unauthorized users
- **False Negative Sign**: Legitimate off-hours work still DENIED/DELAYED

**Examples**:
- On-call engineer accessing infrastructure
- Night security doing rounds
- Data scientist running batch jobs

---

### 7. **Badge Cloning** (Original)
**Goal**: Detect rapid multi-location access

- **Test Pattern**: Same badge used at 2 different locations 30 seconds apart
- **Expected Result**: Second access should be DENIED
- **False Positive Sign**: Both accesses GRANTED

**Examples**:
- Physical badge cloning attempt
- Stolen badge verification

---

### 8. **Restricted Access** (Original)
**Goal**: Block low-clearance users from secure areas

- **Test Pattern**: Low-level employee attempts server room, vault, executive areas
- **Expected Result**: All DENIED
- **False Negative Sign**: Any GRANTED decisions

---

### 9. **High Frequency** (Original)
**Goal**: Detect brute-force or bulk access attempts

- **Test Pattern**: Same user accesses same location 5 times in 20 seconds
- **Expected Result**: High risk scores, likely DENIED after burst
- **False Negative Sign**: All GRANTED despite spam pattern

---

### 10. **Random Anomalous** (Original)
**Goal**: Mix all scenarios randomly

- **Test Pattern**: Random scenario from all available types
- **Expected Result**: Varies; useful for comprehensive system stress

---

## How to Use the Simulator

### Frontend Access
1. Navigate to **Traffic Simulator** page in RaptorX dashboard
2. Select a scenario from the dropdown
3. Set iteration count (1-100)
4. Click **EXECUTE RUN**
5. Review results:
   - **Green** = GRANTED (should be low risk)
   - **Orange** = DELAYED (manual review)
   - **Red** = DENIED (high risk detected)

### Expected Results Summary

| Scenario | Expected Grants | Expected Denies | Avg Risk | What We're Testing |
|----------|-----------------|-----------------|----------|-------------------|
| Repeated Normal | ~100% | 0% | <0.3 | Consistency |
| Weekend Normal | ~90% | 0% | <0.4 | Role-based rules |
| Cross-Department | ~95% | 0% | <0.35 | Manager permissions |
| Sequential Restricted | 0% | 100% | >0.7 | Pattern detection |
| Early Morning | ~95% | 0% | <0.35 | Boundary realism |

---

## Interpreting Results for False Positives/Negatives

### **False Positive Indicators** ⚠️
- Repeated Normal scenarios showing DENIED
- Weekend Normal showing DENIED for known employees
- Cross-Department manager getting DENIED
- Early Morning showing DELAYED or DENIED

### **False Negative Indicators** 🚨
- Sequential Restricted showing any GRANTED
- Restricted Access scenarios showing GRANTED
- Badge Cloning showing both accesses GRANTED
- High Frequency showing all GRANTED

---

## Debugging Workflow

1. **Run Repeated Normal** → If failures, system is too strict
2. **Run Cross-Department** → If failures, role-based access broken
3. **Run Sequential Restricted** → If passes, pattern detection works
4. **Run Early Morning** → If failures, threshold misconfiguration
5. **Check Average Risk Scores** → Verify they align with expectations

---

## Model Statistics to Track

After each test scenario run:

```
Live Stream Results:
- Total Events: X
- Granted: Y (should be high for normal scenarios)
- Denied: Z (should be high for restricted scenarios)
- Average Risk Score: A.BC (should be low for normal, high for anomalies)
- Avg Risk Color Code:
  - 0.00-0.30 = GREEN (normal, safe)
  - 0.30-0.70 = YELLOW (delayed, review)
  - 0.70-1.00 = RED (denied, blocked)
```

---

## Common False Positive Root Causes

1. **Timestamp handling**: Timezone differences causing false off-hours flags
2. **Feature scaling**: Velocity/distance features out-of-range due to test patterns
3. **Threshold too high**: DENY_THRESHOLD set too low (should be ~0.70)
4. **Missing role data**: User clearance_level not properly set in database
5. **Feature extraction**: Incorrect feature mapping for user roles

---

## Common False Negative Root Causes

1. **Model underfitting**: Isolated Forest or Autoencoder not properly trained
2. **Anomaly thresholds miscalibrated**: GRANT_THRESHOLD set too high (should be ~0.30)
3. **Strategy weights wrong**: Ensemble weights (IF=0.3, AE=0.7) not optimal
4. **Missing features**: Critical features not included in model training
5. **Data leakage**: Test data used in training, model overfitting

---

## Next Steps

After running scenarios:

1. ✅ If all pass → Models are working correctly, safe to deploy
2. ⚠️ If some false positives → Adjust GRANT_THRESHOLD or review feature engineering
3. 🚨 If false negatives → Retrain models or adjust DENY_THRESHOLD
4. 📊 If inconsistent → Check data quality and feature extraction

---

## Related Files

- [Data Generator](../scripts/generate_data_fixed.py) - Synthetic data generation
- [Decision Engine](../backend/app/services/decision_engine.py) - ML scoring logic
- [Feature Extraction](../backend/app/services/access_service.py) - Feature engineering
- [ML Status](./ml_status.md) - Current model metrics

