# from app.router.openai import call_openai
# from app.router.claude import call_claude
# from app.router.gemini import call_gemini

# def route_request(task: str, messages):
#     if task == "coding":
#         order = [call_openai, call_claude, call_gemini]
#     elif task == "interview":
#         order = [call_claude, call_openai, call_gemini]
#     else:
#         order = [call_openai, call_gemini, call_claude]

#     for provider in order:
#         try:
#             return provider(messages)
#         except Exception as e:
#             print(f"⚠ Model failed: {provider.__name__} → {e}")

#     raise RuntimeError("All AI providers failed")


def route_request(prompt: str, model: str = None):
    raise Exception("Fallback disabled: OpenAI only mode")
