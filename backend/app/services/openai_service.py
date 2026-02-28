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

async def stream_answer_live(
    question: str,
    user_id: str | None = None,
    role: str | None = None,
    resume_loaded: bool = False,
    jd_loaded: bool = False,
    answer_language: str = "english",
):
    """
    TRUE streaming answer generation - yields tokens as OpenAI generates them.
    This gives ~200-500ms time-to-first-word instead of 3-5 seconds.
    
    Used by live voice interview for competitor-like instant response.
    
    answer_language: "english" = always English, "detected" = match question language
    """
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
        "Write a high-quality spoken answer (not coaching tips).\n"
        f"{language_instruction}"
        "Requirements:\n"
        "1) 90-160 words total.\n"
        "2) Start with one direct sentence answering the question.\n"
        "3) Add 2-4 concise bullets with concrete reasoning and one realistic metric/example.\n"
        "4) End with one short trade-off or decision line.\n"
        "5) If the question is vague or truncated, assume the most likely intent and state the assumption in the first sentence.\n"
        "6) Keep language natural and interview-ready. Avoid generic filler.\n\n"
        f"Role mode: {role or 'general'}\n"
        f"Resume loaded: {resume_loaded}\n"
        f"Job description loaded: {jd_loaded}"
    )
    
    context_block = ""
    if context.get('resume_text'):
        context_block += f"\nRESUME:\n{context.get('resume_text','')[:2000]}\n"
    if context.get('job_description'):
        context_block += f"\nJOB DESCRIPTION:\n{context.get('job_description','')[:2000]}\n"
    
    messages = [
        {"role": "system", "content": system_prompt},
    ]
    if context_block:
        messages.append({"role": "system", "content": context_block})
    messages.append({"role": "user", "content": question})
    
    # Use gpt-4o-mini for fastest streaming
    model = "gpt-4o-mini"
    
    # Retry with exponential backoff for OpenAI
    # Total max wait: 0.3 + 0.5 + 0.8 = 1.6s (under 2s for perceived responsiveness)
    MAX_RETRIES = 3
    BACKOFF_TIMES = [0.3, 0.5, 0.8]  # Quick retries to stay under 2s total
    openai_succeeded = False
    last_error = None
    
    for attempt in range(MAX_RETRIES):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                max_tokens=400,
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
                logger.warning("stream_answer_live all retries exhausted | model=%s err=%s", model, exc)
    
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
