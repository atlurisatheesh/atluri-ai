import os
import sys
from dotenv import load_dotenv

load_dotenv("d:/linkedin-ai-main/backend/.env")

from app.interview.questions import generate_question

history = [
    {"q": "What are the key differences between synchronous and asynchronous programming in Java?", "a": "I have 5 years of experience using Java Spring Boot for the backend and React for the frontend."}
]

print("Generating response...")
res = generate_question("Java Full Stack Developer", history)
print("\n--- AI INTERVIEWER RESPONSE ---")
print(res)
print("-------------------------------")
