"""add ip_address to access_points

Revision ID: 7dabdc13895c
Revises: phase2_001
Create Date: 2026-05-17 03:43:26.217111

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7dabdc13895c'
down_revision: Union[str, Sequence[str], None] = 'phase2_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('access_points', sa.Column('ip_address', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('access_points', 'ip_address')
