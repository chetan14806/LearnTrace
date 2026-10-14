# Submission preparation

## Description draft

Students often study the same idea across disconnected lecture recordings, slides and textbook pages. LearnTrace brings their extracted text into one local study space and preserves the source location of each passage. Learners can ask a question, inspect the matching evidence and take a source-based check. Their result points them to a passage to revisit and a follow-up question.

PDF and PowerPoint text extraction preserve pages and slide numbers. Uploaded lecture audio/video is transcribed locally with faster-whisper and retains timestamps. BM25 retrieves passages; optional model calls generate explanations and conceptual multiple-choice questions from those passages. Without model credentials, the app openly displays source excerpts and simple reading checks. A shared-term map exposes connections across sources. Practice history records actual attempts in the browser.

Our focus is inspectable evidence and a connected revision loop. This prototype does not yet provide semantic retrieval, diagram understanding, automatic transcription of public YouTube URLs or a validated estimate of student mastery. Playlist metadata discovery is optional and labelled separately from lecture evidence.

## Five-minute demo outline

1. **0:00–0:30 — Problem and promise.** Show the disconnected study materials. Explain the evidence → practice → revisit loop.
2. **0:30–1:30 — Real ingestion.** Upload a permitted short PDF, slide deck and spoken clip. Show page/slide/time references. If preprocessed for timing, say so and show a fresh short upload too.
3. **1:30–2:30 — Ask and inspect.** Ask a fresh question. State whether the visible response is model-generated or a source excerpt. Open a citation and compare the answer with the passage.
4. **2:30–3:30 — Practice and revision.** Take a check, deliberately miss one, read feedback, inspect the passage and take a different follow-up. Show actual attempt counts.
5. **3:30–4:15 — Boundaries.** Ask a question the material cannot answer. Explain lexical retrieval limitations and show how the interface labels its modes.
6. **4:15–5:00 — Architecture and results.** Explain transcription, passages, BM25 and optional generation. Show real evaluation results only after running them. Close with what is implemented and what remains.

Do not present labelled sample passages as real extracted lecture content. Do not show model stubs or authored canned text as live model output.

## Submission checklist from the supplied guidelines

- Devpost project description: problem, what was built, how it works.
- Public GitHub repository with source and README setup/dependencies/run instructions.
- YouTube demo: 3–10 minutes; public or unlisted, not private; English audio or English subtitles.
- Real full names for all team members, each with a Devpost account and added to the submission. Teams may have 1–4 members.

These are preparation documents only. No repository has been published, video uploaded or Devpost submission created by this audit. Consult the original guidelines for the deadline; this document does not invent one.
