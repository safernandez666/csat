from app.connectors.base import BaseConnector
from typing import Any, Dict


class OktaOIDCConnector(BaseConnector):
    name = "okta_oidc"

    def configure(self, config: Dict[str, Any]) -> None:
        self.client_id = config.get("client_id")
        self.client_secret = config.get("client_secret")
        self.issuer_url = config.get("issuer_url")

    def health_check(self) -> Dict[str, Any]:
        return {"status": "not_configured", "message": "Okta OIDC not yet configured"}

    def fetch_evidence(self, **kwargs) -> list:
        return []
