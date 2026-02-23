#!/bin/bash

# CI/CD Pipeline Helper Script
# Usage: ./ci_pipelines.sh [command]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
mkdir -p "${LOG_DIR}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

show_help() {
    cat << EOF
RAPTORX CI/CD Pipeline Helper

Usage: ./ci_pipelines.sh [command]

Commands:
    retune          Run threshold retuning locally
    validate        Validate models without updating
    test            Run model validation tests
    deploy-staging  Deploy models to staging
    deploy-prod     Deploy models to production
    logs            Show recent CI/CD logs
    status          Check CI/CD workflow status
    help            Show this help message

Environment Variables:
    CI_MODE=true    Run in CI/CD mode (automated)
    VALIDATE_ONLY=true  Only validate, don't update models
    DEPLOY_ENV=staging|production

Examples:
    ./ci_pipelines.sh retune
    ./ci_pipelines.sh validate
    CI_MODE=true ./ci_pipelines.sh retune
EOF
}

run_retune() {
    print_header "Running Threshold Retuning"
    
    if [ ! -f "retune_threshold.py" ]; then
        print_error "retune_threshold.py not found"
        return 1
    fi
    
    LOG_FILE="${LOG_DIR}/retune_$(date +%Y%m%d_%H%M%S).log"
    
    echo "Running retune_threshold.py..."
    python retune_threshold.py 2>&1 | tee "${LOG_FILE}"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        print_success "Threshold retuning completed"
        print_success "Log saved to ${LOG_FILE}"
        return 0
    else
        print_error "Threshold retuning failed"
        return 1
    fi
}

run_ci_retune() {
    print_header "Running CI/CD Threshold Retuning"
    
    if [ ! -f "ci_retune_threshold.py" ]; then
        print_error "ci_retune_threshold.py not found"
        return 1
    fi
    
    LOG_FILE="${LOG_DIR}/ci_retune_$(date +%Y%m%d_%H%M%S).log"
    
    echo "Running ci_retune_threshold.py with structured output..."
    python ci_retune_threshold.py 2>&1 | tee "${LOG_FILE}"
    
    if [ -f "retune_results.json" ]; then
        echo ""
        echo "Results saved to retune_results.json:"
        cat retune_results.json | python -m json.tool
        print_success "CI/CD retune completed"
        return 0
    else
        print_error "CI/CD retune failed - no results file"
        return 1
    fi
}

validate_models() {
    print_header "Validating Models"
    
    python3 << 'EOF'
import joblib
import numpy as np
from pathlib import Path

models_ok = True
models_dir = Path("ml/models")

print("Checking model files...")
required_models = {
    "isolation_forest.pkl": "Isolation Forest",
    "autoencoder.pkl": "Autoencoder",
    "ensemble_config.pkl": "Ensemble Config",
}

for model_file, model_name in required_models.items():
    model_path = models_dir / model_file
    if model_path.exists():
        try:
            model = joblib.load(str(model_path))
            size_mb = model_path.stat().st_size / 1024 / 1024
            print(f"✅ {model_name}: OK ({size_mb:.2f} MB)")
        except Exception as e:
            print(f"❌ {model_name}: FAILED - {e}")
            models_ok = False
    else:
        print(f"⚠️  {model_name}: NOT FOUND")

if models_ok:
    print("\n✅ All models validation passed")
    exit(0)
else:
    print("\n❌ Model validation failed")
    exit(1)
EOF
}

run_tests() {
    print_header "Running Model Tests"
    
    python3 << 'EOF'
import sys
import numpy as np
from decision_engine import DecisionEngine

print("Testing DecisionEngine...")

try:
    engine = DecisionEngine()
    print("✅ Engine initialized")
    
    # Test prediction
    test_data = np.random.rand(1, 13)
    result = engine.predict(test_data)
    print(f"✅ Prediction works: {result}")
    
    # Test status
    status = engine.status()
    print(f"✅ Status check: {status}")
    
    # Test thread safety
    import threading
    results = []
    
    def worker():
        data = np.random.rand(1, 13)
        results.append(engine.predict(data))
    
    threads = [threading.Thread(target=worker) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    
    print(f"✅ Thread safety: {len(results)} concurrent predictions")
    print("\n✅ All tests passed!")
    exit(0)
    
except Exception as e:
    print(f"❌ Test failed: {e}")
    exit(1)
EOF
}

show_logs() {
    print_header "Recent CI/CD Logs"
    
    if [ ! -d "${LOG_DIR}" ] || [ -z "$(ls -A ${LOG_DIR})" ]; then
        print_warning "No logs found"
        return
    fi
    
    echo "Latest 5 log files:"
    ls -lt "${LOG_DIR}" | head -6 | tail -5
    
    echo ""
    echo "View latest log with: tail -f logs/retune_*.log"
}

check_status() {
    print_header "CI/CD Workflow Status"
    
    echo "GitHub Actions Workflows:"
    echo "  Retune Thresholds    - .github/workflows/retune-thresholds.yml"
    echo "  Model Validation     - .github/workflows/model-validation.yml"
    echo "  Deploy Models        - .github/workflows/deploy-models.yml"
    echo ""
    echo "To check status: https://github.com/username/raptorx/actions"
    echo ""
    
    if command -v gh &> /dev/null; then
        echo "Recent workflow runs:"
        gh run list -L 5 || print_warning "Could not fetch runs (gh CLI not authenticated)"
    else
        print_warning "GitHub CLI (gh) not installed - cannot fetch live status"
    fi
}

main() {
    local command="${1:-help}"
    
    case "${command}" in
        retune)
            run_retune
            ;;
        validate)
            run_ci_retune
            ;;
        test)
            run_tests
            ;;
        deploy-staging)
            print_header "Deploy to Staging"
            echo "This would deploy updated models to staging..."
            echo "Run: git push to trigger GitHub Actions deploy-models.yml"
            ;;
        deploy-prod)
            print_header "Deploy to Production"
            echo "⚠️  CAUTION: Production deployment"
            echo "Ensure all tests pass before deploying!"
            echo "Run with: ACTION=deploy-prod workflow_dispatch"
            ;;
        logs)
            show_logs
            ;;
        status)
            check_status
            ;;
        help|--help|-h|"")
            show_help
            ;;
        *)
            print_error "Unknown command: ${command}"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
