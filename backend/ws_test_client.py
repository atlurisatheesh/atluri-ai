import asyncio
import urllib.parse
import websockets

async def main():
    jd = "Senior DevOps Engineer. Must have Kubernetes, Terraform, AWS. 8+ years experience required."
    resume = "Satheesh Atluri. 9 years experience. Strong in AWS, Kubernetes, CI/CD."
    query = urllib.parse.urlencode({"role": "devops", "jd": jd, "resume": resume})
    url = f"ws://127.0.0.1:9010/ws/voice?{query}"
    async with websockets.connect(url) as ws:
        msg = await ws.recv()
        print(msg)

asyncio.run(main())
