"""Shared fixtures for the CSAT backend test suite.

Each test gets:
  - a tmp dir for control.db + tenants/
  - a fresh EnginePool
  - a FastAPI TestClient bound to a configurable Host
"""
import os
import pytest


@pytest.fixture
def tmp_data_dir(tmp_path, monkeypatch):
    """Point the app at a per-test tmp directory for all persistent state."""
    data_dir = tmp_path / "data"
    tenants_dir = data_dir / "tenants"
    uploads_dir = tmp_path / "uploads"
    for d in (data_dir, tenants_dir, uploads_dir):
        d.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CSAT_ENV", "dev")
    monkeypatch.setenv("CSAT_MODE", "saas")
    monkeypatch.setenv("CONTROL_DB_URL", f"sqlite:///{data_dir/'control.db'}")
    monkeypatch.setenv("TENANTS_DIR", str(tenants_dir))
    monkeypatch.setenv("UPLOAD_DIR", str(uploads_dir))
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-not-for-production-32b")
    yield {"data_dir": data_dir, "tenants_dir": tenants_dir, "uploads_dir": uploads_dir}


@pytest.fixture(autouse=True)
def reset_control_session():
    """Dispose the cached control plane engine after each test."""
    yield
    from app.db import control_session
    control_session.reset_for_tests()


@pytest.fixture(autouse=True)
def reset_engine_pool():
    """Dispose the cached EnginePool singleton after each test."""
    yield
    from app.core import engine_pool
    engine_pool.reset_for_tests()
