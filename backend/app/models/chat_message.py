from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from datetime import datetime, timezone
from app.db.base import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("ix_chat_user_created", "user_id", "created_at"),
    )
