"""Service for retrieving and managing onboarding configuration data."""

from sqlalchemy.orm import Session
from ..models.organization import Organization
from ..models.building import Building
from ..models.floor import Floor
from ..models.zone import Zone
from ..models.room import Room
from ..models.access_point import AccessPoint
from ..models.access_policy import AccessPolicy
from ..models.user import User
from ..models.org_data_setting import OrgDataSetting


def get_onboarding_configuration(org_id: int, db: Session) -> dict:
    """
    Retrieve complete onboarding configuration for an organization.
    
    Returns:
    {
        "organization": {
            "id": int,
            "name": str,
            "industry": str,
            "country": str,
            "timezone": str,
            "contact_email": str,
            "contact_phone": str
        },
        "admins": [
            {
                "id": int,
                "email": str,
                "name": str,
                "role": str
            }
        ],
        "buildings": [
            {
                "id": int,
                "name": str,
                "floors": [
                    {
                        "id": int,
                        "name": str,
                        "zones": [
                            {
                                "id": int,
                                "name": str,
                                "rooms": [
                                    {
                                        "id": int,
                                        "name": str
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ],
        "access_points": [
            {
                "id": int,
                "name": str,
                "type": str,
                "building_id": int,
                "zone_id": int,
                "status": str,
                "ip_address": str,
                "is_restricted": bool,
                "required_clearance": int
            }
        ],
        "policies": [
            {
                "id": int,
                "name": str,
                "role_id": int,
                "allowed_zones": [int],
                "allowed_days": [int],
                "time_start": str,
                "time_end": str,
                "deny_overrides_allow": bool
            }
        ],
        "data_settings": {
            "use_historical_logs": bool,
            "privacy_mask_pii": bool,
            "data_retention_days": int,
            "start_with_conservative_defaults": bool
        }
    }
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return None

    # Get admins
    admins = db.query(User).filter(User.org_id == org_id, User.is_admin == True).all()

    # Get buildings and hierarchy
    buildings = db.query(Building).filter(Building.org_id == org_id).all()
    buildings_data = []
    for building in buildings:
        floors = db.query(Floor).filter(Floor.building_id == building.id).all()
        floors_data = []
        for floor in floors:
            zones = db.query(Zone).filter(Zone.floor_id == floor.id).all()
            zones_data = []
            for zone in zones:
                rooms = db.query(Room).filter(Room.zone_id == zone.id).all()
                rooms_data = [{"id": r.id, "name": r.name} for r in rooms]
                zones_data.append({
                    "id": zone.id,
                    "name": zone.name,
                    "rooms": rooms_data
                })
            floors_data.append({
                "id": floor.id,
                "name": floor.name,
                "zones": zones_data
            })
        buildings_data.append({
            "id": building.id,
            "name": building.name,
            "address": building.address,
            "floors": floors_data
        })

    # Get access points
    access_points = db.query(AccessPoint).filter(AccessPoint.org_id == org_id).all()
    access_points_data = [
        {
            "id": ap.id,
            "name": ap.name,
            "type": ap.type,
            "building_id": ap.building_id,
            "floor_id": ap.floor_id,
            "zone_id": ap.zone_id,
            "status": ap.status,
            "ip_address": ap.ip_address,
            "is_restricted": ap.is_restricted,
            "required_clearance": ap.required_clearance
        }
        for ap in access_points
    ]

    # Get access policies
    policies = db.query(AccessPolicy).filter(AccessPolicy.org_id == org_id).all()
    policies_data = [
        {
            "id": p.id,
            "name": p.name,
            "role_id": p.role_id,
            "allowed_zones": p.allowed_zones or [],
            "allowed_days": p.allowed_days or [0, 1, 2, 3, 4, 5, 6],
            "time_start": p.time_start,
            "time_end": p.time_end,
            "deny_overrides_allow": p.deny_overrides_allow
        }
        for p in policies
    ]

    # Get data settings
    data_settings = db.query(OrgDataSetting).filter(OrgDataSetting.org_id == org_id).first()
    data_settings_data = {
        "use_historical_logs": data_settings.use_historical_logs if data_settings else False,
        "privacy_mask_pii": data_settings.privacy_mask_pii if data_settings else True,
        "data_retention_days": data_settings.data_retention_days if data_settings else 90,
        "start_with_conservative_defaults": data_settings.start_with_conservative_defaults if data_settings else True
    }

    return {
        "organization": {
            "id": org.id,
            "name": org.name,
            "industry": org.industry,
            "country": org.country,
            "timezone": org.timezone,
            "contact_email": org.contact_email,
            "contact_phone": org.contact_phone
        },
        "admins": [
            {
                "id": a.id,
                "email": a.email,
                "name": a.name,
                "role": "super_admin" if a.is_superuser else "admin"
            }
            for a in admins
        ],
        "buildings": buildings_data,
        "access_points": access_points_data,
        "policies": policies_data,
        "data_settings": data_settings_data
    }
