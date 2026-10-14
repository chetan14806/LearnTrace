# LearnTrace: evidence-based review

Audit date: 14 October 2026. This report supersedes earlier blanket statements that the features were complete. It is a code-and-browser review by the working assistant, not an independent model verdict or a benchmark certification.

## What we are building

Track D asks for a study companion that unifies lecture videos, textbooks and slides into a source-cited knowledge base and uses it for adaptive assessments and personalised tutoring. LearnTrace's strongest demonstration is: upload course material → find a supporting passage → inspect its source → practise a concept → revisit evidence after a mistake.

The core file-to-passage flow is real. The current AI modes need live configuration and evaluation. The no-key experience is a source-reading tool with a simple revision loop. It should not be described as a finished semantic tutoring engine.

## Supplied feedback: checked one item at a time

| Feedback | What the files actually showed | Decision and current result |
| --- | --- | --- |
| Hard-coded Python prevents portability | Confirmed: server.js contained one user's absolute runtime path. | Replaced with module-aware runtime discovery: project venv, installed commands, bundled fallback; explicit override supported. PDF and PPTX extraction pass locally. Clean-machine installation still needs a separate check. |
| Missing setup files | package.json, requirements.txt and .gitignore had just been added in the preceding turn; the README was stale. | Kept manifests, rewrote setup and limitations, added venv exclusions. Node can run all tests directly when npm is absent. |
| Follow-up repeats the question | Confirmed: identical source sentence and three fixed distractors were reshuffled. | Template follow-ups use unused statements; model follow-ups avoid the preceding question and reject an exact repeat. Browser test demonstrated a different source statement. Exhaustion is reported. |
| Model-written quizzes | Absent in the actual server before this audit; present only in the external patch. | Implemented optional structured quiz generation with timeout and fallback, explanation and misconception feedback. Controlled-response tests pass. Live quality is unverified. |
| Fake mastery values | Initial percentages had been removed, but a static fallback still wrote invented 76/38 scores. | Removed that path. Display actual correct/attempt counts, persist only validated records, and allow clearing history. No readiness percentage. |
| XSS in quiz options/concept names | Earlier turn had changed these to DOM text; status still inserted a model-name string into HTML. | Kept text-node rendering and replaced dynamic status HTML with text. Source excerpts, labels and options are displayed as text. |
| Grounded-answer citation checks | Original prompt did not request per-claim numbered citations; there was no timeout. | Added numbered-citation instruction, timeout, warning for absent citations and fallback for impossible numbers. These checks do not verify semantic support. |
| Model name invalid | The correction is valid: official documentation lists gpt-6-astra with Responses and structured outputs. | Kept configurable model. OPENAI_QUIZ_MODEL allows a separate choice. No unverified cheaper model substituted. |
| Biased shuffle | Confirmed sort with random comparator. | Replaced with Fisher–Yates using crypto.randomInt. |
| Unbounded assessment map | Confirmed. | Records capped at 300; evicted checks report expiry. |
| Retrieval evaluation | Only a tiny authored demo corpus existed. | Kept as a smoke check, explicitly non-reportable as final accuracy. A held-out real-course benchmark remains outstanding. |
| Embeddings | Not implemented. | Deferred until we measure real paraphrase failures. Documentation now consistently says BM25 lexical retrieval. |
| Vision on slide diagrams | Not implemented. | Explicit future work. PPTX/PDF text and video speech are the supported modalities. |
| Playlist needs real API test | Confirmed: no live verification evidence. | Kept as an optional, collapsed metadata tool; excluded from the core proof claim. |

The provided archive was inspected as an inventory; it was not extracted over the working project. Selected server changes from the patch were applied through the file-editing tool, then revised and tested. The supplied patch and archive remain as original references and are no longer replacements for this working tree.

## Additional defects found and repaired

- Suggested questions bypassed the server and displayed canned answers. They now use the real question endpoint.
- Offline state could present a prewritten answer as course evidence. It now explains that the server is unavailable.
- Empty source lists displayed fictional source cards. Empty state now asks the learner to add material or load the labelled demo.
- The page showed an invented student, exam countdown and streak. Removed.
- Multiple upload submit handlers competed; timed captions in the general uploader could miss topic mapping. Replaced with a single file-type router.
- Processing messages advanced based on a timer without backend progress. Replaced with one truthful processing state.
- Short slide text was discarded by the chunk-length filter. A two-slide ZIP/XML fixture now verifies extraction and ordering.
- Timestamp-based passage IDs could collide. IDs now use random UUIDs.
- A generic term such as recovery could produce a deadlock label in unrelated material. The label now also requires the deadlock term.
- An already graded check accepted different answers on retry. Grading is now repeat-safe.
- Quiz errors were swallowed and could leave stale options. The interface clears the old check and displays the error.
- Citations were noninteractive badges. They now focus the relevant excerpt, including keyboard access.
- Phone-width layout hid connection status and allowed an arrow to overlap button text. Both repaired after visual inspection.
- Practice UI now records counts and preserves the concept across follow-ups; it does not claim educational diagnosis.

## Verification evidence

- Retrieval/PDF/grounding-contract suite: passes.
- Quality suite: passes. It covers model-response stubs, malformed quizzes, unavailable model fallback, citation bounds, repeated grading, follow-up variety/exhaustion, unique IDs, topic-label regression and actual PPTX extraction.
- HTTP learner journey: passes with external API keys disabled.
- Browser: verified clean empty state, guided demo, live suggested question, source excerpts, grading, recorded practice count, and a different follow-up statement.
- Visual inspection: desktop and 390 px phone viewport; phone content showed no horizontal overflow.
- Existing transcription smoke evidence is recorded in PROJECT_LOG.md; this review does not relabel an old test as a fresh live test.

## What still prevents a final quality claim

1. Run actual model answers and quizzes with a configured key. Human-check source support, ambiguous distractors, feedback and latency. Stub tests cannot establish those properties.
2. Evaluate unseen questions over an actual permitted lecture, textbook extract and slide deck. Include paraphrases, contradictions, irrelevant overlapping vocabulary and absent answers. Preserve failures, not just a headline score.
3. Verify the playlist integration with a real key if it is shown in the video.
4. Rehearse on a clean installation, including the first transcription model download. Existing-machine success is not a portability certification.
5. The fallback questions are intentionally simple. Strong conceptual adaptation depends on quality-tested generated questions and a richer future assessment policy.
6. No embeddings, diagram interpretation, original-video playback, durable server corpus or multi-user isolation are present.
7. Publish the repository, record the 3–10 minute demo, enter Devpost text and add actual team members. None of these external submission actions has been performed.

## Using another LLM to review our work

That can provide a useful second opinion as a development activity. Give the reviewer the Track D requirement, current source, README, this report and actual test results. Ask it to identify unsupported claims, reproduce failures and distinguish severity. Compare its findings against the code before changing anything. Do not treat its numeric rating as proof that the product works.

The mistakenly added runtime judge, starter judge cases, judge test and package command were removed. No judge is called from the learner flow or the build.

## Official references checked

- Model availability and features: https://developers.openai.com/api/docs/models/gpt-6-astra
- Structured-output contract: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses

Structured output enforces response shape; it does not independently establish factual correctness. That distinction matters for generated questions.
