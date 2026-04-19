"""create_onboarding_schema

Revision ID: 001_create_onboarding_schema
Revises: 
Create Date: 2026-02-15 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_create_onboarding_schema'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - create onboarding tables."""
    
    # Create organizations table
    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('industry', sa.String(), nullable=True),
        sa.Column('country', sa.String(), nullable=True),
        sa.Column('timezone', sa.String(), nullable=True),
        sa.Column('contact_email', sa.String(), nullable=True),
        sa.Column('contact_phone', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)

    # Create buildings table
    op.create_table(
        'buildings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('state', sa.String(), nullable=True),
        sa.Column('country', sa.String(), nullable=True),
        sa.Column('zip', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_buildings_id'), 'buildings', ['id'], unique=False)
    op.create_index(op.f('ix_buildings_org_id'), 'buildings', ['org_id'], unique=False)

    # Create floors table
    op.create_table(
        'floors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('building_id', sa.Integer(), nullable=False),
        sa.Column('floor_number', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('total_rooms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['building_id'], ['buildings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_floors_id'), 'floors', ['id'], unique=False)
    op.create_index(op.f('ix_floors_building_id'), 'floors', ['building_id'], unique=False)

    # Create zones table
    op.create_table(
        'zones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('floor_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('security_level', sa.Integer(), nullable=False, default=1),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['floor_id'], ['floors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_zones_id'), 'zones', ['id'], unique=False)
    op.create_index(op.f('ix_zones_floor_id'), 'zones', ['floor_id'], unique=False)

    # Create rooms table
    op.create_table(
        'rooms',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('zone_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('room_number', sa.String(), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_rooms_id'), 'rooms', ['id'], unique=False)
    op.create_index(op.f('ix_rooms_zone_id'), 'rooms', ['zone_id'], unique=False)

    # Create access_policies table (enhanced from AccessRule)
    op.create_table(
        'access_policies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('base_clearance', sa.Integer(), nullable=False, default=1),
        sa.Column('deny_overrides_allow', sa.Boolean(), nullable=False, default=False),
        sa.Column('two_person_required', sa.Boolean(), nullable=False, default=False),
        sa.Column('step_up_required_risk', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_access_policies_id'), 'access_policies', ['id'], unique=False)
    op.create_index(op.f('ix_access_policies_org_id'), 'access_policies', ['org_id'], unique=False)

    # Create onboarding_drafts table
    op.create_table(
        'onboarding_drafts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=True),
        sa.Column('step_number', sa.Integer(), nullable=False),
        sa.Column('draft_data', postgresql.JSON if 'postgresql' in sa.__version__ else sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_onboarding_drafts_id'), 'onboarding_drafts', ['id'], unique=False)
    op.create_index(op.f('ix_onboarding_drafts_org_id'), 'onboarding_drafts', ['org_id'], unique=False)

    # Create org_data_settings table
    op.create_table(
        'org_data_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('pii_masking_enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('retention_days', sa.Integer(), nullable=False, default=90),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id'),
    )
    op.create_index(op.f('ix_org_data_settings_id'), 'org_data_settings', ['id'], unique=False)
    op.create_index(op.f('ix_org_data_settings_org_id'), 'org_data_settings', ['org_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - drop onboarding tables."""
    op.drop_table('org_data_settings')
    op.drop_table('onboarding_drafts')
    op.drop_table('access_policies')
    op.drop_table('rooms')
    op.drop_table('zones')
    op.drop_table('floors')
    op.drop_table('buildings')
    op.drop_table('organizations')
