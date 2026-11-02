"""Resume extraction and AI matching helpers used by the web app."""

import json
import os
import shutil
import subprocess
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq
from pydantic import BaseModel, Field

load_dotenv()
MODEL = "openai/gpt-oss-120b"


class JobD(BaseModel):
    role: str = ""
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    minimum_experience: float | None = None
    education_requirements: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)


class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = Field(default_factory=list)


class Resume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    total_experience_years: float | None = None
    skills: list[str] = Field(default_factory=list)
    experiences: list[Experience] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


class MatchResult(BaseModel):
    score: float
    details: dict = Field(default_factory=dict)


def _client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is missing. Add it to your .env file to enable resume analysis.")
    return Groq(api_key=api_key)


def _json_completion(system: str, prompt: str) -> dict:
    response = _client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content or "{}"
    return json.loads(content)


def parse_job_description(description: str) -> JobD:
    schema = JobD.model_json_schema()
    data = _json_completion(
        f"You are an expert HR assistant. Extract job information and return only JSON matching this schema: {schema}. Do not invent information; use empty lists and null when absent.",
        f"Analyze this job description:\n{description}",
    )
    return JobD(**data)


def parse_resume(resume_text: str) -> Resume:
    schema = Resume.model_json_schema()
    data = _json_completion(
        f"You are an expert resume parser. Extract information by meaning, including internships and skills across all sections. Do not invent information. Use null for missing values and empty lists for missing lists. Return only JSON matching this schema: {schema}",
        f"Parse this resume:\n{resume_text}",
    )
    return Resume(**data)


def final_score(job: JobD, resume: Resume) -> MatchResult:
    schema = MatchResult.model_json_schema()
    data = _json_completion(
        f"You are an expert HR assistant. Compare the candidate fairly against the role. Return only JSON matching this schema: {schema}. Set score from 0 to 100. In details include matching_skills (list), missing_skills (list), experience_met (boolean or null), verdict (one concise sentence), and highlights (list).",
        f"JOB:\n{job.model_dump_json(indent=2)}\n\nCANDIDATE:\n{resume.model_dump_json(indent=2)}",
    )
    result = MatchResult(**data)
    result.score = max(0, min(100, result.score))
    return result


def read_resume(file_path: Path) -> str:
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        from pypdf import PdfReader

        return "\n".join(page.extract_text() or "" for page in PdfReader(str(file_path)).pages)
    if suffix == ".docx":
        from docx import Document

        document = Document(str(file_path))
        parts = [paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()]
        parts.extend(cell.text for table in document.tables for row in table.rows for cell in row.cells if cell.text.strip())
        return "\n".join(parts)
    if suffix == ".doc":
        antiword = shutil.which("antiword")
        if antiword:
            result = subprocess.run([antiword, str(file_path)], capture_output=True, text=True, check=True, timeout=20)
            return result.stdout
        office = shutil.which("soffice") or shutil.which("libreoffice")
        if office:
            import tempfile

            with tempfile.TemporaryDirectory(prefix="doc-convert-") as temporary:
                subprocess.run([office, "--headless", "--convert-to", "txt:Text", "--outdir", temporary, str(file_path)], capture_output=True, text=True, check=True, timeout=30)
                converted = Path(temporary) / f"{file_path.stem}.txt"
                if converted.exists():
                    return converted.read_text(encoding="utf-8", errors="replace")
        raise ValueError("Legacy .doc reading needs antiword or LibreOffice installed. Save this resume as .docx or PDF and upload it again.")
    raise ValueError("Please upload a PDF, DOC, or DOCX file.")


FIELD_TARGETS = {
    "Software engineering": "Software Engineer. Core skills: programming, data structures, algorithms, software design, APIs, databases, testing, version control, and collaboration. Evaluate relevant languages and practical software projects.",
    "Data science & analytics": "Data Scientist or Data Analyst. Core skills: Python or R, SQL, statistics, data cleaning, visualization, experimentation, machine learning where relevant, and communicating insights.",
    "Product management": "Product Manager. Core skills: product strategy, user research, roadmap planning, prioritization, requirements, analytics, stakeholder communication, and cross-functional delivery.",
    "Design & UX": "Product or UX Designer. Core skills: user research, interaction design, wireframing, prototyping, visual design, usability testing, accessibility, and design systems.",
    "Marketing": "Marketing professional. Core skills: campaign planning, content, audience research, channel strategy, analytics, brand communication, and measurable growth.",
    "Finance": "Finance professional. Core skills: financial analysis, accounting fundamentals, budgeting, forecasting, spreadsheets, reporting, attention to detail, and business communication.",
    "Operations": "Operations professional. Core skills: process improvement, planning, project coordination, data-informed decisions, documentation, communication, and reliable execution.",
    "Human resources": "Human Resources professional. Core skills: recruiting, interviewing, employee relations, HR operations, documentation, confidentiality, communication, and people programs.",
}


def analyze_candidate(file_path: Path, target: JobD) -> dict:
    text = read_resume(file_path)
    if not text.strip():
        raise ValueError("No readable text was found. This may be a scanned PDF; upload a text-based PDF or DOCX.")
    resume = parse_resume(text)
    match = final_score(target, resume)
    return {"name": resume.name or file_path.stem, "email": resume.email, "score": round(match.score), "details": match.details, "skills": resume.skills, "experience": resume.total_experience_years, "role": target.role}
