# RaptorX ML Pipeline Modes

## Overview

The RaptorX pipeline now supports two training modes optimized for different use cases:

- **dev** (default): Training-focused configuration with stable signal for model development
- **prod-like**: Production-ready configuration with low-prevalence calibration for real-world deployment

## Quick Start

### Default Development Run
```bash
python run_pipeline.py
```
or explicitly with dev mode:
```bash
python run_pipeline.py --mode dev
```

### Production-Like Run
```bash
python run_pipeline.py --mode prod-like
```

## Mode Configurations

### Dev Mode

**Purpose**: Fast iteration, model debugging, hyperparameter exploration

| Setting | Value | Reasoning |
|---------|-------|-----------|
| Data Profile | `dev` | 7% anomalies (good signal for tuning) |
| Training Data | 500,000 records | Full size for robust learning |
| Threshold Tuning Target | 2% anomaly ratio | Intermediate for testing |
| Decision Thresholds | Min precision: 0.72, Min recall: 0.80 | Production-grade guardrails |
| Seed | 42 (fixed) | Reproducibility across runs |

**Use case**: Local testing, model improvements, feature engineering

### Prod-Like Mode

**Purpose**: Production candidate validation with realistic anomaly prevalence

| Setting | Value | Reasoning |
|---------|-------|-----------|
| Data Profile | `prod` | 1.5% anomalies (matches typical real systems) |
| Training Data | 500,000 records | Same size; matches deployment scale |
| Threshold Tuning Target | 1.5% anomaly ratio | Real-world prevalence alignment |
| Decision Thresholds | Min precision: 0.72, Min recall: 0.80 | Same guardrails as dev |
| Seed | 42 (fixed) | Reproducibility across runs |

**Use case**: Release candidate validation, threshold stability testing before deployment

## Environment Variables (Advanced)

You can override defaults via environment variables. This is useful for one-off runs:

### Data Generation
```bash
$env:RAPTORX_DATA_PROFILE='prod'           # dev or prod
$env:RAPTORX_ANOMALY_RATIO='0.015'         # custom ratio (0.0 - 0.5)
$env:RAPTORX_TOTAL_RECORDS='500000'        # dataset size
$env:RAPTORX_RANDOM_SEED='42'              # reproducibility
$env:RAPTORX_NUM_USERS='500'               # synthetic user count
```

### Threshold Tuning
```bash
$env:RAPTORX_TARGET_ANOMALY_RATIO='0.02'   # prevalence for tuning calibration
$env:RAPTORX_MIN_PRECISION='0.72'          # precision floor for valid threshold
$env:RAPTORX_MIN_RECALL='0.80'             # recall floor for valid threshold
```

### Pipeline Control
```bash
$env:RAPTORX_PIPELINE_MODE='dev'           # dev or prod-like (if not using --mode flag)
```

## Example Workflows

### Test with Custom Anomaly Ratio
```bash
$env:RAPTORX_DATA_PROFILE='custom'
$env:RAPTORX_ANOMALY_RATIO='0.05'
python scripts/generate_data_fixed.py
```

### Tune Thresholds on Ultra-Low Prevalence
```bash
$env:RAPTORX_TARGET_ANOMALY_RATIO='0.01'
python scripts/retune_threshold.py
```

### Reproduce Exact Dev Run
```bash
python run_pipeline.py --mode dev
# All settings are environment-fixed with seed=42
```

## Pipeline Outputs

Regardless of mode, the pipeline generates:

```
data/
  raw/
    train.csv          # Training features (80% of data)
    test.csv           # Test features (20% of data)
  processed/
    train_scaled.csv   # Normalized training features
    test_scaled.csv    # Normalized test features

ml/
  models/
    isolation_forest.pkl        # Trained IF model + best threshold
    autoencoder.keras           # Trained AE model
    autoencoder_config.pkl      # AE normalization metadata
    ensemble_config.pkl         # Ensemble weights + thresholds
    scaler_13.pkl               # Feature scaler for 13 base features

  results/
    isolation_forest/           # IF tuning results
    autoencoder/                # AE tuning results
    ensemble/                   # Ensemble comparison
```

## Performance Expectations

### Dev Mode (7% anomalies)
- **Expected Performance**: F1 > 0.95 (very high signal)
- **Use**: Validate model learning and relative improvements

### Prod-Like Mode (1.5% anomalies)
- **Expected Performance**: F1 ~0.85-0.92 (realistic imbalance)
- **Verdict**: "Excellent" to "Good" for production adoption
- **Use**: Confirm thresholds generalize to low-prevalence settings

## Decision Thresholds

The pipeline computes a continuous **risk score** (0.0–1.0) combining:
- **Isolation Forest** (30% weight): Anomaly divergence from forest structure
- **Autoencoder** (70% weight): Reconstruction error deviation from normal patterns

These are mapped to access decisions:
- **risk < 0.30** → **GRANTED** (low anomaly risk)
- **0.30 ≤ risk < 0.70** → **DELAYED** (elevated risk; security review suggested)
- **risk ≥ 0.70** → **DENIED** (high anomaly risk; blocked)

Thresholds are tuned per prevalence target to maintain precision and recall guardrails.

## Troubleshooting

**Q: "F1 > 0.95" warning in prod-like mode?**  
A: The synthetic data may still be too cleanly separable. Use prod mode (1.5% anomalies) instead of dev (7%) for more realistic overlap.

**Q: Thresholds don't match between dev and prod-like runs?**  
A: This is expected—thresholds are tuned to the anomaly prevalence. Prod-like uses ~1.5% prevalence, so thresholds shift lower to catch the rarer anomalies without excessive false positives.

**Q: How do I integrate with real data?**  
A: Once you have production logs:
1. Replace `data/raw/train.csv` with real positive records (normal behavior)
2. Keep `data/raw/test.csv` with real labels for unbiased evaluation
3. Run `python scripts/explore_and_prepare.py` to re-scale
4. Run `python scripts/retune_threshold.py` with `RAPTORX_TARGET_ANOMALY_RATIO` set to your observed anomaly rate
5. Update decision thresholds in `ml/models/ensemble_config.pkl` with the new values

## Future Enhancements

- Temporal validation: Hold out recent weeks for unbiased evaluation
- Multi-seed runs: Validate stability by averaging over 3–5 random seeds
- Cost-sensitive thresholding: Weight false positives vs false negatives by operational impact
- Live monitoring: Continuous threshold retuning from production outcomes

---

**Last Updated**: 2026-02-23  
**Default Mode**: `dev`  
**Recommended for Production Candidates**: `prod-like`
