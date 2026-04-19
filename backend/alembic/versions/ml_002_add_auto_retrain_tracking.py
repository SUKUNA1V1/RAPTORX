"""Add auto-retrain tracking columns to organizations table

Revision ID: ml_002
Revises: ml_001
Create Date: 2026-04-19

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ml_002'
down_revision = 'ml_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add auto-retrain tracking columns to organizations table
    op.add_column('organizations', sa.Column('last_training_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('organizations', sa.Column('next_retrain_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('organizations', sa.Column('auto_retrain_enabled', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    # Remove auto-retrain tracking columns
    op.drop_column('organizations', 'auto_retrain_enabled')
    op.drop_column('organizations', 'next_retrain_date')
    op.drop_column('organizations', 'last_training_date')
