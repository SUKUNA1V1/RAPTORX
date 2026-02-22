# CI/CD Pipeline Documentation

## Overview

RAPTORX includes a comprehensive CI/CD pipeline for automated model validation, threshold retuning, and deployment. The pipeline ensures model quality and enables continuous model improvement.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   CI/CD Pipeline                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Trigger Events:                                            │
│  ├── Schedule (Weekly)                                      │
│  ├── Manual Trigger (Actions Dashboard)                     │
│  ├── Code Push (Model-related files)                        │
│  └── Workflow Completion                                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. RETUNE THRESHOLDS                                       │
│     ├── Load validation/test data                           │
│     ├── Run decision engine on test set                     │
│     ├── Find optimal thresholds                             │
│     ├── Validate F1 score (0.70-0.95)                       │
│     └── Update model files if valid                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  2. MODEL VALIDATION                                        │
│     ├── Lint and type check                                 │
│     ├── Unit tests                                          │
│     ├── Thread safety tests                                 │
│     ├── Artifact validation                                 │
│     └── Threshold range checks                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  3. DEPLOY MODELS                                           │
│     ├── Download updated artifacts                          │
│     ├── Verify integrity                                    │
│     ├── Deploy to staging                                   │
│     └── Optional: Deploy to production                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Workflows

### 1. Retune Thresholds (`retune-thresholds.yml`)

**Purpose**: Automatically retune anomaly detection thresholds based on latest data

**Triggers**:
- Schedule: Every Sunday at 2 AM UTC
- Manual: Click "Run workflow" in Actions tab
- Input: Optional `validate_only` flag

**Steps**:
1. Checkout code
2. Install dependencies
3. Download data artifacts
4. Run threshold retuning (`retune_threshold.py`)
5. Validate F1 score range (0.70-0.95)
6. Update model files if valid
7. Upload artifacts and logs

**Outputs**:
- `updated-models` artifact (if successful)
- `retune-logs` artifact (always)
- `retune_results.json` with metrics

**Success Criteria**:
- F1 score between 0.70 and 0.95
- No errors during execution
- Previous F1 ≥ 0.70

### 2. Model Validation (`model-validation.yml`)

**Purpose**: Validate models after code changes

**Triggers**:
- Push to files: `decision_engine.py`, `train_*.py`, model routes
- Pull requests with model changes

**Runs on**:
- Python 3.11
- Python 3.13 (checks compatibility)

**Tests**:
- ✅ Code linting (pylint)
- ✅ Type checking (mypy)
- ✅ Unit tests (pytest)
- ✅ Decision engine functionality
- ✅ Model artifacts exist
- ✅ Threshold validation
- ✅ Thread safety (5 concurrent predictions)

### 3. Deploy Models (`deploy-models.yml`)

**Purpose**: Deploy validated models to staging/production

**Triggers**:
- Successful threshold retuning completion
- Manual workflow dispatch with environment selection

**Deployment Options**:
- **Staging**: Automatic after successful retuning
- **Production**: Manual approval required

**Pre-deployment Checks**:
- Artifact verification
- Model integrity validation
- Checksum verification

## Local Usage

### Using Helper Script

```bash
# Run threshold retuning locally
./ci_pipelines.sh retune

# Validate models with structured output
./ci_pipelines.sh validate

# Run tests
./ci_pipelines.sh test

# Show logs
./ci_pipelines.sh logs

# Check workflow status
./ci_pipelines.sh status
```

### Manual Execution

```bash
# Run threshold retuning
python retune_threshold.py

# Run CI/CD wrapper (with JSON output)
python ci_retune_threshold.py

# View results
cat retune_results.json | python -m json.tool
```

## Environment Variables

```bash
# CI/CD Mode
export CI_MODE=true

# Validation Only (don't update models)
export VALIDATE_ONLY=true

# Target Environment
export DEPLOY_ENV=staging  # or 'production'

# Data and Model Paths
export DATA_DIR=data/processed
export MODEL_PATH=ml/models
```

## Configuration

### Scheduling

Edit threshold retuning schedule in `.github/workflows/retune-thresholds.yml`:

```yaml
on:
  schedule:
    # Cron format: minute hour day-of-month month day-of-week
    - cron: '0 2 * * 0'  # Sunday 2 AM UTC
```

Common schedules:
- Daily: `'0 2 * * *'` (2 AM UTC every day)
- Weekly: `'0 2 * * 0'` (Sunday 2 AM UTC)
- Monthly: `'0 2 1 * *'` (1st of month at 2 AM UTC)

### Validation Thresholds

Model Performance Acceptance Criteria (in `ci_retune_threshold.py`):

```python
# F1 Score ranges
0.85-0.92  →  EXCELLENT (deploy immediately)
0.80-0.85  →  GOOD (deploy with monitoring)
0.70-0.80  →  MODERATE (requires review)
<0.70      →  NEEDS_WORK (block deployment)
```

Adjust these values based on your requirements:

```python
# Edit thresholds in ci_retune_threshold.py
if 0.85 <= f1_test <= 0.92:
    verdict = "EXCELLENT"
    # Can lower 0.85 to 0.80 if needed
```

## GitHub Actions Setup

### 1. Enable Actions

1. Go to GitHub repo → Settings → Actions
2. Enable "All actions"
3. Allow personal access tokens (if needed)

### 2. Set Secrets (Optional)

For deployment to cloud storage:

```bash
# In GitHub Settings → Secrets and Variables → Actions
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
```

### 3. Configure Branch Protection

For production deployments:

```bash
# In GitHub Settings → Branches → Branch protection rules
- Require status checks to pass before merging
- Require code reviews
- Require workflow approval
```

## Monitoring & Troubleshooting

### View Workflow Runs

```bash
# Using GitHub CLI
gh run list
gh run view <RUN_ID> --log

# Or visit
https://github.com/your-repo/actions
```

### Common Issues

**Issue**: Workflow times out
- Solution: Increase `timeout-minutes` in workflow file
- Check data download times

**Issue**: Models not found
- Solution: Ensure model paths match in `.env` and workflows
- Verify data is in correct directory

**Issue**: F1 score below threshold
- Solution: Check data quality
- Review recent changes to feature engineering
- Consider retraining base models

**Issue**: Threshold validation fails
- Solution: Check `.env` for correct DECISION_THRESHOLD values
- Verify test data hasn't changed drastically

### Debugging Locally

```bash
# Enable verbose logging
PYTHONVERBOSE=1 python ci_retune_threshold.py

# Check dependencies
pip list | grep -E "scikit|tensorflow|joblib"

# Test individual components
python -c "from retune_threshold import load_validation_data; df = load_validation_data(); print(df.shape)"
```

## Integration Points

### Backend API Integration

The updated thresholds are automatically:
1. Saved to `ml/models/isolation_forest.pkl`
2. Saved to `ml/models/ensemble_config.pkl`
3. Registered in model registry

Backend loads on startup:
```python
# In backend/app/routes/access.py
engine = get_engine()  # Loads latest threshold
```

### Frontend Monitoring

Performance monitoring dashboard shows:
- Last threshold update timestamp
- Current F1 score
- Recent validation results

Access at: `/performance` → Database Performance

## Best Practices

### 1. Data Management

```bash
# Keep validation data up-to-date
# Run retuning at least weekly
# Archive old test scores for trend analysis
```

### 2. Threshold Tuning

```bash
# Don't manually edit thresholds - use retuning pipeline
# Review verdict before deploying to production
# Monitor error rates post-deployment
```

### 3. Model Versioning

```bash
# All model updates are registered
# Maintain backward compatibility
# Test new thresholds with old models first
```

### 4. Alerting

```bash
# Set up notifications for:
# - Failed retuning runs
# - Thresholds outside expected range
# - Performance degradation
```

## Advanced: Custom Deployments

### Deploy to AWS S3

```bash
# Add to deploy-models job
- name: Deploy to S3
  run: |
    aws s3 cp models/isolation_forest.pkl s3://bucket/ml-models/
    aws s3 cp models/ensemble_config.pkl s3://bucket/ml-models/
```

### Deploy to Docker Registry

```bash
# Create docker image with new models
docker build -t raptorx:${{ github.sha }} .
docker push registry.example.com/raptorx:${{ github.sha }}
```

### Deploy to Kubernetes

```bash
# Update model ConfigMap
kubectl create configmap ml-models \
  --from-file=models/ \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Performance Metrics

### Pipeline Runtime

Typical execution times:
- Threshold retuning: 5-10 minutes
- Model validation: 3-5 minutes
- Deployment: 2-3 minutes
- **Total**: ~10-18 minutes

### Resource Usage

GitHub Actions (per run):
- CPU: 2 cores
- Memory: 7 GB
- Disk: 20 GB
- Timeout: 30 minutes (adjustable)

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review workflow YAML files
3. Test locally with `ci_pipelines.sh test`
4. Check model artifact integrity

---

**Last Updated**: 2026-02-22
**Status**: Production Ready
