# LearnTrace feature audit and repair backlog

Reviewed 15 October 2026 against the submission repository after commits 2e51ad8 and 52f3eca. Application code was not changed during this audit. The live user's corpus and API credentials were not used for the probes.

This is an implementation review, not an independent evaluator's certification. Confirmed means supported by current code or a controlled reproduction. Risk means a plausible failure path identified in code but not reproduced in a real browser. Unverified means evidence is still missing. A configured API key is not proof of successful integration or quality.

## Highest-priority work

### LT-01 — No course or source scope (confirmed; high)

**Implemented 15 October:** source IDs, an explicit study selection and server-enforced filtering now cover questions, concept maps, checks, grading and follow-ups. Same-name uploads stay distinct; samples carry separate metadata and are selected explicitly. Progress display is filtered by the selected source set. HTTP, frontend and isolated-browser checks pass. This needs a backend restart to activate in an existing live session; durable course storage remains LT-08.

Original finding: all uploads and sample material shared one global corpus. Questions, assessments and follow-ups searched that corpus without source selection. Unrelated courses or the deadlock demo could contaminate a learner's current study task. Evidence at audit time: server.js corpus, retrieve and /api/ask; dist/app.js question payload contained only question.

Done when: a learner can choose an active course/source set and retrieval, checks, connections and progress consistently use that scope. Verify two unrelated courses plus demo material cannot leak across scope.

### LT-02 — Word overlap is mistaken for answerability (reproduced; high)

**Guardrails implemented 15 October; semantic accuracy still unverified:** lexical matches are now explicitly related material, with no automatic quiz. The existing tutor response may answer or report insufficient evidence; positive responses need citations and quotes present in the supplied passages. Validation/service failures safely fall back. A server-owned receipt gates automatic practice. Explicit passage reading remains available. This is not a separate LLM judge, and exact-quote checks cannot prove semantic support. Offline/browser paths and stubbed tutor contracts pass; a real-course human-labelled evaluation remains LT-27/28. Do not mark the broad answerability problem completely solved.

retrieve keeps any score above zero. Asking “What year was deadlock invented?” against a passage defining deadlock returned a hit despite no date being present. That hit can trigger a model answer and a check. The excerpt fallback is labelled, but its heading still says “Answer from your source material.” Evidence: server.js retrieve, extractiveAnswer, /api/ask.

Done when: distinguish candidate retrieval from sufficient evidence, abstain on unsupported questions even with overlapping words, and avoid generating a check from an unanswered question.

### LT-03 — Paraphrases and multilingual material are poorly supported (reproduced/code-confirmed; high)

“How do locks guarantee exclusivity?” returned no hit against a mutex/critical-section passage. Tokenization is ASCII English, does not stem plurals or equate synonyms, and keeps hyphenated terms differently from separated words. Evidence: server.js tokens/retrieve.

Done when: evaluate actual paraphrases, normalize text appropriately and select retrieval improvements from measured misses. Do not claim semantic or multilingual support before testing it.

The tutor also receives each question independently; there is no conversation history for follow-ups such as “explain that more.” This should be handled explicitly rather than implying a continuing conversation.

### LT-04 — A valid citation number does not establish grounding (reproduced; high)

Update: structured answers now require present-in-source support quotations as well as valid citations, displayed for inspection. A fabricated answer with unrelated but real quotes could still pass. Claim entailment is not independently verified; this finding remains open.

The controlled model response “The moon is made of cheese [1].” was accepted against operating-systems evidence. modelAnswer verifies only reference-number bounds; missing references merely warn. /api/ask also reports the resulting mode as model_grounded. Evidence: server.js modelAnswer and /api/ask.

Done when: answers expose claim-to-excerpt support, unsupported claims are rejected/revised or clearly withheld, and human-labelled examples test groundedness. This does not require embedding an LLM judge in the product.

### LT-05 — Generated questions are not verified for correctness (reproduced; high)

**Additional guardrails, not fully resolved:** generated items require a substantial quote present in the source, lexical relevance to focus and normalized distinct options. Invalid items fall back to reading checks. Feedback labels the AI-generated key and exposes its quote; generic misconception notes are not diagnoses of a specific wrong choice. A false but topically related item with a real quote could still pass. Correctness/ambiguity need human-reviewed evaluation, not an internal LLM judge.

A deliberately unrelated astronomy quiz with a false answer was accepted against deadlock notes because its shape was valid. Validation catches duplicate options and bad types, not correct-answer support, ambiguous alternatives, or a wrong explanation. Evidence: server.js validQuizItem/modelQuizItem.

Done when: every accepted quiz has an inspectable support passage, one defensible answer and reviewed distractors. Test deliberately ambiguous and unsupported items, using format checks plus evidence-based review.

### LT-06 — The check can test the wrong part of a passage (confirmed; high)

**Lexical focus repair implemented:** original learner focus is sent to the quiz generator and retained for follow-ups. Fallback sentences are ranked by focus and restricted to strongest matched-term coverage instead of always taking the first sentence or drifting to weaker material after exhaustion. Regression fixtures cover a definition followed by the requested graph-cycle explanation. Paraphrases and semantic equivalence remain limited by BM25; arbitrary topic alignment is not guaranteed.

createAssessmentAI sends the selected passage without the learner's focus for the initial model question. The template selects its first unused sentence. A passage may mention both definition and graph detection, but the learner's graph question can receive a definition quiz. Evidence: server.js createAssessmentAI and assessmentFromSource.

Done when: the selected concept/question intent is passed through, assessed and preserved across follow-ups.

### LT-07 — Adaptation is currently shallow (confirmed product gap; high)

The result changes a revision instruction and next question; there is no difficulty policy, prerequisite model or selection driven by accumulated weak-topic history. The same generic misconception line may be displayed for any wrong option, although it describes only the model's most tempting distractor. The template's three fixed alternatives are easily eliminated. Evidence: server.js assessmentFromSource/gradeAssessment/createFollowUpAssessmentAI; browser practice counts.

Done when: show one meaningful example of a specific wrong choice leading to suitable feedback, evidence and a targeted next item. Define that behavior before claiming diagnostic mastery or broad personalised teaching.

### LT-08 — Study material disappears on server restart (confirmed; high)

Corpus, checks and follow-up IDs are in memory, while browser practice survives. A restart loses the material but leaves old progress. Assessment eviction after 300 entries can also invalidate a pending check. Evidence: server.js corpus/assessments; dist/app.js localStorage.

Done when: save a local workspace or provide explicit export/import, preserve source identity and handle expired attempts clearly. Browser and server state must describe the same workspace.

## Sources, extraction and citations

### LT-09 — Source identity and management are incomplete (partly reproduced; medium)

Two sources both named “Lecture,” one PDF and one transcript, appeared separately in the library but produced zero cross-source connections because conceptMap keys only by title. Reuploading material creates duplicates. There are no remove, replace, rename or source-specific selection controls. Evidence: server.js sourceLibrary/conceptMap and ingestion routes.

Done when: source IDs are independent of titles, duplicate handling is deliberate, and a learner can remove the wrong source without restarting everything.

### LT-10 — Citations cannot open the original source (confirmed limitation; medium)

Citation buttons focus extracted text. Uploaded original files are deleted after processing; there is no original PDF page, slide viewer or media player. The UI also shows all retrieved passages as citation buttons, regardless of which numbered references the answer used; citedEvidence is not used to distinguish them. Evidence: extraction finally blocks; dist/app.js showLiveAnswer.

Done when: clearly separate cited support from other retrieved matches; offer an appropriate original-source view/seek where retention is enabled and understood.

### LT-11 — Chunking can lose structure or exceed its target (reproduced/code-confirmed; medium)

A 9,000-character unpunctuated paragraph remained one chunk despite the approximate 700-character target. There is no overlap or sentence-neighbour expansion. PDF tables, formulas and slide reading order are flattened. Long extracted output can exceed subprocess buffers. Evidence: server.js chunkText/PDF_EXTRACT_SCRIPT/PPTX_EXTRACT_SCRIPT; runtime.js maxBuffer.

Done when: enforce real chunk budgets, preserve useful adjacency/structure and test long paragraphs, tables, lists and short lecture cues.

### LT-12 — OCR and visual understanding are absent (confirmed scope limitation; medium)

Scanned PDFs, slide diagrams and video frames are not understood. Audio transcription alone cannot capture an instructor pointing at an unlabeled diagram. This is a scope limitation, not a broken existing vision feature.

Done when: either implement the selected visual capability or make the limitation clear before upload and demonstrate the supported text/audio modalities honestly.

### LT-13 — Caption validation is too permissive (reproduced; medium)

“banana --> earlier” was accepted as a timestamped cue. Start/end ordering, valid time formats and overlapping cues are not checked. Plain transcript fallbacks lose exact times. Evidence: server.js captionCues/captionToChunks.

Done when: reject invalid timings with useful errors, normalize supported SRT/VTT formats and retain valid cue order.

## Lectures, playlists and connections

### LT-14 — Topic maps do not reliably list what is taught (confirmed; medium/high relative to the original vision)

Four cues become one section regardless of duration or topic boundaries. The top four frequent terms drive a small set of labels; the visible quote is truncated to 360 characters. Important infrequent topics can be omitted. Some label logic is tied to operating systems; assessmentConcept even labelled a road-resource graph question “Resource graphs and deadlock” in the controlled probe.

Done when: test on a real lecture, segment by coherent topic/time and show evidence for each topic. Remove domain-specific assumptions. Treat topic completeness as something to measure.

### LT-15 — Timestamps are displayed, but not actionable (confirmed; medium)

There is no seek/play action, transcript correction, timed-transcript download control or full transcript viewer. Topic cards can disappear on reload even though transcript chunks remain in the running server.

Done when: the learner can revisit a section, inspect/correct recognized text and recover their lecture analysis.

### LT-16 — Arbitrary YouTube links do not yield lecture content (confirmed product gap; medium/high relative to the requested vision)

Playlist Map uses titles/descriptions; there is no authorised YouTube transcript connection. Uploading permitted media or captions is a separate route. Do not market this version as automatically reading every lecture from a playlist URL.

Done when: either deliver an authorised end-to-end transcript path or position the existing two routes clearly and demonstrate each supported behavior.

### LT-17 — Playlist tags and selection have limited usefulness (confirmed; medium)

Tags are simply the first four distinct non-stopwords in title plus description, not a content/topic classifier. Full descriptions can be long. Selecting a video only records a checkbox and may prefill a title; it does not build a saved watch plan or import evidence. Video unavailability detection is heuristic and English-title-dependent. Evidence: server.js topicTags/mapPlaylistItems; dist/app.js renderPlaylistItems.

Done when: provide a concise inventory, clearly useful selection outcome and honest topic/detail boundaries, with a real playlist test.

### LT-18 — Concept connections are shared words rather than concepts (confirmed; medium)

The map can connect generic words or different meanings of the same word. It misses synonyms, caps output at eight terms and keeps just the first excerpt per title. Broad concept wording in the UI can overstate that relationship. Evidence: server.js conceptMap.

Done when: improve candidate ranking and source IDs, distinguish term overlap from conceptual equivalence and show enough context to justify the connection.

### LT-19 — Transcription quality and language scope are narrow (confirmed limitation; medium)

base.en defaults to English. Technical vocabulary, accents, noisy recordings and code switching can be misrecognized. There is no confidence/review workflow or correction path; transcript errors then affect every downstream feature. No video-frame analysis is present.

Done when: test representative lecture clips, expose reviewable speech text and give clear language expectations before processing.

### LT-20 — Media processing is expensive and has no job control (confirmed; medium)

Each request starts Python and loads Whisper. Entire media files are read/base64-encoded and transported in JSON, multiplying memory use. There is no queue, cancellation, resumable job or reliable progress feed. The dedicated media/caption/playlist submit controls are not disabled while requests run, so repeated clicks can duplicate work and ingest duplicates. The unified uploader does disable its button.

Done when: prevent duplicate work, bound concurrency, keep errors actionable and use an appropriate file/job mechanism for longer recordings. Avoid fabricated progress percentages.

## Practice state and frontend flow

### LT-21 — Follow-up history is incomplete (reproduced; medium)

The API permits a follow-up before grading its parent. Calling the same parent repeatedly produced new IDs with the same option sets in the probe. Model avoidance includes only the immediately previous question, so older questions can return. A chosen alternate passage can be exhausted without trying all other viable passages.

Done when: require a completed parent, make follow-up creation repeat-safe and preserve history over the whole study path.

### LT-22 — Practice records have unstable identity (confirmed; medium)

localStorage groups by concept strings generated from questions/models, shared across courses. The same concept may split across names, and unrelated concepts may merge. There are no timestamps or source/workspace versions. The “last check” label is insufficient to explain long-term weakness.

Done when: stable concept/workspace IDs drive storage, and every recorded result retains its source and attempt identity.

### LT-23 — Overlapping interactions can show stale results (code-supported risk; medium)

**15 October, step 1 repaired for the learner answer/check flow:** a new study-action ID now invalidates older question, quiz, follow-up and grading UI callbacks within the same source scope as well as across scope changes. Automatic checks inherit the question action. Old success/error/finally paths cannot replace the new quiz or change its controls, and obsolete practice responses cannot trigger scrolling. Added delayed-response regressions that fail on the old frontend and assert actual rendered quizzes with a repaired fake-DOM harness. Seven suites and isolated normal-browser practice/grading/follow-up smoke pass. This does not add request cancellation or solve all asynchronous ingestion/status interactions; those remain separate checks.

A pending model check can return after the learner starts another action. assessmentLoading silently drops another check request instead of linking work to a current question. Starting a new query clears a check but leaves the previous answer visible while loading or on request failure. There are no request IDs/cancellation to reject outdated responses.

Adding a source also does not invalidate or rebuild an already visible concept map, so old connections can remain on screen without a stale-state indicator.

Done when: delayed-response tests prove the displayed answer and check always belong to the active learner action. This risk was not live-browser-reproduced in this audit.

### LT-24 — Status and errors still conflate different things (confirmed; medium)

modelReady/playlistReady only check for a nonempty environment variable; transcriptionReady is null. Neither establishes working service/dependency access. Status refresh overwrites the upload message whenever another action checks readiness. Some requests bypass the improved API helper. Model quiz failures silently fall back, while answer failures use one generic “unavailable” warning, hiding authentication, timeout or invalid-citation distinctions.

Done when: distinguish configured, checked, processing and failed states; keep upload results stable and expose safe, useful diagnostics without secrets.

### LT-25 — Everyday usability still needs refinement (confirmed/design review; medium)

The page always shows a large first-use hero even with many loaded sources, and remains a long scroll. Supporting text and mobile status are very small. Keyboard focus exists, but contrast, zoom and screen-reader behavior have not had a formal pass. Navigation selection follows clicks rather than actual scroll position; mobile links have no active state. The interface still exposes internal terms such as “chunks.”

Done when: returning learners reach their material quickly, status and help are legible, and a keyboard-only/zoom/mobile pass finds no blocked task. Do not infer standards compliance from a screenshot.

### LT-26 — Demo state and sample questions are misleading in some situations (confirmed; medium)

The demo-status label resets to “No sample material loaded” on reload even if demo sources remain on the server. loadDemoEvidence treats any title starting “Demo ” as proof that the whole demo exists. Deadlock/Coffman/handling suggestions remain visible for unrelated courses, and the current authored demo does not teach all suggested topics. Sample passages are not real source-file extraction evidence.

Done when: derive sample state from server metadata, isolate samples, and generate example questions the active material actually supports.

## Validation, reliability and deployment

### LT-27 — Accuracy claims are not supported by current evaluation (confirmed; high before submission claims)

The retrieval evaluation has three supported questions plus one absent-topic question over five sample chunks. It scores source-title hits, not claim support, passage correctness, distractor validity or useful adaptation. Even a top-three source hit is weak evidence when the corpus is this small. Existing tests mostly cover plumbing and controlled model responses.

Done when: evaluate unseen real-course questions, overlapping-vocabulary negatives, paraphrases, citations, generated questions and a wrong-answer revision path. Preserve failure cases and human review.

### LT-28 — Live integration and reproducibility evidence remains incomplete (unverified; high for demo rehearsal)

Recent UI inspection shows the user's configured AI status; the prior fresh audio/HTTP smoke passed. This audit did not make live model or YouTube calls and cannot certify their quality, quota, latency or cost. A clean-machine install, first model download, media format matrix and representative real-course rehearsal remain unproven. Readiness badges do not close these gaps.

Done when: run and record a bounded live rehearsal in the actual configured environment, plus a fresh clone/setup check. Never call a stub test a live service test.

### LT-29 — Upload/input errors need stronger validation (confirmed; medium)

Backend routes decode base64 without strict validation and often return HTTP 500 for malformed user data. PDF/PPTX extension/size checks do not establish a valid document or a safe decompressed archive budget. Oversize body handling destroys the connection rather than reliably returning a structured limit response. Raw subprocess messages can expose confusing internal paths.

Done when: test malformed/corrupt/oversize inputs and return bounded, readable 4xx responses, preserving useful developer diagnostics privately.

### LT-30 — Performance and service budgets are not bounded enough (confirmed; medium locally, higher if hosted)

BM25 retokenizes the corpus for every query and concept maps scan all passages. The corpus has no total capacity limit; API and playlist requests have no application-level rate/cost budget. Playlist pagination can fetch the whole list without a total item cap. Model calls are sequential for answer then quiz and can each take up to 25 seconds.

Done when: measure the intended demo size, avoid unnecessary calls/reindexing, cap work and show meaningful latency states. Do not optimize speculatively before measurement.

### LT-31 — Public multi-user use is not supported (confirmed scope limitation; defer unless deploying)

Loopback binding is appropriate for this local demo. There is no authentication, per-user corpus, upload quota, origin policy or service-level isolation. If publicly exposed, users could affect the same data and resource budget. This is not a claim that the current loopback demo has been exploited.

Done when: keep the submission explicitly local, or design isolation and deployment controls before publishing it as a shared service.

### LT-32 — Maintainability and offline polish have gaps (confirmed; lower priority)

Many handlers/routes and the stylesheet are compressed into long lines, making regressions harder to review. The UI depends on external fonts, with a fallback but no identical offline rendering guarantee. Several important browser interactions are represented by a minimal fake DOM in tests; there is no automated real-browser end-to-end suite or demonstrated accessibility audit.

Done when: format the code without changing behavior, consolidate shared request/feedback logic, and add a small real-browser smoke suite after core correctness is repaired.

## Order to solve these

1. LT-01/02: isolate active material and stop unsupported questions from becoming false answers/checks.
2. LT-03/04: improve measured retrieval and make claim support inspectable.
3. LT-05/06/07/21: correct, targeted questions and a demonstrably useful revision loop.
4. LT-08/09/22: source identity, persistence, deletion and progress consistency.
5. LT-14–20: lecture/topic/playlist experience and processing reliability.
6. LT-23–26/29: interaction state, diagnostics and remaining UI friction.
7. LT-27/28: real-course evaluation and final live rehearsal. Start collecting cases during step 1, not only at the end.
8. LT-10–13/30–32: remaining capabilities/hardening based on demo needs; keep heavy OCR, full video vision and public hosting explicitly deferred if time is limited.

Fixing everything should mean removing defects and unsupported claims within the chosen product scope. It need not mean building every possible future feature before submission.
