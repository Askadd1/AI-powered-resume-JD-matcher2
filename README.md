# TalentLens

A Flask website for comparing resumes with a job description or exploring how a resume aligns with a career field. Resume text extraction and AI analysis use the existing Groq account setup.

## Run locally

1. Add your Groq API key as `GROQ_API_KEY=...` in the project `.env` file.
2. Install the project dependencies with `uv sync`.
3. Start the server with `uv run python app.py`.
4. Open <http://127.0.0.1:5000> in your browser.

The home page asks whether you're a recruiter or exploring a career. Recruiters can enter a job description and upload up to 25 resumes. Individuals can select a career field and upload one resume. PDF, DOCX, and legacy DOC files are accepted; legacy DOC reading requires `antiword` or LibreOffice to be installed on the server.

Resume files are processed from a temporary folder and removed after each request. Add production hosting and authentication before using the app with real applicant data.
