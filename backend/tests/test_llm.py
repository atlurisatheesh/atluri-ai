import pytest


@pytest.mark.asyncio
async def test_call_llm_blank_prompt_short_circuit():
    from app.ai_reasoning.llm import call_llm

    result = await call_llm("")
    assert result == "{}"


@pytest.mark.asyncio
async def test_call_llm_success_with_mock(monkeypatch: pytest.MonkeyPatch):
    from app.ai_reasoning import llm

    class _Msg:
        content = '{"ok": true}'

    class _Choice:
        message = _Msg()

    class _Response:
        choices = [_Choice()]

    async def _fake_create(*args, **kwargs):
        return _Response()

    monkeypatch.setattr(llm.client.chat.completions, "create", _fake_create)

    result = await llm.call_llm("return json")
    assert result == '{"ok": true}'


@pytest.mark.asyncio
async def test_call_llm_fallback_after_failures(monkeypatch: pytest.MonkeyPatch):
    from app.ai_reasoning import llm

    async def _boom(*args, **kwargs):
        raise RuntimeError("forced")

    monkeypatch.setattr(llm.client.chat.completions, "create", _boom)

    result = await llm.call_llm("will fail", retries=1, timeout_sec=0.1)
    assert result == "{}"
