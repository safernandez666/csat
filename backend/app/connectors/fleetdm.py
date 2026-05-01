from app.connectors.base import BaseConnector
from typing import Any, Dict


class FleetDMConnector(BaseConnector):
    name = "fleetdm"

    def configure(self, config: Dict[str, Any]) -> None:
        self.api_url = config.get("api_url")
        self.api_token = config.get("api_token")

    def health_check(self) -> Dict[str, Any]:
        return {"status": "not_configured", "message": "FleetDM not yet configured"}

    def fetch_evidence(self, **kwargs) -> list:
        return []
