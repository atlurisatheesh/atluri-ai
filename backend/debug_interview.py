import os
import sys

# Add backend dir to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from app.interview.engine import AIInterviewEngine

engine = AIInterviewEngine()

try:
    print("Starting interview...")
    session_id, question = engine.start(user_id="test_user_123", role="Java Developer")
    print("SUCCESS!")
    print(f"Session ID: {session_id}")
    print(f"Question: {question}")
    
    print("\nSubmitting answer...")
    res = engine.submit_answer(session_id, "I use spring boot.")
    print("SUCCESS!")
    print(res)
except Exception as e:
    print(f"EXCEPTION: {e}")
    import traceback
    traceback.print_exc()
