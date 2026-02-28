import asyncio
import websockets

async def test():
    async with websockets.connect("ws://localhost:9000/ws/voice") as ws:
        print("Connected to voice websocket")

asyncio.run(test())
