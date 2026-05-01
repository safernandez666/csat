from app.connectors.base import BaseConnector
from typing import Any, Dict


class WazuhConnector(BaseConnector):
    name = "wazuh"

    def configure(self, config: Dict[str, Any]) -> None:
        self.api_url = config.get("api_url")
        self.api_key = config.get("api_key")

    def health_check(self) -> Dict[str, Any]:
        return {"status": "not_configured", "message": "Wazuh not yet configured"}

    def fetch_evidence(self, **kwargs) -> list:
        return []
