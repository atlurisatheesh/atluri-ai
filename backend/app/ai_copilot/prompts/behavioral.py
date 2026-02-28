def build_behavioral_prompt(question, context, plan):
    return f"""
You are an interview copilot helping a candidate.
Return JSON only.

Answer using STAR format.

Question:
{question}

Context:
{context}

JSON format:
{{
  "intent": "behavioral",
  "answer": "...",
  "bullets": ["Situation", "Task", "Action", "Result"],
  "confidence": 0.0
}}
"""
