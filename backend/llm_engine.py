"""
LLM Engine — configurable via environment variables
Set LM_STUDIO_URL and MODEL_NAME in your .env file
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://127.0.0.1:1234")
MODEL_NAME    = os.getenv("MODEL_NAME",    "meta-llama-3.1-8b-instruct")


def ask_llama(prompt, system_msg="You are a coding mentor. Give hints only."):
    url = f"{LM_STUDIO_URL.rstrip('/')}/v1/chat/completions"
    payload = {
        "model":    MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user",   "content": prompt}
        ],
        "temperature": 0.7
    }
    response = requests.post(url, json=payload, timeout=60)
    result   = response.json()
    return result["choices"][0]["message"]["content"]


def get_code_hint(code: str, error: str = "", cognitive_state: str = "beginner"):
    teaching_style = {
        "confused":   "Explain very slowly. Use simple language. Ask guiding questions.",
        "struggling": "Give small logical hints. Do not reveal answer.",
        "confident":  "Challenge the student with deeper questions.",
        "expert":     "Give minimal hint and push optimization thinking."
    }
    style  = teaching_style.get(cognitive_state, "Give helpful hint.")
    prompt = f"""You are an expert programming mentor.

Student cognitive state: {cognitive_state}
Teaching style: {style}

Student code:
{code}

Error:
{error}

Rules:
- NEVER give full solution
- Give only hints
- Ask questions to guide thinking
- Adjust difficulty based on cognitive state"""

    return ask_llama(prompt)
