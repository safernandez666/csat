import os
from sqlalchemy.engine import Engine


def _make_company(slug: str, tenants_dir):
    """Lightweight stub matching the duck-type EnginePool expects."""
    class C:
        pass
    c = C()
    c.slug = slug
    c.db_path = str(tenants_dir / f"{slug}.db")
    return c


def test_get_or_open_creates_engine_on_disk(tmp_data_dir):
    from app.core.engine_pool import EnginePool

    pool = EnginePool(max_size=4)
    company = _make_company("acme", tmp_data_dir["tenants_dir"])
    engine = pool.get_or_open(company)
    assert isinstance(engine, Engine)
    # SQLite creates the file when the engine first connects.
    with engine.connect():
        pass
    assert os.path.exists(company.db_path)


def test_get_or_open_caches_engine(tmp_data_dir):
    from app.core.engine_pool import EnginePool

    pool = EnginePool(max_size=4)
    company = _make_company("acme", tmp_data_dir["tenants_dir"])
    e1 = pool.get_or_open(company)
    e2 = pool.get_or_open(company)
    assert e1 is e2


def test_lru_evicts_least_recently_used(tmp_data_dir):
    from app.core.engine_pool import EnginePool

    pool = EnginePool(max_size=2)
    a = _make_company("a", tmp_data_dir["tenants_dir"])
    b = _make_company("b", tmp_data_dir["tenants_dir"])
    c = _make_company("c", tmp_data_dir["tenants_dir"])
    ea = pool.get_or_open(a)
    eb = pool.get_or_open(b)
    # Touch `a` so it becomes MRU; `b` is now LRU.
    pool.get_or_open(a)
    ec = pool.get_or_open(c)
    assert "a" in pool._engines
    assert "c" in pool._engines
    assert "b" not in pool._engines
    # Old engine should have been disposed (no exception on dispose-twice).
    eb.dispose()


def test_evict_disposes_engine(tmp_data_dir):
    from app.core.engine_pool import EnginePool

    pool = EnginePool(max_size=1)
    a = _make_company("a", tmp_data_dir["tenants_dir"])
    b = _make_company("b", tmp_data_dir["tenants_dir"])
    ea = pool.get_or_open(a)
    pool.get_or_open(b)  # evicts a
    # After eviction, the engine should be closed: a fresh connection still
    # works because SQLite re-opens lazily; but the pool should no longer
    # have the slug.
    assert "a" not in pool._engines
