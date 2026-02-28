from __future__ import annotations


class MemorySnapshotBuilder:
    def build(self, memory_store) -> dict:
        if memory_store is None:
            return {
                "claim_count": 0,
                "contradiction_count": 0,
                "unresolved_contradictions": 0,
                "unresolved_assertion_count": 0,
                "consistency_score": 1.0,
                "top_unresolved": [],
                "top_unresolved_assertions": [],
            }
        return memory_store.snapshot()
