import asyncio
from app.ai_copilot.engine import CopilotEngine

async def test():
    copilot = CopilotEngine()
    q = "Design a rate limiter"

    print("Streaming response:")
    async for chunk in copilot.stream(q):
        print(chunk, end="", flush=True)

asyncio.run(test())
