# from openai import OpenAI
# from app.prompts import SYSTEM_PROMPT
# from app.memory import get_memory, add_message
# from app.state import user_context
# from app.verification.engine import verify_answer
# from core.config import OPENAI_API_KEY
# from app.router.engine import classify_task, select_model
# from app.verification.engine import verify_answer



# client = OpenAI(api_key=OPENAI_API_KEY)

# def get_ai_reply(user_message: str) -> str:
#     context_block = f"""
# RESUME:
# {user_context.get('resume_text','')}

# JOB DESCRIPTION:
# {user_context.get('job_description','')}
# """

#     messages = [
#         {"role": "system", "content": SYSTEM_PROMPT},
#         {"role": "system", "content": context_block},
#     ]

#     messages.extend(get_memory())
#     messages.append({"role": "user", "content": user_message})

#     response = client.responses.create(
#         model="gpt-4.1-mini",
#         input=messages
#     )

#     reply = response.output_text

#     add_message("user", user_message)
#     add_message("assistant", reply)

#     return reply
# def stream_ai_reply(user_message: str):
#     from app.state import user_context

#     context_block = f"""
# RESUME:
# {user_context.get('resume_text','')}

# JOB DESCRIPTION:
# {user_context.get('job_description','')}
# """

#     messages = [
#         {"role": "system", "content": SYSTEM_PROMPT},
#         {"role": "system", "content": context_block},
#         {"role": "user", "content": user_message},
#     ]

#     stream = client.responses.stream(
#         model="gpt-4.1-mini",
#         input=messages,
#     )

#     for event in stream:
#         if event.type == "response.output_text.delta":
#             yield event.delta

#     stream.close()
# def get_ai_reply(user_message: str) -> str:
#     from app.state import user_context

#     # ---------- Context ----------
#     context_block = f"""
# RESUME:
# {user_context.get('resume_text','')}

# JOB DESCRIPTION:
# {user_context.get('job_description','')}
# """

#     messages = [
#         {"role": "system", "content": SYSTEM_PROMPT},
#         {"role": "system", "content": context_block},
#         {"role": "user", "content": user_message},
#     ]

#     # ---------- Routing ----------
#     task = classify_task(user_message)
#     model = select_model(task)

#     # ---------- Draft Generation ----------
#     draft_response = client.responses.create(
#         model=model,
#         input=messages
#     )

#     draft = draft_response.output_text

#     # ---------- Verification Pass ----------
#     verified = verify_answer(user_message, draft)

#     # ---------- Memory ----------
#     add_message("user", user_message)
#     add_message("assistant", verified["final_answer"])

#     return f"""
# {verified['final_answer']}

# ---
# Model Used: {model}
# Task Type: {task}
# Confidence: {verified['confidence']}
# Accuracy: {verified['accuracy']}
# Reasoning: {verified['reasoning']}
# """

#     # -------- Draft Generation --------
#     draft_response = client.responses.create(
#         model="gpt-4.1-mini",
#         input=messages
#     )

#     draft = draft_response.output_text

#     # -------- Verification Pass --------
#     verified = verify_answer(user_message, draft)

#     # Store memory
#     add_message("user", user_message)
#     add_message("assistant", verified["final_answer"])

#     return f"""
# {verified['final_answer']}

# ---
# Confidence: {verified['confidence']}
# Accuracy: {verified['accuracy']}
# Reasoning: {verified['reasoning']}
# """


import asyncio
import logging
import os
from openai import AsyncOpenAI
import re
from app.prompts import SYSTEM_PROMPT
from app.state import get_user_context
from app.company_modes import get_company_mode_prompt
from app.verification.engine import verify_answer
from app.router.engine import classify_task, select_model
from app.db.chat_repo import get_chat_history_async
from core.config import OPENAI_API_KEY

logger = logging.getLogger("app.services.openai_service")

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

FORMAT_PROMPT = """
Response format rules:
- Answer as bullet points.
- Use short bullets (1-2 lines each).
- Avoid repeated words and duplicated phrases.
- No markdown headers unless the user asks.
"""


def _clean_repeated_words(text: str) -> str:
    parts = text.split()
    if not parts:
        return ""

    cleaned = [parts[0]]
    for token in parts[1:]:
        if token.lower() != cleaned[-1].lower():
            cleaned.append(token)
    return " ".join(cleaned)


def _clean_line(line: str) -> str:
    line = line.strip()
    if not line:
        return ""

    line = re.sub(r"^[-*•\d\.)\s:]+", "", line)
    line = re.sub(r"[`*_#]", "", line)
    line = re.sub(r"\s+", " ", line)
    line = _clean_repeated_words(line)
    line = line.strip(" -:\t")
    return line


def _format_as_bullets(raw_text: str, max_items: int = 6) -> str:
    text = str(raw_text or "").replace("\r", "\n").strip()
    if not text:
        return "- I can help with that. Please share a bit more detail."

    rough_items: list[str] = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith(("-", "*", "•")):
            rough_items.append(line)
        else:
            rough_items.extend(re.split(r"(?<=[.!?])\s+", line))

    seen: set[str] = set()
    normalized_items: list[str] = []
    for item in rough_items:
        cleaned = _clean_line(item)
        if len(cleaned) < 8:
            continue

        normalized_items.append(cleaned)

    merged_items: list[str] = []
    idx = 0
    while idx < len(normalized_items):
        current = normalized_items[idx]
        if len(current) < 28 and idx + 1 < len(normalized_items):
            current = f"{current}: {normalized_items[idx + 1]}"
            idx += 1
        merged_items.append(current)
        idx += 1

    final_items: list[str] = []
    for cleaned in merged_items:
        key = re.sub(r"[^a-z0-9]+", "", cleaned.lower())
        if not key or key in seen:
            continue
        seen.add(key)
        final_items.append(f"- {cleaned}")
        if len(final_items) >= max_items:
            break

    if not final_items:
        fallback = _clean_line(text)
        return f"- {fallback or 'Please share more detail so I can answer clearly.'}"

    return "\n".join(final_items)


# ================= NORMAL CHAT =================

async def _create_response_with_retry(messages: list[dict], model: str, timeout_sec: float = 18.0, retries: int = 2):
    last_error: Exception | None = None
    for attempt in range(max(1, retries + 1)):
        try:
            return await asyncio.wait_for(
                client.responses.create(
                    model=model,
                    input=messages,
                ),
                timeout=timeout_sec,
            )
        except asyncio.TimeoutError as exc:
            last_error = exc
            logger.warning("LLM timeout | model=%s attempt=%s", model, attempt + 1)
        except Exception as exc:
            last_error = exc
            logger.warning("LLM failure | model=%s attempt=%s err=%s", model, attempt + 1, exc)

        if attempt < retries:
            await asyncio.sleep(0.4 * (attempt + 1))

    raise RuntimeError(f"LLM request failed after retries: {last_error}")


async def get_ai_reply(user_message: str, user_id: str | None = None, company_mode: str | None = None) -> str:
    context = await asyncio.to_thread(get_user_context, user_id) if user_id else {"resume_text": "", "job_description": ""}
    context_block = f"""
RESUME:
{context.get('resume_text','')}

JOB DESCRIPTION:
{context.get('job_description','')}
"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": FORMAT_PROMPT},
        {"role": "system", "content": get_company_mode_prompt(company_mode)},
        {"role": "system", "content": context_block},
    ]

    if user_id:
        history_rows = await get_chat_history_async(user_id, limit=6)
        for item in history_rows:
            role = str(item.get("role") or "").strip().lower()
            content = str(item.get("message") or "").strip()
            if role in {"user", "assistant", "system"} and content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})

    # ---------- Routing ----------
    task = classify_task(user_message)
    model = select_model(task)

    # ---------- Draft ----------
    try:
        response = await _create_response_with_retry(messages=messages, model=model)
        draft = str(getattr(response, "output_text", "") or "")
    except Exception as exc:
        logger.warning("get_ai_reply fallback | model=%s err=%s", model, exc)
        return _format_as_bullets("I can help with that. Share one specific detail and I will provide a concise interview-ready response.")

    # draft = route_request(task, messages)
    # ---------- Verification ----------
    verified = await asyncio.to_thread(verify_answer, user_message, draft)

    cleaned_answer = _format_as_bullets(verified["final_answer"])

    return cleaned_answer


# ================= STREAMING CHAT =================

async def stream_ai_reply(user_message: str, user_id: str | None = None, company_mode: str | None = None):
    context = await asyncio.to_thread(get_user_context, user_id) if user_id else {"resume_text": "", "job_description": ""}

    context_block = f"""
RESUME:
{context.get('resume_text','')}

JOB DESCRIPTION:
{context.get('job_description','')}
"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": FORMAT_PROMPT},
        {"role": "system", "content": get_company_mode_prompt(company_mode)},
        {"role": "system", "content": context_block},
        {"role": "user", "content": user_message},
    ]

    task = classify_task(user_message)
    model = select_model(task)

    try:
        response = await _create_response_with_retry(messages=messages, model=model)
        final_text = str(getattr(response, "output_text", "") or "")
    except Exception as exc:
        logger.warning("stream_ai_reply fallback | model=%s err=%s", model, exc)
        final_text = "I can help with that. Share one specific detail and I will provide a concise interview-ready response."
    cleaned = _format_as_bullets(final_text)

    for line in cleaned.split("\n"):
        yield line + "\n"


# ================= TRUE STREAMING FOR LIVE INTERVIEW =================

# Ollama fallback configuration  
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "mistral"  # or "llama3" - use local model when OpenAI unavailable

async def _check_ollama_available() -> bool:
    """Check if Ollama is running locally."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=2.0) as http_client:
            resp = await http_client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return resp.status_code == 200
    except:
        return False

async def _stream_ollama_fallback(messages: list[dict], model: str = OLLAMA_MODEL):
    """Stream from local Ollama when OpenAI is unavailable."""
    import httpx
    
    # Convert messages to Ollama format
    ollama_messages = []
    for msg in messages:
        ollama_messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    payload = {
        "model": model,
        "messages": ollama_messages,
        "stream": True,
        "options": {
            "temperature": 0.7,
            "num_predict": 400
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as http_client:
            async with http_client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload
            ) as response:
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        import json as json_lib
                        data = json_lib.loads(line)
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
                    except:
                        pass
    except Exception as e:
        logger.warning("Ollama fallback error: %s", e)
        yield "Unable to generate response - both OpenAI and local Ollama unavailable."


async def _stream_anthropic_fallback(messages: list[dict], model: str):
    """Stream via Anthropic SDK, then yield token chunks for UI parity."""
    try:
        from anthropic import AsyncAnthropic  # type: ignore
    except Exception as exc:
        raise RuntimeError("anthropic SDK not installed") from exc

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    client = AsyncAnthropic(api_key=api_key)

    system_chunks: list[str] = []
    chat_messages: list[dict[str, str]] = []
    for msg in messages:
        role = str(msg.get("role", "user"))
        content = str(msg.get("content", ""))
        if not content:
            continue
        if role == "system":
            system_chunks.append(content)
            continue
        normalized_role = "assistant" if role == "assistant" else "user"
        chat_messages.append({"role": normalized_role, "content": content})

    if not chat_messages:
        chat_messages = [{"role": "user", "content": "Please provide a concise interview-ready answer."}]

    response = await client.messages.create(
        model=model,
        max_tokens=500,
        temperature=0.7,
        system="\n\n".join(system_chunks) if system_chunks else None,
        messages=chat_messages,
    )

    text_parts: list[str] = []
    for block in getattr(response, "content", []):
        if getattr(block, "type", "") == "text" and getattr(block, "text", ""):
            text_parts.append(block.text)
    final_text = "\n".join(text_parts).strip()
    if not final_text:
        final_text = "I can help with that. Please share one more detail and I will refine the answer."

    # Emit word-level chunks to preserve streaming UX.
    for token in re.findall(r"\S+\s*", final_text):
        yield token

async def stream_answer_live(
    question: str,
    user_id: str | None = None,
    role: str | None = None,
    resume_loaded: bool = False,
    jd_loaded: bool = False,
    answer_language: str = "english",
    company: str = "",
    position: str = "",
    industry: str = "",
    experience: str = "",
    objective: str = "",
    company_research: str = "",
    coach_style: str = "",
    coach_industry: str = "",
    voice_signature: str = "",
    model: str = "",
    screenshot_base64: str = "",
    image_context: str = "",
):
    """
    TRUE streaming answer generation - yields tokens as OpenAI generates them.
    This gives ~200-500ms time-to-first-word instead of 3-5 seconds.
    
    Used by live voice interview for competitor-like instant response.
    
    answer_language: "english" = always English, "detected" = match question language
    """
    from core.config import QA_MODE
    if QA_MODE:
        q = question.lower()
        print(f"!!! QA MODE TRIGGERED FOR: {q}")
        ans = "This is a generic QA mock answer for testing."
        if "payment gateway" in q:
            ans = "I documented both approaches with projected outcomes and let the data decide. We identified the gap early, and I drove the architectural fix to adapt."
        elif "idempotency" in q or "kafka" in q:
            ans = "To guarantee idempotency during a partition rebalance, I shift from a synchronous saga to event-driven choreography. We ensure the consumer maintains a dedicated state store for processed message offsets, effectively isolating the Kafka partition topology from upstream jitter."
        elif "event loop" in q:
            ans = "The JavaScript event loop manages asynchronous operations. The call stack executes code, while the microtask queue handles promises, ensuring async and await operations run at the end of the current tick before the next macro task."
        elif "url shortener" in q:
            ans = "I would hash the URLs and store them in a database. I'd use sharding and replication to scale the db, and put a cache and CDN behind a load balancer for reads."
        elif "two sum" in q:
            ans = "I would use a hash map or dictionary for an O(n) lookup of the complement."
        elif "weakness" in q:
            ans = "My biggest weakness was struggling with delegation, which was a challenge, but I've worked hard to learn from it and improve my delegation, leading to leadership growth."
        elif "process and a thread" in q:
            ans = "A process has isolated memory, while a thread has shared memory."
        elif "cap theorem" in q:
            ans = "CAP theorem says you can only pick two: consistency, availability, or partition tolerance."
        elif "database query performance" in q:
            ans = "I would add an index, use explain to analyze the query, add a cache, and then partition or shard."
        elif "five years" in q:
            ans = "I want to grow, lead a team, build my skill set, and make an impact on the vision and goal."

        for word in ans.split():
            yield word + " "
            await asyncio.sleep(0.01)
        return

    context = await asyncio.to_thread(get_user_context, user_id) if user_id else {"resume_text": "", "job_description": ""}
    
    # Build language instruction based on preference
    language_instruction = ""
    if answer_language == "detected":
        language_instruction = (
            "IMPORTANT: Respond in the SAME language as the question. "
            "If the question is in Hindi, respond in Hindi. "
            "If in Tamil, respond in Tamil. If in English, respond in English. "
            "Match the language exactly.\n\n"
        )
    else:
        language_instruction = "Respond in English only.\n\n"
    
    system_prompt = (
        "You are generating a live interview response draft for a candidate. "
        "Write a high-quality, detailed spoken answer (not coaching tips).\n"
        f"{language_instruction}"
        "Requirements:\n"
        "1) 200-300 words total. Be thorough and substantive.\n"
        "2) Start with one direct sentence answering the question clearly.\n"
        "3) Provide 3-5 detailed points with concrete examples, real metrics, specific technologies, and measurable outcomes.\n"
        "4) For behavioral questions, use the STAR format (Situation, Task, Action, Result) with specific details.\n"
        "5) For technical questions, explain the architecture, trade-offs, and your reasoning process.\n"
        "6) End with a strong closing statement that ties back to the role/company.\n"
        "7) If the question is vague or truncated, assume the most likely intent and state the assumption in the first sentence.\n"
        "8) Keep language natural, confident, and interview-ready. Avoid generic filler. Use first person.\n\n"
        f"Role mode: {role or 'general'}\n"
        f"Resume loaded: {resume_loaded}\n"
        f"Job description loaded: {jd_loaded}"
    )
    
    # Inject session context from desktop setup wizard (company, position, industry, etc.)
    session_context_parts = []
    if company:
        session_context_parts.append(f"Target Company: {company}")
    if position:
        session_context_parts.append(f"Target Position: {position}")
    if industry and industry != "default":
        session_context_parts.append(f"Industry: {industry}")
    if experience and experience != "mid":
        session_context_parts.append(f"Experience Level: {experience}")
    if objective:
        session_context_parts.append(f"Interview Objective: {objective[:400]}")
    if coach_style and coach_style != "balanced":
        style_map = {
            "aggressive": "Be direct, assertive. Emphasize leadership and impact.",
            "supportive": "Be warm and collaborative. Highlight teamwork.",
            "behavioral": "Emphasize STAR format. Lead with situation/context.",
            "technical": "Be precise and technical. Lead with architecture/implementation details.",
            "coding": "Focus on algorithmic thinking, time/space complexity, trade-offs.",
        }
        session_context_parts.append(f"Coaching Style: {style_map.get(coach_style, coach_style)}")
    if coach_industry and coach_industry != "default":
        session_context_parts.append(f"Coaching Industry Lens: {coach_industry}")
    
    if session_context_parts:
        system_prompt += "\n\n--- SESSION CONTEXT ---\n" + "\n".join(session_context_parts)
    
    # Voice personalization injection
    if voice_signature:
        system_prompt += "\n\n--- VOICE PERSONALIZATION ---\n" + voice_signature
    
    context_block = ""
    if context.get('resume_text'):
        context_block += f"\nRESUME:\n{context.get('resume_text','')[:2000]}\n"
    if context.get('job_description'):
        context_block += f"\nJOB DESCRIPTION:\n{context.get('job_description','')[:2000]}\n"
    if company_research:
        context_block += f"\nCOMPANY RESEARCH:\n{company_research[:1500]}\n"
    
    messages = [
        {"role": "system", "content": system_prompt},
    ]
    if context_block:
        messages.append({"role": "system", "content": context_block})

    # ── VISION MODE: When a screenshot is available, use GPT-4o vision ──
    if screenshot_base64:
        vision_hint = (
            "A screenshot of the interviewer's screen is attached. "
            "Analyze what's visible (coding problem, system design diagram, chat message, shared document) "
            "and incorporate it into your answer. "
            "If it shows a coding problem: identify the problem, suggest optimal approach, provide code solution with complexity analysis. "
            "If it shows a diagram or architecture: reference the specific components visible. "
            "If it shows a chat/question: read and respond to what's written on screen."
        )
        if image_context:
            vision_hint += f"\nAdditional context: {image_context}"
        user_content = [
            {"type": "text", "text": f"{vision_hint}\n\nInterviewer's question: {question}"},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{screenshot_base64}",
                    "detail": "high",
                },
            },
        ]
        messages.append({"role": "user", "content": user_content})
        logger.info("stream_answer_live: VISION MODE — screenshot attached (%d KB)", len(screenshot_base64) // 1024)
    else:
        messages.append({"role": "user", "content": question})
    
    # Route model via model router (supports multi-provider)
    from app.router.model_router import resolve_model, get_fallback_spec, PROVIDER_OPENAI, PROVIDER_ANTHROPIC, PROVIDER_OLLAMA
    spec = get_fallback_spec(resolve_model(model))
    resolved_model = spec.api_model

    # Force GPT-4o for vision (mini doesn't support images)
    if screenshot_base64 and "mini" in (resolved_model or ""):
        resolved_model = "gpt-4o"
        logger.info("stream_answer_live: upgraded to gpt-4o for vision")

    logger.info("stream_answer_live model=%s → provider=%s api_model=%s", model, spec.provider, resolved_model)
    
    # For non-OpenAI providers, delegate to provider-specific streaming
    if spec.provider == PROVIDER_ANTHROPIC:
        try:
            async for token in _stream_anthropic_fallback(messages, resolved_model):
                yield token
            return
        except Exception as exc:
            logger.warning("Anthropic streaming failed (model=%s): %s. Falling back to OpenAI.", resolved_model, exc)
            resolved_model = "gpt-4o-mini"

    if spec.provider == PROVIDER_OLLAMA:
        async for token in _stream_ollama_fallback(messages, resolved_model or OLLAMA_MODEL):
            yield token
        return
    
    if spec.provider not in (PROVIDER_OPENAI,):
        # All other providers (Gemini, xAI, DeepSeek, Moonshot) — use OpenAI-compatible endpoint or fallback
        logger.info("Provider %s not yet streaming-enabled, using OpenAI fallback", spec.provider)
        resolved_model = "gpt-4o-mini"
    
    # Retry with exponential backoff for OpenAI
    # Total max wait: 0.3 + 0.5 + 0.8 = 1.6s (under 2s for perceived responsiveness)
    MAX_RETRIES = 3
    BACKOFF_TIMES = [0.3, 0.5, 0.8]  # Quick retries to stay under 2s total
    openai_succeeded = False
    last_error = None
    
    for attempt in range(MAX_RETRIES):
        try:
            response = await client.chat.completions.create(
                model=resolved_model,
                messages=messages,
                temperature=0.7,
                max_tokens=1200 if screenshot_base64 else 800,
                stream=True,  # TRUE STREAMING
            )
            
            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            
            openai_succeeded = True
            break  # Success - exit retry loop
                
        except Exception as exc:
            last_error = exc
            if attempt < MAX_RETRIES - 1:
                backoff_sec = BACKOFF_TIMES[attempt]
                logger.warning("stream_answer_live retry %d/%d after %.1fs | err=%s", 
                             attempt + 1, MAX_RETRIES, backoff_sec, exc)
                await asyncio.sleep(backoff_sec)
            else:
                logger.warning("stream_answer_live all retries exhausted | model=%s err=%s", resolved_model, exc)
    
    # Fallback to Ollama if OpenAI failed after all retries
    if not openai_succeeded:
        ollama_available = await _check_ollama_available()
        if ollama_available:
            logger.info("Using Ollama fallback for answer generation after OpenAI failures")
            async for token in _stream_ollama_fallback(messages, OLLAMA_MODEL):
                yield token
        else:
            # Neither available - yield static fallback
            yield "I understand that's an important question. Here's a concise answer: "
            yield "Please rephrase and I'll provide a detailed response tailored to your interview context."
