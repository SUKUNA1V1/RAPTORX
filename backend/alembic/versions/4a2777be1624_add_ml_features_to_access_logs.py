"""add_ml_features_to_access_logs

Revision ID: 4a2777be1624
Revises: 
Create Date: 2026-02-15 02:30:50.564360

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4a2777be1624'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("access_logs", sa.Column("is_first_access_today", sa.Boolean(), nullable=True))
    op.add_column("access_logs", sa.Column("sequential_zone_violation", sa.Boolean(), nullable=True))
    op.add_column("access_logs", sa.Column("access_attempt_count", sa.Integer(), nullable=True))
    op.add_column("access_logs", sa.Column("time_of_week", sa.Integer(), nullable=True))
    op.add_column("access_logs", sa.Column("hour_deviation_from_norm", sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("access_logs", "hour_deviation_from_norm")
    op.drop_column("access_logs", "time_of_week")
    op.drop_column("access_logs", "access_attempt_count")
    op.drop_column("access_logs", "sequential_zone_violation")
    op.drop_column("access_logs", "is_first_access_today")
