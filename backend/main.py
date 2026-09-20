"""
CodeMentor AI — FastAPI Backend (OPTIONAL, for local LM Studio proxy use)
==========================================================================
The frontend now calls LM Studio / API directly from the browser.
This backend is only needed if you prefer the proxy approach.

SETUP:
  cp .env.example .env  # edit LM_STUDIO_URL and MODEL_NAME
  pip install -r requirements.txt
  uvicorn main:app --reload
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from student_memory import update_student_profile
from style_detector import detect_ai_code
from debug_engine import DebugSession
from code_analyzer import analyze_code
from llm_engine import ask_llama, get_code_hint
from cognitive_model import predict_state

load_dotenv()

app = FastAPI(title="CodeMentor AI Backend", version="3.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
debug_sessions = {}

@app.get("/")
def home():
    return {"status": "running", "model": os.getenv("MODEL_NAME", "meta-llama-3.1-8b-instruct")}

@app.get("/ask")
def ask(q: str):
    return {"response": ask_llama(q)}

@app.post("/analyze")
def analyze_student_code(data: dict):
    code    = data.get("code", "")
    user_id = data.get("user_id", "default")
    if user_id not in debug_sessions:
        debug_sessions[user_id] = DebugSession()
    session = debug_sessions[user_id]
    analysis  = analyze_code(code)
    has_error = analysis["status"] == "error"
    session.record_attempt(has_error)
    # run_count comes from the backend's own attempt counter, not the client.
    state   = predict_state(data.get("typing_speed",10), data.get("deletions",5),
                            session.attempts, data.get("idle_time",5))
    hint  = get_code_hint(code, analysis.get("message","") if has_error else "", state)
    score = session.calculate_score()
    return {
        "analysis": analysis, "cognitive_state": state,
        "student_level": update_student_profile(user_id, score, state),
        "hint": hint, "debug_score": score, "ai_detection": detect_ai_code(code)
    }
