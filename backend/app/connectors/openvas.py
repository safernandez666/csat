from app.connectors.base import BaseConnector
from typing import Any, Dict


class OpenVASConnector(BaseConnector):
    name = "openvas"

    def configure(self, config: Dict[str, Any]) -> None:
        self.api_url = config.get("api_url")
        self.username = config.get("username")
        self.password = config.get("password")

    def health_check(self) -> Dict[str, Any]:
        return {"status": "not_configured", "message": "OpenVAS not yet configured"}

    def fetch_evidence(self, **kwargs) -> list:
        return []
