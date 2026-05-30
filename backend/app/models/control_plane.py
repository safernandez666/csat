"""Control plane ORM models — live in control.db only.

These never appear in tenant DBs because they inherit from `ControlBase`
(separate MetaData from `TenantBase`).
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.bases import ControlBase


class Company(ControlBase):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    db_path = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")  # active | suspended | failed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    suspended_at = Column(DateTime, nullable=True)


class SuperUser(ControlBase):
    __tablename__ = "super_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class TenantAuditLog(ControlBase):
    __tablename__ = "tenant_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    super_user_id = Column(Integer, ForeignKey("super_users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    action = Column(String, nullable=False)
    # SQLAlchemy reserves `metadata`, so we use `metadata_` in Python.
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
