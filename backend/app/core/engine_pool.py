"""Per-tenant SQLAlchemy engine pool with LRU eviction.

Only used when CSAT_MODE=saas. The pool is process-local; one instance is
created at app startup and held in module-level state.
"""
from __future__ import annotations

import threading
from collections import OrderedDict
from typing import Protocol

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine


class _CompanyLike(Protocol):
    slug: str
    db_path: str


class EnginePool:
    def __init__(self, max_size: int = 128):
        if max_size < 1:
            raise ValueError("max_size must be >= 1")
        self.max_size = max_size
        self._engines: OrderedDict[str, Engine] = OrderedDict()
        self._lock = threading.Lock()

    def get_or_open(self, company: _CompanyLike) -> Engine:
        with self._lock:
            if company.slug in self._engines:
                self._engines.move_to_end(company.slug)
                return self._engines[company.slug]
            engine = create_engine(
                f"sqlite:///{company.db_path}",
                connect_args={"check_same_thread": False},
                echo=False,
            )
            self._engines[company.slug] = engine
            if len(self._engines) > self.max_size:
                _, evicted = self._engines.popitem(last=False)
                evicted.dispose()
            return engine

    def evict(self, slug: str) -> None:
        with self._lock:
            engine = self._engines.pop(slug, None)
            if engine is not None:
                engine.dispose()

    def clear(self) -> None:
        with self._lock:
            for engine in self._engines.values():
                engine.dispose()
            self._engines.clear()


# Process-wide singleton, initialised at startup in main.py.
_pool: EnginePool | None = None


def get_pool() -> EnginePool:
    if _pool is None:
        raise RuntimeError("EnginePool not initialised; call init_pool() first")
    return _pool


def init_pool(max_size: int) -> EnginePool:
    global _pool
    _pool = EnginePool(max_size=max_size)
    return _pool


def reset_for_tests() -> None:
    global _pool
    if _pool is not None:
        _pool.clear()
    _pool = None
