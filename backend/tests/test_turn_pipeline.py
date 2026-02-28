import pytest

from app.api.ws_voice_components import CoachingEmitter, TranscriptRouter, TurnDecisionPipeline


@pytest.mark.asyncio
async def test_turn_decision_pipeline_runs_compute():
    async def _compute(text: str):
        return {"decision": text.upper()}

    pipeline = TurnDecisionPipeline(compute_fn=_compute)
    result = await pipeline.run("hello")
    assert result == {"decision": "HELLO"}


@pytest.mark.asyncio
async def test_coaching_emitter_sends_payload():
    sent = []

    async def _send(payload: dict):
        sent.append(payload)

    emitter = CoachingEmitter(send_fn=_send)
    await emitter.emit("s-1", ["Tip A", "Tip B"])

    assert sent
    assert sent[0]["type"] == "live_coaching"
    assert sent[0]["session_id"] == "s-1"
    assert sent[0]["tips"] == ["Tip A", "Tip B"]


@pytest.mark.asyncio
async def test_transcript_router_invokes_handler():
    observed = []

    async def _handler(payload: dict):
        observed.append(payload)

    router = TranscriptRouter(on_payload_fn=_handler)
    await router.route({"type": "candidate_transcript", "text": "hello"})

    assert observed == [{"type": "candidate_transcript", "text": "hello"}]
