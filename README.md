# RaptorX - AI-Powered Access Control System

RaptorX is a comprehensive full-stack AI access control system designed for real-time security decision making. It combines a robust **FastAPI backend** with an advanced **Vite + React frontend**, implementing intelligent ML-powered access decisioning with rule-based pre-filtering, an ensemble of isolation forest and autoencoder models, comprehensive anomaly detection, and real-time audit logging.

## System Highlights

- **ML-Powered Risk Scoring**: Ensemble decision engine using Isolation Forest + Autoencoder
- **Real-Time Access Control**: Instant grant/deny/delayed decisions with explainability
- **Admin Authentication**: Secure admin panel with bcrypt password hashing
- **Comprehensive Auditing**: JSON-line audit logs with feature hashes and decision context
- **Anomaly Detection & Alerts**: Automated alert generation with severity triage
- **Performance Monitoring**: Built-in API and database performance tracking
- **Thread-Safe Inference**: Concurrent ML model inference for high-throughput scenarios

## Table of Contents

- Overview
- System Highlights
- Key Features
- Architecture
- Technology Stack
- Admin Authentication & Security
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
- Frontend Architecture
- Repository Layout
- Setup and Configuration
- Run (Dev and Prod)
- Scripts and Utilities
- CI/CD
- Security Notes
- Troubleshooting

## Overview

RaptorX models real-world physical access control. Users present badges at access points. The backend evaluates rule constraints (clearance, status, access-point availability) and ML risk signals, then issues a decision (granted, delayed, denied). Decisions are stored with feature context, and anomalous outcomes generate alerts. The frontend provides dashboards, logs, alert triage, simulator, ML health, and explainability tools.

## Quick Start (5 Minutes)

For experienced developers who want to launch immediately:

### 1. Clone & Setup Directories
```bash
cd e:\RAPTORX

# Backend environment
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Database migration
alembic upgrade head

# Frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

**`backend/.env`:**
```
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/raptorx
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**`frontend/.env`:**
```
VITE_API_URL=http://localhost:8000
```

### 3. Generate ML Pipeline
```bash
# From workspace root
python run_pipeline.py
# OR interactive mode
python scripts/startup.py
```

This generates:
- Synthetic data (500 users, 500K records)
- Trained Isolation Forest
- Trained Autoencoder
- Scaler artifacts
- Ensemble configuration

### 4. Start Services (Two Terminals)

**Terminal 1 (Backend):**
```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### 5. Access the Dashboard

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 6. Admin Login

Default credentials (create via `backend/create_default_admin.py` if needed):
```
Email: admin@raptorx.com
Password: admin_password
```

### 7. Generate Test Data

Use the **Simulator** page to create access requests, or:
```bash
python iot-simulator/simulate_badges.py
```

**You're now running RaptorX!** Navigate to:
- **Dashboard**: Real-time KPIs and metrics
- **Logs**: View all access decisions
- **Alerts**: Anomaly alerts with severity
- **ML Status**: Model health and configuration
- **Explainability**: Understand why decisions were made

For detailed documentation, continue reading or visit [docs/](docs/) directory.

## Key Features

- **Real-time access decisioning** (rule-based + ML ensemble with dual models)
- **Multi-layer security**: Rule gating → ML risk scoring → Alert generation
- **Admin authentication** with secure password management and bcrypt hashing
- **Access logs** with dynamic filtering, pagination, and risk scores
- **Anomaly alerts** with severity gradients, resolution tracking, and false-positive flow
- **Explainability endpoints** for decision transparency and model insights
- **Dashboard metrics** with real-time charts and KPI tracking
- **Access request simulator** for testing and scenario validation
- **Model health monitoring** with status reporting and ensemble configuration
- **Audit logging** with JSON-line entries including decision context and feature hashes
- **Thread-safe ML inference** for concurrent FastAPI requests
- **Model registry** with versioned artifacts and automatic rollback capability
- **Performance monitoring**: API response tracking, database query analysis, system health metrics
- **UI Components**: Comprehensive React/Material-UI dashboard with authentication

## How RaptorX Works: End-to-End Flow

### Access Request Journey

**Step 1: User Badges In**
```
Badge → Access Point → POST /api/access/request
{
  "badge_id": "B001",
  "access_point_id": 3,
  "timestamp": "2026-04-04T12:00:00Z",
  "method": "badge"
}
```

**Step 2: Rule-Based Pre-Filtering (Access Gating)**
```
Database Lookup:
  ✓ User exists and is_active?
  ✓ Access point exists and is_active?
  ✓ User clearance ≥ Access point required clearance?
  
If any check fails:
  → Immediate DENY
  → Create High-severity "unauthorized_zone" alert
  → Log decision to audit log
  → Return to access point
```

**Step 3: Feature Extraction**
```
Raw Access Event
  ↓
Extract 13 Runtime Features:
  • Temporal: hour, day_of_week, is_weekend, time_of_week, hour_deviation_from_norm
  • Behavioral: access_frequency_24h, time_since_last_access_min, is_first_access_today
  • Contextual: location_match, role_level, is_restricted_area
  • Anomaly: sequential_zone_violation, access_attempt_count
  ↓
Scale using scaler_13.pkl (StandardScaler)
  ↓
Scaled Feature Vector [13 values, normalized to ~N(0,1)]
```

**Step 4: ML Risk Scoring (Ensemble)**
```
Scaled Features
  ├→ Isolation Forest Model
  │  └→ Detect anomalies as isolated points
  │  └→ IF Raw Score (range varies) → Normalized [0, 1]
  │
  ├→ Autoencoder Model
  │  └→ Compute reconstruction error
  │  └→ AE Error → Normalized [0, 1]
  │
  └→ Weighted Ensemble
     Risk Score = (IF_weight × IF_normalized) + (AE_weight × AE_normalized)
     Default: IF_weight = 0.3, AE_weight = 0.7
     Final Risk Score: [0.0, 1.0]
```

**Step 5: Decision Band Determination**
```
Risk Score < 0.30  → GRANTED   (Low risk, allow access)
Risk Score 0.30-0.70 → DELAYED  (Medium risk, audit required)
Risk Score ≥ 0.70  → DENIED    (High risk, block access)
```

**Step 6: Alert Generation Logic**
```
IF Denied:
  → Create Alert (severity=high, triggered_by="ml_ensemble")
  
IF Delayed AND Risk ≥ 0.50:
  → Create Alert (severity=medium)
  
IF Clearance gate failed:
  → Create Alert (severity=high, type="unauthorized_zone")
  
IF Granted:
  → No alert generated (unless special conditions)
```

**Step 7: Audit Logging**
```
Emit JSON-Line Entry to logs/access_decisions_audit.log:
{
  "timestamp_utc": "2026-04-04T12:00:00+00:00",
  "event_type": "decision",
  "decision": "granted",
  "risk_score": 0.2143,
  "if_score": 0.18,
  "ae_score": 0.24,
  "mode": "ensemble",
  "reasoning": "Risk score 0.2143 below grant threshold 0.30",
  "thresholds": {"grant": 0.30, "deny": 0.70},
  "features_scaled_len": 13,
  "features_scaled_sha256": "hash_of_features",
  "features_raw_sha256": "hash_of_raw",
  "context": {
    "user_id": 77,
    "access_point_id": 3,
    "badge_id": "B001",
    "timestamp": "2026-04-04T12:00:00+00:00"
  }
}
```

**Step 8: Store in Database**
```
INSERT INTO access_logs (user_id, access_point_id, timestamp, decision, risk_score, ...)
INSERT INTO anomaly_alerts (log_id, alert_type, severity, ...) [if alert]
```

**Step 9: Return Decision to Access Point**
```
HTTP 200 Response:
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

**Step 10: Frontend Real-Time Dashboard**
```
React Dashboard (Updates via API polling)
  ├→ Logs Page: Displays new access_log entry immediately
  │  ├→ Shows decision, risk score, badge ID, timestamp
  │  ├→ Clickable explainability link for detailed reasoning
  │  └→ Color-coded risk bars
  │
  ├→ Alerts Page: Shows new anomaly_alert (if created)
  │  ├→ Severity-color badge
  │  ├→ Operator can resolve or mark false positive
  │  └→ Updates alert resolution status
  │
  ├→ Dashboard: Updates KPIs and charts
  │  ├→ Total decisions count
  │  ├→ Grant/deny ratio
  │  ├→ Alert count by severity
  │  └→ Access timeline chart
  │
  └→ ML Status Page: Shows model health
     ├→ Both models loaded? ✓
     ├→ Current thresholds: grant=0.30, deny=0.70
     └→ Weights: IF=0.3, AE=0.7

```

### Admin Panel Flow

**Login Process:**
```
1. Admin visits /admin-login
2. Enters email + password
3. Frontend POST /api/admin/login with credentials
4. Backend:
   - Query User table for email
   - If found, verify password with bcrypt.checkpw()
   - If match, return user profile
   - If no match, return 401 (generic error message)
5. Frontend stores session token/user data
6. Protected routes now accessible
   - /admin/users
   - /admin/profile
   - /admin/settings
```

**Password Management:**
```
Change Password:
  1. Admin enters old password + new password + confirmation
  2. Frontend POST /api/admin/change-password
  3. Backend verifies old password with bcrypt
  4. If valid, hash new password with bcrypt (12 rounds)
  5. Update User.pin_hash in database
  6. Return 200 success or 401 invalid old password
```

## Technology Stack

### Backend
- **Framework**: FastAPI (modern, high-performance Python web framework)
- **Server**: Uvicorn (ASGI server for production deployments)
- **Database**: PostgreSQL (primary) or SQLAlchemy ORM-compatible databases
- **ORM**: SQLAlchemy with Alembic for database migrations
- **Async**: Full async/await support for scalability
- **Authentication**: Bcrypt for password hashing and verification
- **Monitoring**: Custom API performance middleware and query tracking
- **Logging**: Rotating file handlers with structured JSON-line audit logging

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (next-generation, lightning-fast build tool)
- **Router**: React Router v6 for client-side navigation
- **UI Library**: Material-UI (MUI) v5 for professional component library
- **Visualization**: ECharts with React integration for data charts
- **HTTP Client**: Axios for API communication
- **Date Handling**: date-fns and dayjs for date/time operations
- **Data Grid**: MUI X Data Grid for advanced table features
- **Icons**: Iconify React for scalable icon system

### Machine Learning
- **Isolation Forest**: Scikit-learn implementation for anomaly detection
- **Autoencoder**: TensorFlow/Keras deep learning model
- **Scaling**: Scikit-learn StandardScaler with versioned artifacts
- **Ensemble**: Weighted combination with dynamic threshold configuration

### DevOps & Infrastructure
- **CI/CD**: GitHub Actions workflows for automated testing and deployment
- **Containerization**: Support for Docker deployment
- **Version Control**: Git with model versioning and artifact management

## Architecture

### Component Diagram

```mermaid
graph TD
  subgraph Frontend
    UI[Vite + React Dashboard<br/>Material-UI Components]
    Auth[Admin Authentication<br/>React Router Navigation]
  end

  subgraph Backend
    API[FastAPI API<br/>Async Endpoints]
    DE[Decision Engine<br/>ML Ensemble]
    FE[Feature Engineering<br/>13/19-feature extraction]
    OBS[API + DB Monitoring<br/>Performance Tracking]
    Auth_BE[Admin Routes<br/>Bcrypt Security]
  end

  subgraph Data
    DB[(SQL Database<br/>PostgreSQL)]
    MODELS[(ML Models<br/>Versioned Registry)]
    LOGS[(Audit Logs<br/>JSON-line Format)]
  end

  UI -->|REST/CORS| API
  Auth -->|JWT/Session| Auth_BE
  API --> FE
  FE --> DE
  DE --> MODELS
  API --> DB
  Auth_BE --> DB
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

## Admin Authentication & Security

RaptorX now includes a comprehensive admin authentication system with role-based access and secure password management.

### Authentication Architecture

#### Password Security
- **Hashing Algorithm**: Bcrypt with 12 salt rounds
- **Utility Functions**: Located in [backend/app/utils/password.py](backend/app/utils/password.py)
  - `hash_password(password: str)`: Securely hashes passwords for storage
  - `verify_password(password: str, hashed_password: str)`: Validates login credentials

#### Admin API Routes
Located in [backend/app/routes/admin.py](backend/app/routes/admin.py), the admin endpoints include:

- **POST /api/admin/login**: Authenticate admin with email and password
  - Validates credentials with bcrypt verification
  - Returns authenticated admin profile data
  - Status: 401 Unauthorized if credentials invalid

- **GET /api/admin/profile**: Fetch current admin profile
  - Returns admin details (id, email, name, role)
  - Requires admin verification

- **POST /api/admin/update-username**: Update admin username
  - Validates new username uniqueness
  - Requires existing password confirmation
  - Prevents duplicate email addresses

- **POST /api/admin/change-password**: Change admin password
  - Validates old password before change
  - Requires new password confirmation
  - Updates password hash securely with bcrypt

- **GET /api/admin/list**: List all admin users
  - Returns paginated admin list
  - Filters by role='admin'
  - Supports pagination and filtering

#### Example Schemas

**Login Request & Response:**
```json
{
  "email": "admin@raptorx.com",
  "password": "secure_password"
}

{
  "id": 1,
  "email": "admin@raptorx.com",
  "first_name": "Admin",
  "last_name": "User",
  "role": "admin"
}
```

**Create Admin Request:**
```json
{
  "email": "newadmin@raptorx.com",
  "temp_password": "temporary_password",
  "role": "admin",
  "first_name": "New",
  "last_name": "Admin"
}
```

#### Security Implementation
1. **Password Hashing**: Bcrypt with 12 rounds salt before database storage
2. **Verification Logic**: Email lookup followed by bcrypt comparison
3. **User State Tracking**: `is_active` flag prevents unauthorized access
4. **Role-Based Routing**: Admin endpoints verify `role='admin'`
5. **Error Handling**: Generic error messages prevent user enumeration

#### Integration Points
- Admin users stored in same `users` table with `role='admin'`
- Supports hierarchical permission structures
- Scalable to JWT tokens or session-based auth
- Password utilities extensible for MFA integration

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

### Multi-Layer Security Architecture

RaptorX employs a defense-in-depth approach with three decision layers:

```
Layer 1: Rule Gating (Hard Constraints)
         ↓
Layer 2: ML Ensemble Scoring (Risk Assessment)
         ↓
Layer 3: Alert Generation (Anomaly Flagging)
```

### Layer 1: Rule Gating (Pre-ML Validation)

The system performs immediate rejection before ML evaluation if:

| Rule | Condition | Result | Alert |
|------|-----------|--------|-------|
| **Unknown Badge** | badge_id not in users table | DENY | None (early rejection) |
| **Inactive User** | User.is_active = false | DENY | None (early rejection) |
| **Invalid Access Point** | access_point_id not found | DENY | None (early rejection) |
| **Inactive Access Point** | AccessPoint.status ≠ "active" | DENY | None (early rejection) |
| **Insufficient Clearance** | User.clearance_level < AccessPoint.required_clearance | DENY | **High** (unauthorized_zone) |

**Example:**
```python
if not user or not user.is_active:
    # Early denial, no alert (likely fraud or system error)
    return {"decision": "denied", "reason": "User not found or inactive"}

if user.clearance_level < access_point.required_clearance:
    # Clearance failure - create alert for security review
    create_alert(
        alert_type="unauthorized_zone",
        severity="high",
        description=f"User {badge_id} attempted access to restricted area"
    )
    return {"decision": "denied", "reason": "Insufficient clearance"}
```

### Layer 2: ML Ensemble Scoring (Risk Assessment)

After passing rule gating, the access request enters ML scoring:

```
Scaled Features (13) ──┬─→ Isolation Forest ──→ IF Score [0,1]
                      │
                      └─→ Autoencoder ──→ AE Score [0,1]
                           ↓
                      Weighted Ensemble
                           ↓
                      RISK SCORE [0,1]
```

#### Scoring Formulas

**Isolation Forest Normalization:**
$$s_{if} = 1 - \frac{\text{raw\_anomaly\_score} - \text{min}}{\text{max} - \text{min}}$$

**Autoencoder Reconstruction Error Normalization:**
$$s_{ae} = \frac{\text{reconstruction\_error} - \text{min}}{\text{max} - \text{min}}$$

**Ensemble Risk Score (Weighted Combination):**
$$r = w_{if} \cdot s_{if} + w_{ae} \cdot s_{ae}$$

**Default Configuration:**
- $w_{if} = 0.3$ (Isolation Forest weight)
- $w_{ae} = 0.7$ (Autoencoder weight)

**Example Calculation:**
```python
if_score = 0.18      # Low anomaly in IF
ae_score = 0.24      # Low reconstruction error
risk_score = (0.3 * 0.18) + (0.7 * 0.24)
risk_score = 0.054 + 0.168 = 0.222  # Below 0.30 → GRANTED
```

### Layer 3: Decision Bands

Final decision determined by risk score thresholds:

```python
if risk_score < GRANT_THRESHOLD (0.30):
    decision = "GRANTED"      # Low risk, allow access
    severity = None           # No alert
    
elif risk_score < DENY_THRESHOLD (0.70):
    decision = "DELAYED"      # Medium risk
    if risk_score >= 0.50:    # Extra caution zone
        severity = "MEDIUM"   # Create alert
    else:
        severity = None       # No alert
        
else:  # risk_score >= 0.70
    decision = "DENIED"       # High risk, block access
    severity = "HIGH"         # Create alert
```

**Decision Visualization:**
```
Risk Score    0.00          0.30          0.50          0.70          1.00
              |──────────────|─────────────|─────────────|─────────────|
              GRANTED       DELAYED (no alert)  DELAYED+ALERT  DENIED
              (allow)       (audit)             (careful)      (block)
```

### Decision Engines in This Repo

#### Backend Decision Engine
**File:** [backend/app/services/decision_engine.py](backend/app/services/decision_engine.py)

**Features:**
- Accepts 13 (runtime) or 19 (analytics) features
- Uses ML ensemble when models available
- Fallback to rule-based scoring if models unavailable
- Thread-safe for concurrent requests
- Returns full decision context (scores, reasoning, mode)

**Usage:**
```python
from app.services.decision_engine import AccessDecisionEngine

engine = AccessDecisionEngine()
decision = engine.decide(
    features=scaled_features,
    raw_features=raw_features,
    audit_context={...}
)
# Returns: {"decision": "granted", "risk_score": 0.22, ...}
```

#### Standalone Decision Engine
**File:** [scripts/decision_engine.py](scripts/decision_engine.py)

**Additional Features:**
- Accepts 19 features (full analytics set)
- Hard-rule checks for physical impossibility
- Includes test harness with pre-built scenarios
- Useful for batch processing and validation

**Hard Rules (Physics-Based Checks):**
```
IF concurrent_session_detected:
    → DENY (risk_score = 1.0)
    → Reason: "Badge used in two locations <2 min apart"

IF velocity_km_per_min > 1.0:  # 60 km/h+
    → DENY (risk_score = 1.0)
    → Reason: "Impossible travel velocity detected"
```

### Rule-Based Fallback Scoring

If ML models are unavailable or fail to load, the system switches to a rule-based heuristic:

```python
fallback_score = 0.0

# Temporal rules
if hour < 6 or hour > 20:
    fallback_score += 0.35  # Off-hours access suspicious

if is_weekend and role_level <= 2:
    fallback_score += 0.20  # Low-role weekend access

# Contextual rules
if not location_match:
    fallback_score += 0.20  # Department/zone mismatch

if is_restricted_area and role_level < 3:
    fallback_score += 0.30  # Low-role restricted area

# Behavioral rules
if access_frequency_24h > 50:
    fallback_score += 0.25  # Unusually high frequency

if time_since_last_access_min < 2:
    fallback_score += 0.30  # Rapid repeated access

if sequential_zone_violation:
    fallback_score += 0.20  # Rapid zone change impossible

if access_attempt_count > 5:
    fallback_score += 0.15  # Multiple attempted accesses

# Cap score to [0, 1]
fallback_score = min(fallback_score, 1.0)

# Apply same decision bands
if fallback_score < 0.30:
    decision = "GRANTED"
```

**When Fallback Activates:**
- Model files missing or corrupted
- Models fail to load at startup
- Prediction throws exception
- Models in transition during retuning

### Alert Creation Logic

```python
# Clearance gate failures always alert
if clearance_insufficient:
    create_alert(
        alert_type="unauthorized_zone",
        severity="HIGH",
        description=f"User {user_id} insufficient clearance for area"
    )

# ML decisions create alerts based on risk
elif decision == "DENIED":
    create_alert(
        alert_type="high_risk_access",
        severity="HIGH",
        confidence=risk_score
    )

elif decision == "DELAYED" and risk_score >= 0.50:
    create_alert(
        alert_type="medium_risk_access",
        severity="MEDIUM",
        confidence=risk_score
    )

# No alert for low-risk grants or low-risk delayed (<0.50)
else:
    # No alert
    pass
```

### ML Status Endpoint

Provides transparency into model state:

```
GET /api/ml/status

Response:
{
  "is_loaded": true,
  "isolation_forest": true,
  "autoencoder": true,
  "mode": "ensemble",
  "grant_threshold": 0.3,
  "deny_threshold": 0.7,
  "if_weight": 0.3,
  "ae_weight": 0.7,
  "timestamp": "2026-04-04T12:00:00Z"
}
```

**Status Meanings:**
- `is_loaded: true` → All models ready for inference
- `is_loaded: false` → Falling back to rule-based scoring
- `mode: ensemble` → Using weighted ensemble
- `mode: fallback` → Using rule-based scoring

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

### Architecture Overview

The frontend has been migrated from Next.js to a modern **Vite + React** architecture with the following design principles:

- **Vite Build System**: Lightning-fast build times and HMR (Hot Module Replacement)
- **React Router v6**: Client-side routing with centralized route configuration
- **Material-UI (MUI)**: Professional, accessible UI component library
- **ECharts**: Powerful data visualization with real-time chart updates
- **TypeScript**: Full type safety across the application
- **Axios**: Promise-based HTTP client with interceptor support

### Key Technologies

| Technology | Purpose | Version |
|-----------|---------|---------|
| **React** | UI library | 18.2+ |
| **Vite** | Build tool | 5.2+ |
| **React Router** | Client routing | 6.22+ |
| **Material-UI** | Component library | 5.15+ |
| **ECharts** | Data visualization | 5.5+ |
| **TypeScript** | Type safety | 5.9+ |
| **Axios** | HTTP client | 1.14+ |

### Route Structure

```
/              - Dashboard (KPI overview, real-time metrics)
/logs          - Access logs (filterable, paginated, searchable)
/alerts        - Anomaly alerts (triage, resolution, false-positives)
/users         - User management (CRUD operations)
/access-points - Access point list (zone management)
/simulator     - Request simulator (test scenarios)
/ml-status     - Model health (ensemble config, status)
/explainability- Model insights (feature importance, thresholds)
```

### Core Components

#### Layout Components
- **AppLayout**: Main layout wrapper with responsive sidebar
- **Header**: Top navigation with user info and quick actions
- **Sidebar**: Navigation menu with route grouping

#### Data Visualization Components
- **AccessTimelineChart**: Time-series access patterns with ECharts
- **AnomalyDistributionChart**: Severity distribution pie/bar chart
- **TopAccessPointsChart**: Top zones by access frequency
- **RiskScoreChart**: Risk score distribution histogram

#### UI Components
- **DecisionBadge**: Styled badge for grant/deny/delayed decisions
- **SeverityBadge**: Color-coded alert severity (low/medium/high/critical)
- **RiskBar**: Visual risk score indicator (0-1 normalized)
- **ApiStatus**: Backend connectivity indicator
- **LoadingSpinner**: Animated loading state

#### Feature Components
- **DecisionExplainer**: Detailed decision explanation with feature contributions
- **ModelArchitectureCard**: ML model architecture visualization
- **DatabasePerformanceMonitor**: Query performance and latency tracking
- **DetailedPerformanceMonitor**: API endpoint response time graphs

### Admin Authentication

The frontend includes admin authentication with:

- **Login Page**: Email/password authentication
- **Session Management**: Secure session storage
- **Protected Routes**: Role-based route guards
- **Profile Management**: Update credentials, change password
- **Admin Dashboard**: Admin-only features and user management

### Frontend Data Layer

#### API Integration
- **API Client**: [frontend/src/lib/api.ts](frontend/src/lib/api.ts)
  - Axios instance with base configuration
  - Interceptors for error handling and request modification
  - Base URL from environment variable `VITE_API_URL`

#### Type Definitions
- **Types Module**: [frontend/src/lib/types.ts](frontend/src/lib/types.ts)
  - TypeScript interfaces for all API responses
  - Shared domain models (User, AccessLog, Alert, etc.)
  - Decision response schemas

#### Custom Hooks
- **useApi**: Generic hook for API calls with loading/error states
- **useStats**: Statistics data fetching with auto-refresh
- **useAutoRefresh**: Polling mechanism for real-time updates

#### State Management
- **React Context**: Used for global authentication state
- **Local State**: Component-level state for forms and filters
- **Query Parameters**: URL-based state for pagination and filtering

### Styling & Theming

- **Material-UI Theming**: Centralized theme configuration
- **CSS Modules**: Component-scoped styles
- **Icons**: Iconify React for scalable SVG icons
- **Responsive Design**: Mobile-first approach with MUI breakpoints

### Build & Deployment

#### Development
```bash
cd frontend
npm run dev          # Starts Vite dev server on port 3000
```

#### Production Build
```bash
npm run build        # TypeScript compilation + Vite bundle
npm run preview      # Preview production build locally
```

#### Environment Variables
```
VITE_API_URL=http://localhost:8000    # Backend API endpoint
```

## Repository Layout

- **backend/**: FastAPI application with routes, services, models, and Alembic migrations
- **frontend/**: Vite + React dashboard with Material-UI components
- **data/**: Raw and processed datasets for ML pipeline
- **ml/**: Trained models, scalers, and evaluation results
- **iot-simulator/**: Badge simulator for access request generation
- **scripts/**: ML pipeline orchestration, training, and utilities
- **docs/**: Comprehensive documentation and guides
- **tests/**: Test suites and validation scripts
- **.github/workflows/**: CI/CD pipeline definitions

## Setup and Configuration

### Prerequisites

- **Python**: 3.11+ (3.13 tested)
- **Node.js**: 18+ with npm
- **Database**: PostgreSQL (or any SQLAlchemy-compatible DB)
- **Git**: For version control

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

### Frontend Setup (Vite + React)

```bash
cd frontend
npm install
```

Create `frontend/.env` (Vite uses this, not `.env.local`):

```
VITE_API_URL=http://localhost:8000
```

Development server configuration in `frontend/vite.config.ts`:
```typescript
server: {
  host: '0.0.0.0',
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

This automatically proxies `/api` requests to the backend during development, eliminating CORS issues.

### ML Pipeline Bootstrap (Recommended for First Run)

From workspace root:

```bash
python run_pipeline.py
```

This runs the full 9-step training/validation pipeline via `scripts/run_full_pipeline.py`.

Alternative interactive options:

```bash
python scripts/startup.py
# or
python scripts/run_pipeline_interactive.py
```

## Run (Dev and Prod)

### Development Environment

The system is designed for a smooth development experience with hot-reload and automatic API proxying.

#### Backend Development

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Features:**
- **Auto-reload**: Code changes automatically reload without restarting
- **CORS Configuration**: Automatically accepts localhost:3000 and localhost:5173
- **Health Check**: `/health` endpoint available immediately
- **Debug Mode**: Full stack traces on errors
- **Port**: 8000 (configurable via `--port` flag)

#### Frontend Development (Vite)

```bash
cd frontend
npm run dev
```

**Vite Dev Features:**
- **Lightning-Fast HMR**: Changes visible instantly in browser (<100ms)
- **Automatic API Proxy**: `/api` requests forwarded to `http://localhost:8000`
- **TypeScript Checking**: Real-time TypeScript error detection
- **ESLint Integration**: Live linting feedback
- **Port**: 3000 (configurable in `vite.config.ts`)
- **Browser Auto-Open**: Automatically opens http://localhost:3000

**Access the Application:**
1. Backend API: http://localhost:8000
2. Frontend Dashboard: http://localhost:3000
3. API Health Check: http://localhost:8000/health

#### Full Development Stack

Quick launcher for complete environment:

```bash
python scripts/startup.py
```

This interactive menu allows:
- Start ML pipeline with data generation
- Verify system setup
- Run full pipeline with validation
- Launch integrated development environment

### Production Deployment

#### Backend Production

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Production Recommendations:**
- **Workers**: Set to `CPU_COUNT * 2 + 1` for optimal throughput
- **Host**: `0.0.0.0` to accept external connections
- **Port**: 8000 (or desired port)
- **SSL/TLS**: Use reverse proxy (nginx, Apache) for HTTPS
- **Database**: PostgreSQL in production, not SQLite
- **Logging**: Configure rotating file handlers in `logging_config.py`
- **Monitoring**: Enable API performance middleware (default enabled)

#### Frontend Production Build

```bash
cd frontend
npm run build                 # TypeScript + Vite bundle (creates dist/)
npm run preview              # Preview production build locally
npm run deploy               # Deploy to GitHub Pages (if configured)
```

**Build Output:**
- **Location**: `frontend/dist/`
- **Type**: Single-page application (SPA)
- **Deployment**: Static hosting (Vercel, Netlify, CloudFront)
- **Base Path**: Configured in `vite.config.ts` as `/raptorx`

#### Containerization (Docker)

Example Dockerfile for backend:

```dockerfile
FROM python:3.13
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Example Dockerfile for frontend:

```dockerfile
FROM node:18 as build
WORKDIR /app
COPY frontend/package*.json .
RUN npm install
COPY frontend/ .
RUN npm run build

FROM nginx:latest
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Environment Variables

#### Backend `.env`
```
DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/raptorx
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
DECISION_THRESHOLD_GRANT=0.30
DECISION_THRESHOLD_DENY=0.70
LOG_LEVEL=INFO
```

#### Frontend `.env`
```
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=RaptorX
```

## Scripts and Utilities

### Pipeline Orchestration

- [run_pipeline.py](run_pipeline.py): Root wrapper for the full ML pipeline (invokes `scripts/run_full_pipeline.py`)
- [scripts/run_full_pipeline.py](scripts/run_full_pipeline.py): Automated 9-step end-to-end ML pipeline (data generation → training → ensemble → threshold tuning)
- [scripts/run_pipeline_interactive.py](scripts/run_pipeline_interactive.py): Interactive step-by-step pipeline with user confirmation between steps
- [scripts/startup.py](scripts/startup.py): Unified menu for pipeline orchestration, model verification, and system diagnostics

### Data Generation and Preparation

- [scripts/generate_data_fixed.py](scripts/generate_data_fixed.py): **RECOMMENDED** - Improved generator with 500 users for better model generalization
- [scripts/generate_data.py](scripts/generate_data.py): original generator with 100 users
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

- **No authentication or authorization** is configured by default for the access control API itself (separate from admin panel).
- **Admin panel** uses bcrypt password hashing with 12 salt rounds.
- Add auth middleware before deploying to public networks.
- **Secrets** (DATABASE_URL, SECRET_KEY) should be provided via environment variables, never hardcoded.
- **CORS**: Configure `CORS_ORIGINS` whitelist for production deployments.
- **Audit Logs**: All decisions persisted to `logs/access_decisions_audit.log` with feature hashes for forensics.
- **Password Storage**: Passwords never logged or transmitted in plain text; always hashed with bcrypt.

## Recent Updates & Changes

### Major Version Updates (April 2026)

This README documents significant architectural and feature improvements to RaptorX:

#### Frontend Migration: Next.js → Vite + React
- **Previous**: Next.js with app router and server-side rendering
- **Current**: Vite + React 18 with client-side routing (React Router v6)
- **Benefits**: 
  - 10x faster build times
  - Instant HMR (Hot Module Replacement)
  - Smaller production bundle
  - Better TypeScript support
  - Material-UI integration for professional UI

#### New Admin Authentication System
- **Added**: Secure admin login with email/password
- **Security**: Bcrypt password hashing with 12 salt rounds
- **Features**:
  - Admin profile management
  - Password change with old password verification
  - Admin user listing and management
  - Session-based access control
- **Files**: `backend/app/routes/admin.py`, `backend/app/utils/password.py`

#### Enhanced UI Components
- **Material-UI Integration**: Professional component library
- **EChart-based Visualization**: Advanced data charts and graphs
- **Responsive Design**: Mobile-friendly Material-UI breakpoints
- **New Pages**: Top access points, detailed performance monitoring
- **Admin Dashboard**: Admin-only management interface

#### Backend Improvements
- **API Performance Middleware**: Real-time response time tracking
- **Enhanced Logging**: Structured JSON-line audit logging
- **Database Performance Monitoring**: Slow query detection
- **Improved Error Handling**: Generic error messages for security
- **New Admin Routes**: Comprehensive admin management endpoints

#### Build & Deployment
- **Vite Configuration**: Optimized prod/dev configurations
- **Docker Support**: Improved Dockerfile examples
- **Environment Management**: Cleaner env variable handling
- **CORS Configuration**: Support for regex-based origins

### Documentation Improvements
- **Technology Stack**: Detailed backend, frontend, ML, and DevOps components
- **How RaptorX Works**: Step-by-step end-to-end flow with diagrams
- **Decision Logic**: Multi-layer security architecture explained
- **Admin Authentication**: Complete auth system documentation
- **Troubleshooting**: Comprehensive table of issues and solutions
- **Quick Start**: 5-minute setup guide for new developers

## Architecture Improvements

### Before (Next.js)
```
Frontend: Next.js (SSR) ← Vite + React (SPA, now)
Backend: FastAPI + SQLAlchemy
ML: Isolation Forest + Autoencoder (unchanged)
Database: PostgreSQL (unchanged)
```

### After (Vite + React)
```
Frontend: Vite + React + Material-UI + React Router (current)
├─→ SPA with client-side routing
├─→ Component-based architecture
├─→ Material-UI professional components
├─→ Real-time chart updates
└─→ Admin authentication integration

Backend: FastAPI + SQLAlchemy + Admin Routes (enhanced)
├─→ New admin authentication endpoints
├─→ API performance monitoring middleware
├─→ Enhanced audit logging with feature hashes
└─→ Bcrypt password security

ML: Isolation Forest + Autoencoder (unchanged core)
├─→ Same ensemble architecture
├─→ Same 13-feature runtime schema
└─→ Same decision thresholds

Database: PostgreSQL + Alembic (unchanged)
├─→ Same schema and migrations
└─→ Admin credentials now in users table
```

## File Structure Changes

### Frontend Structure (Now organized as React SPA)
```
frontend/
├── src/
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   ├── pages/               # Page components (routes)
│   ├── components/          # Reusable UI components
│   ├── layouts/             # Layout wrappers
│   ├── lib/
│   │   ├── api.ts          # Axios HTTP client
│   │   ├── types.ts        # TypeScript interfaces
│   │   └── auth.ts         # Auth utilities
│   ├── routes/             # Route definitions
│   ├── theme/              # Material-UI theme
│   └── index.css           # Global styles
├── vite.config.ts          # Vite configuration (replaces next.config.ts)
├── tsconfig.json           # TypeScript config
├── .env                    # Environment variables (not .env.local)
└── package.json            # npm scripts and dependencies
```

### Backend Structure (Enhanced)
```
backend/
├── app/
│   ├── main.py             # FastAPI app definition
│   ├── routes/
│   │   ├── admin.py        # NEW: Admin authentication
│   │   ├── access.py       # Access decisions
│   │   ├── users.py        # User management
│   │   └── ...
│   ├── services/           # Business logic
│   ├── models/             # SQLAlchemy models
│   ├── utils/
│   │   └── password.py    # NEW: Bcrypt utilities
│   ├── database.py         # Database connection
│   └── config.py           # Configuration
├── alembic/                # Database migrations
├── requirements.txt        # Python dependencies (updated for bcrypt)
└── .env                    # Environment configuration
```

## Summary of Key Technical Changes

| Component | Before | After | Impact |
|-----------|--------|-------|--------|
| **Frontend Framework** | Next.js | Vite + React | 10x faster builds, better DX |
| **UI Library** | Custom + Tailwind | Material-UI v5 | Professional components, accessibility |
| **Routing** | Next.js File Router | React Router v6 | Client-side SPA navigation |
| **Admin Auth** | None | Email/Password with Bcrypt | Secure admin panel |
| **Password Security** | None | Bcrypt 12 rounds | Enterprise-grade hashing |
| **API Monitoring** | Basic logging | Performance middleware | Real-time metrics |
| **Audit Logging** | Generic | JSON-line with hashes | Forensic capabilities |
| **Build Tool** | Next.js | Vite | Faster dev/prod builds |
| **TypeScript** | Partial | Full coverage | Better type safety |
| **Database** | PostgreSQL | PostgreSQL (same) | Unchanged core |
| **ML Engine** | Ensemble | Ensemble (same) | Unchanged core |

## Troubleshooting

### Frontend (Vite + React)

| Issue | Cause | Solution |
|-------|-------|----------|
| **Blank page / 404 on routes** | React Router base path mismatch | Check `vite.config.ts` `base` setting matches deployment path |
| **API calls return 404** | Backend not running or wrong port | Verify backend runs on 8000; check `VITE_API_URL` environment variable |
| **CORS errors in browser console** | Backend CORS middleware not allowing origin | Backend auto-accepts localhost:3000/5173; check `CORS_ORIGINS` env var |
| **Vite HMR connection refused** | Dev server not accessible | Ensure Vite runs with `--host 0.0.0.0`; check firewall |
| **Material-UI components not styled** | CSS not bundled in production build | Run `npm run build` (not just `tsc`); check `node_modules/@mui` exists |
| **API calls stuck loading** | Backend slow or not responding | Check backend logs; verify database connection; try `/health` endpoint |
| **Admin login fails** | Incorrect credentials or user doesn't exist | Verify user exists in DB with `role='admin'`; check password with `bcrypt` |

### Backend (FastAPI & ML)

| Issue | Cause | Solution |
|-------|-------|----------|
| **Models not loading (fallback mode)** | Model files missing or corrupted | Check `ml/models/` directory; run `python run_pipeline.py` to retrain |
| **Database connection failed** | Invalid `DATABASE_URL` or DB not running | Verify PostgreSQL running; test URL with `psql`; run `alembic upgrade head` |
| **Admin password verification fails** | Bcrypt hash mismatch or corrupted field | Manually hash password with `bcrypt`; reset admin user; check pin_hash field exists |
| **Decision scores always 0.0 or 1.0** | Scaler not fitted or features not scaled | Check `ml/models/scaler_13.pkl` exists; verify feature scaling in pipeline |
| **High latency on access requests** | Slow database queries or ML inference | Check `GET /api/stats/database-performance` and `GET /api/stats/api-performance` |
| **Out of memory during training** | Dataset too large or model too big | Reduce `num_records` in data generation; reduce autoencoder architecture |

### Data & ML Pipeline

| Issue | Cause | Solution |
|-------|-------|----------|
| **Empty dashboards** | No data in database | Seed data with `python scripts/generate_data_fixed.py`; run simulator |
| **Explainability returns generic explanation** | Model artifacts missing or AccessLog empty | Ensure `ml/models/` populated; generate access logs first |
| **Threshold tuning not improving F1** | Thresholds already optimal or data distribution changed | Check validation set size; plot score distributions; retrain models |
| **Feature extraction fails** | Raw data missing expected columns | Verify all 13/19 features present; check feature engineering code |

### Deployment & Production

| Issue | Cause | Solution |
|-------|-------|----------|
| **Can't connect to backend from frontend** | Different host/port or firewall | Use reverse proxy (nginx); set `CORS_ORIGINS` to frontend domain |
| **Slow API responses in production** | Single worker or inadequate resources | Set `--workers` to `CPU_COUNT * 2 + 1`; enable caching middleware |
| **Model registry out of sync** | Manual file deletion or git conflicts | Regenerate with `python scripts/model_registry.py`; commit versioned artifacts |
| **SSL/TLS connection refused** | Backend not configured for HTTPS | Use reverse proxy for SSL termination; check cert paths |

### Common Debug Commands

```bash
# Check backend health
curl http://localhost:8000/health

# Verify database connection
psql -U postgres -h localhost -d raptorx -c "SELECT COUNT(*) FROM users;"

# Test admin login
curl -X POST http://localhost:8000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@raptorx.com", "password":"password"}'

# Check model status
curl http://localhost:8000/api/ml/status

# View audit logs
tail -f logs/access_decisions_audit.log

# Check frontend environment
cat frontend/.env

# Verify Node modules
ls -la frontend/node_modules/@mui/material/
```

### Escalation Steps

1. **Verify Prerequisites**: Python 3.11+, Node 18+, PostgreSQL running
2. **Check Logs**: Backend logs in `backend/logs/`, Vite output in terminal
3. **Test Endpoints**: Use `curl` to isolate frontend vs backend issues
4. **Environment Variables**: Verify all env vars set correctly (DATABASE_URL, VITE_API_URL, etc.)
5. **Data Reset**: Run `python scripts/startup.py` → Option 1 to regenerate pipeline
6. **Clear Cache**: Delete `.venv`, `node_modules`, `dist/`, restart processes
