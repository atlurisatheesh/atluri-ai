from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


@dataclass
class AssistConfig:
    intensity_level: int = 2
    deterministic: bool = False
    window_seconds: int = 20
    profile: str = "behavioral"


@dataclass
class AssistHint:
    rule_id: str
    title: str
    message: str
    severity: str
    priority: int
    profile: str
    timestamp: float

    def to_dict(self) -> dict:
        return {
            "rule_id": self.rule_id,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "priority": self.priority,
            "profile": self.profile,
            "timestamp": self.timestamp,
        }


@dataclass
class AssistRule:
    rule_id: str
    trigger_fn: Callable[[dict], bool]
    severity: str
    cooldown_sec: float
    priority: int
    title: str
    message: str
