"""add_org_id_to_existing_tables

Revision ID: 002_add_org_id_to_existing_tables
Revises: 001_create_onboarding_schema
Create Date: 2026-02-15 03:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_add_org_id_to_existing_tables'
down_revision: Union[str, Sequence[str], None] = '001_create_onboarding_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add org_id to existing tables."""
    
    # Add org_id to users table (nullable initially for backward compatibility)
    op.add_column('users', sa.Column('org_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_users_org_id', 'users', 'organizations', ['org_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_users_org_id'), 'users', ['org_id'], unique=False)

    # Add org_id to access_points table (nullable initially)
    op.add_column('access_points', sa.Column('org_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_access_points_org_id', 'access_points', 'organizations', ['org_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_access_points_org_id'), 'access_points', ['org_id'], unique=False)

    # Add org_id to access_rules table if it exists (nullable initially)
    try:
        op.add_column('access_rules', sa.Column('org_id', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_access_rules_org_id', 'access_rules', 'organizations', ['org_id'], ['id'], ondelete='SET NULL')
        op.create_index(op.f('ix_access_rules_org_id'), 'access_rules', ['org_id'], unique=False)
    except Exception:
        # access_rules table might not exist, silently continue
        pass


def downgrade() -> None:
    """Downgrade schema - remove org_id from existing tables."""
    
    try:
        op.drop_index(op.f('ix_access_rules_org_id'), table_name='access_rules')
        op.drop_constraint('fk_access_rules_org_id', 'access_rules', type_='foreignkey')
        op.drop_column('access_rules', 'org_id')
    except Exception:
        pass

    op.drop_index(op.f('ix_access_points_org_id'), table_name='access_points')
    op.drop_constraint('fk_access_points_org_id', 'access_points', type_='foreignkey')
    op.drop_column('access_points', 'org_id')

    op.drop_index(op.f('ix_users_org_id'), table_name='users')
    op.drop_constraint('fk_users_org_id', 'users', type_='foreignkey')
    op.drop_column('users', 'org_id')
