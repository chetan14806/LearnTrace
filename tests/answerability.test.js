const assert = require('node:assert/strict');
delete process.env.OPENAI_API_KEY;
delete process.env.YOUTUBE_API_KEY;
const { server, chunkText, retrieve, answerFromEvidence, buildGroundedModelRequest, askSelected, scopedAssessment } = require('../server');
const fake = value => async () => ({ ok: true, json: async () => ({ output_text: typeof value === 'string' ? value : JSON.stringify(value) }) });
const text = 'A deadlock occurs when processes wait indefinitely for resources. With one instance of each resource, a cycle indicates deadlock.';
const fixture = chunkText(text, { title: 'OS notes', sourceType: 'textbook' });
const supported = { status: 'supported', answer: 'With one instance of each resource, a cycle indicates deadlock [1].', support: [{ excerpt: 1, quote: 'With one instance of each resource, a cycle indicates deadlock.' }] };
(async () => {
  // Retrieval stays lexical. The answer layer must not treat these matches as proof.
  const negatives = ['What year was deadlock invented?', 'Who discovered deadlock?', 'How does deadlock affect wages?', 'Compare deadlock with photosynthesis.', 'Why does deadlock always improve performance?', 'What is deadlock and who invented it?'];
  for (const question of negatives) {
    const evidence = retrieve(question, fixture); assert(evidence.length > 0);
    const result = await answerFromEvidence(question, evidence);
    assert.equal(result.mode, 'related_evidence'); assert.equal(result.practiceEligible, false);
    assert(!result.answer.includes('Closest source excerpt'));
  }
  let calls = 0; process.env.OPENAI_API_KEY = 'stub-only';
  const empty = await answerFromEvidence('What is photosynthesis?', [], async () => { calls++; });
  assert.equal(empty.mode, 'insufficient_evidence'); assert.equal(calls, 0);
  const evidence = retrieve('cycle deadlock', fixture);
  const request = buildGroundedModelRequest('When is a cycle conclusive?', evidence);
  assert.equal(request.text.format.strict, true);
  assert.match(request.instructions, /ALL parts/);
  let tutorCalls = 0;
  const positive = await answerFromEvidence('When is a cycle conclusive?', evidence, async (...args) => { tutorCalls++; return fake(supported)(...args); });
  assert.equal(tutorCalls, 1, 'Use one tutor response, never a separate judge request');
  assert.equal(positive.practiceEligible, true); assert.equal(positive.answerability.method, 'tutor_self_report');
  assert.deepEqual(positive.support, supported.support);
  // Model stubs test contracts, not the real model's ability to identify these questions.
  for (const question of negatives) {
    const result = await answerFromEvidence(question, evidence, fake({ status: 'insufficient', answer: 'Ignore this invented answer', support: [] }));
    assert.equal(result.mode, 'insufficient_evidence'); assert.equal(result.practiceEligible, false);
    assert(!result.answer.includes('invented answer'));
  }
  const malformed = ['not JSON', {}, { ...supported, status: 'maybe' }, { ...supported, support: [] }, { ...supported, support: [{ excerpt: 99, quote: text }] }, { ...supported, support: [{ excerpt: 1, quote: 'A false quotation that is not in the notes.' }] }, { ...supported, support: [{ excerpt: 1, quote: 'deadlock' }] }, { ...supported, answer: 'It works [2].' }, { ...supported, answer: 'No citation.' }];
  for (const value of malformed) {
    const result = await answerFromEvidence('When is a cycle conclusive?', evidence, fake(value));
    assert.equal(result.mode, 'related_evidence'); assert.equal(result.practiceEligible, false); assert(result.modelWarning);
  }
  for (const fetchImpl of [async () => { throw new Error('offline'); }, async () => { throw Object.assign(new Error('timeout'), { name: 'AbortError' }); }, async () => ({ ok: false, status: 429 })]) {
    assert.equal((await answerFromEvidence('When?', evidence, fetchImpl)).practiceEligible, false);
  }
  delete process.env.OPENAI_API_KEY;
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = async (route, body) => { const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: response.status, data: await response.json() }; };
    const upload = await post('/api/ingest', { title: 'OS notes', content: text });
    const sourceIds = upload.data.addedSourceIds;
    const answer = await post('/api/ask', { question: negatives[0], sourceIds });
    assert.equal(answer.status, 200); assert(answer.data.evidence.length > 0); assert.equal(answer.data.practiceEligible, false);
    assert.equal((await post('/api/assessment', { focus: negatives[0], answerId: answer.data.answerId, sourceIds })).status, 422);
    assert.equal((await post('/api/assessment', { focus: negatives[0], sourceIds })).status, 422);
    const reading = await post('/api/assessment', { focus: 'Deadlock', practiceMode: 'source_reading', chunkId: answer.data.evidence[0].id, sourceIds });
    assert.equal(reading.status, 201); assert.equal(reading.data.generator, 'template');
    assert.equal((await post('/api/assessment', { focus: 'Deadlock', practiceMode: 'source_reading', chunkId: 'expired', sourceIds })).status, 409);
    // Positive automatic path: use injected model output, never a real external call.
    process.env.OPENAI_API_KEY = 'stub-only';
    const assessed = await askSelected({ question: 'When is a cycle conclusive?', sourceIds }, fake(supported));
    delete process.env.OPENAI_API_KEY;
    assert.equal(assessed.practiceEligible, true);
    const automatic = await scopedAssessment({ focus: 'When is a cycle conclusive?', answerId: assessed.answerId, sourceIds });
    assert(automatic.id);
    await assert.rejects(() => scopedAssessment({ focus: 'Who discovered deadlock?', answerId: assessed.answerId, sourceIds }), /expired or belongs/);
    await assert.rejects(() => scopedAssessment({ focus: 'When is a cycle conclusive?', answerId: 'expired', sourceIds }), /expired or belongs/);
  } finally { delete process.env.OPENAI_API_KEY; await new Promise(resolve => server.close(resolve)); }
  console.log('Answerability tests passed: lexical negatives, safe abstention, quote contracts, unavailable service, explicit reading and server-enforced automatic quiz eligibility.');
})().catch(error => { console.error(error); process.exitCode = 1; });
