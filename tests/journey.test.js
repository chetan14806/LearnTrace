const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}
async function waitForServer(baseUrl) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(`${baseUrl}/api/status`); if (response.ok) return; } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw lastError || new Error("Timed out waiting for the LearnTrace server.");
}
async function request(baseUrl, path, method = "GET", body) {
  const response = await fetch(`${baseUrl}${path}`, body === undefined ? { method } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  assert(response.ok, `${method} ${path} failed: ${payload.error || response.status}`);
  return payload;
}

(async () => {
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), OPENAI_API_KEY: '', YOUTUBE_API_KEY: '' }, stdio: "ignore" });
  try {
    await waitForServer(baseUrl);
    const landing = await fetch(baseUrl).then(response => response.text());
    assert.match(landing, /Bring your own material—or see the full loop in 90 seconds/, "The first-use choices must appear on the landing page.");

    await request(baseUrl, "/api/ingest", "POST", { title: "Graph notes", sourceType: "textbook", content: "Deadlock occurs when processes wait indefinitely for resources. A resource-allocation graph can show a cycle that indicates deadlock." });
    await request(baseUrl, "/api/ingest", "POST", { title: "Graph lecture", sourceType: "transcript", content: "WEBVTT\n\n00:02:00.000 --> 00:02:09.000\nA resource-allocation graph can reveal a deadlock cycle while processes wait for resources." });

    const sources = await request(baseUrl, "/api/sources");
    assert.equal(sources.sources.length, 2, "Two ingested sources should appear in the real source library.");

    const sourceIds = sources.sources.map(source => source.id);
    const sourceQuery = new URLSearchParams(); sourceIds.forEach(id => sourceQuery.append("sourceId", id));
    const map = await request(baseUrl, "/api/concept-map?" + sourceQuery);
    const deadlock = map.concepts.find(concept => concept.matchedTerm === "deadlock");
    assert(deadlock, "Two overlapping sources should create a deadlock connection.");
    assert.match(deadlock.reason, /2 distinct ingested sources/, "The concept card must explain its real matching rule.");
    assert(deadlock.evidence.some(item => item.locationLabel.includes("00:02:00")), "The concept evidence must preserve a lecture timestamp.");

    const answer = await request(baseUrl, "/api/ask", "POST", { question: "How does a graph indicate deadlock?", sourceIds });
    assert(answer.evidence.length > 0, "The tutor must retrieve real evidence before answering.");

    assert.equal(answer.practiceEligible, false, "Retrieval-only mode must not automatically start a quiz.");
    const assessment = await request(baseUrl, "/api/assessment", "POST", { focus: "deadlock resource allocation graph", practiceMode: "source_reading", chunkId: answer.evidence[0].id, sourceIds });
    assert.equal(assessment.options.length, 4, "A concept should create a four-option source check.");
    const grade = await request(baseUrl, "/api/assessment/grade", "POST", { id: assessment.id, selectedIndex: 0, sourceIds });
    assert(grade.studyPath.assessmentId, "Grading should produce an adaptive follow-up path.");
    const followUp = await request(baseUrl, "/api/study-path/follow-up", "POST", { id: grade.studyPath.assessmentId, sourceIds });
    assert.notEqual(followUp.id, assessment.id, "The follow-up should be a new source-backed check.");

    const demo = await request(baseUrl, "/api/demo", "POST");
    assert.equal(demo.alreadyLoaded, false, "The first guided-demo load should add labelled evidence.");
    const repeatedDemo = await request(baseUrl, "/api/demo", "POST");
    assert.equal(repeatedDemo.alreadyLoaded, true, "The guided demo must not duplicate its evidence.");

    console.log("End-to-end learner journey test passed.");
  } finally {
    child.kill();
  }
})().catch(error => { console.error(error); process.exit(1); });
