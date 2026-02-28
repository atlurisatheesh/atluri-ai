# backend/app/answer_engine/answer_generator.py

from typing import Dict
from app.ai_reasoning.llm import call_llm
   # reuse your existing LLM helper

async def generate_answer(
    question: str,
    intent_data: Dict,
    memory_context: str
) -> str:
    intent = intent_data["intent"]
    style = intent_data["answer_style"]

    system_prompt = f"""
You are an expert interview assistant.
Answer clearly, confidently, and naturally.
Style: {style}
"""

    if style == "STAR":
        system_prompt += """
Use STAR format:
- Situation
- Task
- Action
- Result
Include metrics where possible.
"""

    elif style == "step_by_step":
        system_prompt += """
Explain:
1. Approach
2. Edge cases
3. Time & space complexity
4. Final answer
"""

    user_prompt = f"""
Previous context:
{memory_context}

Interview question:
{question}
"""

    return await call_llm(
        f"{system_prompt}\n\n{user_prompt}"
    )
