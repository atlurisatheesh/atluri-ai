from openai import OpenAI
from core.config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

def call_openai(messages):
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=messages
    )
    return response.output_text
