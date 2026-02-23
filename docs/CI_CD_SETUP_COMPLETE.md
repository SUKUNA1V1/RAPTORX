# CI/CD Integration Complete

## Summary

RAPTORX now has a production-ready CI/CD pipeline for automated model retuning and validation. All components are configured and ready to deploy.

## What's Been Added

### 1. GitHub Actions Workflows

Three automated workflows in `.github/workflows/`:

#### **retune-thresholds.yml** ✅
- Automatically retunes anomaly detection thresholds
- **Schedule**: Every Sunday at 2 AM UTC (customize as needed)
- **Manual trigger**: Available via GitHub Actions UI
- **Validates F1 score** (0.70-0.95 range)
- **Updates models** only if validation passes
- **Artifacts**: Updated models, logs, results JSON

#### **model-validation.yml** ✅
- Runs on code changes to model files
- **Tests on**: Python 3.11 and 3.13
- **Checks**:
  - Code linting (pylint)
  - Type checking (mypy)
  - Decision engine functionality
  - Thread safety (5 concurrent predictions)
  - Model artifact integrity

#### **deploy-models.yml** ✅
- Deploys validated models to staging/production
- **Auto-triggers** after successful threshold retuning
- **Manual option** for production deployments
- **Pre-checks**: Model verification, artifact validation

### 2. CI/CD Scripts

#### **ci_pipelines.sh** (Local Helper)
```bash
./ci_pipelines.sh retune      # Run threshold retuning
./ci_pipelines.sh validate    # Validate with structured output
./ci_pipelines.sh test        # Run tests
./ci_pipelines.sh logs        # View logs
./ci_pipelines.sh status      # Check workflow status
```

#### **ci_retune_threshold.py** (Structured Output)
- Wrapper for `retune_threshold.py` with JSON output
- Used by GitHub Actions for parsed results
- Can be run locally: `python ci_retune_threshold.py`
- Outputs: `retune_results.json` with detailed metrics

### 3. Configuration Files

#### **.github/ci-cd-config.json**
- Comprehensive configuration reference
- Threshold definitions
- Artifact specifications
- Environment settings
- Scheduling options

#### **CI_CD_GUIDE.md**
- Complete pipeline documentation
- Architecture diagrams
- Troubleshooting guide
- Advanced deployment options
- Best practices

### 4. Backend Integration

Added performance monitoring endpoints (already configured):
- `GET /api/stats/database-performance` - Query metrics
- `GET /api/stats/api-performance` - API endpoint metrics
- `GET /api/stats/system-health` - CPU/memory/disk stats

## Getting Started

### 1. Enable GitHub Actions

1. Go to your repository → Settings → Actions
2. Select "All actions and reusable workflows"
3. Save

### 2. Test Locally (Recommended)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Test threshold retuning
python ci_retune_threshold.py

# Check results
cat retune_results.json | python -m json.tool
```

### 3. Trigger First Pipeline Run

```bash
# Option 1: Wait for schedule (Sunday 2 AM UTC)
# Option 2: Manually trigger from Actions tab
# Go to: Actions → Retune Anomaly Detection Thresholds → Run workflow
```

### 4. Monitor Results

1. Go to repository → Actions tab
2. Select workflow run
3. View logs in real-time
4. Download artifacts (models, logs)
5. Check performance dashboard: `/performance`

## File Structure

```
.github/
├── workflows/
│   ├── retune-thresholds.yml      # Auto threshold retuning
│   ├── model-validation.yml        # Validation on code push
│   └── deploy-models.yml           # Deploy to staging/prod
├── copilot-instructions.md
└── ci-cd-config.json               # Configuration reference

root/
├── CI_CD_GUIDE.md                  # Comprehensive guide
├── ci_pipelines.sh                 # Local helper script
├── ci_retune_threshold.py          # CI/CD-friendly wrapper
├── retune_threshold.py             # Original retuning script
└── [other components...]
```

## Key Features

✅ **Automated Scheduling**
- Threshold retuning: Weekly by default
- Customizable via cron syntax

✅ **Quality Gates**
- F1 score validation (0.70-0.95 range)
- Blocks production deployment if invalid
- Detailed verdict (excellent/good/moderate/needs-work)

✅ **Model Versioning**
- All updates registered in model registry
- Artifacts preserved for rollback
- 30-day retention

✅ **Comprehensive Validation**
- Multi-Python version testing
- Thread safety verification
- Artifact integrity checks

✅ **Deployment Options**
- Auto-deploy to staging
- Optional manual production approval
- Zero-downtime deployment ready

✅ **Monitoring & Logging**
- Structured JSON output
- Full execution logs
- Performance metrics tracked

## Validation Verdicts

The pipeline automatically evaluates model performance:

| F1 Score | Verdict | Action |
|----------|---------|--------|
| 0.85-0.92 | EXCELLENT | Auto-deploy to staging |
| 0.80-0.85 | GOOD | Deploy with monitoring |
| 0.70-0.80 | MODERATE | Block until reviewed |
| <0.70 | NEEDS_WORK | Investigation required |

## Next Steps

### 1. Customize Schedule (Optional)

Edit `.github/workflows/retune-thresholds.yml`:

```yaml
on:
  schedule:
    - cron: '0 2 * * 0'  # Change this line
```

Examples:
- Daily: `'0 2 * * *'`
- Weekdays: `'0 2 * * 1-5'`
- Monthly: `'0 2 1 * *'`

### 2. Set Up Notifications (Optional)

GitHub Actions can notify on failures:

Settings → Actions → Notifications

### 3. Connect to Cloud Storage (Optional)

For production deployments, add to `deploy-models.yml`:

```yaml
- name: Deploy to S3
  run: |
    aws s3 cp models/ s3://bucket/ml-models/ --recursive
```

### 4. Set Deployment Environment (Optional)

GitHub Settings → Environments → Create "production":
- Deployment branches: main
- Deployment reviewers: Your team
- Required reviewers approval

## Monitoring Dashboard

After first successful run, view metrics at:
- **Local**: http://localhost:3000/performance
- **Deployment**: Your app URL + /performance

Metrics tracked:
- Database query performance
- API endpoint response times
- System health (CPU, memory, disk)
- Slow query logs
- Threshold history

## Troubleshooting

### Workflow Won't Trigger
- Check Actions are enabled in Settings
- Verify workflow file syntax (use Actions → Edit)
- Check runner availability

### Tests Failing
```bash
# Test locally first
./ci_pipelines.sh test

# Check required Python packages
pip list | grep -E "scikit|tensorflow|pytest"
```

### Model Update Issues
```bash
# Validate model files
python -c "import joblib; joblib.load('ml/models/isolation_forest.pkl')"

# Check model registry
python -c "import json; print(json.load(open('ml/models/model_registry.json')))"
```

## Performance

Expected pipeline runtime:
- Threshold retuning: 5-10 minutes
- Validation: 3-5 minutes
- Deployment: 2-3 minutes
- **Total**: ~10-18 minutes

GitHub Actions allocation:
- CPU: 2 cores
- Memory: 7 GB
- Disk: 20 GB
- Timeout: 30 minutes

## Security

- ✅ Models signed via registry
- ✅ Artifacts verified before deployment
- ✅ GitHub Actions uses ubuntu-latest
- ✅ No sensitive data in logs
- ✅ Production approval required (optional)

## Documentation

- **Quick Start**: Run `./ci_pipelines.sh help`
- **Full Guide**: Read `CI_CD_GUIDE.md`
- **Config Reference**: See `.github/ci-cd-config.json`
- **Workflow Details**: Check `.github/workflows/*.yml`

## Support

For issues:
1. Check GitHub Actions logs
2. Run `./ci_pipelines.sh test` locally
3. Review `CI_CD_GUIDE.md` troubleshooting section
4. Verify data files exist in `data/processed/`

---

## Quick Reference

```bash
# Local testing
./ci_pipelines.sh retune

# View all workflows
gh run list

# View specific run
gh run view <RUN_ID> --log

# Check latest deployment
gh run list -w deploy-models.yml

# View created artifacts
gh run view <RUN_ID> --json artifacts
```

---

**Status**: ✅ Production Ready
**Version**: 1.0
**Last Updated**: 2026-02-22
