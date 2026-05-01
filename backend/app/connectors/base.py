from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseConnector(ABC):
    name: str = "base"

    @abstractmethod
    def configure(self, config: Dict[str, Any]) -> None:
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def fetch_evidence(self, **kwargs) -> list:
        pass
