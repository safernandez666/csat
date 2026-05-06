from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.db.base import Base


class ControlStatus(str, enum.Enum):
    NOT_IMPLEMENTED = "not_implemented"
    IN_PROGRESS = "in_progress"
    IMPLEMENTED = "implemented"
    NEEDS_REVIEW = "needs_review"


class RiskLevel(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class SafeguardStatus(str, enum.Enum):
    NOT_IMPLEMENTED = "not_implemented"
    PARTS_IMPLEMENTED = "parts_implemented"
    IMPLEMENTED_MOST = "implemented_most"
    IMPLEMENTED_ALL = "implemented_all"
    NOT_APPLICABLE = "not_applicable"


class Control(Base):
    __tablename__ = "controls"

    id = Column(Integer, primary_key=True, index=True)
    cis_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    objective = Column(Text)
    implementation_guidance = Column(Text)
    status = Column(String, default=ControlStatus.NOT_IMPLEMENTED.value)
    risk_level = Column(String, default=RiskLevel.MEDIUM.value)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(Date, nullable=True)
    review_date = Column(Date, nullable=True)
    started_at = Column(DateTime, nullable=True)
    implemented_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="owned_controls")
    safeguards = relationship("Safeguard", back_populates="control", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="control", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="control", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="control", cascade="all, delete-orphan")
    review_schedules = relationship("ReviewSchedule", back_populates="control", cascade="all, delete-orphan")


class Safeguard(Base):
    __tablename__ = "safeguards"

    id = Column(Integer, primary_key=True, index=True)
    control_id = Column(Integer, ForeignKey("controls.id", ondelete="CASCADE"), nullable=False)
    safeguard_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    implementation_status = Column(String, default=SafeguardStatus.NOT_IMPLEMENTED.value)
    ig = Column(String, default="ig1", nullable=False)

    control = relationship("Control", back_populates="safeguards")
