from app.db.bases import ControlBase, TenantBase


def test_two_separate_metadata_registries():
    assert ControlBase.metadata is not TenantBase.metadata


def test_existing_tenant_tables_registered_on_tenant_base():
    # Importing models registers them on whichever base they inherit from.
    import app.models  # noqa: F401
    table_names = set(TenantBase.metadata.tables.keys())
    # Sanity: at least the core tenant tables are present on TenantBase.
    assert "users" in table_names
    assert "controls" in table_names
    assert "safeguards" in table_names
    assert "evidence" in table_names


def test_back_compat_base_is_tenant_base():
    from app.db.base import Base
    assert Base is TenantBase
