from openai import AsyncOpenAI
from core.config import OPENAI_API_KEY

client = AsyncOpenAI(api_key=OPENAI_API_KEY)


async def stream_llm(prompt: str):
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a strict JSON generator."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.4,
        stream=True
    )

    async for chunk in response:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
