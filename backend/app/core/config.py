from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List

DEFAULT_SECRET_KEY = "dev-secret-key-change-me"
INSECURE_DOCKER_DEFAULT = "change-me-in-production"
INSECURE_EXAMPLE_DEFAULT = "your-super-secret-key-change-this-in-production"
INSECURE_BACKEND_EXAMPLE = "change-me-in-production-use-32-byte-random-string"


class Settings(BaseSettings):
    env: str = Field(default="dev", alias="CSAT_ENV")
    database_url: str = Field(default="sqlite:///./csat.db", alias="DATABASE_URL")
    secret_key: str = Field(default=DEFAULT_SECRET_KEY, alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=15, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    argon2_time_cost: int = Field(default=2, alias="ARGON2_TIME_COST")
    argon2_memory_cost: int = Field(default=65536, alias="ARGON2_MEMORY_COST")
    argon2_parallelism: int = Field(default=1, alias="ARGON2_PARALLELISM")
    cors_origins: str = Field(default="http://localhost:5173", alias="CORS_ORIGINS")
    upload_dir: str = Field(default="./uploads", alias="UPLOAD_DIR")
    max_upload_size_mb: int = Field(default=25, alias="MAX_UPLOAD_SIZE_MB")
    scheduler_enabled: bool = Field(default=True, alias="SCHEDULER_ENABLED")
    cookie_secure: bool = Field(default=False, alias="COOKIE_SECURE")

    # --- SaaS multi-tenant mode (Plan A) ---
    csat_mode: str = Field(default="single", alias="CSAT_MODE")  # "single" | "saas"
    control_db_url: str = Field(default="sqlite:///./control.db", alias="CONTROL_DB_URL")
    tenants_dir: str = Field(default="./data/tenants", alias="TENANTS_DIR")
    engine_pool_max_size: int = Field(default=128, alias="ENGINE_POOL_MAX_SIZE")
    dev_tenant_slug: str = Field(default="dev", alias="DEV_TENANT_SLUG")

    okta_client_id: str = Field(default="", alias="OKTA_CLIENT_ID")
    okta_client_secret: str = Field(default="", alias="OKTA_CLIENT_SECRET")
    okta_issuer_url: str = Field(default="", alias="OKTA_ISSUER_URL")
    keycloak_client_id: str = Field(default="", alias="KEYCLOAK_CLIENT_ID")
    keycloak_client_secret: str = Field(default="", alias="KEYCLOAK_CLIENT_SECRET")
    keycloak_issuer_url: str = Field(default="", alias="KEYCLOAK_ISSUER_URL")

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.env.lower() == "dev"

    @property
    def is_saas(self) -> bool:
        return self.csat_mode.lower() == "saas"

    def validate_runtime(self) -> None:
        if not self.is_dev and self.secret_key in (DEFAULT_SECRET_KEY, INSECURE_DOCKER_DEFAULT, INSECURE_EXAMPLE_DEFAULT, INSECURE_BACKEND_EXAMPLE, ""):
            raise RuntimeError(
                "SECRET_KEY is unset or using a known default. "
                "Set SECRET_KEY in your environment, or set CSAT_ENV=dev for local development."
            )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
settings.validate_runtime()
