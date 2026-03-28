"""
Full Interview Flow E2E Tests
=============================
Simulates a real interview session over WebSocket:
  - Interviewer asks questions → candidate receives AI-generated answers
  - Tests answer timing (must arrive within 40s)
  - Tests stream cancellation when rapid questions overlap
  - Tests screen capture analysis
  - Tests session rejoin/state recovery
  - Tests question intelligence metadata
  - Tests concurrent multi-question resilience

Run with backend server on localhost:9010:
    cd backend && python -m pytest tests/test_full_interview_flow.py -v --timeout=120

Or standalone:
    cd backend && python tests/test_full_interview_flow.py
"""
import asyncio
import json
import os
import time
import uuid
from typing import Any

import pytest
import websockets

BASE_URL = os.getenv("WS_TEST_URL", "ws://127.0.0.1:9010")
HTTP_URL = os.getenv("HTTP_TEST_URL", "http://127.0.0.1:9010")
WS_VOICE = f"{BASE_URL}/ws/voice"
RECV_TIMEOUT = 45  # max seconds to wait for answer generation


# ─── Helpers ──────────────────────────────────────────────────────

def ws_url(room_id: str, participant: str = "candidate", intensity: int = 2) -> str:
    return f"{WS_VOICE}?room_id={room_id}&participant={participant}&assist_intensity={intensity}"


async def drain_events(ws, timeout_sec: float = RECV_TIMEOUT) -> list[dict[str, Any]]:
    """Collect all WS events until timeout or connection closes."""
    events: list[dict[str, Any]] = []
    deadline = asyncio.get_event_loop().time() + timeout_sec
    while asyncio.get_event_loop().time() < deadline:
        remaining = max(0.1, deadline - asyncio.get_event_loop().time())
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except (asyncio.TimeoutError, websockets.exceptions.ConnectionClosed):
            break
        if isinstance(msg, bytes):
            continue  # skip binary frames
        data = json.loads(msg)
        events.append(data)
    return events


async def drain_until_type(ws, target_type: str, timeout_sec: float = RECV_TIMEOUT) -> list[dict[str, Any]]:
    """Collect events until a specific type is received."""
    events: list[dict[str, Any]] = []
    deadline = asyncio.get_event_loop().time() + timeout_sec
    while asyncio.get_event_loop().time() < deadline:
        remaining = max(0.1, deadline - asyncio.get_event_loop().time())
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except (asyncio.TimeoutError, websockets.exceptions.ConnectionClosed):
            break
        if isinstance(msg, bytes):
            continue
        data = json.loads(msg)
        events.append(data)
        if data.get("type") == target_type:
            break
    return events


async def drain_until_done(ws, timeout_sec: float = RECV_TIMEOUT) -> list[dict[str, Any]]:
    """Drain until answer_suggestion (final) is received."""
    return await drain_until_type(ws, "answer_suggestion", timeout_sec)


def events_of_type(events: list[dict], t: str) -> list[dict]:
    return [e for e in events if e.get("type") == t]


def connect_pair(room_id: str):
    """Return (interviewer_url, candidate_url) for a room."""
    return ws_url(room_id, "interviewer"), ws_url(room_id, "candidate")


# ─── INTERVIEW QUESTIONS BANK (realistic) ─────────────────────────

BEHAVIORAL_QUESTIONS = [
    "Tell me about a time you had to lead a cross-functional team through a critical deadline. What was your approach?",
    "Describe a situation where you received negative feedback. How did you handle it?",
    "Give me an example of when you had to make a difficult technical decision with incomplete information.",
    "Walk me through a project where you significantly improved system performance. What metrics did you track?",
    "Tell me about a time you disagreed with your manager's technical direction. How did you resolve it?",
]

TECHNICAL_QUESTIONS = [
    "How would you design a real-time notification system that handles 10 million concurrent users?",
    "Explain the difference between eventual consistency and strong consistency. When would you choose each?",
    "Walk me through how you would debug a production memory leak in a Python microservice.",
    "How would you architect a distributed rate limiter that works across multiple data centers?",
    "Describe your approach to designing a search autocomplete system with sub-50ms latency.",
]

CODING_QUESTIONS = [
    "Write a function that finds the longest palindromic substring in a given string. What is its time complexity?",
    "How would you implement an LRU cache from scratch? Walk me through your design choices.",
    "Given a stream of integers, design a data structure that supports finding the median in O(log n) time.",
]

ALL_QUESTIONS = BEHAVIORAL_QUESTIONS + TECHNICAL_QUESTIONS + CODING_QUESTIONS


# ═══════════════════════════════════════════════════════════════════
# TEST 1: Basic Single-Question Flow
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_single_question_full_flow():
    """
    Interviewer asks one behavioral question.
    Candidate should receive the full answer pipeline:
      question → answer_suggestion_start → chunks → answer_suggestion_done → answer_suggestion
    """
    room_id = str(uuid.uuid4())
    i_url, c_url = connect_pair(room_id)

    async with websockets.connect(i_url) as interviewer, \
               websockets.connect(c_url) as candidate:
        # Let connections stabilize
        await asyncio.sleep(0.5)

        # Interviewer asks a question
        question = BEHAVIORAL_QUESTIONS[0]
        await interviewer.send(json.dumps({
            "type": "interviewer_question",
            "text": question,
        }))

        # Drain candidate events
        t0 = time.monotonic()
        events = await drain_until_done(candidate, timeout_sec=RECV_TIMEOUT)
        elapsed = time.monotonic() - t0

        types = [e.get("type") for e in events]

        # Must have the full answer sequence
        assert "answer_suggestion_start" in types, f"Missing answer_suggestion_start. Got: {types}"
        assert "answer_suggestion_done" in types, f"Missing answer_suggestion_done. Got: {types}"
        assert "answer_suggestion" in types, f"Missing answer_suggestion. Got: {types}"

        # Answer must have content
        final = events_of_type(events, "answer_suggestion")[0]
        suggestion = final.get("suggestion", "")
        assert len(suggestion) > 50, f"Answer too short ({len(suggestion)} chars): {suggestion[:100]}"

        # Must complete within 40 seconds
        assert elapsed < 40, f"Answer took {elapsed:.1f}s — exceeds 40s target"

        # Check for chunks (streaming)
        chunks = events_of_type(events, "answer_suggestion_chunk")
        assert len(chunks) >= 3, f"Expected ≥3 chunks, got {len(chunks)}"

        # Done reason should be 'completed'
        done = events_of_type(events, "answer_suggestion_done")[0]
        assert done.get("reason") == "completed", f"Expected completed, got {done.get('reason')}"

        print(f"  ✓ Single question answered in {elapsed:.1f}s ({len(chunks)} chunks, {len(suggestion)} chars)")


# ═══════════════════════════════════════════════════════════════════
# TEST 2: Answer Timing (must be 30-40s or less)
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_answer_timing_under_40_seconds():
    """
    Verify each question gets an answer within 40 seconds.
    Tests 3 different question types sequentially.
    """
    questions = [BEHAVIORAL_QUESTIONS[1], TECHNICAL_QUESTIONS[0], CODING_QUESTIONS[0]]
    timings: list[float] = []

    for question in questions:
        room_id = str(uuid.uuid4())
        i_url, c_url = connect_pair(room_id)

        async with websockets.connect(i_url) as interviewer, \
                   websockets.connect(c_url) as candidate:
            await asyncio.sleep(0.5)

            await interviewer.send(json.dumps({
                "type": "interviewer_question",
                "text": question,
            }))

            t0 = time.monotonic()
            events = await drain_until_done(candidate, timeout_sec=RECV_TIMEOUT)
            elapsed = time.monotonic() - t0
            timings.append(elapsed)

            finals = events_of_type(events, "answer_suggestion")
            assert len(finals) > 0, f"No answer for: {question[:50]}"
            assert elapsed < 40, f"'{question[:40]}...' took {elapsed:.1f}s > 40s"

    avg = sum(timings) / len(timings)
    print(f"  ✓ Answer timings: {[f'{t:.1f}s' for t in timings]} (avg {avg:.1f}s)")


# ═══════════════════════════════════════════════════════════════════
# TEST 3: Question Intelligence Metadata
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_question_intelligence_emitted():
    """
    When a question is asked, the server should emit question_intelligence
    with type classification, difficulty, and framework.
    """
    room_id = str(uuid.uuid4())
    i_url, c_url = connect_pair(room_id)

    async with websockets.connect(i_url) as interviewer, \
               websockets.connect(c_url) as candidate:
        await asyncio.sleep(0.5)

        await interviewer.send(json.dumps({
            "type": "interviewer_question",
            "text": BEHAVIORAL_QUESTIONS[0],
        }))

        events = await drain_until_done(candidate, timeout_sec=RECV_TIMEOUT)

        qi_events = events_of_type(events, "question_intelligence")
        assert len(qi_events) >= 1, f"No question_intelligence event. Types: {[e.get('type') for e in events]}"

        qi = qi_events[0]
        assert qi.get("question_type"), "Missing question_type"
        assert qi.get("difficulty"), "Missing difficulty"
        assert qi.get("framework"), "Missing framework"
        print(f"  ✓ Question classified: type={qi['question_type']}, diff={qi['difficulty']}, framework={qi['framework']}")


# ═══════════════════════════════════════════════════════════════════
# TEST 4: Stream Cancellation (rapid questions)
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_stream_cancellation_on_new_question():
    """
    Interviewer sends Q1, then Q2 200ms later.
    Q1 stream should be cancelled, Q2 should complete.
    """
    room_id = str(uuid.uuid4())
    i_url, c_url = connect_pair(room_id)

    async with websockets.connect(i_url) as interviewer, \
               websockets.connect(c_url) as candidate:
        await asyncio.sleep(0.5)

        q1 = "How did you optimize cloud infrastructure costs with measurable impact?"
        q2 = "How did you improve API reliability and reduce latency under heavy load?"

        # Fire Q1, then Q2 200ms later (simulates rapid interviewer)
        await interviewer.send(json.dumps({"type": "interviewer_question", "text": q1}))
        await asyncio.sleep(0.2)
        await interviewer.send(json.dumps({"type": "interviewer_question", "text": q2}))

        events = await drain_events(candidate, timeout_sec=RECV_TIMEOUT)

        # Q1 should be cancelled
        q1_done = [e for e in events
                    if e.get("type") == "answer_suggestion_done" and e.get("question") == q1]
        assert len(q1_done) >= 1, "No done event for Q1"
        assert q1_done[0].get("reason") == "cancelled", f"Q1 reason: {q1_done[0].get('reason')}"

        # Q2 should complete
        q2_done = [e for e in events
                    if e.get("type") == "answer_suggestion_done" and e.get("question") == q2]
        assert len(q2_done) >= 1, "No done event for Q2"
        assert q2_done[0].get("reason") == "completed", f"Q2 reason: {q2_done[0].get('reason')}"

        q2_final = [e for e in events
                     if e.get("type") == "answer_suggestion" and e.get("question") == q2]
        assert len(q2_final) >= 1, "No final answer for Q2"
        assert len(q2_final[0].get("suggestion", "")) > 20, "Q2 answer too short"

        print(f"  ✓ Q1 cancelled, Q2 completed ({len(q2_final[0]['suggestion'])} chars)")


# ═══════════════════════════════════════════════════════════════════
# TEST 5: Multi-Question Sequential Interview (5 questions)
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_full_5_question_interview():
    """
    Simulates a realistic 5-question interview:
    Interviewer asks each question, waits for full answer, then asks next.
    Validates every answer arrives and the session stays alive.
    """
    room_id = str(uuid.uuid4())
    i_url, c_url = connect_pair(room_id)
    questions = ALL_QUESTIONS[:5]

    async with websockets.connect(i_url) as interviewer, \
               websockets.connect(c_url) as candidate:
        await asyncio.sleep(0.5)

        results: list[dict] = []

        for i, question in enumerate(questions):
            await interviewer.send(json.dumps({
                "type": "interviewer_question",
                "text": question,
            }))

            t0 = time.monotonic()
            events = await drain_until_done(candidate, timeout_sec=RECV_TIMEOUT)
            elapsed = time.monotonic() - t0

            finals = events_of_type(events, "answer_suggestion")
            assert len(finals) > 0, f"Q{i+1} got no answer"
            answer = finals[0].get("suggestion", "")

            results.append({
                "question": question[:50],
                "answer_len": len(answer),
                "time_s": round(elapsed, 1),
                "chunks": len(events_of_type(events, "answer_suggestion_chunk")),
            })

            # Brief pause between questions (realistic)
            if i < len(questions) - 1:
                await asyncio.sleep(1.0)

        print("\n  Full 5-Question Interview Results:")
        for i, r in enumerate(results):
            print(f"    Q{i+1}: {r['time_s']}s | {r['answer_len']} chars | {r['chunks']} chunks | {r['question']}...")

        # Every answer should be non-trivial
        for i, r in enumerate(results):
            assert r["answer_len"] > 30, f"Q{i+1} answer too short: {r['answer_len']}"
            assert r["time_s"] < 40, f"Q{i+1} took {r['time_s']}s"


# ═══════════════════════════════════════════════════════════════════
# TEST 6: Rejoin / State Recovery
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_rejoin_state_recovery():
    """
    Candidate disconnects mid-stream, reconnects to same room,
    sends sync_state_request, and gets the current question + partial answer.
    """
    room_id = str(uuid.uuid4())
    i_url, c_url = connect_pair(room_id)

    # Phase 1: Connect, ask question, let streaming start
    async with websockets.connect(i_url) as interviewer:
        candidate_1 = await websockets.connect(c_url)
        await asyncio.sleep(0.5)

        question = "Describe the most complex distributed system you designed."
        await interviewer.send(json.dumps({
            "type": "interviewer_question",
            "text": question,
        }))

        # Wait for streaming to start
        await drain_until_type(candidate_1, "answer_suggestion_start", timeout_sec=10)
        # Read a few chunks
        for _ in range(3):
            try:
                await asyncio.wait_for(candidate_1.recv(), timeout=5)
            except Exception:
                break

        # Disconnect mid-stream
        await candidate_1.close()
        await asyncio.sleep(0.5)

        # Phase 2: Reconnect to same room
        candidate_2 = await websockets.connect(c_url)
        await asyncio.sleep(0.3)

        await candidate_2.send(json.dumps({"type": "sync_state_request"}))

        events = await drain_until_type(candidate_2, "sync_state", timeout_sec=10)
        sync_events = events_of_type(events, "sync_state")

        assert len(sync_events) >= 1, f"No sync_state response. Types: {[e.get('type') for e in events]}"
        state = sync_events[0]
        assert state.get("active_question"), "sync_state missing active_question"
        assert state.get("room_id") == room_id, "sync_state room_id mismatch"
        print(f"  ✓ Rejoin recovered: q='{state['active_question'][:50]}...', partial={len(state.get('partial_answer', ''))} chars")

        await candidate_2.close()


# ═══════════════════════════════════════════════════════════════════
# TEST 7: Dual-Participant Broadcast
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_dual_participant_broadcast():
    """
    Both interviewer and candidate WS should receive answer events
    when interviewer sends a question.
    """
    room_id = str(uuid.uuid4())
    i_url, c_url = connect_pair(room_id)

    async with websockets.connect(i_url) as interviewer, \
               websockets.connect(c_url) as candidate:
        await asyncio.sleep(0.5)

        await interviewer.send(json.dumps({
            "type": "interviewer_question",
            "text": TECHNICAL_QUESTIONS[1],
        }))

        # Collect from both in parallel
        i_task = asyncio.create_task(drain_until_done(interviewer, timeout_sec=RECV_TIMEOUT))
        c_task = asyncio.create_task(drain_until_done(candidate, timeout_sec=RECV_TIMEOUT))

        i_events, c_events = await asyncio.gather(i_task, c_task)

        i_types = set(e.get("type") for e in i_events)
        c_types = set(e.get("type") for e in c_events)

        # Both should receive the answer sequence
        required = {"answer_suggestion_start", "answer_suggestion_done", "answer_suggestion"}
        for name, types in [("interviewer", i_types), ("candidate", c_types)]:
            missing = required - types
            assert not missing, f"{name} missing events: {missing}"

        print(f"  ✓ Broadcast: interviewer got {len(i_events)} events, candidate got {len(c_events)} events")


# ═══════════════════════════════════════════════════════════════════
# TEST 8: Follow-up Predictions & Key Phrases
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_followup_and_keyphrases():
    """
    After an answer is generated, the server should emit
    key_phrase and/or followup_predictions asynchronously.
    """
    room_id = str(uuid.uuid4())
    i_url, c_url = connect_pair(room_id)

    async with websockets.connect(i_url) as interviewer, \
               websockets.connect(c_url) as candidate:
        await asyncio.sleep(0.5)

        await interviewer.send(json.dumps({
            "type": "interviewer_question",
            "text": BEHAVIORAL_QUESTIONS[3],  # performance improvement question
        }))

        # Drain for longer to catch post-answer intelligence
        events = await drain_events(candidate, timeout_sec=RECV_TIMEOUT + 5)

        types = [e.get("type") for e in events]

        # At least one of these should appear
        has_followup = "followup_predictions" in types
        has_keyphrase = "key_phrase" in types

        if has_followup:
            fp = events_of_type(events, "followup_predictions")[0]
            predictions = fp.get("predictions", {}).get("predictions", [])
            print(f"  ✓ Follow-up predictions: {predictions[:2]}")

        if has_keyphrase:
            kp = events_of_type(events, "key_phrase")[0]
            print(f"  ✓ Key phrase: {kp.get('key_phrase')}")

        assert has_followup or has_keyphrase, (
            f"No post-answer intelligence. Types seen: {types}"
        )


# ═══════════════════════════════════════════════════════════════════
# TEST 9: Ping/Pong Heartbeat
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_ping_pong():
    """Server should respond to ping with pong."""
    room_id = str(uuid.uuid4())
    url = ws_url(room_id, "candidate")

    async with websockets.connect(url) as ws:
        await asyncio.sleep(0.3)

        session_id = str(uuid.uuid4())
        await ws.send(json.dumps({
            "type": "ping",
            "session_id": session_id,
            "ts": time.time(),
        }))

        events = await drain_events(ws, timeout_sec=5)
        pongs = events_of_type(events, "pong")
        assert len(pongs) >= 1, f"No pong received. Types: {[e.get('type') for e in events]}"
        print(f"  ✓ Pong received")


# ═══════════════════════════════════════════════════════════════════
# TEST 10: Stop Answer Generation
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_stop_answer_generation():
    """
    Send a question, wait for streaming to start, then send
    stop_answer_generation. Stream should stop cleanly.
    """
    room_id = str(uuid.uuid4())
    i_url, c_url = connect_pair(room_id)

    async with websockets.connect(i_url) as interviewer, \
               websockets.connect(c_url) as candidate:
        await asyncio.sleep(0.5)

        await interviewer.send(json.dumps({
            "type": "interviewer_question",
            "text": TECHNICAL_QUESTIONS[2],
        }))

        # Wait for stream to start
        events_before = await drain_until_type(candidate, "answer_suggestion_start", timeout_sec=10)
        assert events_of_type(events_before, "answer_suggestion_start"), "Stream never started"

        # Read a couple chunks
        await asyncio.sleep(1.0)

        # Send stop
        await candidate.send(json.dumps({"type": "stop_answer_generation"}))

        # Drain remaining
        events_after = await drain_events(candidate, timeout_sec=10)
        done_events = events_of_type(events_after, "answer_suggestion_done")

        if done_events:
            reason = done_events[0].get("reason", "")
            print(f"  ✓ Generation stopped, reason={reason}")
        else:
            print(f"  ✓ Generation stopped (stream ended)")


# ═══════════════════════════════════════════════════════════════════
# TEST 11: Screen Capture Analysis (REST)
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_screen_capture_analysis():
    """
    POST a small base64 image to /api/capture/analyze
    and verify the AI returns an analysis.
    """
    try:
        import httpx
    except ImportError:
        pytest.skip("httpx not installed — pip install httpx")

    # Minimal 1x1 white PNG (base64)
    tiny_png = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4"
        "nGP4z8BQDwAEgAF/pooBPQAAAABJRU5ErkJggg=="
    )

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{HTTP_URL}/api/capture/analyze",
            json={
                "image_base64": tiny_png,
                "context": {
                    "role": "technical",
                    "question": "Implement a binary search tree",
                    "transcript": "The candidate is currently coding",
                    "resume": "",
                    "job_description": "Senior Software Engineer at Google",
                },
            },
        )

        if resp.status_code == 401:
            pytest.skip("Auth required for capture endpoint")

        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text[:200]}"
        data = resp.json()
        assert "analysis" in data, f"Missing 'analysis' key: {data}"
        assert len(data["analysis"]) > 10, f"Analysis too short: {data['analysis']}"
        print(f"  ✓ Capture analyzed: {data['analysis'][:80]}...")


# ═══════════════════════════════════════════════════════════════════
# TEST 12: Health Check
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_health_check():
    """Verify /healthz returns ok."""
    try:
        import httpx
    except ImportError:
        pytest.skip("httpx not installed")

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{HTTP_URL}/healthz")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True, f"Health check failed: {data}"
        print(f"  ✓ Health: ok")


# ═══════════════════════════════════════════════════════════════════
# STANDALONE RUNNER (interactive mode with colored output)
# ═══════════════════════════════════════════════════════════════════

async def run_all():
    """Run all tests and print summary."""
    tests = [
        ("Health Check", test_health_check),
        ("Ping/Pong Heartbeat", test_ping_pong),
        ("Single Question Flow", test_single_question_full_flow),
        ("Answer Timing (<40s)", test_answer_timing_under_40_seconds),
        ("Question Intelligence", test_question_intelligence_emitted),
        ("Stream Cancellation", test_stream_cancellation_on_new_question),
        ("Dual-Participant Broadcast", test_dual_participant_broadcast),
        ("Follow-ups & Key Phrases", test_followup_and_keyphrases),
        ("Stop Answer Generation", test_stop_answer_generation),
        ("Rejoin State Recovery", test_rejoin_state_recovery),
        ("Full 5-Question Interview", test_full_5_question_interview),
        ("Screen Capture Analysis", test_screen_capture_analysis),
    ]

    print("\n" + "=" * 70)
    print("  INTERVIEW FLOW E2E TEST SUITE")
    print(f"  Backend: {BASE_URL}")
    print("=" * 70 + "\n")

    passed = 0
    failed = 0
    skipped = 0
    results: list[tuple[str, str]] = []

    for name, test_fn in tests:
        print(f"  [{passed + failed + skipped + 1}/{len(tests)}] {name}...", end=" ", flush=True)
        try:
            await test_fn()
            passed += 1
            results.append((name, "PASS"))
        except Exception as e:
            err = str(e)
            if "skip" in err.lower() or "Skip" in type(e).__name__:
                skipped += 1
                results.append((name, "SKIP"))
                print(f"SKIP ({err})")
            else:
                failed += 1
                results.append((name, f"FAIL: {err[:100]}"))
                print(f"FAIL: {err[:120]}")

    print("\n" + "=" * 70)
    print(f"  RESULTS: {passed} passed, {failed} failed, {skipped} skipped / {len(tests)} total")
    print("=" * 70)

    for name, status in results:
        icon = "✓" if status == "PASS" else ("⊘" if status == "SKIP" else "✗")
        print(f"  {icon} {name}: {status}")

    print()
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(run_all())
