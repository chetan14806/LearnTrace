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
let assessmentRequest = 0;
let studyAction = 0;
// Only the latest learner action owns the answer, check and revision UI.
function beginStudyAction() {
  studyAction += 1;
  assessmentRequest += 1;
  assessmentLoading = false;
  const button = document.querySelector('#question-form')?.querySelector('button');
  if (button) { button.disabled = false; button.textContent = 'Find evidence ↗'; }
  return studyAction;
}
function isCurrentStudyAction(action, version) { return action === studyAction && version === scopeVersion; }
const gradedIds = new Set();
let playlistItems = [];
const selectedPlaylistVideos = new Set();


let supportsSourceScope = false;
let librarySources = [];
let scopeVersion = 0;
let selectedSourceIds = new Set();
try {
  const saved = JSON.parse(localStorage.getItem("learntrace.activeSources") || "[]");
  if (Array.isArray(saved)) selectedSourceIds = new Set(saved.filter(id => typeof id === "string"));
} catch { /* A new selection can always be made. */ }
function scopeKey() { return JSON.stringify([...selectedSourceIds].sort()); }
function sourceScope() {
  if (!supportsSourceScope) return {};
  if (!selectedSourceIds.size) throw new Error("Choose at least one source above before asking or practising.");
  return { sourceIds: [...selectedSourceIds].sort() };
}
function chooseSources(ids) {
  const next = new Set(ids);
  if (JSON.stringify([...next].sort()) !== scopeKey()) {
    selectedSourceIds = next; scopeVersion += 1; beginStudyAction();
    try { localStorage.setItem("learntrace.activeSources", JSON.stringify([...next])); } catch {}
    clearAssessment();
    document.querySelector("#answer")?.classList.add("hidden");
    renderConceptMap([]);
    const mapStatus = document.querySelector("#concept-map-status");
    if (mapStatus) mapStatus.textContent = "Selection changed. Rebuild connections using the selected material.";
  }
  renderSourceSelection(); renderMastery();
}
function renderSourceSelection() {
  const list = document.querySelector("#scope-options");
  const summary = document.querySelector("#scope-summary");
  if (!list || !summary) return;
  list.replaceChildren();
  if (!supportsSourceScope) {
    summary.textContent = "Source selection becomes available after the backend is restarted";
    return;
  }
  const selected = librarySources.filter(source => selectedSourceIds.has(source.id));
  summary.textContent = selected.length ? `Studying ${selected.length} source${selected.length === 1 ? "" : "s"}: ${selected.map(source => source.title).join(", ")}` : "Choose which material to study";
  if (!librarySources.length) {
    const empty = document.createElement("p"); empty.textContent = "Add a source or load the sample module to begin."; list.append(empty); return;
  }
  librarySources.forEach(source => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = selectedSourceIds.has(source.id);
    checkbox.addEventListener("change", () => {
      const ids = new Set(selectedSourceIds);
      if (checkbox.checked) ids.add(source.id); else ids.delete(source.id);
      chooseSources([...ids]);
    });
    const title = document.createElement("span"); title.textContent = `${source.isDemo ? "Sample · " : ""}${source.title}`;
    const preview = document.createElement("small"); preview.textContent = source.preview || `${source.type} · ${(source.locations || []).join(", ")}`;
    const text = document.createElement("div"); text.append(title, preview);
    label.append(checkbox, text); list.append(label);
  });
}
function adoptUploadedSources(result) {
  if (!supportsSourceScope || !result.addedSourceIds?.length) return;
  const own = librarySources.filter(source => !source.isDemo && selectedSourceIds.has(source.id)).map(source => source.id);
  chooseSources([...own, ...result.addedSourceIds]);
}

let statusRequest = null;
let connectionDiagnostic = "";
async function refreshServerStatus() {
  if (statusRequest) return statusRequest;
  statusRequest = (async () => {
    let status;
    try {
      status = await api("/api/status", undefined, { timeoutMs: 8000 });
      if (!status || typeof status.retrievalReady !== "boolean") throw new Error("GET /api/status returned an unexpected status format.");
      if (!status.retrievalReady) throw new Error("The backend responded, but retrieval is not ready yet.");
    } catch (error) {
      serverReady = false;
      connectionDiagnostic = error.message;
      const badge = document.querySelector("#server-status");
      if (badge) badge.textContent = connectionDiagnostic;
      return null;
    }
    // Backend readiness depends only on its response, never optional display elements.
    serverReady = true; connectionDiagnostic = "";
    supportsSourceScope = status.sourceScopingReady === true;
    const badge = document.querySelector("#server-status");
    if (badge) badge.textContent = `${status.chunks} source passages · ${status.modelReady ? "AI tutor configured" : "Source excerpt mode"}`;
    const count = document.querySelector("#source-count");
    if (count) count.textContent = String(status.chunks);
    const message = document.querySelector("#ingest-status");
    if (message) {
      message.textContent = status.chunks ? `${status.chunks} chunks are ready for new questions.` : "Server connected. Add a source to create real evidence chunks.";
      message.className = "ingest-status ready";
    }
    const playlistStatus = document.querySelector("#playlist-status");
    if (playlistStatus && !playlistItems.length) {
      playlistStatus.textContent = status.playlistReady ? "Server ready. Paste a public playlist URL to map its accessible video metadata." : "Backend connected. Playlist mapping needs YOUTUBE_API_KEY in the server terminal.";
      playlistStatus.className = "playlist-status";
    }
    await refreshSourceLibrary();
    return status;
  })();
  try { return await statusRequest; }
  finally { statusRequest = null; }
}
async function ensureServerReady() {
  const status = await refreshServerStatus();
  if (!status) throw new Error(connectionDiagnostic || "Backend status could not be checked.");
  return status;
}
function showLiveAnswer(result) {
  document.querySelector("#answer-mode-label").textContent = result.mode === "model_grounded" ? "AI ANSWER · REVIEW THE SUPPORT" : "RETRIEVED MATERIAL · NOT A VERIFIED ANSWER";
  document.querySelector("#answer-title").textContent = result.mode === "insufficient_evidence" ? "No supported answer established" : result.mode === "model_grounded" ? "Explanation from retrieved material" : "Related passages—not an established answer";
  document.querySelector("#answer-text").textContent = result.answer;
  document.querySelector("#answer .grounded").textContent = `${result.mode.replaceAll("_", " ")} · ${result.evidence.length} retrieved chunks`;
  const citations = document.querySelector("#citations"); citations.innerHTML = "";
  result.evidence.forEach(item => { const citation = document.createElement("button"); citation.type = "button"; citation.className = "citation"; citation.addEventListener("click", () => { const block = document.querySelector(`#evidence-${result.evidence.indexOf(item)}`); block?.scrollIntoView({ behavior: "smooth", block: "center" }); block?.focus(); }); citation.textContent = `▤ ${item.sourceTitle} · ${item.locationLabel}`; citation.title = item.text; citations.append(citation); });
  const panel = document.querySelector("#evidence-panel"); const excerpts = document.querySelector("#evidence-excerpts"); excerpts.innerHTML = "";
  if (result.evidence.length) { result.evidence.forEach((item, index) => { const block = document.createElement("article"); block.className = "evidence-excerpt"; block.id = `evidence-${index}`; block.tabIndex = -1; const heading = document.createElement("strong"); heading.textContent = `${index + 1}. ${item.sourceTitle} · ${item.locationLabel}`; const meta = document.createElement("small"); meta.textContent = `Matching terms: ${item.matchedTerms.join(", ")}`; const body = document.createElement("p"); body.textContent = item.text; block.append(heading, meta, body);
    const quotes = (result.support || []).filter(support => support.excerpt === index + 1);
    quotes.forEach(support => { const quote = document.createElement("p"); quote.textContent = `AI-selected support (verify relevance): “${support.quote}”`; block.append(quote); });
    if (result.answerId && item.id) { const practice = document.createElement("button"); practice.type = "button"; practice.textContent = "Practise this passage"; practice.addEventListener("click", async () => { if (await loadSourceCheck(item.text.slice(0, 100), { practiceMode: "source_reading", chunkId: item.id })) document.querySelector("#check")?.scrollIntoView({ behavior: "smooth", block: "center" }); }); block.append(practice); }
    excerpts.append(block); }); panel.classList.remove("hidden"); } else { panel.classList.add("hidden"); }
  document.querySelector("#answer-boundary").textContent = result.mode === "model_grounded" ? "The AI assessed these excerpts as sufficient and supplied quotes found in them. Quote matching does not independently prove that every claim is supported. Review the evidence." : "Retrieved matches are candidates, not proof of an answer. No automatic check is created for an unassessed or unsupported question. Passage practice is a separate reading exercise.";
  const warning = document.querySelector("#model-warning"); warning.textContent = result.modelWarning || ""; warning.classList.toggle("hidden", !result.modelWarning);
  document.querySelector("#answer").classList.remove("hidden"); document.querySelector("#answer").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderSources(liveSources = null) {
  const grid = document.querySelector("#source-grid"); if (!grid) return; grid.innerHTML = "";
  const summary = document.querySelector("#source-summary");
  if (liveSources && liveSources.length) {
    if (summary) summary.textContent = `${liveSources.length} loaded source${liveSources.length === 1 ? "" : "s"} in this study space`;
    liveSources.forEach(source => {
      const card = document.createElement("article"); const type = document.createElement("span"); type.className = "source-type"; type.textContent = source.type.toUpperCase();
      const title = document.createElement("h3"); title.textContent = source.title;
      const description = document.createElement("p"); description.textContent = source.preview || `${source.chunks} source passages ready for questions and practice.`;
      const meta = document.createElement("span"); meta.className = "source-meta"; meta.textContent = source.locations.join(" · ");
      card.append(type, title, description, meta);
      if (supportsSourceScope && source.id) {
        const use = document.createElement("button"); use.type = "button"; use.className = "use-source"; use.textContent = "Study this source →";
        use.addEventListener("click", () => { chooseSources([source.id]); document.querySelector("#ask")?.scrollIntoView({ behavior: "smooth", block: "start" }); }); card.append(use);
      }
      grid.append(card);
    });
    return;
  }
  if (summary) summary.textContent = "No sources yet";
  const empty = document.createElement("p"); empty.textContent = "Add your material or load the labelled demo to begin."; grid.append(empty);
}
async function refreshSourceLibrary() {
  if (!serverReady) return;
  try {
    const result = await api("/api/sources");
    librarySources = result.sources;
    if (supportsSourceScope) chooseSources([...selectedSourceIds].filter(id => librarySources.some(source => source.id === id)));
    renderSources(result.sources);
    if (result.sources.length >= 2 && document.querySelector("#concept-list")?.classList.contains("hidden")) {
      const status = document.querySelector("#concept-map-status");
      const count = supportsSourceScope ? selectedSourceIds.size : result.sources.length;
      if (status) { status.textContent = count >= 2 ? "Build the concept map for your selected sources." : "Select at least two sources to find connections between them."; status.className = "concept-map-status"; }
    }
  } catch (error) { const summary = document.querySelector("#source-summary"); if (summary) summary.textContent = `Source library: ${error.message}`; }
}
function renderConceptMap(concepts) {
  const list = document.querySelector("#concept-list"); if (!list) return; list.innerHTML = "";
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
    const check = document.createElement("button"); check.type = "button"; check.textContent = "Start source check"; check.addEventListener("click", async () => { if (await loadSourceCheck(concept.label, concept.evidence[0]?.id ? { practiceMode: "source_reading", chunkId: concept.evidence[0].id } : {})) document.querySelector("#check").scrollIntoView({ behavior: "smooth", block: "center" }); });
    actions.append(ask, check); node.append(actions);
    list.append(node);
  });
  list.classList.toggle("hidden", !concepts.length);
}
async function loadConceptMap() {
  const status = document.querySelector("#concept-map-status");
  try { await ensureServerReady(); } catch (error) { status.textContent = error.message; status.className = "concept-map-status error"; return; }
  status.textContent = "Finding shared terms across your ingested evidence…"; status.className = "concept-map-status";
  try {
    const selected = sourceScope(); const version = scopeVersion;
    const query = new URLSearchParams(); (selected.sourceIds || []).forEach(id => query.append("sourceId", id));
    const result = await api(`/api/concept-map${query.size ? "?" + query : ""}`);
    if (version !== scopeVersion) return;
    renderConceptMap(result.concepts);
    status.textContent = result.concepts.length ? `${result.concepts.length} evidence-backed connections found. Each concept appears in at least two sources.` : "No shared concepts yet. Add at least two sources that discuss overlapping ideas.";
  } catch (error) { status.textContent = error.message; status.className = "concept-map-status error"; }
}
function renderMastery() {
  const items = Object.entries(mastery).filter(([, record]) => !supportsSourceScope || record.scopeKey === scopeKey());
  const list = document.querySelector("#mastery-list"); if (!list) return; list.replaceChildren();
  const overall = document.querySelector("#overall-score"); if (overall) overall.textContent = items.length ? `${items.length} study topics` : "No checks yet";
  if (!items.length) { const empty = document.createElement("p"); empty.textContent = "Your practice history starts here. Complete a source check to see what to revisit."; list.append(empty); return; }
  items.sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts).forEach(([name, record]) => {
    const row = document.createElement("div"); row.className = "practice-row";
    const label = document.createElement("strong"); label.textContent = record.concept || name;
    const detail = document.createElement("small"); detail.textContent = `${record.correct} correct / ${record.attempts} checks · ${record.lastCorrect ? "Last check correct" : "Worth revisiting"}`;
    row.append(label, detail); list.append(row);
  });
  saveMastery();
}
function clearAssessment(message = "Ask about your sources to prepare a check.") {
  activeAssessment = null; activeStudyPath = null; selected = null;
  if (!document.querySelector("#check-answer") || !document.querySelector("#quiz-question") || !document.querySelector("#quiz-concept") || !document.querySelector("#feedback") || !document.querySelector("#next-title") || !document.querySelector("#next-copy") || !document.querySelector("#next-evidence") || !document.querySelector("#start-check")) return;
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
  const list = document.querySelector("#options"); if (!list) return; list.replaceChildren();
  values.forEach((value, index) => { const button = document.createElement("button"); button.className = "option"; button.dataset.index = String(index); button.textContent = `${String.fromCharCode(65 + index)}. ${value}`; list.append(button); });
  document.querySelectorAll(".option").forEach(button => button.addEventListener("click", () => { document.querySelectorAll(".option").forEach(b => b.classList.remove("selected")); button.classList.add("selected"); selected = Number(button.dataset.index); }));
}
async function loadSourceCheck(focus, origin = {}, parentAction) {
  const action = parentAction === undefined ? beginStudyAction() : parentAction;
  if (action !== studyAction) return;
  if (assessmentLoading) return;
  assessmentLoading = true; const version = scopeVersion; const request = ++assessmentRequest; clearAssessment("Preparing a question from your source…");
  try {
    const assessment = await api("/api/assessment", { focus, ...origin, ...sourceScope() });
    if (!isCurrentStudyAction(action, version) || request !== assessmentRequest) return;
    showAssessment(assessment, "Practice");
    return true;
  } catch (error) { if (isCurrentStudyAction(action, version) && request === assessmentRequest) { clearAssessment(error.message); return true; } }
  finally { if (request === assessmentRequest) assessmentLoading = false; }
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
  const button = document.querySelector("#start-check"); if (button.disabled) return;
  const parentId = activeStudyPath.assessmentId;
  const action = beginStudyAction(); const version = scopeVersion;
  button.disabled = true; button.textContent = "Building follow-up check…";
  try {
    const response = await fetch("/api/study-path/follow-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: parentId, ...sourceScope() }) });
    const assessment = await response.json(); if (!response.ok) throw new Error(assessment.error);
    if (!isCurrentStudyAction(action, version)) return;
    showAssessment(assessment, "Follow-up"); activeStudyPath = null;
    document.querySelector("#next-title").textContent = "Follow-up check ready"; document.querySelector("#next-copy").textContent = "This check uses another supported statement or a newly generated question. Inspect its cited passage after answering.";
    document.querySelector("#next-evidence").classList.add("hidden"); button.disabled = false; button.innerHTML = "Go to follow-up check <span>→</span>";
    document.querySelector("#check").scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) { if (isCurrentStudyAction(action, version)) { button.disabled = false; button.innerHTML = "Try follow-up again <span>→</span>"; document.querySelector("#next-copy").textContent = error.message; } }
}
function updatePlaylistSelection() {
  const count = selectedPlaylistVideos.size; document.querySelector("#playlist-selection").textContent = `${count} lecture${count === 1 ? "" : "s"} selected`;
}
function renderPlaylistItems() {
  const query = document.querySelector("#playlist-filter").value.trim().toLowerCase(); const list = document.querySelector("#playlist-list"); list.innerHTML = "";
  const visibleItems = playlistItems.filter(item => !query || `${item.title} ${item.description} ${item.topics.join(" ")}`.toLowerCase().includes(query));
  visibleItems.forEach(item => {
    const card = document.createElement("article"); card.className = `playlist-item${item.available ? "" : " unavailable"}`;
    if (item.available) { const box = document.createElement("input"); box.type = "checkbox"; box.checked = selectedPlaylistVideos.has(item.videoId); box.setAttribute("aria-label", `Select ${item.title}`); box.addEventListener("change", () => { if (box.checked) { selectedPlaylistVideos.add(item.videoId); [document.querySelector("#media-title"), document.querySelector("#transcript-title")].forEach(title => { if (title && !title.value) title.value = item.title; }); } else selectedPlaylistVideos.delete(item.videoId); updatePlaylistSelection(); }); card.append(box); }
    const content = document.createElement("div"); const title = document.createElement("h3"); title.textContent = `${item.position}. ${item.title}`; const description = document.createElement("p"); description.textContent = item.description; content.append(title, description);
    item.topics.forEach(topic => { const tag = document.createElement("span"); tag.className = "topic-tag"; tag.textContent = topic; content.append(tag); });
    const evidence = document.createElement("small"); evidence.textContent = item.available ? item.evidenceLabel : "Unavailable item — no selectable public video link"; content.append(evidence);
    if (item.url) { const link = document.createElement("a"); link.href = item.url; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = "Open on YouTube ↗"; content.append(link); }
    card.append(content); list.append(card);
  });
  if (!visibleItems.length) { const empty = document.createElement("p"); empty.textContent = "No mapped lecture matches that filter."; list.append(empty); }
  updatePlaylistSelection();
}
document.querySelector("#playlist-filter")?.addEventListener("input", renderPlaylistItems);
document.querySelector("#playlist-form")?.addEventListener("submit", async event => {
  event.preventDefault(); const status = document.querySelector("#playlist-status"); const url = document.querySelector("#playlist-url").value.trim();
  try { const readiness = await ensureServerReady(); if (!readiness.playlistReady) throw new Error("Backend connected, but playlist mapping needs YOUTUBE_API_KEY in the terminal running this server."); } catch (error) { status.textContent = error.message; status.className = "playlist-status error"; return; }
  status.textContent = "Mapping public playlist metadata…"; status.className = "playlist-status";
  try { const result = await api("/api/playlist", { url }); playlistItems = result.items; selectedPlaylistVideos.clear(); document.querySelector("#playlist-results").classList.remove("hidden"); renderPlaylistItems(); status.textContent = `${playlistItems.length} playlist items mapped. Select the lectures you want to study.`; status.className = "playlist-status ready"; }
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
document.querySelector("#transcript-form")?.addEventListener("submit", async event => {
  event.preventDefault(); const status = document.querySelector("#transcript-status"); const file = document.querySelector("#transcript-file").files[0]; const content = file ? await file.text() : document.querySelector("#transcript-text").value; const title = document.querySelector("#transcript-title").value || (file ? file.name : "Untitled lecture transcript");
  try { await ensureServerReady(); } catch (error) { status.textContent = error.message; status.className = "transcript-status error"; return; }
  if (!content.trim()) { status.textContent = "Attach or paste timed SRT/VTT captions first."; status.className = "transcript-status error"; return; }
  status.textContent = "Finding timestamped topic candidates from the transcript…"; status.className = "transcript-status";
  try { const result = await api("/api/transcript-topic-map", { title, content }); renderTranscriptTopics(result.topics, "#transcript-topic-list"); document.querySelector("#transcript-results").classList.remove("hidden"); status.textContent = `${result.topics.length} transcript-grounded topic sections mapped; ${result.added} timestamped chunks are now available for questions.`; status.className = "transcript-status ready"; document.querySelector("#transcript-text").value = ""; document.querySelector("#transcript-file").value = ""; await refreshServerStatus(); adoptUploadedSources(result); }
  catch (error) { status.textContent = error.message; status.className = "transcript-status error"; }
});
function bytesToBase64(bytes) { let binary = ""; const size = 8192; for (let index = 0; index < bytes.length; index += size) binary += String.fromCharCode(...bytes.subarray(index, index + size)); return btoa(binary); }
document.querySelector("#media-form")?.addEventListener("submit", async event => {
  event.preventDefault(); const file = document.querySelector("#media-file").files[0]; const status = document.querySelector("#media-status"); try { await ensureServerReady(); } catch (error) { status.textContent = error.message; status.className = "transcript-status error"; return; }
  if (!file) { status.textContent = "Choose a lecture audio or video file first."; status.className = "transcript-status error"; return; }
  if (file.size > 100_000_000) { status.textContent = "Choose media smaller than 100 MB for this local demo."; status.className = "transcript-status error"; return; }
  const title = document.querySelector("#media-title").value || file.name; const finishProgress = startMediaProgress(status, "lecture audio or video");
  try { const bytes = new Uint8Array(await file.arrayBuffer()); const result = await api("/api/transcribe-media", { title, filename: file.name, base64: bytesToBase64(bytes) }); finishProgress(); renderTranscriptTopics(result.topics, "#media-topic-list"); document.querySelector("#media-results").classList.remove("hidden"); status.textContent = `${result.transcript.length} timed transcript cues and ${result.topics.length} topic sections created locally with ${result.model}. Inspect the evidence text before relying on it.`; status.className = "transcript-status ready"; document.querySelector("#media-file").value = ""; await refreshServerStatus(); adoptUploadedSources(result); }
  catch (error) { finishProgress(); status.textContent = friendlyMediaError(error); status.className = "transcript-status error"; }
});
async function api(route, body, { timeoutMs } = {}) {
  const method = body === undefined ? "GET" : "POST";
  if (location.protocol === "file:") throw new Error("Open http://127.0.0.1:4173/ from the running server instead of opening index.html directly.");
  let response;
  try {
    response = await fetch(route, {
      method, cache: "no-store",
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {})
    });
  } catch (error) {
    const reason = /Timeout|Abort/.test(error.name) ? "timed out" : "could not connect";
    throw new Error(`${method} ${route} ${reason} at ${location.origin}. Check that this page uses the port of the running server, then retry.`);
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error(`${method} ${route} returned HTTP ${response.status} without valid JSON. Check that this port serves LearnTrace's Node backend.`); }
  if (!response.ok) throw new Error(`${method} ${route} failed (HTTP ${response.status}): ${result?.error || "Request failed."}`);
  return result;
}
document.querySelector("#question-form")?.addEventListener("submit", async event => {
  event.preventDefault();
  const question = document.querySelector("#question").value.trim(); if (!question) return;
  const button = event.currentTarget.querySelector("button"); if (button.disabled) return;
  const action = beginStudyAction(); const version = scopeVersion;
  const status = document.querySelector("#question-status");
  button.disabled = true; button.textContent = "Finding evidence…"; status.textContent = "";
  clearAssessment();
  document.querySelector("#answer")?.classList.add("hidden");
  try {
    await ensureServerReady();
    if (!isCurrentStudyAction(action, version)) return;
    const result = await api("/api/ask", { question, ...sourceScope() });
    if (!isCurrentStudyAction(action, version)) return;
    showLiveAnswer(result);
    button.disabled = false; button.textContent = "Find evidence ↗";
    if (result.practiceEligible === true) await loadSourceCheck(question, { answerId: result.answerId }, action);
    else clearAssessment("No automatic quiz: support for this question was not established. Inspect an excerpt and choose ‘Practise this passage’, or start from a concept card.");
  } catch (error) { if (isCurrentStudyAction(action, version)) status.textContent = error.message; }
  finally { if (isCurrentStudyAction(action, version)) { button.disabled = false; button.textContent = "Find evidence ↗"; } }
});
document.querySelectorAll(".suggestions button").forEach(button => button.addEventListener("click", () => {
  document.querySelector("#question").value = button.dataset.question;
  document.querySelector("#question-form").requestSubmit();
}));
document.querySelector("#start-check")?.addEventListener("click", loadFollowUpCheck);
document.querySelector("#refresh-concept-map")?.addEventListener("click", loadConceptMap);
document.querySelector("#start-own")?.addEventListener("click", () => { document.querySelector("#ingest").scrollIntoView({ behavior: "smooth", block: "start" }); window.setTimeout(() => document.querySelector("#source-title")?.focus({ preventScroll: true }), 350); });
document.querySelector("#start-demo")?.addEventListener("click", () => { document.querySelector(".demo-card").scrollIntoView({ behavior: "smooth", block: "center" }); document.querySelector("#load-demo").click(); });
document.querySelector("#load-demo")?.addEventListener("click", async () => {
  const button = document.querySelector("#load-demo"); const status = document.querySelector("#demo-status");
  try { await ensureServerReady(); } catch (error) { status.textContent = error.message; return; }
  button.disabled = true; button.textContent = "Loading evidence…"; status.textContent = "Adding clearly labelled sample sources…";
  try {
    const response = await fetch("/api/demo", { method: "POST" }); const result = await response.json(); if (!response.ok) throw new Error(result.error);
    await refreshServerStatus();
    if (supportsSourceScope) chooseSources(result.sources.filter(source => source.isDemo).map(source => source.id));
    await loadConceptMap();
    status.textContent = result.alreadyLoaded ? "Demo evidence is already ready. Open a concept card to continue." : `${result.added} demo evidence chunks are ready. Open a concept card, then ask the tutor or start a check.`;
    button.textContent = "Demo ready"; button.disabled = false; document.querySelector("#concept-map").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { status.textContent = error.message; button.textContent = "Try guided demo again"; button.disabled = false; }
});
document.querySelector("#ingest-form")?.addEventListener("submit", async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector("button");
  if (button.disabled) return; button.disabled = true;
  const status = document.querySelector("#ingest-status");
  try {
    await ensureServerReady();
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
    await refreshServerStatus(); adoptUploadedSources(result);
    if (result.topics) {
      renderTranscriptTopics(result.topics, "#media-topic-list");
      document.querySelector("#media-results").classList.remove("hidden");
      const tools = document.querySelector("#lecture-tools"); if (tools) tools.open = true;
    }
    status.textContent = `Added “${title}”: ${result.added} source passages ready. Ask a question below.`; status.className = "ingest-status ready";
    document.querySelector("#source-file").value = ""; document.querySelector("#source-text").value = "";
    const filename = document.querySelector("#file-name"); if (filename) filename.textContent = "No file selected";
  } catch (error) { status.textContent = error.message; status.className = "ingest-status error"; }
  finally { button.disabled = false; }
});
document.querySelector("#source-file")?.addEventListener("change", event => {
  const filename = document.querySelector("#file-name"); if (filename) filename.textContent = event.target.files[0]?.name || "No file selected";
});
document.querySelector("#check-answer")?.addEventListener("click", async () => {
  const feedback = document.querySelector("#feedback");
  if (!activeAssessment || selected === null) { feedback.textContent = "Choose an answer to the current source check."; feedback.classList.remove("hidden"); return; }
  const button = document.querySelector("#check-answer"); if (button.disabled) return;
  const assessment = activeAssessment; const selection = selected; const action = studyAction; button.disabled = true;
  try {
    const result = await api("/api/assessment/grade", { id: assessment.id, selectedIndex: selection, ...(assessment.sourceIds ? { sourceIds: assessment.sourceIds } : {}) });
    if (action !== studyAction || activeAssessment?.id !== assessment.id) return;
    document.querySelectorAll(".option").forEach((option, index) => { option.disabled = true; if (index === result.correctIndex) option.classList.add("correct"); if (index === selection && !result.correct) option.classList.add("incorrect"); });
    if (!gradedIds.has(assessment.id)) {
      const currentScope = supportsSourceScope ? JSON.stringify(assessment.sourceIds) : "legacy";
      const key = supportsSourceScope ? `${currentScope}::${result.concept}` : result.concept;
      const prior = mastery[key] || { attempts: 0, correct: 0 };
      mastery[key] = { attempts: prior.attempts + 1, correct: prior.correct + Number(result.correct), lastCorrect: result.correct, concept: result.concept, scopeKey: currentScope };
      gradedIds.add(assessment.id);
    }
    activeStudyPath = result.studyPath;
    feedback.textContent = result.feedback; feedback.classList.remove("hidden");
    document.querySelector("#next-title").textContent = result.correct ? "Try another source check" : `Revisit: ${result.concept}`;
    document.querySelector("#next-copy").textContent = result.studyPath.revisionAction;
    const evidence = document.querySelector("#next-evidence"); evidence.textContent = `${result.evidence.sourceTitle} · ${result.evidence.locationLabel} — “${result.evidence.text}”`; evidence.classList.remove("hidden");
    document.querySelector("#start-check").textContent = "Try a follow-up →"; document.querySelector("#start-check").disabled = false;
    button.textContent = "Result saved"; renderMastery();
  } catch (error) { if (action === studyAction && activeAssessment?.id === assessment.id) { feedback.textContent = error.message; feedback.classList.remove("hidden"); button.disabled = false; } }
});
document.querySelector("#reset-progress")?.addEventListener("click", () => {
  mastery = {}; saveMastery(); renderMastery();
});
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
  link.classList.add("active");
}));
renderSources(); renderMastery(); clearAssessment(); refreshServerStatus();
