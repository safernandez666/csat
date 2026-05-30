from app.core.config import Settings


def test_default_mode_is_single(monkeypatch):
    monkeypatch.delenv("CSAT_MODE", raising=False)
    s = Settings()
    assert s.csat_mode == "single"
    assert s.is_saas is False


def test_saas_mode(monkeypatch):
    monkeypatch.setenv("CSAT_MODE", "saas")
    monkeypatch.setenv("CSAT_ENV", "dev")
    s = Settings()
    assert s.csat_mode == "saas"
    assert s.is_saas is True


def test_saas_mode_exposes_pool_and_paths(monkeypatch):
    monkeypatch.setenv("CSAT_MODE", "saas")
    monkeypatch.setenv("CSAT_ENV", "dev")
    monkeypatch.setenv("ENGINE_POOL_MAX_SIZE", "64")          # non-default to actually test parsing
    monkeypatch.setenv("CONTROL_DB_URL", "sqlite:///./other-control.db")  # non-default
    monkeypatch.setenv("TENANTS_DIR", "./custom/tenants")     # non-default
    monkeypatch.setenv("DEV_TENANT_SLUG", "stage")            # non-default
    s = Settings()
    assert s.engine_pool_max_size == 64
    assert s.control_db_url == "sqlite:///./other-control.db"
    assert s.tenants_dir == "./custom/tenants"
    assert s.dev_tenant_slug == "stage"
