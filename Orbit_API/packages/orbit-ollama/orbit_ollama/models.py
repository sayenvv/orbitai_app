from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class OllamaModel:
    name: str
    size: int | None = None
    modified_at: datetime | None = None
    digest: str | None = None
    family: str | None = None
    parameter_size: str | None = None
    quantization_level: str | None = None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "size": self.size,
            "modified_at": self.modified_at.isoformat() if self.modified_at else None,
            "digest": self.digest,
            "family": self.family,
            "parameter_size": self.parameter_size,
            "quantization_level": self.quantization_level,
        }
