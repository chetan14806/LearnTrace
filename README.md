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

### Choose your study sources

The question panel lists the sources in the current workspace. Check the files that belong to your current study task. Answers, concept connections, quizzes, grading and follow-ups use that selection. Each upload has an ID separate from its filename, so identically named files remain distinct. Source previews help distinguish them.

New uploads join your selected personal material; uploading after a sample-only session switches back to your own sources. Loading the sample module explicitly selects its three sources. A source card's “Study this source” button selects that source alone. Changing the selection clears old answers/checks and hides progress from other selections. No selection means no scoped question; an expired ID asks you to select material again.

The selection is saved in this browser, but source contents are still held in server memory. This is source selection, not durable course storage or user-account isolation.

Backend changes take effect after restarting Node in the terminal with your existing environment variables. A running older server continues using its prior behavior; the frontend labels source selection as pending restart until the backend advertises sourceScopingReady. Restarting still clears uploaded sources, so preserve originals and re-add them afterwards.

API clients must send a nonempty sourceIds array from GET /api/sources for POST /api/ask and /api/assessment. Send the same sourceIds with grading and follow-up requests. GET /api/concept-map accepts repeated sourceId query parameters. Missing selections return 400; expired or mismatched selections return 409.

### Answering versus related passages

BM25 finds candidates; word overlap is not proof of answerability. Without AI, matching passages are labelled **related passages**, not an established answer, and do not automatically produce a quiz. No matches means no matches were retrieved, not proof that an answer is absent from the entire source.

The existing tutor request returns a structured answer or reports insufficient evidence. A supported response must include numbered citations and substantial quotations found in the supplied passages. Invalid output, refusals and service failures fall back to related passages, with no automatic check. The UI exposes tutor-selected quotes for inspection. This is the tutor's self-report plus deterministic validation, **not an LLM judge, independent factual verification or an accuracy guarantee**. There is no separate judging call, judge model, judge score, dashboard or evaluation feature in the website. The format follows [official OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses); schema conformance does not establish truth.

Practice still works without AI: click **Practise this passage** beside an excerpt, or **Start source check** in a concept card. This creates an explicit source-reading exercise, not a claim that the original question was answered. Grading and follow-ups continue normally.

For automatic checks, POST /api/assessment requires the answerId from /api/ask, the same focus/question and sourceIds. The server checks its own bounded in-memory receipt, not a client practiceEligible flag. Unassessed or unsupported answers return 422. Explicit reading requires practiceMode: "source_reading" and a chunkId from displayed evidence within the selection. Expired/mismatched receipts or out-of-selection chunks return 409. Receipts clear on restart.

### Other implemented features

- PDF text with page references, PPTX text with slide references, TXT/MD and timed SRT/VTT ingestion.
- Local faster-whisper transcription of uploaded MP3/WAV/M4A/MP4/WebM/MOV/AVI, retaining timestamps. Limits: media 100 MB; PDF/PPTX 12 MB; browser text uploads 200 KB.
- BM25 **lexical** retrieval. This matches words; embeddings and semantic retrieval are not implemented.
- Related excerpts without a model key; optionally, generated answers or abstention from retrieved passages. Citation buttons focus the excerpt on the page.
- Optional model-written multiple-choice questions receive the original learner focus, retained for follow-ups. Missing/invented support quotes, obvious lexical off-topic output, normalized duplicate options, malformed or unavailable output fall back to a labelled source-reading check. Template statements are ranked by focus, rather than always taking the first sentence; short passages can exhaust their strongest focused statements sooner.
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

With a model key, questions and retrieved excerpts are sent to OpenAI. Quiz requests send one selected passage. Requests specify store: false. No key means no model calls. Timeouts, invalid output, missing support quotes or invalid citation numbers cause related-excerpt fallback. Checking citation numbers and quote occurrence does **not** prove claim support.

Live OpenAI and YouTube calls have not been verified during this audit. Stub tests prove handling, not live model quality or account access. No LLM-judge component is part of the application.

## Verify

```sh
node tests/retrieval.test.js
node tests/quality.test.js
node tests/quiz-focus.test.js
node tests/frontend.test.js
node tests/answerability.test.js
node tests/source-scope.test.js
node tests/journey.test.js
node eval/run-retrieval.js
```

`npm.cmd test` runs all seven suites on Windows without invoking PowerShell's blocked npm.ps1. HTTP tests use temporary loopback servers with external keys disabled. Quality tests cover stubbed model behavior, failures, repeat-safe grading, follow-up exhaustion, invalid citations, short PPTX slides and unique passage IDs. Quiz-focus tests cover original intent in generation/follow-up requests, sentence ranking, quote/relevance/duplicate checks and transparent feedback. Frontend tests cover initialization, diagnostics, selected-source payloads and no automatic quizzes for unanswered questions. Answerability tests cover lexical negatives, structured-response/quotation contracts, safe fallback, explicit reading and server-owned quiz eligibility. Stubs verify control flow, not the live tutor's semantic accuracy. Source-scope tests verify isolation across answers, connections, quizzes, grading, follow-ups, samples and same-name uploads.

The retrieval script is a small demo smoke check. Its source-level hit rates are **not** a final accuracy metric. A submission-quality evaluation needs independently labelled questions and actual course material, including paraphrases and unsupported questions.

## Storage and limits

- Sources and assessment IDs live in server memory and clear on restart. Practice history stays in the browser until cleared. There are no accounts or multi-user isolation; the server binds to loopback.
- PDF/PPTX processing reads text, not diagrams. Scanned PDFs need OCR, which is not implemented. Video processing transcribes audio; it does not inspect frames.
- Topic labels are deterministic suggestions from transcript terms; they are not a complete lecture syllabus. Speech recognition can be wrong.
- BM25 can miss synonyms and retrieve irrelevant passages sharing words. A retrieved excerpt is not automatically an answer.
- Raw YouTube links are not automatically transcribed. Uploaded permitted media or timed captions supply lecture evidence in this version.
- Generated quizzes are checked for format, normalized duplication, quote occurrence and lexical relevance, not independently verified for factual correctness or ambiguous distractors. Quote matching is not entailment. Feedback labels the AI-generated key, and generic misconception notes are not diagnoses of a particular wrong choice. Real generated questions need human review; there is no internal LLM judge.
- Template quizzes check source reading, with simple distractors. The revision loop is not a validated mastery model or long-term adaptive curriculum.
- The original uploaded files are not retained for playback/viewing. Citations show extracted passages.

## Project guide

[GITHUB_GUIDE.md](GITHUB_GUIDE.md): exact file layout, exclusions and safe updates after merging a GitHub-created README/.gitignore. Publishing source does not deploy this Node/Python application.

[PROJECT_BRIEF.md](PROJECT_BRIEF.md): intent and scope.
[ARCHITECTURE.md](ARCHITECTURE.md): implementation.
[FEATURE_ROADMAP.md](FEATURE_ROADMAP.md): status.
[PROJECT_LOG.md](PROJECT_LOG.md): learning history.
[REVIEW.md](REVIEW.md): feedback-by-feedback audit.
[SUBMISSION.md](SUBMISSION.md): demo outline and submission requirements.
