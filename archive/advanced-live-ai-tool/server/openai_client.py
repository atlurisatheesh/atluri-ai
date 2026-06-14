"""OpenAI integration — GPT-4o for response generation, code analysis, and resume analysis."""
from openai import AsyncOpenAI
from config import settings

_client = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def generate_interview_response(
    question: str,
    context: dict | None = None,
    persona: str = "senior_faang",
    style: str = "balanced",
) -> dict:
    """Genius Response Engine™ — Generate structured interview answer using GPT-4o."""
    client = get_openai_client()

    system_prompt = f"""You are an elite interview coach AI named InterviewGenius, operating in {persona} persona mode.
Your task: Generate a perfect interview answer for the candidate.

RESPONSE FORMAT (return valid JSON):
{{
  "direct_answer": "A clear, confident 2-3 sentence answer",
  "key_points": ["bullet point 1", "bullet point 2", "bullet point 3", "bullet point 4"],
  "star_example": "S: [Situation]. T: [Task]. A: [Action with specifics]. R: [Result with metrics].",
  "avoid_saying": ["thing to avoid 1", "thing to avoid 2"],
  "confidence": 0.92
}}

Rules:
- Be specific — use numbers, metrics, percentages
- Use power verbs: spearheaded, architected, championed, drove
- Reference the candidate's resume/JD context when available
- Style: {style} (fast=concise, balanced=detailed, thorough=comprehensive)"""

    context_str = ""
    if context:
        if context.get("resume"):
            context_str += f"\nCandidate Resume:\n{context['resume'][:2000]}"
        if context.get("job_description"):
            context_str += f"\nJob Description:\n{context['job_description'][:1500]}"
        if context.get("company"):
            context_str += f"\nCompany: {context['company']}"

    user_msg = f"Interview Question: {question}"
    if context_str:
        user_msg += f"\n\nContext:{context_str}"

    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.7,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )

        import json
        result = json.loads(response.choices[0].message.content)
        result["tokens_used"] = response.usage.total_tokens if response.usage else 0
        return result

    except Exception as e:
        return {
            "direct_answer": f"I'd approach this systematically. {question.rstrip('?')} requires careful consideration of multiple factors.",
            "key_points": ["Structured problem-solving approach", "Cross-functional collaboration", "Data-driven decision making", "Measurable outcomes"],
            "star_example": "S: Faced a similar challenge. T: Needed to deliver results under pressure. A: Led a focused initiative. R: Achieved significant improvement.",
            "avoid_saying": ["Avoid vague language", "Don't undersell your contributions"],
            "confidence": 0.75,
            "error": str(e),
        }


async def analyze_code_with_ai(problem: str, language: str, code: str | None = None) -> dict:
    """CodeForge™ — AI code analysis with Big-O, hints, and communication."""
    client = get_openai_client()

    system_prompt = """You are CodeForge™, an elite coding interview AI. Analyze the given problem and return valid JSON:
{
  "pattern": "Algorithm pattern name",
  "time_complexity": "O(n)",
  "space_complexity": "O(n)",
  "hints": [{"level": 1, "text": "..."}, {"level": 2, "text": "..."}, {"level": 3, "text": "..."}],
  "edge_cases": ["edge case 1", "edge case 2"],
  "solution_approach": "Brief explanation of optimal approach",
  "communication_script": ["What to say step 1", "step 2", "step 3"]
}"""

    user_msg = f"Problem: {problem}\nLanguage: {language}"
    if code:
        user_msg += f"\nCandidate's Code:\n```{language}\n{code}\n```"

    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.5,
            max_tokens=800,
            response_format={"type": "json_object"},
        )

        import json
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        return {
            "pattern": "Unable to analyze",
            "time_complexity": "N/A",
            "space_complexity": "N/A",
            "hints": [{"level": 1, "text": str(e)}],
            "edge_cases": [],
            "communication_script": [],
            "error": str(e),
        }


async def analyze_resume_with_ai(resume_text: str, job_description: str | None = None) -> dict:
    """ProfileCraft™ — AI resume analysis with ATS scoring."""
    client = get_openai_client()

    system_prompt = """You are ProfileCraft™, an AI resume analyzer. Score the resume and return valid JSON:
{
  "ats_score": 82,
  "issues": [{"type": "error|warning|info", "text": "description"}],
  "strengths": ["strength 1", "strength 2"],
  "missing_keywords": ["keyword 1", "keyword 2"],
  "rewrite_suggestions": [{"original": "weak bullet", "improved": "strong bullet with metrics"}]
}"""

    user_msg = f"Resume:\n{resume_text[:3000]}"
    if job_description:
        user_msg += f"\n\nJob Description:\n{job_description[:2000]}"

    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.5,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )

        import json
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        return {
            "ats_score": 70,
            "issues": [{"type": "warning", "text": str(e)}],
            "strengths": [],
            "missing_keywords": [],
            "rewrite_suggestions": [],
        }
