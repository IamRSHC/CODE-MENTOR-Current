# CodeMentor AI v3

Adaptive programming intelligence. No backend required.

## Quick Start

### Option A — Vercel (Recommended)
1. Fork / push this repo to GitHub
2. Import in Vercel → Deploy
3. Open the app → click ⚙ Settings → choose your mode:
   - **LM Studio**: enter your local LM Studio URL + model name
   - **API Key**: choose a provider (OpenAI, Groq, OpenRouter…) and paste your key

### Option B — Local (LM Studio)
1. Open LM Studio → Settings → Server → ✅ Enable CORS → Save
2. Load any model in LM Studio
3. Open `index.html` in a browser (or run `npx serve .`)
4. Click ⚙ Settings → LM Studio mode → set URL + model → Save

### Option C — Local FastAPI proxy (original flow)
```bash
cd backend
cp .env.example .env
# Edit .env with your LM Studio URL and model name
pip install -r requirements.txt
uvicorn main:app --reload
```
Then open `index.html`.

## LM Studio CORS Setup
LM Studio → ⚙ → Server → Enable CORS → Save → restart server.

## Provider Presets (API Key mode)
| Provider    | Free tier |
|-------------|-----------|
| OpenRouter  | ✅ Yes (free models available) |
| Groq        | ✅ Yes |
| Together AI | ✅ Yes |
| OpenAI      | ❌ Paid |
