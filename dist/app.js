let selected = null;
function loadMastery() {
  try {
    const value = JSON.parse(localStorage.getItem("learntrace.progress.v2") || "{}");
    if (!value || Array.isArray(value) || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v && Number.isInteger(v.attempts) && Number.isInteger(v.correct) && v.attempts > 0 && v.correct >= 0 && v.correct <= v.attempts));
  } catch { return {}; }
}
function saveMastery() { try { localStorage.setItem("learntrace.progress.v2", JSON.stringify(mastery)); } catch { /* Storage may be unavailable. */ } }
let mastery = loadMastery();
let serverReady = false;
let activeAssessment = null;
let activeStudyPath = null;
let assessmentLoading = false;
const gradedIds = new Set();
let playlistItems = [];
const selectedPlaylistVideos = new Set();

async function refreshServerStatus() {
  try {
    const status = await fetch("/api/status").then(response => response.json());
    serverReady = Boolean(status.retrievalReady);
    const tutorState = status.modelReady ? `model tutor ready (${status.modelName})` : "evidence-only tutor mode";
    document.querySelector("#server-status").textContent = `${status.chunks} source passages · ${status.modelReady ? "AI tutor configured" : "Source excerpt mode"}`;
    document.querySelector("#source-count").textContent = String(status.chunks);
    const message = document.querySelector("#ingest-status");
    message.textContent = status.chunks ? `${status.chunks} chunks are ready for new questions.` : "Server connected. Add a source to create real evidence chunks.";
    message.className = "ingest-status ready";
    if (!playlistItems.length) { const playlistStatus = document.querySelector("#playlist-status"); playlistStatus.textContent = status.playlistReady ? "Server ready. Paste a public playlist URL to map its accessible video metadata." : "Configure the server-side YouTube key to map a public playlist."; playlistStatus.className = "playlist-status"; }
    await refreshSourceLibrary();
  } catch { serverReady = false; document.querySelector("#server-status").textContent = "Server unavailable · open LearnTrace through node server.js"; }
}
function showLiveAnswer(result) {
  document.querySelector("#answer-mode-label").textContent = result.mode === "model_grounded" ? "MODEL-GROUNDED ANSWER" : "EVIDENCE-ONLY ANSWER";
  document.querySelector("#answer-title").textContent = result.mode === "insufficient_evidence" ? "No supported answer found" : "Answer from your source material";
  document.querySelector("#answer-text").textContent = result.answer;
  document.querySelector("#answer .grounded").textContent = `${result.mode.replaceAll("_", " ")} · ${result.evidence.length} retrieved chunks`;
  const citations = document.querySelector("#citations"); citations.innerHTML = "";
  result.evidence.forEach(item => { const citation = document.createElement("button"); citation.type = "button"; citation.className = "citation"; citation.addEventListener("click", () => { const block = document.querySelector(`#evidence-${result.evidence.indexOf(item)}`); block?.scrollIntoView({ behavior: "smooth", block: "center" }); block?.focus(); }); citation.textContent = `▤ ${item.sourceTitle} · ${item.locationLabel}`; citation.title = item.text; citations.append(citation); });
  const panel = document.querySelector("#evidence-panel"); const excerpts = document.querySelector("#evidence-excerpts"); excerpts.innerHTML = "";
  if (result.evidence.length) { result.evidence.forEach((item, index) => { const block = document.createElement("article"); block.className = "evidence-excerpt"; block.id = `evidence-${index}`; block.tabIndex = -1; const heading = document.createElement("strong"); heading.textContent = `${index + 1}. ${item.sourceTitle} · ${item.locationLabel}`; const meta = document.createElement("small"); meta.textContent = `Matching terms: ${item.matchedTerms.join(", ")}`; const body = document.createElement("p"); body.textContent = item.text; block.append(heading, meta, body); excerpts.append(block); }); panel.classList.remove("hidden"); } else { panel.classList.add("hidden"); }
  document.querySelector("#answer-boundary").textContent = result.mode === "model_grounded" ? "The model was instructed to use only the retrieved excerpts shown above." : result.mode === "insufficient_evidence" ? "LearnTrace found no supporting chunk in the material you added, so it did not generate an answer." : "This is a matching excerpt, not a generated explanation. A word match alone does not prove it answers your question.";
  const warning = document.querySelector("#model-warning"); warning.textContent = result.modelWarning || ""; warning.classList.toggle("hidden", !result.modelWarning);
  document.querySelector("#answer").classList.remove("hidden"); document.querySelector("#answer").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderSources(liveSources = null) {
  const grid = document.querySelector("#source-grid"); grid.innerHTML = "";
  const summary = document.querySelector("#source-summary");
  if (liveSources && liveSources.length) {
    summary.textContent = `${liveSources.length} real source${liveSources.length === 1 ? "" : "s"} in this study space`;
    liveSources.forEach(source => {
      const card = document.createElement("article"); const type = document.createElement("span"); type.className = "source-type"; type.textContent = source.type.toUpperCase();
      const title = document.createElement("h3"); title.textContent = source.title;
      const description = document.createElement("p"); description.textContent = `${source.chunks} traceable evidence chunk${source.chunks === 1 ? "" : "s"} ready for tutor answers, checks, and concept connections.`;
      const meta = document.createElement("span"); meta.className = "source-meta"; meta.textContent = source.locations.join(" · ");
      card.append(type, title, description, meta); grid.append(card);
    });
    return;
  }
  summary.textContent = "No sources yet";
  const empty = document.createElement("p"); empty.textContent = "Add your material or load the labelled demo to begin."; grid.append(empty);
}
async function refreshSourceLibrary() {
  if (!serverReady) return;
  try {
    const result = await fetch("/api/sources").then(response => response.json()); renderSources(result.sources);
    if (result.sources.length >= 2 && document.querySelector("#concept-list").classList.contains("hidden")) {
      const status = document.querySelector("#concept-map-status"); status.textContent = "Two or more sources are ready. Build the concept map to reveal shared evidence."; status.className = "concept-map-status";
    }
  } catch { /* The library keeps its local demo state if the server is unavailable. */ }
}
function renderConceptMap(concepts) {
  const list = document.querySelector("#concept-list"); list.innerHTML = "";
  concepts.forEach(concept => {
    const node = document.createElement("details"); node.className = "concept-node";
    const summary = document.createElement("summary"); const title = document.createElement("h3"); title.textContent = concept.label;
    const reason = document.createElement("p"); reason.className = "concept-reason"; reason.textContent = `Why connected: “${concept.matchedTerm}” appears in ${concept.sourceCount} sources.`;
    const count = document.createElement("small"); count.textContent = "View matching evidence across sources →";
    summary.append(title, reason, count); node.append(summary);
    concept.evidence.forEach(item => {
      const evidence = document.createElement("article"); evidence.className = "concept-evidence";
      const heading = document.createElement("strong"); heading.textContent = item.sourceTitle;
      const location = document.createElement("small"); location.textContent = `${item.sourceType} · ${item.locationLabel}`;
      const quote = document.createElement("p"); quote.textContent = `“${item.text}”`;
      evidence.append(heading, location, quote); node.append(evidence);
    });
    const actions = document.createElement("div"); actions.className = "concept-actions";
    const ask = document.createElement("button"); ask.type = "button"; ask.textContent = "Ask tutor"; ask.addEventListener("click", () => { document.querySelector("#question").value = `Explain ${concept.label} using my sources.`; document.querySelector("#question-form").requestSubmit(); });
    const check = document.createElement("button"); check.type = "button"; check.textContent = "Start source check"; check.addEventListener("click", async () => { await loadSourceCheck(concept.label); document.querySelector("#check").scrollIntoView({ behavior: "smooth", block: "center" }); });
    actions.append(ask, check); node.append(actions);
    list.append(node);
  });
  list.classList.toggle("hidden", !concepts.length);
}
async function loadConceptMap() {
  const status = document.querySelector("#concept-map-status");
  if (!serverReady) { status.textContent = "Open LearnTrace through its local server before building a concept map."; status.className = "concept-map-status error"; return; }
  status.textContent = "Finding shared terms across your ingested evidence…"; status.className = "concept-map-status";
  try {
    const response = await fetch("/api/concept-map"); const result = await response.json(); if (!response.ok) throw new Error(result.error);
    renderConceptMap(result.concepts);
    status.textContent = result.concepts.length ? `${result.concepts.length} evidence-backed connections found. Each concept appears in at least two sources.` : "No shared concepts yet. Add at least two sources that discuss overlapping ideas.";
  } catch (error) { status.textContent = error.message; status.className = "concept-map-status error"; }
}
function renderMastery() {
  const items = Object.entries(mastery);
  const list = document.querySelector("#mastery-list"); list.replaceChildren();
  document.querySelector("#overall-score").textContent = items.length ? `${items.length} study topics` : "No checks yet";
  if (!items.length) { const empty = document.createElement("p"); empty.textContent = "Your practice history starts here. Complete a source check to see what to revisit."; list.append(empty); return; }
  items.sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts).forEach(([name, record]) => {
    const row = document.createElement("div"); row.className = "practice-row";
    const label = document.createElement("strong"); label.textContent = name;
    const detail = document.createElement("small"); detail.textContent = `${record.correct} correct / ${record.attempts} checks · ${record.lastCorrect ? "Last check correct" : "Worth revisiting"}`;
    row.append(label, detail); list.append(row);
  });
  saveMastery();
}
function clearAssessment(message = "Ask about your sources to prepare a check.") {
  activeAssessment = null; activeStudyPath = null; selected = null;
  renderOptions([]); document.querySelector("#check-answer").disabled = true;
  document.querySelector("#quiz-question").textContent = message;
  document.querySelector("#quiz-concept").textContent = "Source check";
  document.querySelector("#feedback").classList.add("hidden");
  document.querySelector("#next-title").textContent = "Choose a topic to practise";
  document.querySelector("#next-copy").textContent = "Ask a question or choose a shared concept. Your next step will follow your result.";
  document.querySelector("#next-evidence").classList.add("hidden");
  document.querySelector("#start-check").disabled = true;
}
function renderOptions(values = []) {
  const list = document.querySelector("#options"); list.replaceChildren();
  values.forEach((value, index) => { const button = document.createElement("button"); button.className = "option"; button.dataset.index = String(index); button.textContent = `${String.fromCharCode(65 + index)}. ${value}`; list.append(button); });
  document.querySelectorAll(".option").forEach(button => button.addEventListener("click", () => { document.querySelectorAll(".option").forEach(b => b.classList.remove("selected")); button.classList.add("selected"); selected = Number(button.dataset.index); }));
}
async function loadSourceCheck(focus) {
  if (assessmentLoading) return;
  assessmentLoading = true; clearAssessment("Preparing a question from your source…");
  try {
    const assessment = await api("/api/assessment", { focus });
    showAssessment(assessment, "Practice");
  } catch (error) { clearAssessment(error.message); }
  finally { assessmentLoading = false; }
}
function showAssessment(assessment, label) {
  activeAssessment = assessment; selected = null;
  document.querySelector("#quiz-concept").textContent = `${label}: ${assessment.concept} · ${assessment.generator === "model" ? "AI-written question" : "Source-reading check"} · ${assessment.evidence.sourceTitle}, ${assessment.evidence.locationLabel}`;
  document.querySelector("#quiz-question").textContent = assessment.question;
  document.querySelector("#feedback").classList.add("hidden");
  const button = document.querySelector("#check-answer"); button.textContent = "Check answer"; button.disabled = false;
  renderOptions(assessment.options);
}
async function loadFollowUpCheck() {
  if (!activeStudyPath) return document.querySelector("#check").scrollIntoView({ behavior: "smooth" });
  const button = document.querySelector("#start-check"); button.disabled = true; button.textContent = "Building follow-up check…";
  try {
    const response = await fetch("/api/study-path/follow-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeStudyPath.assessmentId }) });
    const assessment = await response.json(); if (!response.ok) throw new Error(assessment.error);
    showAssessment(assessment, "Follow-up"); activeStudyPath = null;
    document.querySelector("#next-title").textContent = "Follow-up check ready"; document.querySelector("#next-copy").textContent = "This check uses another supported statement or a newly generated question. Inspect its cited passage after answering.";
    document.querySelector("#next-evidence").classList.add("hidden"); button.disabled = false; button.innerHTML = "Go to follow-up check <span>→</span>";
    document.querySelector("#check").scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) { button.disabled = false; button.innerHTML = "Try follow-up again <span>→</span>"; document.querySelector("#next-copy").textContent = error.message; }
}
function updatePlaylistSelection() {
  const count = selectedPlaylistVideos.size; document.querySelector("#playlist-selection").textContent = `${count} lecture${count === 1 ? "" : "s"} selected`;
}
function renderPlaylistItems() {
  const query = document.querySelector("#playlist-filter").value.trim().toLowerCase(); const list = document.querySelector("#playlist-list"); list.innerHTML = "";
  const visibleItems = playlistItems.filter(item => !query || `${item.title} ${item.description} ${item.topics.join(" ")}`.toLowerCase().includes(query));
  visibleItems.forEach(item => {
    const card = document.createElement("article"); card.className = `playlist-item${item.available ? "" : " unavailable"}`;
    if (item.available) { const box = document.createElement("input"); box.type = "checkbox"; box.checked = selectedPlaylistVideos.has(item.videoId); box.setAttribute("aria-label", `Select ${item.title}`); box.addEventListener("change", () => { if (box.checked) { selectedPlaylistVideos.add(item.videoId); [document.querySelector("#media-title"), document.querySelector("#transcript-title")].forEach(title => { if (!title.value) title.value = item.title; }); } else selectedPlaylistVideos.delete(item.videoId); updatePlaylistSelection(); }); card.append(box); }
    const content = document.createElement("div"); const title = document.createElement("h3"); title.textContent = `${item.position}. ${item.title}`; const description = document.createElement("p"); description.textContent = item.description; content.append(title, description);
    item.topics.forEach(topic => { const tag = document.createElement("span"); tag.className = "topic-tag"; tag.textContent = topic; content.append(tag); });
    const evidence = document.createElement("small"); evidence.textContent = item.available ? item.evidenceLabel : "Unavailable item — no selectable public video link"; content.append(evidence);
    if (item.url) { const link = document.createElement("a"); link.href = item.url; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = "Open on YouTube ↗"; content.append(link); }
    card.append(content); list.append(card);
  });
  if (!visibleItems.length) { const empty = document.createElement("p"); empty.textContent = "No mapped lecture matches that filter."; list.append(empty); }
  updatePlaylistSelection();
}
document.querySelector("#playlist-filter").addEventListener("input", renderPlaylistItems);
document.querySelector("#playlist-form").addEventListener("submit", async event => {
  event.preventDefault(); const status = document.querySelector("#playlist-status"); const url = document.querySelector("#playlist-url").value.trim();
  if (!serverReady) { status.textContent = "Open LearnTrace through node server.js before mapping a playlist."; status.className = "playlist-status error"; return; }
  status.textContent = "Mapping public playlist metadata…"; status.className = "playlist-status";
  try { const response = await fetch("/api/playlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); playlistItems = result.items; selectedPlaylistVideos.clear(); document.querySelector("#playlist-results").classList.remove("hidden"); renderPlaylistItems(); status.textContent = `${playlistItems.length} playlist items mapped. Select the lectures you want to study.`; status.className = "playlist-status ready"; }
  catch (error) { status.textContent = error.message; status.className = "playlist-status error"; }
});
function startMediaProgress(status, targetName = "lecture", statusClass = "transcript-status") {
  status.textContent = `Processing ${targetName} locally. Transcription may take several minutes; keep this page open.`; status.className = statusClass;
  return () => {};
}
function friendlyMediaError(error) {
  const message = error?.message || "The media could not be processed.";
  if (/No speech was detected/i.test(message)) return "No clear speech was detected. Try a clip with audible spoken content, or use creator-provided captions.";
  if (/too large/i.test(message)) return "This file is above the 100 MB local-demo limit. Trim the lecture or choose a smaller file.";
  if (/common audio or video/i.test(message)) return "Use MP3, WAV, M4A, MP4, WebM, MOV, or AVI for local transcription.";
  return message;
}
function renderTranscriptTopics(topics, target) {
  const list = document.querySelector(target); list.innerHTML = "";
  topics.forEach(topic => { const card = document.createElement("article"); card.className = "transcript-topic"; const title = document.createElement("h3"); title.textContent = `${topic.section}. ${topic.topicLabel}`; const time = document.createElement("small"); time.textContent = `${topic.start} – ${topic.end} · transcript terms: ${topic.terms.join(", ")}`; const evidence = document.createElement("p"); evidence.textContent = `“${topic.evidence}”`; card.append(title, time, evidence); list.append(card); });
}
document.querySelector("#transcript-form").addEventListener("submit", async event => {
  event.preventDefault(); const status = document.querySelector("#transcript-status"); const file = document.querySelector("#transcript-file").files[0]; const content = file ? await file.text() : document.querySelector("#transcript-text").value; const title = document.querySelector("#transcript-title").value || (file ? file.name : "Untitled lecture transcript");
  if (!serverReady) { status.textContent = "Open LearnTrace through node server.js before mapping a transcript."; status.className = "transcript-status error"; return; }
  if (!content.trim()) { status.textContent = "Attach or paste timed SRT/VTT captions first."; status.className = "transcript-status error"; return; }
  status.textContent = "Finding timestamped topic candidates from the transcript…"; status.className = "transcript-status";
  try { const response = await fetch("/api/transcript-topic-map", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, content }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); renderTranscriptTopics(result.topics, "#transcript-topic-list"); document.querySelector("#transcript-results").classList.remove("hidden"); status.textContent = `${result.topics.length} transcript-grounded topic sections mapped; ${result.added} timestamped chunks are now available for questions.`; status.className = "transcript-status ready"; document.querySelector("#transcript-text").value = ""; document.querySelector("#transcript-file").value = ""; refreshServerStatus(); }
  catch (error) { status.textContent = error.message; status.className = "transcript-status error"; }
});
function bytesToBase64(bytes) { let binary = ""; const size = 8192; for (let index = 0; index < bytes.length; index += size) binary += String.fromCharCode(...bytes.subarray(index, index + size)); return btoa(binary); }
document.querySelector("#media-form").addEventListener("submit", async event => {
  event.preventDefault(); const file = document.querySelector("#media-file").files[0]; const status = document.querySelector("#media-status"); if (!serverReady) { status.textContent = "Open LearnTrace through node server.js before transcribing media."; status.className = "transcript-status error"; return; }
  if (!file) { status.textContent = "Choose a lecture audio or video file first."; status.className = "transcript-status error"; return; }
  if (file.size > 100_000_000) { status.textContent = "Choose media smaller than 100 MB for this local demo."; status.className = "transcript-status error"; return; }
  const title = document.querySelector("#media-title").value || file.name; const finishProgress = startMediaProgress(status, "lecture audio or video");
  try { const bytes = new Uint8Array(await file.arrayBuffer()); const response = await fetch("/api/transcribe-media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, filename: file.name, base64: bytesToBase64(bytes) }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); finishProgress(); renderTranscriptTopics(result.topics, "#media-topic-list"); document.querySelector("#media-results").classList.remove("hidden"); status.textContent = `${result.transcript.length} timed transcript cues and ${result.topics.length} topic sections created locally with ${result.model}. Inspect the evidence text before relying on it.`; status.className = "transcript-status ready"; document.querySelector("#media-file").value = ""; refreshServerStatus(); }
  catch (error) { finishProgress(); status.textContent = friendlyMediaError(error); status.className = "transcript-status error"; }
});
async function api(route, body) {
  const response = await fetch(route, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let result;
  try { result = await response.json(); } catch { throw new Error("The local server did not return a readable response. Check that it is running."); }
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}
document.querySelector("#question-form").addEventListener("submit", async event => {
  event.preventDefault();
  const question = document.querySelector("#question").value.trim(); if (!question) return;
  const button = event.currentTarget.querySelector("button"); if (button.disabled) return;
  const status = document.querySelector("#question-status");
  button.disabled = true; button.textContent = "Finding evidence…"; status.textContent = "";
  clearAssessment();
  try {
    if (!serverReady) throw new Error("The local server is unavailable. Start LearnTrace and refresh this page.");
    const result = await api("/api/ask", { question }); showLiveAnswer(result);
    if (result.evidence.length && result.mode !== "insufficient_evidence") await loadSourceCheck(question);
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; button.textContent = "Find evidence ↗"; }
});
document.querySelectorAll(".suggestions button").forEach(button => button.addEventListener("click", () => {
  document.querySelector("#question").value = button.dataset.question;
  document.querySelector("#question-form").requestSubmit();
}));
document.querySelector("#start-check").addEventListener("click", loadFollowUpCheck);
document.querySelector("#refresh-concept-map").addEventListener("click", loadConceptMap);
document.querySelector("#start-own").addEventListener("click", () => { document.querySelector("#ingest").scrollIntoView({ behavior: "smooth", block: "start" }); window.setTimeout(() => document.querySelector("#source-title").focus(), 350); });
document.querySelector("#start-demo").addEventListener("click", () => { document.querySelector(".demo-card").scrollIntoView({ behavior: "smooth", block: "center" }); document.querySelector("#load-demo").click(); });
document.querySelector("#load-demo").addEventListener("click", async () => {
  const button = document.querySelector("#load-demo"); const status = document.querySelector("#demo-status");
  if (!serverReady) { status.textContent = "Open LearnTrace through its local server to load the guided demo."; return; }
  button.disabled = true; button.textContent = "Loading evidence…"; status.textContent = "Adding clearly labelled sample sources…";
  try {
    const response = await fetch("/api/demo", { method: "POST" }); const result = await response.json(); if (!response.ok) throw new Error(result.error);
    await refreshServerStatus(); await loadConceptMap();
    status.textContent = result.alreadyLoaded ? "Demo evidence is already ready. Open a concept card to continue." : `${result.added} demo evidence chunks are ready. Open a concept card, then ask the tutor or start a check.`;
    button.textContent = "Demo ready"; button.disabled = false; document.querySelector("#concept-map").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { status.textContent = error.message; button.textContent = "Try guided demo again"; button.disabled = false; }
});
document.querySelector("#ingest-form").addEventListener("submit", async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector("button");
  if (button.disabled) return; button.disabled = true;
  const status = document.querySelector("#ingest-status");
  try {
    if (!serverReady) throw new Error("Start the local server before adding material.");
    const file = document.querySelector("#source-file").files[0];
    const title = document.querySelector("#source-title").value.trim() || file?.name || "Pasted source";
    const extension = file?.name.split(".").pop().toLowerCase();
    const media = ["mp3", "wav", "m4a", "mp4", "webm", "mov", "avi"].includes(extension);
    const office = ["pdf", "pptx"].includes(extension);
    if (file && !media && !office && !["txt", "md", "srt", "vtt"].includes(extension)) throw new Error("Choose PDF, PPTX, TXT, MD, SRT, VTT, or a supported audio/video file.");
    if (file && file.size > (media ? 100_000_000 : office ? 12_000_000 : 200_000)) throw new Error("File too large: media limit 100 MB, PDF/slides 12 MB, text 200 KB.");
    status.textContent = media ? "Transcribing locally. This may take several minutes." : "Reading your material…";
    let result;
    if (media || office) {
      const base64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
      result = await api(media ? "/api/transcribe-media" : `/api/ingest-${extension}`, { title, filename: file.name, base64 });
    } else {
      const content = file ? await file.text() : document.querySelector("#source-text").value;
      if (!content.trim()) throw new Error("Choose a file or paste some study material.");
      if (["srt", "vtt"].includes(extension) || content.includes("-->")) result = await api("/api/transcript-topic-map", { title, content });
      else result = await api("/api/ingest", { title, sourceType: document.querySelector("#source-type").value, content });
    }
    await refreshServerStatus();
    if (result.topics) {
      renderTranscriptTopics(result.topics, "#media-topic-list");
      document.querySelector("#media-results").classList.remove("hidden");
      document.querySelector("#lecture-tools").open = true;
    }
    status.textContent = `Added “${title}”: ${result.added} source passages ready. Ask a question below.`; status.className = "ingest-status ready";
    document.querySelector("#source-file").value = ""; document.querySelector("#source-text").value = "";
    document.querySelector("#file-name").textContent = "No file selected";
  } catch (error) { status.textContent = error.message; status.className = "ingest-status error"; }
  finally { button.disabled = false; }
});
document.querySelector("#source-file").addEventListener("change", event => {
  document.querySelector("#file-name").textContent = event.target.files[0]?.name || "No file selected";
});
document.querySelector("#check-answer").addEventListener("click", async () => {
  const feedback = document.querySelector("#feedback");
  if (!activeAssessment || selected === null) { feedback.textContent = "Choose an answer to the current source check."; feedback.classList.remove("hidden"); return; }
  const button = document.querySelector("#check-answer"); if (button.disabled) return;
  const assessment = activeAssessment; const selection = selected; button.disabled = true;
  try {
    const result = await api("/api/assessment/grade", { id: assessment.id, selectedIndex: selection });
    if (activeAssessment?.id !== assessment.id) return;
    document.querySelectorAll(".option").forEach((option, index) => { option.disabled = true; if (index === result.correctIndex) option.classList.add("correct"); if (index === selection && !result.correct) option.classList.add("incorrect"); });
    if (!gradedIds.has(assessment.id)) {
    const key = result.concept;
      const prior = mastery[key] || { attempts: 0, correct: 0 };
      mastery[key] = { attempts: prior.attempts + 1, correct: prior.correct + Number(result.correct), lastCorrect: result.correct };
      gradedIds.add(assessment.id);
    }
    activeStudyPath = result.studyPath;
    feedback.textContent = result.feedback; feedback.classList.remove("hidden");
    document.querySelector("#next-title").textContent = result.correct ? "Try another source check" : `Revisit: ${result.concept}`;
    document.querySelector("#next-copy").textContent = result.studyPath.revisionAction;
    const evidence = document.querySelector("#next-evidence"); evidence.textContent = `${result.evidence.sourceTitle} · ${result.evidence.locationLabel} — “${result.evidence.text}”`; evidence.classList.remove("hidden");
    document.querySelector("#start-check").textContent = "Try a follow-up →"; document.querySelector("#start-check").disabled = false;
    button.textContent = "Result saved"; renderMastery();
  } catch (error) { feedback.textContent = error.message; feedback.classList.remove("hidden"); button.disabled = false; }
});
document.querySelector("#reset-progress").addEventListener("click", () => {
  mastery = {}; saveMastery(); renderMastery();
});
renderSources(); renderMastery(); clearAssessment(); refreshServerStatus();
