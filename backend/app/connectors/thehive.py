from app.connectors.base import BaseConnector
from typing import Any, Dict


class TheHiveConnector(BaseConnector):
    name = "thehive"

    def configure(self, config: Dict[str, Any]) -> None:
        self.api_url = config.get("api_url")
        self.api_key = config.get("api_key")

    def health_check(self) -> Dict[str, Any]:
        return {"status": "not_configured", "message": "TheHive not yet configured"}

    def fetch_evidence(self, **kwargs) -> list:
        return []
