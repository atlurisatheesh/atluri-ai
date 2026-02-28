from app.router.fallback import route_request

def analyze_video_frame(image_b64):
    prompt = f"""
Analyze this interview frame.

Return JSON:
{{
  "confidence": 0-10,
  "stress": 0-10,
  "engagement": 0-10,
  "professionalism": 0-10
}}
"""

    messages = [
        {"role": "user", "content": prompt}
    ]

    return route_request("interview", messages)
