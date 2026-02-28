# import json
# from app.ai_copilot.intent import detect_intent
# from app.ai_copilot.planner import plan_answer
# from app.ai_reasoning.llm import call_llm
# from app.ai_copilot.prompts.generic import build_prompt


# class CopilotEngine:
#     def __init__(self, role="candidate"):
#         self.role = role

#     def generate_answer(self, question: str, context: dict):
#         intent = detect_intent(question)
#         plan = plan_answer(intent)

#         prompt = build_prompt(
#             question=question,
#             intent=intent,
#             plan=plan,
#             context=context
#         )

#         raw = call_llm(prompt)

#         try:
#             return json.loads(raw)
#         except Exception:
#             return {
#                 "intent": intent,
#                 "answer": "Let me think through this step by step.",
#                 "confidence": 0.3
#             }
# # 



import json
from app.ai_reasoning.llm import call_llm
from app.ai_reasoning.llm_stream import stream_llm
from app.ai_copilot.intent import detect_intent
from app.ai_copilot.prompts.coding import build_coding_prompt
from app.ai_copilot.prompts.system_design import build_system_design_prompt


class CopilotEngine:
    def __init__(self, whisper_mode: bool = False):
        self.whisper_mode = whisper_mode

    # -------------------------
    # MODE DECISION (IMPORTANT)
    # -------------------------
    def decide_mode(self, intent: str) -> str:
        if self.whisper_mode:
            return "whisper"

        if intent in ["coding", "system_design"]:
            return "bullets"

        return "full"

    # -------------------------
    # PROMPT BUILDER
    # -------------------------
    def build_generic_prompt(self, question: str, mode: str) -> str:
        return f"""
You are an interview copilot.

Rules:
- Return JSON ONLY
- Follow the requested mode strictly

Mode:
{mode}

Question:
{question}

JSON:
{{
  "intent": "behavioral | hr | unknown",
  "answer": "string",
  "key_points": ["string"],
  "confidence": 0.0
}}
"""

    # -------------------------
    # MAIN GENERATION (BLOCKING)
    # -------------------------
    async def generate(self, question: str) -> dict:
        intent = detect_intent(question)
        mode = self.decide_mode(intent)

        if intent == "coding":
            prompt = build_coding_prompt(question, mode)
        elif intent == "system_design":
            prompt = build_system_design_prompt(question, mode)
        else:
            prompt = self.build_generic_prompt(question, mode)

        raw = await call_llm(prompt)

        try:
            data = json.loads(raw)
        except Exception:
            data = {
                "intent": intent,
                "answer": "Let me think through this.",
                "key_points": [],
                "confidence": 0.3
            }

        # 🔒 ENFORCE MODE (safety net)
        data["mode"] = mode

        if mode == "whisper":
            data["answer"] = ""
            data["code"] = ""
        elif mode == "bullets":
            data["answer"] = ""
            data["verbal_explanation"] = ""

        return data

    # -------------------------
    # STREAMING VERSION
    # -------------------------
    async def stream(self, question: str):
        intent = detect_intent(question)
        mode = self.decide_mode(intent)

        if intent == "coding":
            prompt = build_coding_prompt(question, mode)
        elif intent == "system_design":
            prompt = build_system_design_prompt(question, mode)
        else:
            prompt = self.build_generic_prompt(question, mode)

        async for token in stream_llm(prompt):
            yield {
                "mode": mode,
                "token": token
            }

