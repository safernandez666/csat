from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base


class ReviewSchedule(Base):
    __tablename__ = "review_schedules"

    id = Column(Integer, primary_key=True, index=True)
    control_id = Column(Integer, ForeignKey("controls.id", ondelete="CASCADE"), nullable=False)
    review_type = Column(String, nullable=False)
    next_review_at = Column(DateTime, nullable=False)
    last_reviewed_at = Column(DateTime, nullable=True)

    control = relationship("Control", back_populates="review_schedules")
