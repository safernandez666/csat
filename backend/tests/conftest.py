"""Shared fixtures for the CSAT backend test suite."""
import importlib
import pytest


@pytest.fixture
def tmp_data_dir(tmp_path, monkeypatch):
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
    # Force reload of modules that snapshot settings at import time.
    from app.core import config as config_module
    importlib.reload(config_module)
    yield {"data_dir": data_dir, "tenants_dir": tenants_dir, "uploads_dir": uploads_dir}


@pytest.fixture(autouse=True)
def reset_singletons():
    """Reset module-level singletons (control engine, pool) between tests."""
    yield
    from app.db import control_session
    from app.core import engine_pool
    control_session.reset_for_tests()
    engine_pool.reset_for_tests()


@pytest.fixture(autouse=True)
def reset_rate_limit():
    """Reset the in-memory rate limit store between tests."""
    yield
    import sys
    auth_mod = sys.modules.get("app.api.auth")
    if auth_mod is not None:
        auth_mod.RATE_LIMIT_STORE.clear()


@pytest.fixture
def app(tmp_data_dir, reset_singletons):
    """Fresh FastAPI app with SaaS middleware active."""
    # Late import: settings and pool must be reset first.
    import app.main as main_module
    importlib.reload(main_module)
    return main_module.app


@pytest.fixture
def admin_client(app):
    from fastapi.testclient import TestClient
    return TestClient(app, base_url="http://admin.csat.test")


def tenant_client_for(app, slug: str):
    from fastapi.testclient import TestClient
    return TestClient(app, base_url=f"http://{slug}.csat.test")
