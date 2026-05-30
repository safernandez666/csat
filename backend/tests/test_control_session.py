import pytest
from sqlalchemy import inspect


@pytest.fixture(autouse=True)
def reset_control_session():
    """Ensure the module-level engine cache is cleared between tests."""
    yield
    from app.db.control_session import reset_for_tests
    reset_for_tests()


def test_init_control_db_creates_control_tables_only(tmp_data_dir):
    # Late import so monkeypatched envs apply.
    from app.core.config import Settings
    s = Settings()
    from app.db.control_session import init_control_db, get_control_engine

    init_control_db()
    engine = get_control_engine()
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    # Control-plane tables exist (they'll be added in Task 5; for now the
    # registry is empty but the engine must point at the configured URL).
    assert str(engine.url) == s.control_db_url


def test_get_control_db_yields_session(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_db

    init_control_db()
    gen = get_control_db()
    db = next(gen)
    try:
        assert db.is_active
    finally:
        gen.close()
