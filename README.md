<div align="center">

# 🧠 CodeMentor AI — v3

### Adaptive Socratic Coding Mentor

*An AI programming tutor that reads **how** you're coding — not just **what** you wrote — and adapts its teaching in real time.*

[![Live on Vercel](https://img.shields.io/badge/Live-Vercel-000000?logo=vercel&logoColor=white)](https://codementor-ai-dev-rshc.vercel.app/)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla_JS-f7df1e?logo=javascript&logoColor=black)](#-tech-stack)
[![Editor](https://img.shields.io/badge/Editor-Monaco-007ACC?logo=visualstudiocode&logoColor=white)](#-tech-stack)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](#-architecture)
[![ML](https://img.shields.io/badge/ML-scikit--learn-F7931E?logo=scikitlearn&logoColor=white)](#-how-cognitive-state-detection-works)
[![LLM](https://img.shields.io/badge/LLM-Gemini_2.0_Flash_·_Llama_3.1_8B-4285F4?logo=googlegemini&logoColor=white)](#-adaptive-hint-engine)

**Built for Noob Hackfest 2026**

`JavaScript` · `Python` · `FastAPI` · `scikit-learn` · `Monaco Editor` · `Gemini 2.0 Flash` · `Llama 3.1 8B` · `Vercel`

</div>

> **🔗 Live Demo:** **[codementor-ai-dev-rshc.vercel.app](https://codementor-ai-dev-rshc.vercel.app/)** &nbsp;·&nbsp; **📦 Repo:** [`IamRSHC/CODE-MENTOR-AI-V3`](https://github.com/IamRSHC/CODE-MENTOR-AI-V3)

---

## ✨ Overview

Most coding tutors grade the **output**. CodeMentor AI reads the **process**.

As you type in the editor, the app continuously measures your behavior — typing speed, deletion rate, how often you run/analyze, and how long you pause — and infers a **cognitive state**: `confused`, `struggling`, `confident`, or `expert`. That inferred state then drives a **provider-agnostic LLM hint engine** that scales its explanation depth to match: slow, guided, Socratic questioning when you're stuck; terse optimization nudges when you're flying — and it **never hands you the full solution**.

The result is a mentor that behaves like a good human TA: it meets you where you are.

<div align="center">

```
 ┌──────────────┐     behavioral      ┌────────────────────┐    cognitive     ┌────────────────────┐
 │  You type in │  ───  signals  ──▶  │  Cognitive-State   │  ──  state  ──▶  │  Adaptive LLM      │
 │  the editor  │   speed/deletions/  │  Classifier        │  confused/…/     │  Hint Engine       │
 │  (Monaco)    │   runs/idle time    │  (Random Forest)   │  expert          │  (Socratic, gated) │
 └──────────────┘                     └────────────────────┘                  └────────────────────┘
```

</div>

---

## 🚀 Key Features

| | Feature | What it does |
|---|---|---|
| 🧠 | **Cognitive-state detection** | Infers `confused / struggling / confident / expert` from live behavioral signals using a Random Forest classifier trained on synthetic learner profiles. |
| 💬 | **Adaptive Socratic hints** | LLM guidance whose depth and tone scale to your inferred state — hints and guiding questions only, **full solutions explicitly suppressed**. |
| 🔌 | **Provider-agnostic LLM engine** | Swap between **Gemini 2.0 Flash**, **Llama 3.1 8B**, and any **OpenAI-compatible** endpoint (LM Studio, Groq, OpenRouter, Together AI, OpenAI) — no code changes. |
| 🖥️ | **Multi-language Monaco Editor** | Full VS Code editor engine with **Python, C++, Java, JavaScript**, multi-tab files, syntax highlighting, minimap, bracket colorization, light/dark toggle. |
| 🕵️ | **AI-authorship detection** | Heuristic style analysis (line length, variable diversity, comment density, indentation) flags likely AI-generated vs. human-written code. |
| 🏅 | **Debugging-session scoring** | Time-, attempt-, and error-weighted score rewards efficient debugging over brute-force retries. |
| 📈 | **Persistent student profiling** | Rolling level (`beginner → intermediate → advanced`) computed from average score, persisted across sessions via LocalStorage. |
| 🐾 | **Wellbeing companion** | Animated pixel-pet whose mood mirrors your cognitive state, plus a break-nudge that surfaces after a streak of rough attempts. |
| 💾 | **Zero-backend deployment** | The entire live app runs client-side — deploy as static files, no server required. |

---

## 🧩 How Cognitive-State Detection Works

The editor emits four **behavioral signals** as you code. These are the model's feature vector:

| Signal | Source | Intuition |
|---|---|---|
| **Typing speed** | chars typed ÷ minutes since last analysis | Fast, sustained typing → flow; slow, diluted typing → hesitation |
| **Deletion rate** | count of deletion events in the window | Heavy corrections → floundering |
| **Execution / run count** | this session's own attempt counter | Repeated attempts on the same problem → struggle |
| **Idle time** | seconds since the last keystroke | A long pause after a burst → stuck / thinking |

These map onto four learner states:

<div align="center">

| State | Reads as… | Teaching response |
|:---:|---|---|
| 🔴 `confused` | Long pause or barely-there progress | Explain slowly, simple language, guiding questions |
| 🟠 `struggling` | Active typing but heavy corrections | Small logical hints, don't reveal the answer |
| 🟢 `confident` | Steady pace, moderate corrections | Deeper challenge questions |
| 🔵 `expert` | Fast, clean, proven across attempts | Minimal hint, push optimization thinking |

</div>

### Two implementations of one model

The classifier ships in **two forms**, by design:

- **`backend/cognitive_model.py` (the real ML model)** — a **scikit-learn `RandomForestClassifier`** trained on a **600-row synthetic dataset** (150 samples/class, sampled with Gaussian noise around per-class prototypes). It's trained once and persisted to `cognitive_model.joblib`, with a versioned cache so a stale model is discarded and retrained automatically.
- **`script.js` (the live, deployed replica)** — a dependency-free, rule-based port of the same decision boundaries so the shipped app runs **entirely in the browser** with zero server round-trips. Each ported module carries an explicit `/* ported from X.py */` comment.

This dual approach is deliberate: the Python/FastAPI/scikit-learn stack is the reference intelligence; the client-side port is what makes the app instantly deployable as static files on Vercel.

---

## 🔌 Adaptive Hint Engine

One engine, many providers. The hint request is built from your cognitive state, your code, and any detected error, then routed to whichever backend you've configured in **⚙ Settings**:

| Mode | Providers | Notes |
|---|---|---|
| ⚡ **LM Studio** | Any local model (default: `meta-llama-3.1-8b-instruct`) | 100% local & free — requires CORS enabled in LM Studio |
| ✦ **Google AI Studio** | **Gemini 2.0 Flash** | Paste a free API key; model & endpoint handled automatically |
| 🔑 **API Key** | **OpenAI · Groq · OpenRouter · Together AI** + custom | OpenAI-compatible `/v1/chat/completions`; one-click provider presets |

The system prompt enforces the mentor contract on every call:

> *"You are a supportive, Socratic programming mentor. Never reveal full solutions."*
> Rules: never give the full solution · hints and guiding questions only · match language complexity to the cognitive state · keep it under 120 words.

Keys are stored **only in your browser's LocalStorage** and sent directly to the provider you choose — never to any intermediary server.

---

## 🏗 Architecture

```
CodeMentor AI v3
│
├── LIVE APP  (client-side, deployed to Vercel — no server needed)
│   ├── index.html          UI shell, settings modal, editor mount
│   ├── style.css           Full design system (themes, animations, pixel-pet)
│   └── script.js           Everything: analysis, cognitive model, hint engine,
│                           AI detection, scoring, memory, persistence
│
└── backend/  (OPTIONAL — FastAPI reference implementation / local proxy)
    ├── main.py             FastAPI app: /ask, /analyze endpoints
    ├── cognitive_model.py  scikit-learn RandomForest (synthetic-data trained)
    ├── code_analyzer.py    Python AST-based structure & syntax analysis
    ├── debug_engine.py     Session tracking + scoring
    ├── llm_engine.py       LM Studio hint generation
    ├── student_memory.py   In-memory student profiling & leveling
    ├── style_detector.py   AI-vs-human authorship heuristics
    └── requirements.txt
```

**Why two?** The `backend/` folder is a fully-working Python/FastAPI/scikit-learn implementation — the origin of the intelligence and the home of the *actual* trained Random Forest. The deployed product is the browser port in `script.js`, which reproduces the same logic client-side so the app needs no hosting beyond static files. The backend remains as a documented reference and an optional local proxy.

---

## 🛠 Tech Stack

**Frontend** — Vanilla JavaScript (ES6+), [Monaco Editor](https://microsoft.github.io/monaco-editor/) `0.34.1`, CSS custom-property design system, LocalStorage persistence
**Backend (optional)** — Python, [FastAPI](https://fastapi.tiangolo.com/), Uvicorn, [scikit-learn](https://scikit-learn.org/) (`RandomForestClassifier`), NumPy, joblib
**AI / LLM** — Gemini 2.0 Flash, Llama 3.1 8B, OpenAI-compatible APIs (LM Studio / Groq / OpenRouter / Together AI / OpenAI)
**Deployment** — Vercel (static)

---

## ⚡ Getting Started

### Option A — Deploy to Vercel (recommended)

1. Fork / push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com) → **Deploy** (static config is already in [`vercel.json`](vercel.json)).
3. Open the app → click **⚙ Settings** → pick a mode:
   - **Google AI Studio** — paste a free Gemini key and go.
   - **API Key** — choose a provider (OpenAI / Groq / OpenRouter / Together AI) and paste your key.
   - **LM Studio** — point at your local server URL + model.

### Option B — Run locally (no build step)

```bash
git clone https://github.com/IamRSHC/CODE-MENTOR-AI-V3.git
cd CODE-MENTOR-AI-V3
npx serve .          # or just open index.html in a browser
```

Then open **⚙ Settings** and configure a backend (see below).

### Option C — Optional FastAPI proxy / reference backend

```bash
cd backend
cp .env.example .env          # set LM_STUDIO_URL and MODEL_NAME
pip install -r requirements.txt
uvicorn main:app --reload
```

The Random Forest trains and caches itself to `cognitive_model.joblib` on first run.

---

## ⚙ Configuration

### Using a local model (LM Studio)

1. LM Studio → **⚙ Settings → Server → ✅ Enable CORS → Save** (then restart the server).
2. Load any model.
3. In the app: **⚙ Settings → LM Studio** → set URL (`http://localhost:1234`) + exact model name → **Test Connection** → **Save**.

### Using a cloud provider

| Provider | Free tier | Preset base URL |
|---|:---:|---|
| **OpenRouter** | ✅ free models available | `https://openrouter.ai/api` |
| **Groq** | ✅ yes | `https://api.groq.com/openai` |
| **Together AI** | ✅ yes | `https://api.together.xyz` |
| **Google AI Studio (Gemini)** | ✅ yes | handled automatically |
| **OpenAI** | ❌ paid | `https://api.openai.com` |

> 🔒 **Privacy:** All API keys live in your browser's LocalStorage only and are sent directly to your chosen provider. Nothing routes through a CodeMentor server (there isn't one).

---

## 🗺 Roadmap

- [x] Client-side cognitive-state inference (rule-based port)
- [x] scikit-learn Random Forest reference model (synthetic-data trained, joblib-persisted)
- [x] Provider-agnostic hint engine (Gemini / Llama / OpenAI-compatible)
- [x] Multi-language Monaco editor + multi-tab files
- [x] AI-authorship detection, debug scoring, persistent profiling
- [x] Wellbeing companion (pixel-pet + break nudges)
- [ ] 🚧 **Real-time error detection system** — *actively under development.* The right AI panel and "Error Detected" surface are already wired; the live static analyzer currently reports structure without failing on real syntax/runtime errors. Approaches being explored: language-server / in-browser linting (e.g. Pyodide for Python, tree-sitter WASM), and LLM-assisted diagnostics feeding the same panel.
- [ ] Cognitive-state threshold calibration against larger real-usage samples
- [ ] Cross-device profile sync

---

## 📁 Project Structure

```
.
├── index.html              # App shell + settings modal
├── script.js               # Live app logic (all engines, ported from backend/)
├── style.css               # Design system, themes, animations
├── vercel.json             # Static deployment config
├── backend/                # Optional FastAPI + scikit-learn reference implementation
│   ├── main.py
│   ├── cognitive_model.py
│   ├── code_analyzer.py
│   ├── debug_engine.py
│   ├── llm_engine.py
│   ├── student_memory.py
│   ├── style_detector.py
│   ├── requirements.txt
│   └── .env.example
└── README.md
```

---

## 🧪 Note on the Error Detection System

The error-detection pipeline is **actively in development** and not yet complete. Structural code analysis (loops, conditions, functions, variables across all four languages) is live, and the UI surface for errors is in place — but robust, real-time syntax/runtime error catching in the browser is still being prototyped. I'm currently evaluating in-browser execution/linting (Pyodide, tree-sitter WASM) and LLM-assisted diagnostics as candidate approaches. Expect this to land in a future iteration.

---

## 🙌 Acknowledgements

Built during **Noob Hackfest 2026**. Editor by [Monaco](https://microsoft.github.io/monaco-editor/); LLM inference via Google AI Studio, LM Studio, and OpenAI-compatible providers.

## License
All rights reserved. This repository is public for portfolio/demonstration 
purposes only. No permission is granted to copy, modify, or redistribute 
this code without explicit written consent from the author.

<div align="center">

*CodeMentor AI reads the room, not just the code.*

</div>
