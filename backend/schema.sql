-- Schema setup for access_control_db

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin', 'security', 'contractor', 'visitor');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_result') THEN
        CREATE TYPE access_result AS ENUM ('granted', 'denied', 'delayed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
        CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_status') THEN
        CREATE TYPE alert_status AS ENUM ('open', 'acknowledged', 'resolved', 'false_positive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'point_type') THEN
        CREATE TYPE point_type AS ENUM ('door', 'gate', 'turnstile', 'elevator', 'parking', 'server_room');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'point_status') THEN
        CREATE TYPE point_status AS ENUM ('active', 'maintenance', 'disabled');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    badge_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL,
    department VARCHAR(100),
    clearance_level INTEGER NOT NULL CHECK (clearance_level BETWEEN 1 AND 5),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    pin_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS access_points (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type point_type NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(50),
    room VARCHAR(50),
    zone VARCHAR(100),
    status point_status NOT NULL DEFAULT 'active',
    required_clearance INTEGER NOT NULL CHECK (required_clearance BETWEEN 1 AND 5),
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(50),
    installed_at TIMESTAMPTZ,
    description TEXT
);

CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    access_point_id INTEGER NOT NULL REFERENCES access_points(id),
    timestamp TIMESTAMPTZ NOT NULL,
    decision access_result NOT NULL,
    risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    method VARCHAR(50),
    hour INTEGER,
    day_of_week INTEGER,
    is_weekend BOOLEAN,
    access_frequency_24h INTEGER,
    time_since_last_access_min INTEGER,
    location_match BOOLEAN,
    role_level INTEGER,
    is_restricted_area BOOLEAN,
    badge_id_used VARCHAR(50),
    context JSONB
);

CREATE TABLE IF NOT EXISTS anomaly_alerts (
    id SERIAL PRIMARY KEY,
    log_id INTEGER NOT NULL REFERENCES access_logs(id),
    alert_type VARCHAR(100) NOT NULL,
    severity alert_severity NOT NULL,
    status alert_status NOT NULL DEFAULT 'open',
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    confidence DOUBLE PRECISION,
    triggered_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES users(id),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS access_rules (
    id SERIAL PRIMARY KEY,
    access_point_id INTEGER NOT NULL REFERENCES access_points(id),
    role user_role,
    department VARCHAR(100),
    min_clearance INTEGER,
    allowed_days VARCHAR(50),
    time_start TIME,
    time_end TIME,
    max_daily_accesses INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
