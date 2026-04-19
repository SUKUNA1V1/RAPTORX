#!/usr/bin/env python3
"""Quick test of explainability module."""

import sys
from pathlib import Path

# Add scripts to path
sys.path.insert(0, str(Path.cwd() / 'scripts'))

try:
    from explainability import ModelExplainer
    
    print("Loading explainability module...")
    explainer = ModelExplainer()
    
    print("Computing feature importance...")
    data = explainer.explain_feature_importance()
    
    print(f"\n✓ Success! Retrieved {len(data.get('features', []))} features")
    print(f"✓ Top 3: {data.get('top_3_features', [])}")
    print("\nTop 5 features by importance:")
    for f in data.get('features', [])[:5]:
        print(f"  - {f['feature']}: {f['importance']:.3f}")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
