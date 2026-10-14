# LearnTrace

Turn course notes, slides and lecture recordings into a searchable study space, with inspectable source passages and practice that points you back to the material.

Built for Track D: Personalized Tutoring & Adaptive Learning. This is a local, single-user hackathon prototype. See [REVIEW.md](REVIEW.md) for the feedback audit and remaining submission blockers.

## Run

Prerequisites: Node.js 18 or later; Python 3.10 or later for file extraction and transcription. JavaScript uses Node built-ins and requires no npm dependency installation.

Windows:
```powershell
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
node server.js
```

macOS / Linux:
```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
node server.js
```

Open http://127.0.0.1:4173/. Use the server URL, not the HTML file directly. Set PORT to use another port. `npm start` also works when npm is installed.

Runtime discovery checks the project virtual environment, installed Python commands and an available bundled interpreter. LEARNTRACE_PYTHON overrides discovery. Missing modules produce setup guidance. The first transcription may download a Whisper model and need network access; subsequent runs can use its cache. CPU transcription can take several minutes.

## Implemented features

- PDF text with page references, PPTX text with slide references, TXT/MD and timed SRT/VTT ingestion.
- Local faster-whisper transcription of uploaded MP3/WAV/M4A/MP4/WebM/MOV/AVI, retaining timestamps. Limits: media 100 MB; PDF/PPTX 12 MB; browser text uploads 200 KB.
- BM25 **lexical** retrieval. This matches words; embeddings and semantic retrieval are not implemented.
- Source excerpts without a model key; optionally, generated answers from retrieved passages. Citation buttons focus the excerpt on the page.
- Optional model-written multiple-choice questions. Malformed, duplicate or unavailable model output falls back to a labelled source-reading check.
- Server-side grading and evidence-linked follow-ups. Template follow-ups use another statement; exhausted evidence prompts the learner to add material.
- Actual correct/attempt counts in browser-local practice history, with a clear-history control.
- Shared-term connections across source titles with visible evidence.
- Optional YouTube playlist titles/descriptions and filtering. Selection does not download or import video transcripts.

The guided demo loads **authored sample text** for a textbook, slides and a timed lecture transcript into the normal pipeline. Its page/slide/time labels are illustrative references. It does not prove extraction from original course files.

## Optional services

### Connection troubleshooting on Windows

Start the server from the submission directory, in the same PowerShell session where you configured the API keys:

```powershell
Set-Location 'D:\projects\LearnTrace-submission'
node server.js
```

In another terminal, check the exact port shown by that server:

```powershell
Invoke-RestMethod http://127.0.0.1:4173/api/status
npm.cmd test
```

Open http://127.0.0.1:4173/ and refresh the page after updating frontend files. A different preview port can serve a different project copy. If Node reports EADDRINUSE, reuse the existing server or stop it deliberately in its own terminal; do not start duplicate processes. API environment variables belong to the terminal that launches Node, and changing another terminal does not update a running server.

The October 15 readiness fix prevents optional HTML elements from marking a healthy backend unavailable. If a request fails, the UI now names its route and HTTP/connection error. Missing YouTube configuration is reported separately from backend connectivity.

Set environment variables in the terminal that starts the server. .env files are not automatically loaded.

| Variable | Purpose |
| --- | --- |
| OPENAI_API_KEY | Enables model answers and quiz generation; server-side only. |
| OPENAI_MODEL | Answer model; default gpt-6-astra. |
| OPENAI_QUIZ_MODEL | Quiz-model override; otherwise uses the answer model. |
| YOUTUBE_API_KEY | Public playlist metadata through YouTube Data API. |
| LEARNTRACE_PYTHON | Python executable override. |
| LEARNTRACE_WHISPER_MODEL | Local model; default base.en (English). |
| PORT | Local server port; default 4173. |

With a model key, questions and retrieved excerpts are sent to OpenAI. Quiz requests send one selected passage. Requests specify store: false. No key means no model calls. Timeouts or invalid citation numbers cause excerpt fallback. Checking citation numbers does **not** prove claim support.

Live OpenAI and YouTube calls have not been verified during this audit. Stub tests prove handling, not live model quality or account access. No LLM-judge component is part of the application.

## Verify

```sh
node tests/retrieval.test.js
node tests/quality.test.js
node tests/frontend.test.js
node tests/journey.test.js
node eval/run-retrieval.js
```

`npm.cmd test` runs all four suites on Windows without invoking PowerShell's blocked npm.ps1. The HTTP journey test starts a temporary loopback server and disables external keys. Quality tests cover stubbed model behavior, failures, repeat-safe grading, follow-up exhaustion, invalid citations, short PPTX slides and unique passage IDs. Frontend tests execute app.js against the actual HTML and cover optional elements, status diagnostics and recovery.

The retrieval script is a small demo smoke check. Its source-level hit rates are **not** a final accuracy metric. A submission-quality evaluation needs independently labelled questions and actual course material, including paraphrases and unsupported questions.

## Storage and limits

- Sources and assessment IDs live in server memory and clear on restart. Practice history stays in the browser until cleared. There are no accounts or multi-user isolation; the server binds to loopback.
- PDF/PPTX processing reads text, not diagrams. Scanned PDFs need OCR, which is not implemented. Video processing transcribes audio; it does not inspect frames.
- Topic labels are deterministic suggestions from transcript terms; they are not a complete lecture syllabus. Speech recognition can be wrong.
- BM25 can miss synonyms and retrieve irrelevant passages sharing words. A retrieved excerpt is not automatically an answer.
- Raw YouTube links are not automatically transcribed. Uploaded permitted media or timed captions supply lecture evidence in this version.
- Generated quizzes are checked for format and duplication, not independently verified for factual correctness. Real generated questions need human review.
- Template quizzes check source reading, with simple distractors. The revision loop is not a validated mastery model or long-term adaptive curriculum.
- The original uploaded files are not retained for playback/viewing. Citations show extracted passages.

## Project guide

[PROJECT_BRIEF.md](PROJECT_BRIEF.md): intent and scope.
[ARCHITECTURE.md](ARCHITECTURE.md): implementation.
[FEATURE_ROADMAP.md](FEATURE_ROADMAP.md): status.
[PROJECT_LOG.md](PROJECT_LOG.md): learning history.
[REVIEW.md](REVIEW.md): feedback-by-feedback audit.
[SUBMISSION.md](SUBMISSION.md): demo outline and submission requirements.
