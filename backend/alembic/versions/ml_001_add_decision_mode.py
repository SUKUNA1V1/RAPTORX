"""Add decision_mode column to organizations table

Revision ID: ml_001
Revises: security_001
Create Date: 2026-04-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ml_001'
down_revision: Union[str, Sequence[str], None] = 'security_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add decision_mode column to organizations table."""
    # Add decision_mode column to organizations table
    op.add_column('organizations', sa.Column('decision_mode', sa.String(), nullable=False, server_default='hard_rules'))


def downgrade() -> None:
    """Remove decision_mode column from organizations table."""
    op.drop_column('organizations', 'decision_mode')
