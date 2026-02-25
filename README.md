# RaptorX

RaptorX is a full-stack AI access control system with a FastAPI backend and a Next.js dashboard. It ingests access events, evaluates risk with a rule engine plus ML ensemble, logs decisions, and surfaces alerts, analytics, and explainability in an operations UI.

## Table of Contents

- Overview
- Key Features
- Architecture
- Database Schema
- API Reference
- API Schemas and Examples
- ML System and Data Pipeline
- Decision Logic Deep Dive
- Feature Engineering Details
- Data Generation and Datasets
- Model Training Details
- Threshold Tuning and Evaluation
- Explainability Internals
- Observability and Monitoring
- Frontend
- Repository Layout
- Setup and Configuration
- Run (Dev and Prod)
- Scripts and Utilities
- CI/CD
- Security Notes
- Troubleshooting

## Overview

RaptorX models real-world physical access control. Users present badges at access points. The backend evaluates rule constraints (clearance, status, access-point availability) and ML risk signals, then issues a decision (granted, delayed, denied). Decisions are stored with feature context, and anomalous outcomes generate alerts. The frontend provides dashboards, logs, alert triage, simulator, ML health, and explainability tools.

## Key Features

- Real-time access decisioning (rule-based + ML ensemble)
- Access logs with filtering, pagination, and risk scores
- Anomaly alerts with severity, resolution, and false-positive flow
- Explainability endpoints for decision transparency
- Dashboard metrics and charts
- Access request simulator
- Model health and status reporting
- Audit logging with JSON-line entries
- Thread-safe ML inference for concurrent FastAPI requests
- Model registry with versioned artifacts
- Database and API performance monitoring
- CI/CD pipeline for threshold retuning, validation, and deployment

## Architecture

### Component Diagram

```mermaid
graph TD
  subgraph Frontend
    UI[Next.js Dashboard]
  end

  subgraph Backend
    API[FastAPI API]
    DE[Decision Engine]
    FE[Feature Engineering]
    OBS[API + DB Monitoring]
  end

  subgraph Data
    DB[(SQL Database)]
    MODELS[(ML Models)]
    LOGS[(Audit Logs)]
  end

  UI -->|REST| API
  API --> FE
  FE --> DE
  DE --> MODELS
  API --> DB
  DE --> LOGS
  API --> OBS
```

### Access Decision Sequence

```mermaid
sequenceDiagram
  participant Client as Badge/Frontend
  participant API as FastAPI /api/access/request
  participant DB as Database
  participant FE as Feature Extraction
  participant ML as Decision Engine
  participant ALERT as Alert Service

  Client->>API: POST access request
  API->>DB: Load User + AccessPoint
  DB-->>API: User + AccessPoint
  API->>FE: Extract features
  FE-->>API: Raw + Scaled feature vectors
  API->>ML: decide(features)
  ML-->>API: decision + scores + reasoning
  API->>DB: Insert AccessLog
  API->>ALERT: Create AnomalyAlert (if needed)
  API-->>Client: Decision response
```

### Decision Engine Class Diagram

```mermaid
classDiagram
  class AccessDecisionEngine {
    +GRANT_THRESHOLD: float
    +DENY_THRESHOLD: float
    +IF_WEIGHT: float
    +AE_WEIGHT: float
    +load_models()
    +compute_risk_score(features)
    +rule_based_score(features)
    +decide(features, raw_features, audit_context)
    +audit_decision(...)
  }
  class AccessService {
    +process_access_request(badge_id, access_point_id, timestamp)
  }
  class AlertService {
    +resolve_alert(alert, resolved_by)
    +mark_false_positive(alert, resolved_by)
  }
  class ModelExplainer {
    +explain_decision(...)
    +explain_feature_importance()
    +explain_threshold_behavior()
    +explain_model_insights()
  }

  AccessService --> AlertService
  AccessDecisionEngine --> AlertService
  AccessDecisionEngine --> ModelExplainer
```

## Database Schema

The backend uses SQLAlchemy models in [backend/app/models](backend/app/models). Primary keys are integer IDs unless otherwise noted.

### Entity Relationship Diagram

```mermaid
erDiagram
  USERS ||--o{ ACCESS_LOGS : has
  ACCESS_POINTS ||--o{ ACCESS_LOGS : has
  ACCESS_POINTS ||--o{ ACCESS_RULES : has
  ACCESS_LOGS ||--o| ANOMALY_ALERTS : triggers
  USERS ||--o{ ANOMALY_ALERTS : resolves

  USERS {
    int id PK
    string badge_id UNIQUE
    string first_name
    string last_name
    string email UNIQUE
    string phone
    string role
    string department
    int clearance_level
    bool is_active
    string pin_hash
    datetime created_at
    datetime updated_at
    datetime last_seen_at
  }

  ACCESS_POINTS {
    int id PK
    string name
    string type
    string building
    string floor
    string room
    string zone
    string status
    int required_clearance
    bool is_restricted
    string ip_address
    datetime installed_at
    string description
  }

  ACCESS_RULES {
    int id PK
    int access_point_id FK
    string role
    string department
    int min_clearance
    string allowed_days
    time time_start
    time time_end
    int max_daily_accesses
    bool is_active
    string description
    datetime created_at
  }

  ACCESS_LOGS {
    int id PK
    int user_id FK
    int access_point_id FK
    datetime timestamp
    string decision
    float risk_score
    string method
    int hour
    int day_of_week
    bool is_weekend
    int access_frequency_24h
    int time_since_last_access_min
    bool location_match
    int role_level
    bool is_restricted_area
    bool is_first_access_today
    bool sequential_zone_violation
    int access_attempt_count
    int time_of_week
    float hour_deviation_from_norm
    string badge_id_used
    json context
  }

  ANOMALY_ALERTS {
    int id PK
    int log_id FK
    string alert_type
    string severity
    string status
    bool is_resolved
    string description
    float confidence
    string triggered_by
    datetime created_at
    datetime resolved_at
    int resolved_by FK
    string notes
  }
```

### Table Details

#### users

- id: Integer, primary key, indexed
- badge_id: String, unique, indexed, required
- first_name: String, required
- last_name: String, required
- email: String, unique, indexed, required
- phone: String, nullable
- role: String, required
- department: String, nullable
- clearance_level: Integer, required, default 1
- is_active: Boolean, required, default true
- pin_hash: String, nullable
- created_at: DateTime (timezone), server default now
- updated_at: DateTime (timezone), server default now, on update now
- last_seen_at: DateTime (timezone), nullable

#### access_points

- id: Integer, primary key, indexed
- name: String, required
- type: String, required
- building: String, nullable
- floor: String, nullable
- room: String, nullable
- zone: String, nullable
- status: String, required, default "active"
- required_clearance: Integer, required, default 1
- is_restricted: Boolean, required, default false
- ip_address: String, nullable
- installed_at: DateTime (timezone), nullable
- description: String, nullable

#### access_rules

- id: Integer, primary key, indexed
- access_point_id: Integer, FK to access_points.id, required
- role: String, nullable
- department: String, nullable
- min_clearance: Integer, nullable
- allowed_days: String, nullable
- time_start: Time, nullable
- time_end: Time, nullable
- max_daily_accesses: Integer, nullable
- is_active: Boolean, required, default true
- description: String, nullable
- created_at: DateTime (timezone), server default now

#### access_logs

- id: Integer, primary key, indexed
- user_id: Integer, FK to users.id, required
- access_point_id: Integer, FK to access_points.id, required
- timestamp: DateTime (timezone), required
- decision: String, required
- risk_score: Float, required, default 0.0
- method: String, nullable
- hour: Integer, nullable
- day_of_week: Integer, nullable
- is_weekend: Boolean, nullable
- access_frequency_24h: Integer, nullable
- time_since_last_access_min: Integer, nullable
- location_match: Boolean, nullable
- role_level: Integer, nullable
- is_restricted_area: Boolean, nullable
- is_first_access_today: Boolean, nullable
- sequential_zone_violation: Boolean, nullable
- access_attempt_count: Integer, nullable
- time_of_week: Integer, nullable
- hour_deviation_from_norm: Float, nullable
- badge_id_used: String, nullable
- context: JSONB (Postgres), nullable

#### anomaly_alerts

- id: Integer, primary key, indexed
- log_id: Integer, FK to access_logs.id, required
- alert_type: String, required
- severity: String, required
- status: String, required, default "open"
- is_resolved: Boolean, required, default false
- description: Text, nullable
- confidence: Float, nullable
- triggered_by: String, nullable
- created_at: DateTime (timezone), server default now
- resolved_at: DateTime (timezone), nullable
- resolved_by: Integer, FK to users.id, nullable
- notes: Text, nullable

### Migrations

- Initial migration: [backend/alembic/versions/4a2777be1624_add_ml_features_to_access_logs.py](backend/alembic/versions/4a2777be1624_add_ml_features_to_access_logs.py)

## API Reference

Base URL: http://localhost:8000

### Health

- GET /health

### Access

- POST /api/access/request
- GET /api/access/logs
- GET /api/access/logs/{id}
- DELETE /api/access/logs

### Access Points

- GET /api/access-points
- GET /api/access-points/{id}
- POST /api/access-points
- PUT /api/access-points/{id}

### Users

- GET /api/users
- GET /api/users/{id}
- POST /api/users
- PUT /api/users/{id}
- DELETE /api/users/{id}

### Alerts

- GET /api/alerts
- GET /api/alerts/{id}
- PUT /api/alerts/{id}/resolve
- PUT /api/alerts/{id}/false-positive

### Stats and Monitoring

- GET /api/stats/overview
- GET /api/stats/access-timeline
- GET /api/stats/anomaly-distribution
- GET /api/stats/top-access-points
- GET /api/stats/database-performance
- GET /api/stats/api-performance
- GET /api/stats/system-health

### ML

- GET /api/ml/status

### Explainability

Note: The endpoint prefix is spelled `/api/explainations` in code.

- GET /api/explainations/decision/{log_id}
- GET /api/explainations/feature-importance
- GET /api/explainations/threshold-behavior
- GET /api/explainations/model-insights

## API Schemas and Examples

### Access Request

Request body (POST /api/access/request):

```json
{
  "badge_id": "B001",
  "access_point_id": 3,
  "timestamp": "2026-02-22T15:04:05Z",
  "method": "badge"
}
```

Response:

```json
{
  "decision": "granted",
  "risk_score": 0.2143,
  "if_score": 0.18,
  "ae_score": 0.24,
  "log_id": 12345,
  "user_name": "Jane Doe",
  "access_point_name": "Server Room Door",
  "mode": "ensemble",
  "reasoning": "Risk score 0.2143 below grant threshold 0.30",
  "alert_created": false
}
```

### Access Log List

Response (GET /api/access/logs):

```json
{
  "items": [
    {
      "id": 12345,
      "timestamp": "2026-02-22T15:04:05Z",
      "decision": "granted",
      "risk_score": 0.2143,
      "method": "badge",
      "badge_id_used": "B001",
      "user_id": 77,
      "access_point_id": 3,
      "user": {
        "first_name": "Jane",
        "last_name": "Doe",
        "badge_id": "B001",
        "role": "admin"
      },
      "access_point": {
        "name": "Server Room Door",
        "building": "HQ",
        "room": "SR-01"
      }
    }
  ],
  "total": 1
}
```

### Alert Resolution

Request body (PUT /api/alerts/{id}/resolve):

```json
{
  "resolved_by": 12
}
```

Response:

```json
{
  "id": 99,
  "status": "resolved",
  "is_resolved": true,
  "resolved_at": "2026-02-22T15:08:11Z",
  "resolved_by": 12
}
```

## ML System and Data Pipeline

### End-to-End Data Flow

```mermaid
graph LR
  A[Access Request] --> B[Feature Extraction]
  B --> C[Scaler 13]
  C --> D[Isolation Forest]
  C --> E[Autoencoder]
  D --> F[Weighted Ensemble]
  E --> F
  F --> G[Decision + Audit Log]
  G --> H[Access Logs]
  G --> I[Anomaly Alerts]
```

### Feature Sets

RaptorX maintains two aligned schemas:

- 13-feature runtime schema (models and live scoring)
- 19-feature analytics schema (data generation and offline analysis)

Runtime (13 features):

1) hour
2) day_of_week
3) is_weekend
4) access_frequency_24h
5) time_since_last_access_min
6) location_match
7) role_level
8) is_restricted_area
9) is_first_access_today
10) sequential_zone_violation
11) access_attempt_count
12) time_of_week
13) hour_deviation_from_norm

Analytics-only additions (6 more):

14) geographic_impossibility
15) distance_between_scans_km
16) velocity_km_per_min
17) zone_clearance_mismatch
18) department_zone_mismatch
19) concurrent_session_detected

### Models

- Isolation Forest (scikit-learn)
- Autoencoder (TensorFlow/Keras)
- Weighted ensemble (default IF=0.3, AE=0.7)

### Decision Thresholds

- Grant threshold default: 0.30
- Deny threshold default: 0.70
- Central resolver: [scripts/threshold_utils.py](scripts/threshold_utils.py)

### Model Registry

Artifacts are versioned in `ml/models/versions/` with an active pointer in `ml/models/current.json`.

- Registry helper: [scripts/model_registry.py](scripts/model_registry.py)
- Resolve artifact paths with `resolve_model_artifact_path()`
- Register versions with `register_model_version()`

### Audit Logging

The decision engine emits JSON-line entries:

- File: `logs/access_decisions_audit.log`
- Fields: timestamp, decision, risk score, model scores, thresholds, feature hashes, audit context

### Thread Safety

Inference is thread-safe:

- Class-level initialization lock
- Instance-level re-entrant prediction lock
- Verified in [THREAD_SAFETY.md](THREAD_SAFETY.md)

### Explainability

The explainability module in [scripts/explainability.py](scripts/explainability.py) provides:

- Decision explanations (top features, warnings, confidence)
- Global feature importance
- Threshold behavior documentation
- Model insights

Integration details are in [EXPLAINABILITY_INTEGRATION.md](EXPLAINABILITY_INTEGRATION.md).

## Decision Logic Deep Dive

### Rule Gating (Pre-ML)

The access request is rejected immediately if:

- badge_id is unknown
- user is inactive
- access point does not exist or is not active
- user clearance is below access point required_clearance

When clearance is insufficient, the system logs a denial and creates an alert with severity high and alert_type "unauthorized_zone".

### Decision Engines in This Repo

- Backend engine: [backend/app/services/decision_engine.py](backend/app/services/decision_engine.py)
  - Accepts 13 or 19 features
  - Uses ensemble scoring when models are available
  - Fallback to rule-based scoring when models are unavailable
- Standalone engine: [scripts/decision_engine.py](scripts/decision_engine.py)
  - Accepts 19 features
  - Adds hard-rule checks for impossible travel and concurrent badge use
  - Includes test harness with sample cases

### Hard Rules (Standalone Engine)

The standalone engine short-circuits decisions when physical impossibility is detected:

- Concurrent session detected => denied with risk_score 1.0
- Velocity > 1 km/min (60 km/h) => denied with risk_score 1.0

These rules use unscaled features to preserve physical units.

### Risk Scoring Math

Isolation Forest score normalization:

$$
s_{if} = 1 - \frac{raw - min}{max - min}
$$

Autoencoder reconstruction error normalization:

$$
s_{ae} = \frac{error - min}{max - min}
$$

Ensemble risk score:

$$
r = w_{if} s_{if} + w_{ae} s_{ae}
$$

Default weights: $w_{if}=0.3$, $w_{ae}=0.7$.

### Decision Bands

- $r < 0.30$ => granted
- $0.30 \le r < 0.70$ => delayed
- $r \ge 0.70$ => denied

### Rule-Based Fallback Scoring

If ML scoring fails, the system computes a fallback score from the 13 core features:

- Off-hours access adds 0.35
- Weekend access by low-role adds 0.20
- Location mismatch adds 0.20
- Restricted area + low role adds 0.30
- High frequency adds 0.25
- Short time since last access adds 0.30
- Sequential zone violation adds 0.20
- Repeated attempts adds 0.15

The fallback score is capped to [0, 1] and fed into the same decision bands.

### Alert Creation Logic

- Clearance failures create alerts (alert_type "unauthorized_zone")
- ML decisions create alerts when decision is denied
- ML decisions create alerts when decision is delayed and $r \ge 0.50$
- Some early denials (unknown badge, inactive user, invalid access point) do not create alerts
- Alert severity derives from risk score buckets

### Decision Status Endpoint

The ML status endpoint reports model readiness:

```json
{
  "is_loaded": true,
  "isolation_forest": true,
  "autoencoder": true,
  "mode": "ensemble",
  "grant_threshold": 0.3,
  "deny_threshold": 0.7,
  "if_weight": 0.3,
  "ae_weight": 0.7
}
```

## Feature Engineering Details

### Core Runtime Features (13)

1) hour: access timestamp hour [0-23]
2) day_of_week: weekday [0-6]
3) is_weekend: 1 if day_of_week >= 5 else 0
4) access_frequency_24h: count of user access logs in the last 24 hours
5) time_since_last_access_min: minutes since last user access
6) location_match: department-zone match (1 if matches, else 0)
7) role_level: role -> integer map (employee=1, manager=2, admin=3, security=2, contractor=1, visitor=1)
8) is_restricted_area: 1 if access point is restricted
9) is_first_access_today: 1 if no accesses for user today
10) sequential_zone_violation: 1 if different zone and <5 minutes since last access
11) access_attempt_count: number of failed attempts (if tracked)
12) time_of_week: day_of_week * 24 + hour
13) hour_deviation_from_norm: absolute deviation from user mean hour

### Analytics Features (Additional 6)

14) geographic_impossibility: 1 if velocity > 1 km/min
15) distance_between_scans_km: distance between last and current zones
16) velocity_km_per_min: distance / minutes since last access
17) zone_clearance_mismatch: 1 if restricted area and low role
18) department_zone_mismatch: 1 if department does not match zone
19) concurrent_session_detected: 1 if access in another zone <2 min ago

### Scalers

- scaler_13.pkl: fit on 13 core features for runtime inference
- scaler_19.pkl: fit on 19 features for analytics
- scaler.pkl: legacy alias to scaler_13.pkl

### Zone and Department Mapping

`ZONE_DEPARTMENT_MAP` (in [backend/app/services/ml_service.py](backend/app/services/ml_service.py)) normalizes zones to expected departments, for example:

- engineering -> Engineering
- hr -> HR
- finance -> Finance
- server-room -> IT
- executive -> Management
- lobby, parking -> None (no strict mapping)

### Zone Distance Matrix

The runtime distance matrix defines km distances between zones for velocity calculations. Values are symmetric and default to 0.15 km when unknown.

## Data Generation and Datasets

Synthetic data is generated in [scripts/generate_data_fixed.py](scripts/generate_data_fixed.py) (500 users, recommended) or [scripts/generate_data.py](scripts/generate_data.py) (100 users). Key parameters:

- Total records: 500,000
- Anomaly ratio: 0.07
- Zones: engineering, hr, finance, marketing, logistics, it, server_room, executive
- Restricted zones: server_room, executive
- Clearance requirements: server_room=3, executive=3, finance=2

The generator models:

- Per-user behavior profiles (role, clearance, department, typical hours)
- Power-law activity weights (small number of heavy users)
- Day-of-week and hour variability per user
- Hour distributions with variability
- Location mismatch probabilities
- Travel distance and velocity between zones
- Anomaly patterns (badge cloning, high-frequency access, unauthorized zones)

Processed datasets are saved under data/processed:

- train_scaled.csv
- test_scaled.csv
- val_scaled.csv (created if missing)

## Model Training Details

### Isolation Forest

Training script: [scripts/train_isolation_forest.py](scripts/train_isolation_forest.py)

- Trained on normal-only samples
- Hyperparameter grid includes n_estimators, contamination, max_samples
- Output includes min_score/max_score for normalization

### Autoencoder

Training script: [scripts/train_autoencoder.py](scripts/train_autoencoder.py)

Architecture (13 features):

- Encoder: Dense 32 -> Dense 16 -> Dense 8
- Bottleneck: Dense 4
- Decoder: Dense 8 -> Dense 16 -> Dense 32
- Output: Dense 13 with sigmoid
- Loss: MSE
- Optimizer: Adam
- Early stopping on validation loss

### Model Artifacts

Common artifacts under ml/models:

- isolation_forest.pkl
- autoencoder.keras
- autoencoder_config.pkl
- scaler_13.pkl
- scaler_19.pkl
- scaler.pkl
- ensemble_config.pkl (optional)
- current.json (model registry)

### Ensemble Evaluation

The [scripts/compare_and_ensemble.py](scripts/compare_and_ensemble.py) script:

- Computes IF and AE scores
- Tests weighted ensembles and voting strategies
- Picks best threshold by F1
- Writes results to ml/results/ensemble

## Threshold Tuning and Evaluation

### Retuning

- Script: [scripts/retune_threshold.py](scripts/retune_threshold.py)
- Validation data split from train_scaled.csv if val is missing
- Searches thresholds in [0.20, 0.90] with step 0.01
- Updates model registry if F1 is within acceptable range

### Validation and Diagnostics

- [scripts/quick_test.py](scripts/quick_test.py): fast precision/recall/F1 check
- [scripts/overfitting_check.py](scripts/overfitting_check.py): train-test gap, edge cases, score separation

### Threshold Resolution Precedence

Resolved by [scripts/threshold_utils.py](scripts/threshold_utils.py) in this order:

1) ensemble_config.pkl -> best_threshold
2) ensemble_config.pkl -> threshold
3) isolation_forest.pkl -> best_threshold
4) default (0.50)

## Explainability Internals

Explainability is implemented in [scripts/explainability.py](scripts/explainability.py) and exposed by the backend API.

The explainer computes:

- Feature contributions via permutation-style perturbation
- Feature warnings based on percentile ranks
- Confidence from IF/AE agreement
- Human-readable reasons and risk levels

Key response structure:

```json
{
  "decision": "denied",
  "confidence": 0.86,
  "reason": "Access denied. Anomaly score 0.823 exceeds threshold.",
  "risk_level": "high",
  "scores": {
    "isolation_forest": 0.77,
    "autoencoder": 0.88,
    "combined": 0.823,
    "threshold": 0.50
  },
  "top_features": [
    {
      "name": "time_since_last_access_min",
      "value": 2,
      "contribution": 0.12,
      "importance": 0.18,
      "percentile": 97
    }
  ],
  "feature_warnings": ["time_since_last_access_min is unusually low"],
  "contributing_factors": {
    "time_pattern": "Outside normal business hours"
  }
}
```

### Audit Log Schema (JSON Lines)

Each decision emits a JSON-line entry:

```json
{
  "timestamp_utc": "2026-02-22T04:38:52.966777+00:00",
  "event_type": "decision",
  "decision": "granted",
  "risk_score": 0.0684,
  "if_score": 0.2273,
  "ae_score": 0.0003,
  "mode": "ensemble",
  "reasoning": "Risk score 0.0684 below grant threshold 0.30",
  "thresholds": {
    "grant": 0.30,
    "deny": 0.70
  },
  "features_scaled_len": 13,
  "features_raw_len": 13,
  "features_scaled_sha256": "...",
  "features_raw_sha256": "...",
  "context": {
    "user_id": 77,
    "access_point_id": 3,
    "badge_id": "B001",
    "method": "badge",
    "timestamp": "2026-02-22T15:04:05+00:00"
  }
}
```

## Observability and Monitoring

- API performance middleware: response time tracking and slow endpoint warnings
- Database query monitoring with slow-query logging
- System health metrics: CPU, memory, disk
- Application logging with rotating files in `logs/`

## Frontend

### Pages

- /dashboard: KPI overview and charts
- /logs: Access logs with risk scores and explainability
- /alerts: Anomaly alerts triage
- /users: User management
- /access-points: Access point list
- /simulator: Access request simulator
- /ml-status: Model health and config
- /explainability: Model insights and explanations

### Notable UI Components

- Charts: AccessTimelineChart, AnomalyDistributionChart, TopAccessPointsChart
- Status and badges: ApiStatus, DecisionBadge, SeverityBadge, RiskBar
- Layout: AppLayout, Header, Sidebar

### Frontend Data Layer

- API client: [frontend/src/lib/api.ts](frontend/src/lib/api.ts)
- Types: [frontend/src/lib/types.ts](frontend/src/lib/types.ts)
- Hooks: [frontend/src/hooks/useApi.ts](frontend/src/hooks/useApi.ts), [frontend/src/hooks/useStats.ts](frontend/src/hooks/useStats.ts)

## Repository Layout

- backend/: FastAPI app, DB models, services, routes, Alembic
- frontend/: Next.js dashboard
- data/: raw and processed datasets
- ml/: trained models and results
- iot-simulator/: access request generator
- docs/: additional documentation
- tests/: test stubs

## Setup and Configuration

### Prerequisites

- Python 3.11+ (3.13 tested)
- Node.js 18+
- A SQL database (Postgres recommended)

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` (or export env vars) with:

```
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/raptorx
SECRET_KEY=change-me
DECISION_THRESHOLD_GRANT=0.30
DECISION_THRESHOLD_DENY=0.70
ML_MODEL_PATH=./app/ml/model.pkl
AUTOENCODER_MODEL_PATH=./app/ml/autoencoder.pkl
```

### Database Setup

```bash
cd backend
alembic upgrade head
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### ML Pipeline Bootstrap (Recommended for First Run)

From workspace root:

```bash
python run_pipeline.py
```

This runs the full 10-step training/validation pipeline via `scripts/run_full_pipeline.py`, including database loading (`scripts/load_data_to_db.py`).

Alternative interactive options:

```bash
python scripts/startup.py
# or
python scripts/run_pipeline_interactive.py
```

## Run (Dev and Prod)

### Development

Backend:

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

Optional quick launcher (root):

```bash
python scripts/startup.py
```

### Production

Backend:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm run build
npm run start
```

## Scripts and Utilities

### Pipeline Orchestration

- [run_pipeline.py](run_pipeline.py): root wrapper for the full pipeline (`scripts/run_full_pipeline.py`)
- [scripts/run_full_pipeline.py](scripts/run_full_pipeline.py): automated 10-step end-to-end pipeline
- [scripts/run_pipeline_interactive.py](scripts/run_pipeline_interactive.py): interactive step-by-step pipeline
- [scripts/startup.py](scripts/startup.py): unified menu for pipeline/model verification/startup

### Data Generation and Preparation

- [scripts/generate_data_fixed.py](scripts/generate_data_fixed.py): **RECOMMENDED** - improved generator with 500 users for better model generalization
- [scripts/generate_data.py](scripts/generate_data.py): original generator with 100 users
- [scripts/load_data_to_db.py](scripts/load_data_to_db.py): loads generated data into PostgreSQL
- [scripts/load_data_to_db_simple.py](scripts/load_data_to_db_simple.py): simplified DB loading variant
- [scripts/explore_and_prepare.py](scripts/explore_and_prepare.py): EDA, scaling, and artifact creation
- [scripts/explore_database.py](scripts/explore_database.py): database exploration and statistics

### Model Training and Evaluation

- [scripts/train_isolation_forest.py](scripts/train_isolation_forest.py)
- [scripts/train_autoencoder.py](scripts/train_autoencoder.py)
- [scripts/compare_and_ensemble.py](scripts/compare_and_ensemble.py)
- [scripts/retune_threshold.py](scripts/retune_threshold.py)
- [scripts/overfitting_check.py](scripts/overfitting_check.py)
- [scripts/quick_test.py](scripts/quick_test.py)
- [scripts/test_thread_safety.py](scripts/test_thread_safety.py)
- [scripts/validate_system.py](scripts/validate_system.py)

### Standalone Decision Engine

- [scripts/decision_engine.py](scripts/decision_engine.py): standalone engine with hard rules, thread safety, and audit logging

### Model & Threshold Utilities

- [scripts/model_registry.py](scripts/model_registry.py): model artifact registry helpers
- [scripts/threshold_utils.py](scripts/threshold_utils.py): threshold resolution utilities
- [scripts/verify_setup.py](scripts/verify_setup.py): setup/artifact verification
- [scripts/verify_upgrade.py](scripts/verify_upgrade.py): upgrade verification checks

### IoT Simulator

- [iot-simulator/simulate_badges.py](iot-simulator/simulate_badges.py): generates access requests against the API

## CI/CD

RaptorX ships with CI/CD workflows for threshold retuning and model validation. See:

- [CI_CD_GUIDE.md](CI_CD_GUIDE.md)
- [CI_CD_SETUP_COMPLETE.md](CI_CD_SETUP_COMPLETE.md)

Key workflows in `.github/workflows/`:

- retune-thresholds.yml
- model-validation.yml
- deploy-models.yml

## Security Notes

- No authentication or authorization is configured by default.
- Add auth middleware before deploying to public networks.
- Secrets (DATABASE_URL, SECRET_KEY) should be provided via env vars.

## Troubleshooting

- 404 on frontend API calls: ensure backend runs on port 8000 and `NEXT_PUBLIC_API_URL` is set.
- CORS errors: backend allows http://localhost:3000 by default.
- Empty dashboards: seed data or run the simulator to generate logs.
- Explainability endpoints: ensure model artifacts exist and AccessLog data is populated.
- Pipeline/import issues: run `python run_pipeline.py` from workspace root (or `python scripts/startup.py` for guided mode).
- Database connection failures: verify `backend/.env` contains a valid `DATABASE_URL` and run `alembic upgrade head`.
