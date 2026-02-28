from openai import OpenAI
from app.prompts import SYSTEM_PROMPT
from core.config import OPENAI_API_KEY
client = OpenAI(api_key=OPENAI_API_KEY)

# client = OpenAI()

VERIFIER_PROMPT = """
You are an AI verification system.

Your task:
1. Check factual correctness
2. Check logical consistency
3. Detect hallucinations
4. Detect missing assumptions
5. Improve clarity
6. Improve structure

Return response in this format:

CONFIDENCE_SCORE: <0-100>
ACCURACY_SCORE: <0-100>
REASONING_SCORE: <0-100>

FINAL_ANSWER:
<improved verified answer>

ISSUES_FOUND:
- issue 1
- issue 2
- issue 3
"""

def verify_answer(user_question: str, draft_answer: str) -> dict:
    messages = [
        {"role": "system", "content": VERIFIER_PROMPT},
        {"role": "user", "content": f"""
QUESTION:
{user_question}

DRAFT ANSWER:
{draft_answer}
"""}
    ]

    response = client.responses.create(
        model="gpt-4.1",
        input=messages
    )

    text = response.output_text

    # Basic parsing
    result = {
        "raw": text,
        "confidence": "",
        "accuracy": "",
        "reasoning": "",
        "final_answer": text
    }

    try:
        lines = text.splitlines()
        for l in lines:
            if l.startswith("CONFIDENCE_SCORE"):
                result["confidence"] = l.split(":")[1].strip()
            elif l.startswith("ACCURACY_SCORE"):
                result["accuracy"] = l.split(":")[1].strip()
            elif l.startswith("REASONING_SCORE"):
                result["reasoning"] = l.split(":")[1].strip()
            elif l.startswith("FINAL_ANSWER"):
                result["final_answer"] = "\n".join(lines[lines.index(l)+1:])
    except:
        pass

    return result
