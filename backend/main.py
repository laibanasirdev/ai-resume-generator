from fastapi import FastAPI, Form, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from groq import Groq, RateLimitError
from dotenv import load_dotenv
from fpdf import FPDF
import PyPDF2
from docx import Document
import re
import io
import os

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Models tried in order — falls back automatically on rate-limit errors
_MODELS = [
    "llama-3.3-70b-versatile",   # primary:  100K TPD
    "llama-3.1-8b-instant",       # fallback: 500K TPD
    "gemma2-9b-it",               # last resort
]


def _chat(prompt: str, temperature: float = 0.4) -> str:
    """Call Groq with automatic model fallback on rate-limit errors."""
    last_err: Exception | None = None
    for model in _MODELS:
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4000,
                temperature=temperature,
            )
            return resp.choices[0].message.content
        except RateLimitError as e:
            last_err = e
            continue   # try next model
    raise HTTPException(
        status_code=429,
        detail=f"All models are rate-limited. Try again in a few minutes. ({last_err})",
    )

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── colours ────────────────────────────────────────────────────────────────────

_NAVY   = (22,  43,  77)    # header band background
_LIGHT  = (185, 200, 220)   # contact text in header
_ACCENT = (55,  48,  163)   # section heading colour
_DARK   = (17,  24,  39)    # body heading text
_MID    = (55,  65,  81)    # body / bullets
_RULE   = (210, 214, 230)   # section underline


# ── helpers ────────────────────────────────────────────────────────────────────

def split_content(full_text: str) -> tuple[str, str]:
    """Return (resume_section, cover_letter_section)."""
    pattern = re.compile(r'(?m)^#{1,3}\s*COVER\s*LETTER\s*$', re.IGNORECASE)
    match = pattern.search(full_text)
    if match:
        return full_text[: match.start()].strip(), full_text[match.start():].strip()
    return full_text.strip(), ""


_UNICODE_MAP = str.maketrans({
    '\u2013': '-',   '\u2014': '--',
    '\u2018': "'",   '\u2019': "'",
    '\u201c': '"',   '\u201d': '"',
    '\u2022': '-',   '\u25cf': '-',
    '\u00a0': ' ',   '\u2026': '...',
})


def _clean(text: str) -> str:
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*',     r'\1', text)
    text = re.sub(r'__(.+?)__',     r'\1', text)
    text = re.sub(r'`(.+?)`',       r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]',  r'\1', text)
    text = text.translate(_UNICODE_MAP)
    return text.encode('latin-1', errors='ignore').decode('latin-1').strip()


def _clean_ai_output(text: str) -> str:
    """Strip code-block markers, fix inline skill labels, collapse excess blank lines."""
    text = re.sub(r'```[\w]*\n?', '', text)   # opening ```markdown / ```
    text = re.sub(r'```',          '', text)   # any remaining backtick fences

    # If the AI puts two **Label:** items on the same line (skills section bug),
    # insert a newline before every **Label:** that follows non-whitespace content.
    # e.g. "...Computer Vision **Tools & Platforms:** ..." → two separate lines
    text = re.sub(r'([^\n]) (\*\*[A-Za-z][A-Za-z ,&/]+\*\*:)', r'\1\n\2', text)

    text = re.sub(r'\n{3,}', '\n\n', text)    # collapse 3+ blank lines → 2
    return text.strip()


def extract_template_text(filename: str, content: bytes) -> str:
    """Extract plain text from a template file (pdf / docx / txt)."""
    ext = filename.rsplit('.', 1)[-1].lower()
    if ext == 'pdf':
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            return '\n'.join(
                page.extract_text() or '' for page in reader.pages
            ).strip()
        except Exception:
            return ''
    if ext == 'docx':
        try:
            doc = Document(io.BytesIO(content))
            return '\n'.join(p.text for p in doc.paragraphs).strip()
        except Exception:
            return ''
    if ext in ('txt', 'md'):
        return content.decode('utf-8', errors='ignore').strip()
    # images — we can't extract text without OCR; return empty
    return ''


# ── PDF renderer ───────────────────────────────────────────────────────────────

def _render_header_band(pdf: FPDF, L: int, name: str, subtitle: str) -> None:
    """Draw the dark navy header band with name + subtitle."""
    band_h = 30
    pdf.set_fill_color(*_NAVY)
    pdf.rect(0, 0, pdf.w, band_h, 'F')
    pdf.set_y(7)
    pdf.set_x(L)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Helvetica', 'B', 18)
    pdf.multi_cell(0, 8, name, align='L')
    pdf.set_x(L)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(*_LIGHT)
    pdf.multi_cell(0, 5, subtitle, align='L')
    pdf.set_y(band_h + 4)
    pdf.set_text_color(*_DARK)


def markdown_to_pdf_bytes(md_text: str, candidate_name: str = "") -> bytes:
    """Professional resume / cover-letter PDF renderer."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_margins(0, 0, 0)

    L, R = 14, 14
    lines = [l.rstrip() for l in md_text.split('\n')]

    # ── Detect document type ────────────────────────────────────────────────
    first_content = next(
        (l.strip() for l in lines if l.strip() and not re.fullmatch(r'-{3,}', l.strip())),
        ''
    )
    is_cover = bool(re.search(r'COVER\s*LETTER', first_content, re.I))

    # ════════════════════════════════════════════════════════════════════════
    # COVER LETTER rendering
    # ════════════════════════════════════════════════════════════════════════
    if is_cover:
        display_name = candidate_name or "Applicant"
        _render_header_band(pdf, L, display_name, "Cover Letter")

        skip_title   = True   # skip the "# COVER LETTER" line (already in header)
        blank_streak = 0

        for raw in lines:
            s = raw.strip()

            if re.fullmatch(r'-{3,}', s):
                continue

            # Skip the # COVER LETTER heading — it's in the header band
            if skip_title and s.startswith('# '):
                skip_title = False
                continue

            if not s:
                if blank_streak == 0:
                    pdf.ln(4)          # generous paragraph gap for prose
                blank_streak += 1
                continue

            blank_streak = 0

            # Salutation: "Dear Hiring Manager,"
            if re.match(r'^Dear\b|^To\s+Whom', s, re.I):
                pdf.ln(2)
                pdf.set_x(L)
                pdf.set_font('Helvetica', 'B', 10)
                pdf.set_text_color(*_DARK)
                pdf.multi_cell(0, 5.5, _clean(s), align='L')
                pdf.ln(3)

            # Closing: "Sincerely," / "Regards," / "Best,"
            elif re.match(r'^(Sincerely|Regards|Best|Warm\s+regards|Yours)', s, re.I):
                pdf.ln(6)
                pdf.set_x(L)
                pdf.set_font('Helvetica', 'B', 10)
                pdf.set_text_color(*_DARK)
                pdf.multi_cell(0, 5.5, _clean(s), align='L')

            # Signature name (line immediately after closing)
            else:
                pdf.set_x(L)
                pdf.set_font('Helvetica', '', 10)
                pdf.set_text_color(*_MID)
                pdf.multi_cell(0, 5.5, _clean(s), align='L')

        return bytes(pdf.output())

    # ════════════════════════════════════════════════════════════════════════
    # RESUME rendering
    # ════════════════════════════════════════════════════════════════════════

    # First pass — pull name + contact line for the header band
    header_name    = None
    header_contact = None
    body_start     = 0

    for i, raw in enumerate(lines):
        s = raw.strip()
        if re.fullmatch(r'-{3,}', s):
            continue
        if s.startswith('# '):
            header_name = _clean(s[2:])
            for j in range(i + 1, min(i + 5, len(lines))):
                ns = lines[j].strip()
                if not ns or re.fullmatch(r'-{3,}', ns):
                    continue
                if ns.startswith('#'):
                    body_start = j
                    break
                header_contact = _clean(ns)
                body_start = j + 1
                break
            else:
                body_start = i + 1
            break
        else:
            body_start = 0
            break

    # Render header band
    if header_name:
        subtitle = header_contact or ""
        _render_header_band(pdf, L, header_name, subtitle)

    # Second pass — body
    blank_streak = 0

    for raw in lines[body_start:]:
        s = raw.strip()

        if re.fullmatch(r'-{3,}', s):
            continue

        # h2 — section heading with accent bar
        if s.startswith('## '):
            blank_streak = 0
            pdf.ln(4)
            bar_y = pdf.get_y()
            pdf.set_fill_color(*_ACCENT)
            pdf.rect(L, bar_y, 3, 5.5, 'F')
            pdf.set_x(L + 5)
            pdf.set_font('Helvetica', 'B', 10)
            pdf.set_text_color(*_ACCENT)
            pdf.multi_cell(0, 5.5, _clean(s[3:]).upper(), align='L')
            y = pdf.get_y()
            pdf.set_draw_color(*_RULE)
            pdf.line(L, y, pdf.w - R, y)
            pdf.ln(2)
            pdf.set_text_color(*_DARK)

        # h3 — job title / degree
        elif s.startswith('### '):
            blank_streak = 0
            pdf.ln(3)
            pdf.set_x(L)
            pdf.set_font('Helvetica', 'B', 9)
            pdf.set_text_color(*_DARK)
            pdf.multi_cell(0, 4.8, _clean(s[4:]), align='L')

        # bullet
        elif s.startswith('- ') or s.startswith('* '):
            blank_streak = 0
            pdf.set_x(L + 5)
            pdf.set_font('Helvetica', '', 9)
            pdf.set_text_color(*_MID)
            pdf.multi_cell(0, 4.5, '- ' + _clean(s[2:]), align='L')

        # blank line
        elif not s:
            if blank_streak == 0:
                pdf.ln(1.5)
            blank_streak += 1
            continue

        # paragraph / contact / inline text
        else:
            blank_streak = 0
            pdf.set_x(L)
            pdf.set_font('Helvetica', '', 9)
            pdf.set_text_color(*_MID)
            pdf.multi_cell(0, 4.5, _clean(s), align='L')

        blank_streak = 0

    return bytes(pdf.output())


# ── routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "AI Resume Generator API running"}


@app.post("/generate-resume")
async def generate_resume(
    job_title: str        = Form(...),
    job_description: str  = Form(...),
    existing_resume: str  = Form(""),
    name: str             = Form(""),
    email: str            = Form(""),
    phone: str            = Form(""),
    location: str         = Form(""),
    experience: str       = Form(""),
    skills: str           = Form(""),
    education: str        = Form(""),
    custom_instructions: str = Form(""),
    template_file: UploadFile = File(None),
):
    def val(field: str, fallback: str) -> str:
        return field.strip() if field.strip() else fallback

    has_existing = existing_resume.strip() != ""

    # ── candidate block ──────────────────────────────────────────────────────
    loc = val(location, 'Extract from existing resume') if has_existing else location.strip()

    if has_existing:
        candidate_section = f"""CANDIDATE DETAILS (extract any missing fields from EXISTING RESUME below):
- Name: {val(name, 'Extract from existing resume')}
- Email: {val(email, 'Extract from existing resume')}
- Phone: {val(phone, 'Extract from existing resume')}
- Location: {val(location, 'Extract from existing resume')}
- Target Job: {job_title}
- Job Description: {job_description}
- Experience: {val(experience, 'Extract from existing resume')}
- Skills: {val(skills, 'Extract from existing resume')}
- Education: {val(education, 'Extract from existing resume')}

EXISTING RESUME — use as the base, preserve all real data, tailor to target job:
{existing_resume}"""
    else:
        candidate_section = f"""CANDIDATE DETAILS:
- Name: {name}
- Email: {email}
- Phone: {phone}
- Location: {location}
- Target Job: {job_title}
- Job Description: {job_description}
- Experience: {experience}
- Skills: {skills}
- Education: {education}"""

    # ── template block ───────────────────────────────────────────────────────
    template_section = ""
    if template_file and template_file.filename:
        raw_bytes = await template_file.read()
        tpl_text  = extract_template_text(template_file.filename, raw_bytes)
        if tpl_text:
            template_section = f"""

RESUME TEMPLATE — mirror this section order, layout, and style exactly:
---
{tpl_text[:2000]}
---"""
        else:
            template_section = "\n\nTEMPLATE NOTE: A visual template was uploaded. Use a clean two-column professional layout with a coloured header."

    # ── hints ────────────────────────────────────────────────────────────────
    contact_hint = (
        "[Email] | [Phone] | [Location]"
        if has_existing and not email.strip()
        else f"{email} | {phone}{' | ' + loc if loc else ''}"
    )
    name_hint = (
        "[Name from resume]" if has_existing and not name.strip() else name
    )

    prompt = f"""You are an expert ATS resume writer. Create a highly optimized, ATS-friendly resume and cover letter.

{candidate_section}{template_section}

OUTPUT FORMAT — follow this structure EXACTLY, no deviations:

---
# {name_hint}
{contact_hint} | LinkedIn: [Add URL]

---
## PROFESSIONAL SUMMARY
[2-3 impactful sentences tailored precisely to the target job]

---
## SKILLS
**Technical:** [comma-separated — Python, JavaScript, ML, NLP, Computer Vision etc. — techniques and languages ONLY]
**Tools & Platforms:** [Node.js, React.js, AWS, Docker, Git etc. — software, frameworks, cloud tools ONLY]

CRITICAL: The two skill lines above MUST each be on their own separate line. Never put them on the same line.

---
## PROFESSIONAL EXPERIENCE
### [Most Recent Job Title] | [Company] | [Start] - [End or Present]
- [Strong action verb + quantified achievement]
- [Quantified achievement]
- [Quantified achievement]

### [Previous Job Title] | [Company] | [Start] - [End]
- [Quantified achievement]
- [Quantified achievement]

---
## EDUCATION
### [Degree] | [University] | [Year]

---
## CERTIFICATIONS & ACHIEVEMENTS
- [Certification, issuer, year]
- [Award or achievement]

---

---
# COVER LETTER

Dear Hiring Manager,

[Opening: strong hook naming the exact role and company, state why you are the ideal fit]

[Body paragraph 1: most relevant technical achievement with specific metrics]

[Body paragraph 2: leadership or collaboration achievement that matches job requirements]

[Closing: cultural fit, enthusiasm, specific call to action with availability]

Sincerely,
{name_hint}

ABSOLUTE RULES:
1. NEVER output placeholder text — every field must contain real data
2. NEVER invent or hallucinate dates, company names, or titles not in the source data
3. NEVER use code blocks, backticks, or ```markdown markers — plain markdown only
4. Every bullet starts with a strong action verb
5. Quantify every achievement where possible (%, $, time saved, users, etc.)
6. Resume must be one-page worthy — no padding
7. Cover letter paragraph 2 must reference a SPECIFIC achievement, not generic text
8. Cover letter must name the exact job title: {job_title}
9. Use only hyphens (-) for date ranges, never Unicode dashes
10. Separate sections with a single blank line only — no double blank lines
11. In SKILLS: **Technical:** and **Tools & Platforms:** MUST be on separate lines — never on the same line
{f"11. CANDIDATE CUSTOM INSTRUCTIONS (override everything else): {custom_instructions.strip()}" if custom_instructions.strip() else ""}
"""

    cleaned = _clean_ai_output(_chat(prompt, temperature=0.4))
    return {"resume": cleaned, "status": "success"}


@app.post("/refine-resume")
async def refine_resume(
    current_resume: str = Form(...),
    instruction: str    = Form(...),
):
    prompt = f"""You are an expert resume editor. Apply the requested change to the resume below.

CURRENT RESUME & COVER LETTER:
{current_resume}

REQUESTED CHANGE:
{instruction}

RULES:
1. Apply ONLY the requested change — do not alter anything else
2. Return the COMPLETE updated document in the same markdown format
3. NEVER use code blocks, backticks, or ```markdown markers
4. Keep all section headings, structure, and order identical
5. Preserve all real data — never invent or remove facts
"""

    cleaned = _clean_ai_output(_chat(prompt, temperature=0.3))
    return {"resume": cleaned, "status": "success"}


@app.post("/download-pdf")
async def download_pdf(
    text: str    = Form(...),
    section: str = Form("resume"),
    name: str    = Form("Candidate"),
):
    try:
        resume_text, cover_text = split_content(text)

        if section == "cover_letter":
            content  = cover_text if cover_text else text
            filename = f"{name.replace(' ', '_')}_Cover_Letter.pdf"
        else:
            content  = resume_text if resume_text else text
            filename = f"{name.replace(' ', '_')}_Resume.pdf"

        pdf_bytes = markdown_to_pdf_bytes(content, candidate_name=name)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")
