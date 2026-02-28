from app.ai_copilot.engine import CopilotEngine

copilot = CopilotEngine(whisper_mode=True)

questions = [
    "Tell me about a time you handled conflict in a team",
    "Write a function to find the longest substring without repeating characters",
    "Design a URL shortening service"
    "Write a function to reverse a linked list"
]

for q in questions:
    print("\nQUESTION:", q)
    response = copilot.generate(q)
    print("RESPONSE:", response)
