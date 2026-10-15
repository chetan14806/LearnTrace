# LearnTrace — demo speech and screen-by-screen guide

Prepared 15 October 2026. Rehearse against the version you actually run. This is a presentation script, not evidence that every feature or live integration has been validated.

Scope clarification: there is no LLM judge in LearnTrace. An external review of the code, outputs and website is a separate development activity, not part of the learner experience. The tutor itself can decline to answer from insufficient evidence; that does not require a second judging model.

## Before recording

- Run the submission copy, not the older project folder. In the terminal with your existing environment configuration: `Set-Location 'D:\projects\LearnTrace-submission'`, then `node server.js`. Open the exact URL it prints, usually http://127.0.0.1:4173/.
- If that server is already running, stop it deliberately in its own terminal before restarting. Restarting clears in-memory uploads and quizzes: keep the original files and re-add them. Do not expose keys or terminal history in the recording. Environment variables must be configured in the launching terminal; `.env` files are not automatically loaded.
- Refresh the page. Confirm that the question area has source-selection checkboxes. If it says selection needs a backend restart, you are still using an older server.
- Have a permitted short text-based PDF, a small PPTX, and a clear 15–30 second English audio/video clip about the same topic. Check them beforehand. Avoid scanned PDFs and image-only slides: OCR and visual interpretation are not implemented.
- Process the longer clip before recording if needed, and say that you preprocessed it. Whisper can take minutes on CPU and may download its model on first use. Never fake instant transcription with an edited wait.
- Choose one course and a question you have personally checked against its passages. For the authored sample module, use: “How does a resource-allocation graph help detect deadlock?”
- Decide which mode is actually working: source-excerpt mode works without an AI key; a configured key alone does not prove live AI calls succeed. Read the visible answer and quiz mode before describing it.
- Use a separate browser profile/session for a clean recording if desired. Do not erase your real practice history just to prepare a demo.
- No credentials, payments, publication, or submission are performed by this document.

## Main speech — about 6–7 minutes including short interactions

The timing is a guide, not a requirement from the hackathon. Quoted paragraphs are what you say. Instructions underneath are what you do. Pause for actual results and describe what appears; do not read a success claim if the action fails.

### 0:00–0:35 — The student problem

Show: the LearnTrace home screen.

“A student rarely learns a topic from just one place. The explanation might be in a textbook, the diagram in a slide deck, and the useful example halfway through a recorded lecture. Finding the right part is hard—and reading a convincing AI answer does not tell us whether it came from our course material.

“LearnTrace brings that material into one study space. The loop is simple: choose your material, ask with evidence, practise an idea, and revisit the passage that helps.”

### 0:35–1:25 — Bring real material into the system

Show: Add material. Upload the prepared short PDF or PPTX, using a descriptive title. Wait for the added-passages message. Show its source card.

“I’m adding a real course file. LearnTrace extracts readable text and keeps the page or slide location with each passage. This is what makes the answer traceable later: it is not just a document title attached to a response.

“The same uploader accepts notes, timed captions, and permitted audio or video files. For a recording, we transcribe the speech locally and keep the timestamps. That is audio understanding through transcription—not analysis of the video frames.”

If demonstrating samples instead of a real file, replace those lines with:

“For this walkthrough I’m loading clearly labelled, authored sample passages. They go through the normal retrieval and practice flow. Their page, slide and timestamp labels are illustrative; this sample does not prove extraction from original files.”

### 1:25–1:55 — Choose what is allowed to contribute

Show: source-selection panel above the question. Check only the relevant course sources. If showing isolation, uncheck an unrelated source.

“Here I choose the material for this study task. Having another course in the library does not mean it should influence this answer. The selection is enforced by the server before retrieval and is also used for connections, quizzes and follow-ups.

“Each upload has its own ID, so two files called Week One remain separate. Changing the selection also clears the previous answer and check.”

### 1:55–2:45 — Ask, then inspect the evidence

Show: type your prepared question and click Find evidence. Read the actual mode label. Click a citation to focus its displayed excerpt.

If the response is a source excerpt, say:

“This run is in related-passages mode. The system retrieves matching text, but has not established that it answers my question. I can inspect it and explicitly choose to practise reading a passage. It does not automatically create a quiz from this unanswered question.”

If the response is genuinely model-generated, say instead:

“In this run, the tutor receives my question and the retrieved passages. It can return an explanation with citations and support quotes, or say that it cannot answer from those excerpts. The application checks that the quotes exist. That is not independent factual verification, so I still inspect the support.”

Continue in either mode:

“I’m opening the supporting passage and comparing it with the response. Here is the original location. This is the evidence trail a learner can inspect, rather than just trusting the tone of the answer.”

Operator note: citation buttons focus an excerpt on this page. Do not say they open the original PDF page or play the original video; that behavior is not implemented.

### 2:45–3:15 — Connect the same idea across sources

Show: select at least two related sources, build the concept map, then expand one concept. Changing selection clears earlier answers/checks, so use Start source check from this concept for the next scene.

“The connections view shows terms that occur in more than one selected source. I can open this card to compare the textbook passage, slide text and lecture transcript.

“These are shared-term connections with visible evidence. We are not claiming that the system has built a complete semantic knowledge graph.”

### 3:15–4:25 — Show a real quiz, mistake and follow-up

Show: click Start source check inside the expanded concept, or Practise this passage beside an excerpt. A tutor answer that passes the response contract can prepare a check automatically; related passages or insufficient-evidence responses do not. Scroll to Practise an idea.

“Now I can practise this topic. The question is generated from a selected source passage.”

Read the visible quiz label and choose the matching sentence:

- Source-reading check: “This is the transparent fallback: it asks me to identify a supported statement. It is a reading check, not a deep measure of understanding.”
- AI-written question: “This is a model-written question. The evidence remains inspectable, and its correctness still needs review; the current validation does not independently prove factual accuracy.”

Show: choose an option you have checked is wrong, then click Check answer. Do not assume the answer letter: option order can vary.

“I’ll deliberately choose a wrong answer. Now the system grades this attempt, shows the supported statement and points me back to the exact passage to revisit.”

Show: read the passage, click Try a follow-up, and answer the new question. If the new passage differs, point to its location.

“After revising, I can try a follow-up. In this example it uses another supporting passage. My practice history now records the actual attempts. These counts are saved in this browser; they are not a predicted exam score or a validated mastery percentage.”

If the follow-up reports exhausted evidence, say: “We have reached the available statements in this material. The system needs more evidence rather than promising endless fresh questions.”

### 4:25–5:15 — Lecture topics and the YouTube distinction

Show: Lecture explorer → Find topics in a lecture recording. Show the prepared recording's completed topic output and a timed evidence excerpt. Optionally upload a very short fresh clip if latency allows.

“Students also want to know which part of a lecture they need. LearnTrace transcribes uploaded lecture audio and groups transcript passages into timestamped topic candidates. A learner can inspect the actual words behind a suggestion.

“These are suggestions from the transcript, not a guarantee that every topic has been identified. Speech recognition can make mistakes. The current version does not see slide diagrams or video frames.”

Show: the optional YouTube playlist panel only if this integration has actually been rehearsed successfully. Otherwise leave it collapsed and describe the boundary verbally.

“Playlist discovery is a separate feature. It lists available titles and descriptions and lets students filter or select lectures to open on YouTube. It does not automatically transcribe the videos or prove what every lecture teaches. Transcript-grounded topics currently require an uploaded recording or timed captions.”

### 5:15–5:55 — Explain the architecture simply

Show: a relevant evidence panel or the source library, not a credential-filled terminal.

“Underneath, the pipeline is extraction or transcription, followed by small passages with source locations. We filter those passages to the chosen material, then rank them using BM25, which matches words. An optional language model writes an explanation from the retrieved passages; without it, we show the excerpts.

“The practice loop uses source passages too. The important distinction is that retrieval finds candidates—it does not automatically prove that a passage answers the question.”

### 5:55–6:30 — Honest limits and close

Show: source selection and one inspected evidence passage.

“This is a working local, single-user prototype. We have verified the source-selection and practice workflow, including grading, revision and follow-ups. We are not claiming perfect answers or validated learning outcomes.

“Our next reliability work is stronger answerability checks, better retrieval for paraphrases, and verification of generated answers and questions. Sources currently clear when the server restarts, while practice history is browser-local.

“LearnTrace turns scattered course material into an inspectable study loop: find the evidence, check an idea, and return to the part that helps. That is what we want students to spend less time searching for—and more time learning from.”

## When practice buttons look inactive

The required sequence is:

1. Add material or Load sample module.
2. On the updated backend, check the intended source selection.
3. Ask a question and inspect the result. If it shows related passages, click Practise this passage beside one excerpt. A tutor answer that passes the support-response contract can prepare a check automatically. Alternatively, build a concept map, expand a concept and click Start source check. Connections require at least two related sources; passage practice can use just one.
4. Scroll to Practise an idea, select an answer option and click Check answer.
5. Read the feedback. The next-step card now enables Try a follow-up.
6. Click it, answer the follow-up and inspect the updated counts.

Before a quiz exists, Check answer is deliberately disabled. Before a graded result exists, the next-step card is deliberately disabled. Merely having sources in the library does not create a quiz. Clear practice history only clears stored attempts; it is not a quiz-start button.

If it still does not work: capture the visible error, check the exact running URL, confirm the backend is connected and the selection is valid, then check whether the question retrieved any evidence. Do not repeatedly click or claim an empty result is successful. After restarting the server, refresh and re-add sources; old assessment IDs expire.

Known usability issue: the initial next-step label sounds like a start button although it is disabled until grading. After switching checks, an old follow-up label can remain on the disabled button. These confusing labels are not proof of a broken API; they should be improved in a UI pass.

## Short answers for judges

**Is this RAG?** “It retrieves passages from chosen sources before optional generation. The current retriever is lexical BM25, not an embedding-based semantic retriever.”

**What is adaptive?** “The next action depends on the last check: revisit supporting evidence after a miss, or practise again after a correct response. This is a lightweight revision loop, not a validated adaptive-learning model.”

**Does a timestamp play the video?** “Not currently. It preserves the transcript location; source-file playback/navigation is future work.”

**Can you understand any YouTube link?** “Not in this version. Playlist metadata discovery and transcript-grounded lecture analysis are separate, explicitly labelled features.”

**What has actually been tested?** “Automated retrieval/PDF, quality-contract, frontend, source-isolation HTTP and learner-journey suites pass. A real browser test also exercised wrong-answer grading, cited revision, follow-up generation and a correct follow-up. That browser test disabled external services; it does not establish live model quality.”

**What happens with an unsupported question?** “Related word matches no longer become an established answer or automatic quiz. The tutor can report insufficient evidence; malformed or unavailable responses fall back safely. However its support decision is self-reported, and real quotations alone do not prove that it answered correctly. Semantic answerability still needs a reviewed real-course evaluation.”

**Can I use it with my whole class?** “The current app is local and single-user. Accounts, durable source storage and production multi-user security are not implemented.”

## Never say these without new evidence

- “Zero hallucinations,” “100% accurate,” or a retrieval score presented as real-course accuracy.
- “We verify every generated question,” “semantic understanding,” or “full multilingual support.”
- “It watches the whole video,” “reads diagrams,” or “automatically understands every YouTube lecture.”
- “It knows your mastery,” “improves exam scores,” or “personalizes using a trained learner model.”
- “All integrations are working live” when only configuration or stub tests were checked.

For a stronger final submission, rehearse the same loop with real, permitted course files and manually reviewed questions. Keep the sample demo as a clearly labelled fallback, not a substitute for extraction evidence.
