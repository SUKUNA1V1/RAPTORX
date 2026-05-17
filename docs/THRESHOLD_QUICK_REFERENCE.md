# Threshold Management Quick Reference

## ✅ Current Status
- **Auto-Retuning**: Enabled ✓
- **Hardcoded Thresholds**: None in decision path ✓
- **Verification**: All 7 checks passed ✓

---

## 🎯 How Thresholds Work

### Access Decision Logic
```python
if risk_score < grant_threshold:
    decision = "granted"      # Low risk
elif risk_score < deny_threshold:
    decision = "delayed"      # Medium risk
else:
    decision = "denied"       # High risk
```

### Alert Severity Mapping
```python
if risk_score < grant_threshold:
    severity = "low"
elif risk_score >= deny_threshold + 0.20:
    severity = "critical"     # Highest risk
elif risk_score >= deny_threshold:
    severity = "high"
else:
    severity = "medium"
```

---

## 📊 Default Thresholds

| Threshold | Default Value | Purpose |
|-----------|---------------|---------|
| `grant_threshold` | 0.30 | Below this = safe access |
| `deny_threshold` | 0.70 | Above this = deny access |
| Between | 0.30 - 0.70 | Manual review needed |

**Note**: These defaults are overridden by auto-tuned values from model files

---

## 🔄 Auto-Retuning Process

### When Does It Run?
- Every 40 days (automatic CI/CD pipeline)
- Or manually: `python scripts/retune_threshold.py`

### What It Does
1. Loads validation/test data
2. Computes ML scores using ensemble (30% IF, 70% AE)
3. Searches for optimal threshold (0.20 to 0.90)
4. Validates: precision ≥ 0.72, recall ≥ 0.80
5. Saves to model files

### Output
```
BEST GRANT THRESHOLD: 0.35  ← New optimized value
BEST DENY THRESHOLD:  0.72  ← New optimized value
Validation F1:  0.8832
Validation Precision: 0.75
Validation Recall:    0.88
```

### Saved Locations
- `ml/models/isolation_forest.pkl` (best_threshold, deny_threshold)
- `ml/models/ensemble_config.pkl` (best_threshold, deny_threshold, grant_threshold)
- `ml/models/current.json` (thresholds metadata)

---

## 🚀 Threshold Loading on Startup

### Order of Precedence
```
1. ensemble_config.pkl (if exists)
   └─ best_threshold → grant_threshold
   └─ deny_threshold → deny_threshold

2. isolation_forest.pkl (if not in ensemble_config)
   └─ best_threshold → grant_threshold
   └─ deny_threshold → deny_threshold

3. Environment Variables
   └─ DECISION_THRESHOLD_GRANT
   └─ DECISION_THRESHOLD_DENY

4. Default Values (0.30, 0.70)
```

### How to Verify
```bash
# Check what thresholds are loaded
cd backend
python -c "
from app.services.decision_engine import AccessDecisionEngine
e = AccessDecisionEngine()
print(f'Grant Threshold: {e.grant_threshold:.4f}')
print(f'Deny Threshold:  {e.deny_threshold:.4f}')
"
```

---

## 🔧 Override Thresholds (Emergency/Testing)

### Method 1: Environment Variables
```bash
# Override grant threshold to 0.25 (lower = stricter)
export DECISION_THRESHOLD_GRANT=0.25

# Override deny threshold to 0.75 (higher = more lenient)
export DECISION_THRESHOLD_DENY=0.75

# Restart application (thresholds loaded on startup)
```

### Method 2: Update Model Files
```bash
# Edit isolation_forest.pkl or ensemble_config.pkl
# (Not recommended - use env vars or auto-tuning instead)
```

### Method 3: Temporarily Modify Code (Last Resort)
```python
# In backend/app/services/decision_engine.py __init__:
self.grant_threshold = 0.25  # Temporary override
self.deny_threshold = 0.75
```

---

## 📈 Performance Impact

### Threshold Effect on Decisions
| Threshold Change | Impact |
|-----------------|--------|
| Lower grant | More "granted" decisions, fewer alerts |
| Higher grant | More "delayed" decisions, more alerts |
| Lower deny | More "denied" decisions, fewer get through |
| Higher deny | More "delayed" decisions, more delays |

### False Positive vs False Negative Trade-off
- **Lower threshold** = Fewer legitimate users denied (fewer false positives)
- **Higher threshold** = Fewer attackers get through (fewer false negatives)
- **Auto-tuning** balances to: precision ≥ 72%, recall ≥ 80%

---

## 🐛 Troubleshooting

### Issue: Using old thresholds after auto-tuning
**Solution**: Restart application to load new thresholds from model files

### Issue: Thresholds not updating even after retune
**Solution**: Check if environment variables are overriding
```bash
echo $DECISION_THRESHOLD_GRANT  # Should be empty if not set
```

### Issue: Access decisions inconsistent with alert severity
**Solution**: Ensure both use same thresholds - check logs for threshold values at startup

### Issue: Want to verify a specific threshold is being used
**Solution**: Check logs - DecisionEngine prints loaded thresholds:
```
Loaded grant threshold from ensemble_config: 0.3200
Loaded deny threshold from ensemble_config: 0.7100
```

---

## 📝 Code References

### Where Thresholds Are Used

| File | Function | Usage |
|------|----------|-------|
| `backend/app/services/decision_engine.py` | `make_decision()` | Compare risk_score to thresholds |
| `backend/app/services/ml_service.py` | `determine_alert_severity()` | Map score to severity level |
| `backend/app/routes/access.py` | `request_access()` | Fallback rule-based scoring |

### Where Thresholds Are Loaded
```python
# Primary loading
backend/app/services/decision_engine.py:_load_thresholds()

# Auto-tuning
scripts/retune_threshold.py  # Calculates and saves
scripts/ci_retune_threshold.py  # Runs in CI/CD
```

---

## ✅ Verification Checklist

- [ ] Run `backend/verify_thresholds_simple.py` - all 7 checks pass
- [ ] Check logs on startup for "Loaded grant threshold from..."
- [ ] Verify no hardcoded threshold values in access decisions
- [ ] Confirm auto-tuning can update thresholds
- [ ] Test environment variable override works
- [ ] Validate alert severity uses same thresholds as decisions

---

## 🎓 Key Concepts

### Why Dynamic Thresholds?
- Different datasets have different optimal thresholds
- Thresholds should adapt as model improves
- Hardcoding prevents optimization

### Why Two Thresholds?
- **grant_threshold**: Confident normal access (< 0.30)
- **deny_threshold**: Confident suspicious access (> 0.70)
- **Between**: Uncertain - requires manual review

### Why Auto-Tuning Works
1. More data = better threshold estimates
2. F1-score optimization finds best balance
3. Periodic retuning keeps system current
4. No manual configuration needed

---

## 📞 Support

### Questions?
1. Check `THRESHOLD_MANAGEMENT_FIX.md` for detailed documentation
2. Review `scripts/retune_threshold.py` for tuning logic
3. Check `backend/app/services/decision_engine.py` for loading order
4. Run verification script: `backend/verify_thresholds_simple.py`

### Reporting Issues
- Thresholds stuck at defaults? Check if model files exist
- Thresholds not updating? Check environment variables
- Alerts using wrong severity? Verify create_alert receives thresholds

---

**Last Updated**: April 19, 2026
**Status**: Production Ready ✅
**Auto-Tuning**: Enabled ✓
**Hardcoded Values**: Removed ✓
