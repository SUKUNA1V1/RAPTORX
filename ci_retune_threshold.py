"""CI/CD wrapper for threshold retuning with structured output."""

import sys
import json
import logging
import traceback
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('threshold_retuning_ci')


def run_retune_threshold() -> Dict[str, Any]:
    """Run threshold retuning and return structured results."""
    
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "status": "started",
        "metrics": {},
        "errors": [],
    }
    
    try:
        logger.info("=" * 60)
        logger.info("THRESHOLD RETUNING CI/CD PIPELINE")
        logger.info("=" * 60)
        
        # Import and run retune_threshold
        import retune_threshold
        
        logger.info("Loading validation data...")
        val_df = retune_threshold.load_validation_data()
        logger.info(f"Validation data shape: {val_df.shape}")
        
        logger.info("Loading models...")
        if_data = retune_threshold.joblib.load("ml/models/isolation_forest.pkl")
        ae_model = retune_threshold.keras.models.load_model("ml/models/autoencoder.h5")
        ae_config = retune_threshold.joblib.load("ml/models/autoencoder_config.pkl")
        logger.info("Models loaded successfully")
        
        # Get validation data
        X_val = val_df[retune_threshold.FEATURE_COLS_13].values
        y_val = val_df["label"].values
        
        logger.info("Computing anomaly scores...")
        combined_val = retune_threshold.compute_scores(
            X_val, if_data, ae_model, ae_config
        )
        
        logger.info("Finding optimal threshold...")
        thresholds = retune_threshold.np.linspace(0, 1, 101)
        best_t = None
        best_f1 = -1
        
        for t in thresholds:
            preds = (combined_val >= t).astype(int)
            f1 = retune_threshold.f1_score(y_val, preds, zero_division=0)
            if f1 > best_f1:
                best_f1 = f1
                best_t = t
        
        logger.info(f"Best threshold found: {best_t:.4f} (F1: {best_f1:.4f})")
        results["metrics"]["best_threshold"] = float(best_t)
        results["metrics"]["validation_f1"] = float(best_f1)
        
        # Evaluate on test set
        logger.info("Evaluating on test set...")
        test_df = retune_threshold.pd.read_csv("data/processed/test_scaled.csv")
        X_test = test_df[retune_threshold.FEATURE_COLS_13].values
        y_test = test_df["label"].values
        
        combined_test = retune_threshold.compute_scores(
            X_test, if_data, ae_model, ae_config
        )
        preds_test = (combined_test >= best_t).astype(int)
        
        test_metrics = {
            "f1": float(retune_threshold.f1_score(y_test, preds_test, zero_division=0)),
            "precision": float(retune_threshold.precision_score(y_test, preds_test, zero_division=0)),
            "recall": float(retune_threshold.recall_score(y_test, preds_test, zero_division=0)),
            "auc": float(retune_threshold.roc_auc_score(y_test, combined_test)),
        }
        results["metrics"]["test"] = test_metrics
        
        logger.info("Test Set Performance:")
        logger.info(f"  Precision: {test_metrics['precision']:.4f}")
        logger.info(f"  Recall: {test_metrics['recall']:.4f}")
        logger.info(f"  F1-Score: {test_metrics['f1']:.4f}")
        logger.info(f"  AUC-ROC: {test_metrics['auc']:.4f}")
        
        # Validation logic
        f1_test = test_metrics['f1']
        if 0.85 <= f1_test <= 0.92:
            verdict = "EXCELLENT"
            results["status"] = "success"
        elif 0.80 <= f1_test < 0.85:
            verdict = "GOOD"
            results["status"] = "success"
        elif 0.70 <= f1_test < 0.80:
            verdict = "MODERATE"
            results["status"] = "warning"
        else:
            verdict = "NEEDS_WORK"
            results["status"] = "failed"
            results["errors"].append(f"F1 score {f1_test:.4f} below acceptable threshold 0.70")
        
        results["metrics"]["verdict"] = verdict
        logger.info(f"Verdict: {verdict}")
        
        # Check for overfitting
        if f1_test > 0.95:
            logger.warning("F1 > 0.95: Possible data leakage or too-easy dataset")
            results["errors"].append("F1 > 0.95 suggests possible data issues")
        
        # Update models if valid
        if results["status"] in ["success", "warning"]:
            logger.info("Updating model files...")
            if_data["best_threshold"] = float(best_t)
            retune_threshold.joblib.dump(if_data, "ml/models/isolation_forest.pkl")
            retune_threshold.register_model_version(
                "isolation_forest",
                ["ml/models/isolation_forest.pkl"],
                "ml/models"
            )
            logger.info(f"Updated isolation_forest.pkl with threshold: {best_t:.4f}")
            
            try:
                ensemble_path = retune_threshold.resolve_model_artifact_path(
                    "ensemble_config.pkl", "ensemble"
                )
                ensemble = retune_threshold.joblib.load(ensemble_path)
                ensemble["best_threshold"] = float(best_t)
                ensemble["threshold"] = float(best_t)
                retune_threshold.joblib.dump(
                    ensemble,
                    "ml/models/ensemble_config.pkl"
                )
                retune_threshold.register_model_version(
                    "ensemble",
                    ["ml/models/ensemble_config.pkl"],
                    "ml/models"
                )
                logger.info(f"Updated ensemble_config.pkl with threshold: {best_t:.4f}")
            except Exception as e:
                logger.warning(f"Ensemble update skipped: {e}")
        
        return results
        
    except Exception as exc:
        logger.error(f"Error during threshold retuning: {exc}")
        logger.error(traceback.format_exc())
        results["status"] = "failed"
        results["errors"].append(str(exc))
        return results
    
    finally:
        logger.info("=" * 60)
        logger.info(f"Pipeline Status: {results['status'].upper()}")
        logger.info("=" * 60)


def main():
    """Main entry point for CI/CD."""
    results = run_retune_threshold()
    
    # Output JSON for CI/CD consumption
    output_file = Path("retune_results.json")
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"\nResults saved to {output_file}")
    
    # Exit with appropriate code
    if results["status"] == "failed":
        sys.exit(1)
    elif results["status"] == "warning":
        sys.exit(0)  # But log warning
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
