from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.security import get_current_user, require_admin, require_analyst, require_auditor, require_viewer
from app.models.user import User


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
