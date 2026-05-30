import importlib
from app.core import config as config_module


def test_default_mode_is_single(monkeypatch):
    monkeypatch.delenv("CSAT_MODE", raising=False)
    importlib.reload(config_module)
    assert config_module.settings.csat_mode == "single"
    assert config_module.settings.is_saas is False


def test_saas_mode(monkeypatch):
    monkeypatch.setenv("CSAT_MODE", "saas")
    monkeypatch.setenv("CSAT_ENV", "dev")
    importlib.reload(config_module)
    assert config_module.settings.csat_mode == "saas"
    assert config_module.settings.is_saas is True


def test_saas_mode_exposes_pool_and_paths(monkeypatch):
    monkeypatch.setenv("CSAT_MODE", "saas")
    monkeypatch.setenv("CSAT_ENV", "dev")
    monkeypatch.setenv("ENGINE_POOL_MAX_SIZE", "32")
    monkeypatch.setenv("CONTROL_DB_URL", "sqlite:///./test-control.db")
    monkeypatch.setenv("TENANTS_DIR", "./data/tenants")
    monkeypatch.setenv("DEV_TENANT_SLUG", "dev")
    importlib.reload(config_module)
    s = config_module.settings
    assert s.engine_pool_max_size == 32
    assert s.control_db_url == "sqlite:///./test-control.db"
    assert s.tenants_dir == "./data/tenants"
    assert s.dev_tenant_slug == "dev"
