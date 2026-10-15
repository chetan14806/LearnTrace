const assert = require("assert");
const { chunkText, captionToChunks, readableTopicLabel, transcriptTopicMap, conceptMap, sourceLibrary, demoEvidenceChunks, timestampFromSeconds, captionTextFromCues, retrieve, extractiveAnswer, buildGroundedModelRequest, shouldRequestModel, createAssessment, createFollowUpAssessment, gradeAssessment, playlistIdFromUrl, mapPlaylistItems, pdfToPageChunks } = require("../server");
const corpus = chunkText("Deadlock occurs when processes wait forever for resources. Hold and wait means a process holds one resource while requesting another.\n\nA resource-allocation graph uses process and resource nodes. In a single-instance system, a cycle indicates deadlock.", { title: "Deadlocks notes", sourceType: "transcript", locationPrefix: "Transcript segment" });
assert.equal(corpus.length, 2, "The source should create two traceable chunks.");
const evidence = retrieve("How does a resource allocation graph identify deadlock?", corpus);
assert.equal(evidence[0].locationLabel, "Transcript segment 2", "Retrieval should surface the graph evidence.");
assert.equal(extractiveAnswer("What is a graph?", evidence).mode, "related_evidence", "Word matches alone must not become an established answer.");
assert.equal(playlistIdFromUrl("https://www.youtube.com/playlist?list=PL123"), "PL123");
const playlistPreview = mapPlaylistItems([{ snippet: { position: 0, title: "Deadlocks: Graph Cycles", description: "Resource allocation graphs and detection" }, contentDetails: { videoId: "abc123" } }, { snippet: { position: 1, title: "Private video", description: "" }, contentDetails: {} }]);
assert.equal(playlistPreview[0].topics.includes("deadlocks"), true, "Playlist topics should be derived from public title/description metadata.");
assert.equal(playlistPreview[0].available, true, "Public playlist videos should retain a watch URL.");
assert.equal(playlistPreview[1].available, false, "Unavailable playlist videos must be clearly labelled.");
const captions = captionToChunks("WEBVTT\n\n00:00:05.000 --> 00:00:09.000\nDeadlock requires four conditions.\n\n00:00:10.000 --> 00:00:15.000\nA cycle can reveal deadlock in a resource-allocation graph.", { title: "Lecture 4", sourceType: "transcript" });
assert.equal(captions[1].locationLabel, "00:00:10.000 - 00:00:15.000", "Caption chunks should preserve exact timestamps.");
assert.match(retrieve("what can a cycle reveal?", captions)[0].text, /cycle/i, "Retrieval should work on caption chunks.");
const topicMap = transcriptTopicMap("WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nResource allocation graphs represent processes and resources.\n\n00:00:05.000 --> 00:00:09.000\nA request edge points to a resource.\n\n00:00:10.000 --> 00:00:14.000\nA cycle can indicate a deadlock.\n\n00:00:15.000 --> 00:00:19.000\nDeadlock detection uses the graph cycle.", "Lecture 4");
assert.equal(topicMap[0].start, "00:00:00.000", "Topic-map sections must retain their opening timestamp.");
assert.match(topicMap[0].evidence, /Resource allocation graphs/i, "Topic-map sections must retain transcript evidence.");
assert.equal(readableTopicLabel(["deadlock", "graph", "cycle"]), "Detecting deadlock with resource-allocation graphs", "Topic labels should be readable while grounded in the detected terms.");
assert.match(readableTopicLabel(["queues", "scheduling"]), /^Study focus:/, "Unrecognised terms should use a transparent generic label.");
assert.equal(timestampFromSeconds(65.25), "00:01:05.250", "Media transcription timestamps should be formatted as WebVTT timecodes.");
assert.match(captionTextFromCues([{ start: 0, end: 2.5, text: "A lecture segment." }]), /00:00:00.000 --> 00:00:02.500/, "Transcribed cues should become timestamped captions.");
const connectedConcepts = conceptMap([
  { sourceTitle: "Deadlocks textbook", sourceType: "pdf", locationLabel: "Page 18", text: "Deadlock occurs when processes wait for resources." },
  { sourceTitle: "Deadlocks lecture", sourceType: "transcript", locationLabel: "00:02:00 - 00:02:10", text: "A deadlock can make processes wait for resources." },
  { sourceTitle: "Unrelated notes", sourceType: "text", locationLabel: "Passage 1", text: "Memory allocation needs careful planning." }
]);
assert.equal(connectedConcepts[0].label, "Deadlock", "Concept maps should connect an actual shared source term.");
assert.equal(connectedConcepts[0].sourceCount, 2, "A concept connection must include two distinct sources.");
assert.equal(connectedConcepts[0].matchedTerm, "deadlock", "Concept-map cards should expose the exact matching term.");
assert.match(connectedConcepts[0].reason, /appears in 2 distinct ingested sources/i, "Concept-map explanations must describe the real connection rule.");
assert.equal(connectedConcepts[0].evidence[1].locationLabel, "00:02:00 - 00:02:10", "Concept-map evidence must retain a transcript timestamp.");
const library = sourceLibrary([...corpus, ...captions]);
assert.equal(library.length, 2, "The source library should group chunks under their original sources.");
assert.equal(library.find(source => source.title === "Lecture 4").locations[1], "00:00:10.000 - 00:00:15.000", "The source library should retain source locations.");
const demoChunks = demoEvidenceChunks();
assert.equal(sourceLibrary(demoChunks).length, 3, "The guided demo should load three clearly labelled source types.");
assert(conceptMap(demoChunks).some(concept => concept.label === "Deadlock"), "The guided demo should create a real cross-source deadlock connection.");
const groundedRequest = buildGroundedModelRequest("What indicates deadlock?", evidence);
assert.match(groundedRequest.instructions, /only from the supplied source excerpts/i, "The tutor instruction must restrict the model to evidence.");
assert.match(groundedRequest.input, /resource-allocation graph/i, "The model request must contain retrieved evidence.");
assert.equal(shouldRequestModel(evidence, ""), false, "The tutor must not be called without a server-side API key.");
assert.equal(shouldRequestModel([], "test-key"), false, "The tutor must not be called when retrieval found no evidence.");
assert.equal(shouldRequestModel(evidence, "test-key"), true, "The tutor may be called only with evidence and a server-side key.");
const assessment = createAssessment("resource allocation graph deadlock", corpus);
assert(assessment && assessment.options.length === 4, "A supported source should create a four-option source check.");
assert.match(assessment.evidence.locationLabel, /Transcript segment 2/, "The source check must retain the retrieved citation.");
const assessmentResult = gradeAssessment(assessment.id, assessment.options.findIndex(option => /resource-allocation graph uses/i.test(option)));
assert.equal(assessmentResult.correct, true, "The assessment should grade the directly supported statement as correct.");
assert.match(assessmentResult.studyPath.revisionAction, /fresh source check/i, "Grading should return a concrete revision action.");
assert.throws(() => createFollowUpAssessment(assessment.id), /No new source check/, "When the strongest focused statement is exhausted, do not drift to a weaker statement just to fill another check.");
assert.equal(createAssessment("quantum entanglement", corpus), null, "Unsupported topics must not create an assessment.");
(async () => {
  const pdf = require("./pdf-fixture").samplePdf();
  const pdfChunks = await pdfToPageChunks(pdf, "Original PDF test fixture");
  assert(pdfChunks.some(chunk => chunk.locationLabel.startsWith("Page 1")), "PDF chunks should retain a page citation.");
  assert(pdfChunks.some(chunk => /resource-allocation graph/i.test(chunk.text)), "PDF extraction should recover page text.");
  console.log("Retrieval, PDF-ingestion, and grounding-contract tests passed.");
})().catch(error => { console.error(error); process.exit(1); });
