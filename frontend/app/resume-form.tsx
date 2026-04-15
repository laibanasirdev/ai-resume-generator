'use client'

import { useState, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

type FormState = {
  name: string
  email: string
  phone: string
  location: string
  job_title: string
  job_description: string
  experience: string
  skills: string
  education: string
  existing_resume: string
  custom_instructions: string
}

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  location: '',
  job_title: '',
  job_description: '',
  experience: '',
  skills: '',
  education: '',
  existing_resume: '',
  custom_instructions: '',
}

type TemplateState = {
  file: File | null
  name: string
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: '6px' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '20px', marginBottom: '6px', paddingBottom: '4px', borderBottom: '2px solid #3730a3' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginTop: '10px', marginBottom: '2px' }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: '13px', color: '#374151', margin: '4px 0', lineHeight: '1.6' }}>{children}</p>
  ),
  ul: ({ children }) => (
    <ul style={{ listStyleType: 'disc', paddingLeft: '18px', margin: '4px 0' }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ listStyleType: 'decimal', paddingLeft: '18px', margin: '4px 0' }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', marginBottom: '2px' }}>{children}</li>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: '#111827' }}>{children}</strong>
  ),
  em: ({ children }) => <em style={{ fontStyle: 'italic', color: '#4b5563' }}>{children}</em>,
  hr: () => (
    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
  ),
  code: ({ children }) => (
    <code style={{ backgroundColor: '#f3f4f6', padding: '1px 5px', borderRadius: '3px', fontSize: '12px', fontFamily: 'monospace', color: '#1f2937' }}>
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '3px solid #818cf8', paddingLeft: '12px', margin: '8px 0', fontStyle: 'italic', color: '#6b7280', fontSize: '13px' }}>
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} style={{ color: '#4f46e5', textDecoration: 'underline' }}>{children}</a>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '8px 0' }}>
      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ border: '1px solid #d1d5db', backgroundColor: '#f9fafb', padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ border: '1px solid #d1d5db', padding: '6px 10px', color: '#374151' }}>{children}</td>
  ),
}

const inputBase =
  'w-full rounded-lg border px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 transition'
const inputNormal = `${inputBase} border-gray-200 bg-gray-50 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500/20`
const inputDimmed = `${inputBase} border-gray-100 bg-gray-50/50 text-gray-500 focus:border-indigo-400 focus:bg-white focus:ring-indigo-500/10`

function Field({
  label,
  name,
  value,
  onChange,
  textarea,
  placeholder,
  rows = 3,
  required = true,
  optional = false,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  textarea?: boolean
  placeholder?: string
  rows?: number
  required?: boolean
  optional?: boolean
}) {
  const cls = optional ? inputDimmed : inputNormal
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
        {label}
        {optional && (
          <span className="normal-case font-normal text-gray-400 tracking-normal">
            — auto-extracted
          </span>
        )}
      </label>
      {textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          className={`${cls} resize-none`}
          required={required}
        />
      ) : (
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cls}
          required={required}
        />
      )}
    </div>
  )
}

function DownloadButton({
  label,
  loading,
  disabled,
  onClick,
}: {
  label: string
  loading: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg px-3.5 py-2 transition-colors shadow-sm"
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Generating…
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

// ── clipboard helpers ──────────────────────────────────────────────────────────

function escHtml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineMd(t: string): string {
  return escHtml(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = ['<html><body style="font-family:Arial,sans-serif;font-size:11pt;line-height:1.5">']
  let inUl = false

  const closeList = () => { if (inUl) { out.push('</ul>'); inUl = false } }

  for (const raw of lines) {
    const s = raw.trim()
    if (/^-{3,}$/.test(s)) {
      closeList()
      out.push('<hr style="border:none;border-top:1px solid #d1d5db;margin:10px 0">')
    } else if (s.startsWith('# ')) {
      closeList()
      out.push(`<h1 style="font-size:20pt;font-weight:bold;margin:0 0 4px">${inlineMd(s.slice(2))}</h1>`)
    } else if (s.startsWith('## ')) {
      closeList()
      out.push(`<h2 style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;color:#3730a3;border-bottom:2px solid #3730a3;padding-bottom:2px;margin:16px 0 4px">${inlineMd(s.slice(3))}</h2>`)
    } else if (s.startsWith('### ')) {
      closeList()
      out.push(`<h3 style="font-size:10.5pt;font-weight:bold;margin:8px 0 2px">${inlineMd(s.slice(4))}</h3>`)
    } else if (s.startsWith('- ') || s.startsWith('* ')) {
      if (!inUl) { out.push('<ul style="margin:2px 0;padding-left:18px">'); inUl = true }
      out.push(`<li style="font-size:10pt;margin-bottom:1px">${inlineMd(s.slice(2))}</li>`)
    } else if (!s) {
      closeList()
    } else {
      closeList()
      out.push(`<p style="font-size:10pt;margin:3px 0;line-height:1.5">${inlineMd(s)}</p>`)
    }
  }

  closeList()
  out.push('</body></html>')
  return out.join('\n')
}

// ───────────────────────────────────────────────────────────────────────────────

export default function ResumeForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [template, setTemplate] = useState<TemplateState>({ file: null, name: '' })
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState<'resume' | 'cover_letter' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [refinement, setRefinement] = useState('')
  const [refining, setRefining] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const refineRef = useRef<HTMLInputElement>(null)

  const hasExistingResume = form.existing_resume.trim().length > 0

  const sections = useMemo(() => {
    if (!result) return { resume: '', coverLetter: '' }
    const match = result.match(/(?:^|\n)(#{1,3}\s*COVER\s*LETTER)/im)
    if (match?.index !== undefined) {
      return {
        resume: result.slice(0, match.index).trim(),
        coverLetter: result.slice(match.index).trim(),
      }
    }
    return { resume: result, coverLetter: '' }
  }, [result])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.name.endsWith('.pdf')) {
      setExtracting(true)
      setError(null)
      try {
        const body = new FormData()
        body.append('file', file)
        const res = await fetch('/api/extract-text', { method: 'POST', body })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setForm((prev) => ({ ...prev, existing_resume: json.text }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read PDF.')
      } finally {
        setExtracting(false)
      }
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setForm((prev) => ({ ...prev, existing_resume: ev.target?.result as string }))
      }
      reader.readAsText(file)
    }
  }

  const clearExistingResume = () => {
    setForm((prev) => ({ ...prev, existing_resume: '' }))
  }

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setTemplate({ file, name: file.name })
  }

  const clearTemplate = () => setTemplate({ file: null, name: '' })

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, val]) => formData.append(key, val))
      if (template.file) formData.append('template_file', template.file)

      const res = await fetch('http://127.0.0.1:8000/generate-resume', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Server error ${res.status}`)
      }

      const data = await res.json()
      setResult(data.resume)

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Is the backend running?'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRefine = async () => {
    if (!refinement.trim() || !result || refining) return
    setRefining(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('current_resume', result)
      fd.append('instruction', refinement.trim())
      const res = await fetch('http://127.0.0.1:8000/refine-resume', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server error ${res.status}`)
      }
      const data = await res.json()
      setResult(data.resume)
      setRefinement('')
      refineRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed.')
    } finally {
      setRefining(false)
    }
  }

  const copyToClipboard = async () => {
    if (!result) return
    try {
      const html = markdownToHtml(result)
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([result], { type: 'text/plain' }),
        }),
      ])
    } catch {
      // Fallback for browsers that don't support ClipboardItem
      await navigator.clipboard.writeText(result)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadSection = async (section: 'resume' | 'cover_letter') => {
    if (!result) return
    setDownloading(section)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('text', result)
      formData.append('section', section)
      formData.append('name', form.name || 'Candidate')

      const res = await fetch('http://127.0.0.1:8000/download-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server error ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        section === 'resume'
          ? `${form.name || 'Resume'}_Resume.pdf`
          : `${form.name || 'Resume'}_Cover_Letter.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF download failed.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900 leading-none">ResumeAI</h1>
            <p className="text-xs text-gray-500 mt-0.5">ATS-optimized resumes in seconds</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-7">
            <h2 className="text-xl font-semibold text-gray-900">Generate your resume</h2>
            <p className="text-sm text-gray-500 mt-1">
              {hasExistingResume
                ? 'Resume loaded — just tell us the job you\'re targeting.'
                : 'Fill in your details and we\'ll craft a tailored, ATS-optimized resume and cover letter.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Step 1: Existing resume (top, optional) ── */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Have an existing resume?{' '}
                    <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Paste it below or upload a .txt file — we&apos;ll update it for the new job. Other fields will be auto-extracted.
                  </p>
                </div>
                <label className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-2 transition-colors flex-shrink-0 ml-4 ${extracting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 cursor-pointer'}`}>
                  {extracting ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Reading PDF...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload file
                    </>
                  )}
                  <input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFileUpload} disabled={extracting} />
                </label>
              </div>

              <div className="relative">
                <textarea
                  name="existing_resume"
                  value={form.existing_resume}
                  onChange={handleChange}
                  rows={hasExistingResume ? 6 : 3}
                  placeholder="Paste your current resume here..."
                  className={`${inputNormal} resize-none w-full`}
                />
                {hasExistingResume && (
                  <button
                    type="button"
                    onClick={clearExistingResume}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 bg-white rounded p-0.5 transition-colors"
                    title="Clear resume"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {hasExistingResume && (
                <p className="mt-2 text-xs text-green-700 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Resume loaded ({form.existing_resume.trim().split(/\s+/).length} words) — name, contact, experience, skills and education will be extracted automatically.
                </p>
              )}
            </div>

            {/* ── Step 1b: Template upload (optional) ── */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Upload a resume template{' '}
                    <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    PDF, DOCX, or TXT — AI will mirror the structure and style of your template.
                  </p>
                </div>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-2 transition-colors flex-shrink-0 ml-4 cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {template.file ? 'Replace' : 'Upload template'}
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.png,.jpg"
                    className="hidden"
                    onChange={handleTemplateUpload}
                  />
                </label>
              </div>
              {template.file && (
                <div className="mt-2 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-green-700 truncate">{template.name}</span>
                  <button
                    type="button"
                    onClick={clearTemplate}
                    className="ml-auto text-gray-400 hover:text-gray-700 transition-colors"
                    title="Remove template"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* ── Step 2: Target job (always required) ── */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Target Job</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Job Title"
                  name="job_title"
                  value={form.job_title}
                  onChange={handleChange}
                  placeholder="Senior Software Engineer"
                />
                <Field
                  label="Job Description"
                  name="job_description"
                  value={form.job_description}
                  onChange={handleChange}
                  textarea
                  rows={3}
                  placeholder="Paste the job posting here..."
                />
              </div>
            </div>

            {/* ── Step 3: Personal & background (required only when no existing resume) ── */}
            <div className={hasExistingResume ? 'opacity-50 pointer-events-none' : ''}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                Your Details
                {hasExistingResume && (
                  <span className="normal-case font-normal text-green-600 tracking-normal bg-green-50 rounded px-2 py-0.5">
                    auto-extracted from resume
                  </span>
                )}
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field
                    label="Full Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder={hasExistingResume ? 'Auto-extracted' : 'Jane Smith'}
                    required={!hasExistingResume}
                    optional={hasExistingResume}
                  />
                  <Field
                    label="Email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder={hasExistingResume ? 'Auto-extracted' : 'jane@example.com'}
                    required={!hasExistingResume}
                    optional={hasExistingResume}
                  />
                  <Field
                    label="Phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder={hasExistingResume ? 'Auto-extracted' : '+1 (555) 000-0000'}
                    required={!hasExistingResume}
                    optional={hasExistingResume}
                  />
                  <Field
                    label="Location"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder={hasExistingResume ? 'Auto-extracted' : 'New York, NY'}
                    required={false}
                    optional={hasExistingResume}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field
                    label="Work Experience"
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                    textarea
                    rows={4}
                    placeholder={hasExistingResume ? 'Auto-extracted' : 'Company, role, dates, key achievements...'}
                    required={!hasExistingResume}
                    optional={hasExistingResume}
                  />
                  <Field
                    label="Skills"
                    name="skills"
                    value={form.skills}
                    onChange={handleChange}
                    textarea
                    rows={4}
                    placeholder={hasExistingResume ? 'Auto-extracted' : 'React, TypeScript, Node.js, AWS...'}
                    required={!hasExistingResume}
                    optional={hasExistingResume}
                  />
                  <Field
                    label="Education"
                    name="education"
                    value={form.education}
                    onChange={handleChange}
                    textarea
                    rows={4}
                    placeholder={hasExistingResume ? 'Auto-extracted' : 'Degree, school, graduation year...'}
                    required={!hasExistingResume}
                    optional={hasExistingResume}
                  />
                </div>
              </div>
            </div>

            {/* ── Custom instructions ── */}
            <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4">
              <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Custom instructions
                <span className="normal-case font-normal text-indigo-400 tracking-normal">(optional)</span>
              </label>
              <textarea
                name="custom_instructions"
                value={form.custom_instructions}
                onChange={handleChange}
                rows={2}
                placeholder={'e.g. "Emphasize leadership skills", "Keep it to 3 bullet points per role", "Use a more formal tone", "Highlight remote work experience"'}
                className={`${inputNormal} resize-none w-full text-sm`}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl px-7 py-3 transition-colors shadow-sm"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {hasExistingResume ? 'Update My Resume' : 'Generate Resume'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div ref={resultRef} className="mt-8 space-y-6">

            {/* Resume section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Resume</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-3.5 py-2 transition-colors"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy All
                      </>
                    )}
                  </button>
                  <DownloadButton
                    label="Resume PDF"
                    loading={downloading === 'resume'}
                    disabled={downloading !== null}
                    onClick={() => downloadSection('resume')}
                  />
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-10 py-8">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {sections.resume}
                </ReactMarkdown>
              </div>
            </div>

            {/* Cover letter section */}
            {sections.coverLetter && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Cover Letter</h3>
                  <DownloadButton
                    label="Cover Letter PDF"
                    loading={downloading === 'cover_letter'}
                    disabled={downloading !== null}
                    onClick={() => downloadSection('cover_letter')}
                  />
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-10 py-8">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {sections.coverLetter}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* ── Runtime refinement bar ── */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-800 mb-1">Request a change</p>
              <p className="text-xs text-gray-500 mb-3">Describe any correction and the AI will update the resume instantly.</p>

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  'Make the summary more concise',
                  'Add more quantified achievements',
                  'Use a more formal tone',
                  'Shorten bullet points to one line each',
                  'Emphasise leadership experience',
                  'Make cover letter more specific',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => { setRefinement(suggestion); refineRef.current?.focus() }}
                    className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full px-3 py-1 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  ref={refineRef}
                  type="text"
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                  placeholder='e.g. "Change job title to Senior Engineer", "Remove the LinkedIn line", "Add Python to technical skills"'
                  disabled={refining}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleRefine}
                  disabled={refining || !refinement.trim()}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
                >
                  {refining ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Applying…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Apply
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
