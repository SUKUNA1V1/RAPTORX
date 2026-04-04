import joblib
import numpy as np
from tensorflow import keras
import os

os.chdir('.')

# Load models
ae_model = keras.models.load_model('ml/models/autoencoder.keras')
ae_config = joblib.load('ml/models/autoencoder_config.pkl')

# Test features (first 13 only, as models expect)
test_cases = [
    ("Night shift worker", [2, 2, 0, 3, 120, 1, 2, 0, 1, 0, 1, 58, 1.6]),
    ("New employee", [9, 2, 0, 5, 60, 0.5, 1, 0, 1, 0, 1, 51, 1.8]),
    ("Admin Saturday", [10, 5, 1, 2, 200, 1, 3, 1, 1, 0, 0, 130, 0.5]),
]

print("Reconstruction Error Analysis:")
print("=" * 60)
print(f"Max error threshold: {ae_config['max_error']:.6f}")
print()

for name, features in test_cases:
    X = np.array(features).reshape(1, -1)
    recon = ae_model.predict(X, verbose=0)
    error = float(np.mean(np.power(X - recon, 2)))
    normalized = np.clip((error - ae_config['min_error']) / (ae_config['max_error'] - ae_config['min_error']), 0, 1)
    
    print(f"{name}:")
    print(f"  Raw error: {error:.6f}")
    print(f"  Exceeds max? {error > ae_config['max_error']}")
    print(f"  Normalized score: {normalized:.4f}")
    print()
