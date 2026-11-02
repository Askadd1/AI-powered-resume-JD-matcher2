from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from tempfile import TemporaryDirectory
import os

from flask import Flask, jsonify, render_template, request, send_from_directory

from resume_parser import FIELD_TARGETS, JobD, analyze_candidate, parse_job_description

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 30 * 1024 * 1024
ALLOWED = {".pdf", ".doc", ".docx"}

SAMPLE_DIR = Path(__file__).parent / "resumes"

SAMPLE_JDS = {
    "software_engineer": {
        "title": "Senior Full-Stack Engineer",
        "category": "Software engineering",
        "description": "We are seeking a Senior Full-Stack Software Engineer with 4+ years of experience building modern web applications. Strong proficiency in Python, FastAPI/Flask, JavaScript/TypeScript, React or Vue, and PostgreSQL. Experience with Docker, cloud deployments (AWS/GCP), RESTful API design, and CI/CD pipelines is required. Strong communication and problem-solving skills."
    },
    "ai_engineer": {
        "title": "AI / Machine Learning Engineer",
        "category": "Software engineering",
        "description": "Looking for an AI/ML Engineer experienced in LLM application development, PyTorch, Python, LangChain/LlamaIndex, vector databases (Qdrant, Pinecone), and prompt engineering. The ideal candidate has built RAG pipelines, fine-tuned transformer models, and deployed AI APIs into scalable cloud environments."
    },
    "data_scientist": {
        "title": "Data Scientist & Analytics Lead",
        "category": "Data science & analytics",
        "description": "We need a Data Scientist with solid expertise in Python, SQL, statistical modeling, data preprocessing, machine learning algorithms (scikit-learn, XGBoost), and business intelligence dashboards (Tableau/PowerBI). Must be able to translate raw data into actionable strategic insights for leadership."
    },
    "product_manager": {
        "title": "Senior Technical Product Manager",
        "category": "Product management",
        "description": "Seeking a Senior Product Manager to lead product discovery and execution for our AI-driven SaaS platform. Requires experience defining product roadmaps, writing PRDs, conducting user research, collaborating with engineering and design teams, and tracking key retention/growth metrics."
    },
    "ux_designer": {
        "title": "Product & UI/UX Designer",
        "category": "Design & UX",
        "description": "Looking for a UI/UX Designer with expertise in Figma, user journey mapping, wireframing, high-fidelity interactive prototyping, design systems, and usability testing. Strong aesthetic sensibility, user empathy, and accessibility knowledge required."
    }
}


@app.get("/")
def home():
    return render_template("index.html", fields=list(FIELD_TARGETS))


@app.get("/api/samples")
def get_samples():
    sample_resumes = []
    if SAMPLE_DIR.exists():
        for f in SAMPLE_DIR.glob("*.pdf"):
            sample_resumes.append({
                "filename": f.name,
                "name": f.stem,
                "size": f.stat().st_size
            })
    return jsonify({
        "sample_jds": SAMPLE_JDS,
        "sample_resumes": sample_resumes,
        "fields": list(FIELD_TARGETS.keys())
    })


def save_upload(upload, folder: Path) -> Path:
    filename = Path(upload.filename or "resume").name
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED:
        raise ValueError(f"{filename}: please upload a PDF, DOC, or DOCX file.")
    path = folder / f"resume_{len(list(folder.iterdir()))}{suffix}"
    upload.save(path)
    return path


@app.post("/api/analyze/recruiter")
def recruiter_analysis():
    description = request.form.get("job_description", "").strip()
    uploads = request.files.getlist("resumes")
    use_samples = request.form.get("use_samples") == "true"
    sample_names = request.form.getlist("sample_names")

    if len(description) < 30:
        return jsonify(error="Add a little more detail to the job description (at least 30 characters)."), 400

    uploads = [upload for upload in uploads if upload and upload.filename]

    if not uploads and not use_samples and not sample_names:
        return jsonify(error="Add at least one resume to continue."), 400
    if len(uploads) + len(sample_names) > 25:
        return jsonify(error="Upload up to 25 resumes at a time."), 400

    try:
        job = parse_job_description(description)
        results = []
        with TemporaryDirectory(prefix="talentlens-") as temporary:
            folder = Path(temporary)
            tasks = []

            # Save and schedule uploaded files
            for upload in uploads:
                try:
                    saved_path = save_upload(upload, folder)
                    tasks.append((saved_path, Path(upload.filename).name, False))
                except Exception as error:
                    results.append({
                        "name": Path(upload.filename).stem,
                        "file_name": Path(upload.filename).name,
                        "error": str(error)
                    })

            # Schedule sample files if requested
            if use_samples or sample_names:
                if not sample_names:
                    sample_files = list(SAMPLE_DIR.glob("*.pdf"))
                else:
                    sample_files = [SAMPLE_DIR / name for name in sample_names if (SAMPLE_DIR / name).exists()]

                for sample_path in sample_files:
                    tasks.append((sample_path, sample_path.name, True))

            def _process_one(task_info):
                file_path, original_filename, is_sample = task_info
                try:
                    candidate = analyze_candidate(file_path, job)
                    candidate["file_name"] = original_filename
                    if is_sample:
                        candidate["is_sample"] = True
                    return candidate
                except Exception as error:
                    return {
                        "name": Path(original_filename).stem,
                        "file_name": original_filename,
                        "error": str(error),
                        "is_sample": is_sample
                    }

            with ThreadPoolExecutor(max_workers=6) as executor:
                future_to_task = {executor.submit(_process_one, t): t for t in tasks}
                for future in as_completed(future_to_task):
                    results.append(future.result())

        results.sort(key=lambda result: result.get("score", -1), reverse=True)
        if not any("score" in result for result in results):
            return jsonify(error="None of the resumes could be analyzed.", results=results), 422
        return jsonify(role=job.role or "Role match", results=results)
    except Exception as error:
        return jsonify(error=str(error)), 500


@app.post("/api/analyze/individual")
def individual_analysis():
    field = request.form.get("field", "").strip()
    upload = request.files.get("resume")
    sample_name = request.form.get("sample_name")

    if not field:
        return jsonify(error="Choose a career field to continue."), 400

    target_description = FIELD_TARGETS.get(field, f"{field} professional. Evaluate relevant core skills, projects, and work experience for entry into {field}.")

    if not upload and not sample_name:
        return jsonify(error="Add your resume to continue."), 400

    try:
        target = JobD(
            role=field,
            required_skills=[target_description],
            responsibilities=[f"Evaluate the resume for readiness and fit for {field} roles."]
        )

        with TemporaryDirectory(prefix="talentlens-") as temporary:
            if upload and upload.filename:
                file_path = save_upload(upload, Path(temporary))
                file_name = Path(upload.filename).name
            elif sample_name and (SAMPLE_DIR / sample_name).exists():
                file_path = SAMPLE_DIR / sample_name
                file_name = sample_name
            else:
                return jsonify(error="Selected resume not found."), 400

            result = analyze_candidate(file_path, target)
            result["file_name"] = file_name

        return jsonify(result)
    except Exception as error:
        return jsonify(error=str(error)), 500


@app.errorhandler(413)
def too_large(_error):
    return jsonify(error="Each upload request must be smaller than 30 MB."), 413


if __name__ == "__main__":
    app.run(debug=True, port=5000)

