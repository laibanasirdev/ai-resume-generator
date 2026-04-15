# ResumeAI — AI-Powered Resume & Cover Letter Generator

Generate ATS-optimized resumes and tailored cover letters in seconds using the Groq LLM API. Paste your existing resume, drop in a job description, and get a polished, ready-to-download PDF — or request live corrections with the built-in refinement prompter.

---

## Features

- **AI generation** — Llama 3.3 70B produces ATS-friendly resumes and matching cover letters from your details or an existing resume
- **Smart auto-extraction** — upload or paste your current resume; name, contact, experience, skills and education are extracted automatically
- **Template matching** — upload a resume template (PDF, DOCX, TXT) and the AI mirrors its structure and style
- **Runtime refinement** — after generation, type any correction ("make the summary shorter", "add Python to skills") and the AI updates the resume instantly
- **Separate PDF downloads** — professionally formatted PDFs for resume and cover letter, with a dark navy header band and colour-accented section headings
- **Rich clipboard copy** — copies as HTML so formatting is preserved when pasting into Google Docs or Word
- **Custom instructions** — add one-off instructions at generation time ("emphasise leadership", "use a formal tone")
- **Location field** — city/country shown in the resume header contact line
- **Model fallback** — automatically switches to a backup model if the primary hits Groq's rate limit

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Markdown rendering | `react-markdown` + `remark-gfm` |
| PDF extraction (frontend) | `unpdf` (serverless-compatible) |
| Backend | FastAPI, Python 3.13, Uvicorn |
| AI / LLM | Groq API — `llama-3.3-70b-versatile` (fallback: `llama-3.1-8b-instant`, `gemma2-9b-it`) |
| PDF generation | `fpdf2` (custom markdown renderer) |
| Template parsing | `PyPDF2`, `python-docx` |

---

## Project Structure

```
ai-resume-generator/
├── backend/
│   ├── main.py          # FastAPI app — generation, refinement, PDF download
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── resume-form.tsx   # Main UI component
│   │   └── api/
│   │       └── extract-text/
│   │           └── route.ts  # Next.js route for PDF text extraction
│   └── package.json
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/ai-resume-generator.git
cd ai-resume-generator
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Open .env and paste your GROQ_API_KEY
```

### 3. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# Runs on http://127.0.0.1:8000
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key — get one free at [console.groq.com](https://console.groq.com) |

See [`.env.example`](.env.example) for the full template.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/generate-resume` | Generate resume + cover letter from form data |
| `POST` | `/refine-resume` | Apply a targeted correction to an existing result |
| `POST` | `/download-pdf` | Return a formatted PDF for resume or cover letter |
| `GET` | `/` | Health check |

---

## Deployment

### Backend — Railway / Render / Fly.io

1. Set `GROQ_API_KEY` as an environment variable in your hosting dashboard
2. Set the start command to `uvicorn main:app --host 0.0.0.0 --port 8000`
3. Update the `fetch` URLs in `frontend/app/resume-form.tsx` from `http://127.0.0.1:8000` to your deployed backend URL

### Frontend — Vercel

```bash
cd frontend
vercel deploy
```

---

## Groq Rate Limits (Free Tier)

| Model | Tokens / Day | Role |
|---|---|---|
| `llama-3.3-70b-versatile` | 100,000 | Primary |
| `llama-3.1-8b-instant` | 500,000 | Automatic fallback |
| `gemma2-9b-it` | 500,000 | Last resort |

The backend automatically falls back to the next model when a rate limit is hit — no action needed from the user.

---

## License

MIT
