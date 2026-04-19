"""Test suite for enterprise onboarding system."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import User, Organization, OnboardingDraft, OrgDataSetting
from app.utils.password import hash_password


# Setup testing database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_onboarding.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    yield TestingSessionLocal()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    """Create test client with overridden database dependency."""
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    """Create an admin user for testing."""
    user = User(
        badge_id="TEST_ADMIN_001",
        first_name="Test",
        last_name="Admin",
        email="admin@test.local",
        role="admin",
        pin_hash=hash_password("testpass123"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_headers(admin_user, db):
    """Generate authentication headers for admin user."""
    from app.utils.auth_token import create_access_token
    
    token = create_access_token(admin_user.id)
    return {"Authorization": f"Bearer {token}"}


class TestOnboardingStatus:
    """Test onboarding status endpoint."""
    
    def test_get_initial_status(self, client, admin_headers):
        """Test getting initial onboarding status."""
        response = client.get("/api/onboarding/status", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["current_step"] == 1
        assert data["has_draft"] is False
        assert data["completion_percentage"] == 14.285714285714286
        assert data["errors"] == []


class TestOnboardingDraft:
    """Test draft save and load functionality."""
    
    def test_save_draft(self, client, admin_headers, db):
        """Test saving onboarding draft."""
        draft_data = {
            "company_name": "Test Corp",
            "industry": "Technology",
            "country": "USA",
        }
        
        response = client.post(
            "/api/onboarding/draft/save",
            json={
                "step_number": 1,
                "draft_data": draft_data,
            },
            headers=admin_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["step_number"] == 1
        assert data["draft_data"] == draft_data
        
        # Verify draft was saved to database
        draft = db.query(OnboardingDraft).first()
        assert draft is not None
        assert draft.step_number == 1
        assert draft.draft_data == draft_data
    
    def test_load_existing_draft(self, client, admin_headers, db):
        """Test loading existing draft."""
        # Create a draft
        draft = OnboardingDraft(
            step_number=2,
            draft_data={"admin_email": "newadmin@test.local"},
        )
        db.add(draft)
        db.commit()
        
        # Load it
        response = client.get("/api/onboarding/draft", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["step_number"] == 2
        assert data["draft_data"] == {"admin_email": "newadmin@test.local"}
    
    def test_load_no_draft(self, client, admin_headers):
        """Test loading when no draft exists."""
        response = client.get("/api/onboarding/draft", headers=admin_headers)
        assert response.status_code == 200
        assert response.json() is None


class TestOnboardingSubmit:
    """Test onboarding submission and validation."""
    
    def test_submit_valid_minimal(self, client, admin_headers):
        """Test submitting valid minimal onboarding data."""
        response = client.post(
            "/api/onboarding/submit",
            json={"company_name": "Test Corp"},
            headers=admin_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "valid"
    
    def test_submit_missing_company_name(self, client, admin_headers):
        """Test submitting without company name."""
        response = client.post(
            "/api/onboarding/submit",
            json={},
            headers=admin_headers,
        )
        
        assert response.status_code == 422


class TestOnboardingApply:
    """Test applying complete onboarding configuration."""
    
    def test_apply_creates_organization(self, client, admin_headers, db):
        """Test that apply creates organization."""
        response = client.post(
            "/api/onboarding/apply",
            json={
                "company_name": "NewCorp Inc",
                "industry": "Finance",
                "country": "USA",
                "timezone": "America/New_York",
                "contact_email": "contact@newcorp.com",
                "contact_phone": "+1-555-0100",
            },
            headers=admin_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "NewCorp Inc"
        assert data["industry"] == "Finance"
        
        # Verify organization in database
        org = db.query(Organization).filter_by(name="NewCorp Inc").first()
        assert org is not None
        assert org.industry == "Finance"
    
    def test_apply_creates_org_settings(self, client, admin_headers, db):
        """Test that apply creates org data settings."""
        response = client.post(
            "/api/onboarding/apply",
            json={"company_name": "SettingsCorp"},
            headers=admin_headers,
        )
        
        assert response.status_code == 200
        
        # Verify settings created
        org = db.query(Organization).filter_by(name="SettingsCorp").first()
        settings = db.query(OrgDataSetting).filter_by(org_id=org.id).first()
        assert settings is not None
        assert settings.pii_masking_enabled is False
        assert settings.retention_days == 90


class TestOnboardingCSVImport:
    """Test CSV import functionality."""
    
    def test_preview_buildings_csv_valid(self, client, admin_headers):
        """Test previewing valid buildings CSV."""
        import io
        
        csv_content = b"""name,address,city,state,country,zip
Tech Building,123 Main St,San Francisco,CA,USA,94107
Ops Building,456 Oak Ave,New York,NY,USA,10001
"""
        
        files = {"file": ("buildings.csv", io.BytesIO(csv_content), "text/csv")}
        response = client.post(
            "/api/onboarding/import/buildings-csv",
            files=files,
            headers=admin_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_rows"] == 2
        assert data["valid_rows"] == 2
        assert data["invalid_rows"] == 0
        assert len(data["preview_data"]) == 2
    
    def test_preview_buildings_csv_invalid(self, client, admin_headers):
        """Test previewing invalid buildings CSV."""
        import io
        
        csv_content = b"""name,address,city,state
Tech Building,123 Main St,San Francisco,CA
Ops Building,456 Oak Ave,New York,
"""
        
        files = {"file": ("buildings.csv", io.BytesIO(csv_content), "text/csv")}
        response = client.post(
            "/api/onboarding/import/buildings-csv",
            files=files,
            headers=admin_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_rows"] == 2
        assert data["valid_rows"] == 1
        assert data["invalid_rows"] == 1
        assert len(data["validation_errors"]) == 1
    
    def test_preview_access_points_csv_valid(self, client, admin_headers):
        """Test previewing valid access points CSV."""
        import io
        
        csv_content = b"""name,type,building,floor,required_clearance
Main Door,door,Building A,1,1
Secure Lab,door,Building B,2,3
"""
        
        files = {"file": ("access_points.csv", io.BytesIO(csv_content), "text/csv")}
        response = client.post(
            "/api/onboarding/import/access-points-csv",
            files=files,
            headers=admin_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_rows"] == 2
        assert data["valid_rows"] == 2
        assert data["invalid_rows"] == 0


class TestOnboardingRBAC:
    """Test RBAC protection on onboarding endpoints."""
    
    def test_non_admin_cannot_access_status(self, client, db):
        """Test that non-admin user cannot access onboarding."""
        # Create non-admin user
        user = User(
            badge_id="USER_001",
            first_name="Regular",
            last_name="User",
            email="user@test.local",
            role="user",
            pin_hash=hash_password("pass123"),
            is_active=True,
        )
        db.add(user)
        db.commit()
        
        from app.utils.auth_token import create_access_token
        token = create_access_token(user.id)
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/api/onboarding/status", headers=headers)
        assert response.status_code == 403


class TestOnboardingStats:
    """Test onboarding statistics endpoint."""
    
    def test_get_stats(self, client, admin_headers, db):
        """Test getting onboarding statistics."""
        # Create test data
        org = Organization(name="StatsCorp")
        db.add(org)
        db.commit()
        
        response = client.get("/api/onboarding/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "organizations_created" in data
        assert "buildings_total" in data
        assert "users_onboarded" in data
        assert "access_policies_created" in data
        assert data["organizations_created"] >= 1
