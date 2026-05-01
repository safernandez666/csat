from sqlalchemy import Column, String, DateTime, JSON
from datetime import datetime, timezone
from app.db.base import Base


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
