# LearnTrace — fresh end-to-end and Track D alignment audit

Reviewed 15 October 2026 against the working tree in `D:\projects\LearnTrace-submission`. Local HEAD: `10cc7df`, plus the uncommitted answerability/quiz refinements. This is an implementation review, not independent certification or a predicted competition score.

## Verdict

**Repair update, 15 October — step 1:** the same-scope stale answer/quiz problem described below is now repaired in the working tree with learner-action identity guards. Deterministic delayed success/error regressions fail on the prior frontend and pass on the repair; seven suites and a normal isolated browser practice/grading/follow-up smoke pass. The test harness's quiz-rendering blind spot was also fixed. All other findings remain open unless separately marked; this audit's original observations are preserved below. This does not establish live-model correctness or cancel obsolete server requests.

LearnTrace has a functioning local study workflow. It is not just static screens: ingestion, source isolation, retrieval, explicit reading checks, grading, revision and browser-local attempt history execute. However, it is **not yet a complete implementation of the detailed Track D requirements**, and the existing tests do not establish real answer quality or personalization effectiveness.

Our earlier work relied too much on the overview and an ambitious internal project brief. The linked, detailed three-page Track D brief contains substantial requirements not represented in the current prototype. Calling all remaining work “polish” would be misleading. The right strategy is a small, complete and measured course-module experience, not another broad feature list.

No LLM judge is required inside the website. The detailed brief asks for question verification and framework-based system evaluation; these are different from a runtime judge. Evaluation can be a separate development/submission activity using saved outputs and reviewed labels. Nothing in this audit adds a judge, calls paid services or changes app behavior.

## Sources and scope of this review

- The local original overview: `D:\projects\Multimodal AI hackathon\Problem Statements.pdf`, including Track D on page 2.
- The complete [detailed Track D brief linked from that overview](https://drive.google.com/file/d/1KlbSV3-WFrd3Cs9J59qpWtiWrAkb-DMM/view). All three pages were read in its public browser viewer. An attempted download did not return a confirmed local file; no local downloaded copy is claimed.
- The local submission-guidelines PDF, current project brief, roadmap, architecture, README, audit backlog, code and tests.
- Fresh isolated HTTP tests, synthetic adversarial probes and a separate keyless browser/server session. The user's main running server, source corpus and credentials were not changed or restarted.

This audits the current local working tree, not the published GitHub site/repository, Devpost entry or every real course/video. Live OpenAI and live YouTube operations were not exercised: configuration alone does not establish success. No guarantee about prizes is possible.

## 1. Actual requirements and alignment

The detailed brief's rubric is Knowledge Base & Grounding 20%, Assessment Quality 15%, Personalization Effectiveness 20%, User Experience & Demo 15%, System Evaluation 15%, Technical Implementation 15%. These are rubric weights, not scores awarded to this project.

| Requirement | Current evidence | Gap |
| --- | --- | --- |
| Ingest videos, textbooks and slides without manual preprocessing | Uploaded audio/video is automatically transcribed; readable PDF/PPTX text extracts with locations | No image/diagram extraction. Layout-sensitive text can fragment. Representative course-material validation is missing. |
| Organize content into topics, subtopics, concepts and prerequisites; tag content units | Shared-term map and transcript topic candidates | No robust course/topic/prerequisite representation or comprehensive unit tagging. A shared word is not a concept relationship. |
| Extract and use images, diagrams and figures in textbooks/slides | Not implemented | This is explicitly in the detailed requirements, not merely an optional polish item. Scanned/image-only materials cannot be promised. |
| Cited answers opening the exact original page, slide or timestamp | Citations focus extracted evidence text; location labels survive | No original-document viewer or audio/video seek. A timestamp label alone does not meet the navigation requirement. |
| Decline/flag uncovered questions | Related-only mode and structured tutor abstention/quote checks | Tutor self-report and real-quote checks do not establish semantic support. A false answer with a real quote still passes a controlled probe. |
| Student-scoped quizzes/mock exams: MCQ, short answer, numerical; topic/source/difficulty tags | One MCQ at a time, selected-source filtering, source/label attached | No multi-question assessment, short-answer/numerical workflow, difficulty policy or full report. |
| Verify correctness; avoid repeated questions across assessments | Shape/duplicate/quote/lexical checks, server-side grading, immediate avoidance | No independent correctness/ambiguity verification. Follow-up state is not durable or repeat-safe across a full learning path. |
| Cited feedback and weak-topic/misconception report | Cited passage and correct/attempt counts; generic revision message | Not a post-assessment diagnostic report. Generic misconception text is not a diagnosis of the selected wrong option. |
| Per-topic learner estimates updated after quizzes and conversations; cold-start intake | Browser-local attempt counts | No real learner model, conversation-driven update, initial diagnostic/intake, or history-driven next-topic selection. |
| Framework-based retrieval/generation metrics | Seven regression suites and tiny lexical retrieval smoke check | No RAGAS/DeepEval/TruLens-or-similar evaluation with faithfulness, answer relevancy, context precision/recall on a reviewed test set. |
| Simulated profiles over multiple sessions; report mastery gains and repetition rate | Not implemented | No multi-session simulation results. Estimated learner-state changes must not be misrepresented as real human learning gains. |
| Clear dashboard/demo and reproducible implementation | Working local UI, setup docs, tests, demo script | Remaining interaction bugs, small text, stale documentation, uncommitted files and no verified clean-machine/live-service rehearsal. |

Personalization plus System Evaluation account for **35%** of the stated rubric. A visual redesign alone cannot close those gaps. Visual extraction and exact-source navigation also matter to the grounding category. The visual prerequisite-flow map is optional; organizing prerequisites in the knowledge base is separately required.

## 2. Fresh checks that passed

| Check | Observed result | Boundary |
| --- | --- | --- |
| Seven existing suites | All passed: retrieval/PDF, quality, quiz-focus, frontend, answerability, source scope, learner journey | Primarily synthetic fixtures and stubbed models; not a real-course accuracy benchmark. |
| Real PDF upload HTTP | 201; original two-page overview PDF processed, with page labels | It produced 181 fragments, including a preview of just “Multimodal”; successful parsing is not good chunking. |
| Generated standard PPTX upload HTTP | 201; one extracted slide passage | Created in memory using the installed python-pptx library, not added as a runtime dependency. One clean text slide is not a representative deck/diagram test. |
| Real local speech-to-text HTTP | 201; fresh synthetic 12.48-second spoken clip produced three timed cues | Approximately 12.749 seconds for this one local request; not a performance benchmark or proof of noisy/long-lecture accuracy. |
| Transcript topic output | One candidate section and retained source ID/times | Label “Resource allocation fundamentals” missed the more specific cycle/deadlock focus. Topic completeness is not proven. |
| Empty-source browser state | Asking required source selection rather than pretending to answer | Initial disabled practice controls are still easy to misunderstand. |
| Current browser learner loop | Load samples → ask → related excerpts → explicitly practise → wrong answer → cited revision → follow-up → correct answer | Deterministic source-reading mode, not live model generation. |
| Progress on refresh | 1 correct / 2 checks survived page reload for the same selected set | Sources/checks still live only in server memory; no durable course or multi-session learner model. |
| Source selection | Scope changes clear prior answer/check; source-isolation suites pass | Exact-set filtering also hides prior history when a related source is added/removed. |
| Playlist mapping with fake pages | Two pages merged, unavailable video marked | Confirms pagination/control handling only; not live API credentials or actual lecture-topic extraction. |

The tiny existing demo retrieval check returned hit@1 **1/3**, hit@3 **3/3**, no-match refusal **1/1**. These very small authored cases are not publishable product-quality scores. A no-match refusal count does not test overlap-based unanswerable questions.

## 3. Confirmed defects and gaps

### High: quotes are provenance checks, not truth checks (LT-02/04/05)

Supplied evidence states that a cycle indicates deadlock with one instance of each resource. A deliberately injected answer claimed that cycles always prove deadlock even with multiple instances, while quoting the real source. It returned model_grounded and practiceEligible true. A similarly false quiz key with a real quote was accepted and graded as correct.

These are deliberately constructed outputs, not observations of a live model. They establish that the validator cannot detect this error, not how frequently a model makes it. Neither “supported” self-report nor quote occurrence can be marketed as factual verification. Keep readable evidence and safe fallback, but evaluate adversarial examples and verify assessment keys through appropriate deterministic checks or a reviewed reference bank. No in-app LLM judge is necessary to demonstrate those improvements.

### High: stale quiz can accompany a newer question (LT-23)

A delayed-response simulation starts quiz generation for Question A, then asks Question B in the same source scope. After A completes, the displayed answer belongs to B but the displayed quiz is “Old Question A check”; only one assessment request was made. scopeVersion changes do not protect different learner actions within the same scope. Use an action/request identity, invalidate pending work on every new question, and discard obsolete success/error callbacks.

The existing fake-DOM harness also lacks dataset on created nodes, so rendering options can throw and be caught without the suite asserting a successfully displayed quiz. The audit-only harness supplied dataset to reproduce the actual stale-result behavior. Add explicit displayed-state assertions and browser smoke tests; don't interpret current green tests as full UI coverage.

### High for the central promise: personalization is not implemented to the detailed requirement

Counts and generic correct/incorrect revision text do not form a learner model. The tutor does not receive persistent per-topic learner state or conversational history. There is no cold-start diagnostic, targeted difficulty selection, prerequisite policy or simulated multi-session evaluation. Keep the honest count display, but do not call it diagnosed mastery.

### High/medium: follow-ups can bypass completion and replay (LT-21)

Both direct helper and HTTP probes created a follow-up from an ungraded parent. Repeating the parent request created different new IDs. The route's message says “completed source check,” but it doesn't enforce that condition. Full path history is incomplete, and a model checks only the immediately prior question. Require grading, make parent-to-child creation retry-safe, and retain normalized question/statement history over the path and sessions.

### High for usability and learner continuity: no persistent workspace (LT-08/09/22)

Restarting clears sources, original files and assessment state; practice counts remain in browser storage. Re-uploading changes IDs. Adding one related source changes the exact scope key and can make previous history disappear from view. No source delete/replace control exists. A stable course/topic/attempt identity and local storage are foundations for both returning learners and the required personalization evaluation.

### Medium/high: lecture topics still fall short of the original playlist vision (LT-14/16/17)

The initial user goal was to discover what a lecture actually teaches, even beyond titles/descriptions. Playlist tags still use metadata only and selection only helps open links/fill a title; it does not import video content. Uploaded lecture topics use frequency over fixed groups of four cues, not coherent semantic segments. A probe produced chlorophyll/photosynthesis topic terms that were absent from the 360-character displayed evidence preview, although present later in the transcript group. Retain expandable full evidence and test coverage/boundaries on a real lecture. Arbitrary public YouTube transcription remains absent; do not promise it or scrape a third-party summarizer as a substitute for an authorized content path.

### Medium: retrieval/chunking and generic “concepts” (LT-03/11/18)

A literal mutex query returned a passage; “How do locks guarantee exclusivity?” returned none. A 9,000-character unpunctuated paragraph became one 9,000-character chunk despite the nominal 700-character target. The real overview PDF produced excessively small fragments. Connections rank repeated words, not subject-level equivalence. Measure misses, normalize text/chunk structure, add contextual adjacency and choose retrieval improvements from a reviewed test set.

### Medium: invalid inputs and noisy failures (LT-13/24/29)

The topic mapper accepted 99:99:99.000 → 00:00:01.000. Malformed JSON returned HTTP 500 rather than a useful input error. A corrupt PDF also returned 500 and exposed a Python command/traceback and machine-local paths. Validate cue ranges/order/formats and file content; return safe bounded 4xx messages while keeping useful diagnostics private. Upload-job cancellation/queueing and long-file resource bounds remain code-review risks, not load-tested failures in this audit.

### Medium: interaction and presentation issues (LT-25/26/32)

- The desktop visual style is cohesive; don't throw it away. Improve task hierarchy and readability instead.
- A source checkbox rebuilds the list and loses keyboard focus to BODY; reproduced with the Space key.
- After refresh, the page says “No sample material loaded” despite sample sources being present and selected.
- “Coffman conditions” has no match in the authored demo corpus. “Deadlock handling” retrieves deadlock text without a supplied handling explanation. Sample questions should be supported by the actual active module.
- “Start a 1-minute check” is disabled before a graded result although its wording sounds like a quiz-entry button. Old follow-up labels can persist on disabled buttons.
- Several helper/status labels use roughly 8–10 px CSS text. Some evidence cards are visually dense. Contrast/accessibility conformance was not measured and is not claimed.
- A fresh mobile override attempt still reported innerWidth 1280, not the requested 390. Therefore this audit does **not** claim a new verified mobile pass; earlier mobile notes are historical evidence only. Browser override was reset.
- FEATURE_ROADMAP still reports the older audit status; ARCHITECTURE includes superseded fallback/citation descriptions and a diagram that implies automatic quiz flow from any retrieved excerpt. Consolidate the authoritative current story before submission.

### Release/reproducibility risks (LT-27/28/31)

The latest answerability and quiz-focus changes are uncommitted locally. In particular, tests/answerability.test.js and tests/quiz-focus.test.js are untracked although package.json references them. The new documentation is also untracked. A push of only committed history does not include these changes. This audit did not inspect the remote repository or publish anything.

No fresh-machine setup, live answer/quiz generation, live playlist run, scanned PDF, representative diagram deck, long/noisy lecture, or public multi-user deployment was verified. The service is a loopback, single-user prototype; adding public hosting before storage/isolation controls is not a polish task.

## 4. Plan for the strongest submission

Use one permitted, coherent module with real source files. Choose material containing a diagram, a short lecture, a few textbook pages, slide text and a numerical example so each required capability can be demonstrated. Self-created material is permitted by the detailed brief, but labelled samples are not proof of extraction or learning quality.

### Phase A — establish a baseline and fix proven workflow errors

Before claiming improvements, label a small held-out set of roughly 30–50 questions with expected answer/source locations: direct, paraphrased, off-material, overlapping-word negatives, contradictions and diagram-dependent examples. Keep labels distinct from generated responses. Fix same-scope stale results, repeat-safe graded follow-ups, input validation, text/chunk bounds and test-harness blind spots. A pass means the reproduced failures have explicit regressions and the existing learner journey still works.

### Phase B — preserve a real course and evidence trail

Add stable course/source/topic/chunk/attempt identities and local persistence. Design original-file retention intentionally; keep data local with clear removal controls. Implement original PDF page/slide viewing and media seek so citations lead to the actual location, not only extracted text. Verify a restart/reopen resumes the same material and learner record. These choices need privacy-conscious storage, not public accounts or hosting.

### Phase C — demonstrate actual learner adaptation

Use an interpretable per-topic learner-state model with documented parameters, a cold-start diagnostic, difficulty tags and targeted next-question selection. Give the tutor relevant learner state and bounded conversational context. A specific wrong option should lead to a relevant explanation/source/retest, not a generic paragraph. Compare a new learner and learners with different weaknesses across multiple persisted sessions. Estimated mastery and simulated improvements must be labelled as model outputs, not validated human learning gains.

### Phase D — complete a narrow but reliable assessment pipeline

Implement scoped multi-question assessments, short answers and numerical questions where the selected module supports them, plus a topic-level report. Use deterministic numeric/rule checks and a reviewed reference bank where possible; preserve source evidence and uncertainty for generated material. Store difficulty, references and question fingerprints. Check key correctness, ambiguous distractors and repetition across sessions. Don't add an internal judge as a shortcut to unproven correctness.

### Phase E — close visual and lecture-understanding requirements

Extract and use a real figure/diagram from the chosen PDF/PPTX, preserving its location and an inspectable image/evidence record. Test a question that cannot be answered from surrounding text alone. Upgrade transcript segmentation and full evidence inspection; measure topic coverage and timestamp usefulness. Keep metadata-based playlists clearly separate. Automatic YouTube content ingestion can remain a separately decided enhancement; it is not a replacement for the mandatory multimodal and learner-model work.

### Phase F — evaluate, polish and rehearse

Run the framework-based evaluation required by the brief outside the learner-facing app. Report faithfulness, answer relevancy, context precision/recall, refusal outcomes and failures on the labelled test set. Add simulated multi-session learner traces, estimated mastery changes and question repetition rate. Use controlled comparisons, not hand-picked success screenshots or perfect scores from training examples.

Then simplify the UI around “choose course → study → practise → revisit,” improve readable text/disabled-state guidance/keyboard behavior, and verify real mobile/zoom layouts. Reconcile README, roadmap, architecture and demo speech. Review/stage the latest files, test a fresh clone, rehearse live services with controlled cost, and record a 3–10 minute demonstration of the working system. Do not promise a prize or fabricate an overall readiness percentage.

## 5. Submission and definition of done

The local submission guidelines require a Devpost description, a public GitHub repository with setup/prerequisites/run instructions, a public or unlisted (not private) 3–10 minute YouTube demo with English audio/subtitles, and actual team members added using real full names. This audit did not verify the deadline, remote publication, video or Devpost state.

Call the final version refined only when:

1. Each detailed required capability has a working example or an explicitly disclosed shortfall; no claim silently relies on an optional/future feature.
2. A new learner can complete ingestion, original-source inspection, assessment, targeted revision and a second session without developer intervention.
3. Correctness, abstention, repetition and adaptive behavior have evaluated examples and retained failures.
4. The committed repository reproduces the tested working tree, and a clean setup has been rehearsed.
5. The demo shows real processing and observed outputs, differentiating samples, model output, deterministic checks and simulated learner results.

The immediate next implementation should be **same-scope request identity + completed/idempotent follow-ups**, followed by stable local course/learner storage. Establish the evaluation baseline in parallel as development work, not as another runtime product feature. This is a stronger route than another broad UI redesign or more unverified features.

## Reproduction material

Audit-only scripts are under `D:\projects\Multimodal AI hackathon\tmp\final-audit\`: probes.js, frontend-race.js, file-smoke.js, media-smoke.js and read-briefs.js. They are not installed as app features. Model probes inject deliberately fake outputs; HTTP probes open only temporary loopback servers. File/media scripts need an explicitly supplied isolated preview URL and must not target the user's live corpus. The synthetic WAV is generated speech, not a real course lecture. The existing seven suite commands remain in package.json.
