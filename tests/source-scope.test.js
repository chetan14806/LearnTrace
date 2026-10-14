const assert = require('node:assert/strict');
delete process.env.OPENAI_API_KEY;
delete process.env.YOUTUBE_API_KEY;
const { server } = require('../server');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, body, expected = 200) {
    const response = await fetch(base + route, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json(); assert.equal(response.status, expected, data.error); return data;
  }
  try {
    assert.equal((await request('/api/status')).sourceScopingReady, true);
    const a = await request('/api/ingest', { title: 'Week 1', sourceType: 'textbook', content: 'Deadlock occurs when processes wait for resources. A resource-allocation graph with a single instance of each resource uses a cycle to identify deadlock.' }, 201);
    const b = await request('/api/ingest', { title: 'Week 1', sourceType: 'textbook', content: 'In economics, resource allocation affects wages and employment. Market supply and demand influence economic outcomes.' }, 201);
    const c = await request('/api/ingest', { title: 'Demo custom upload', sourceType: 'transcript', content: 'WEBVTT\n\n00:00:01.000 --> 00:00:06.000\nA deadlock can occur when processes wait for resources.' }, 201);
    const idsA = a.addedSourceIds, idsB = b.addedSourceIds;
    assert.notDeepEqual(idsA, idsB, 'Identical filenames must not merge separate uploads');
    assert.equal((await request('/api/sources')).sources.length, 3);
    await request('/api/ask', { question: 'resource' }, 400);
    await request('/api/ask', { question: 'resource', sourceIds: [] }, 400);
    await request('/api/ask', { question: 'resource', sourceIds: ['expired-id'] }, 409);
    const answer = await request('/api/ask', { question: 'resource allocation', sourceIds: idsA });
    assert(answer.evidence.length > 0);
    assert(answer.evidence.every(item => idsA.includes(item.sourceId)), 'Tutor must not retrieve outside the selection');
    assert(!answer.answer.includes('wages'));
    const single = await request('/api/concept-map?' + new URLSearchParams([['sourceId', idsA[0]]]));
    assert.equal(single.concepts.length, 0);
    const params = new URLSearchParams(); [...idsA, ...c.addedSourceIds].forEach(id => params.append('sourceId', id));
    const map = await request('/api/concept-map?' + params);
    const deadlock = map.concepts.find(item => item.matchedTerm === 'deadlock');
    assert(deadlock && deadlock.sourceCount === 2);
    assert(deadlock.evidence.every(item => [...idsA, ...c.addedSourceIds].includes(item.sourceId)));
    const check = await request('/api/assessment', { focus: 'deadlock resource graph', sourceIds: idsA }, 201);
    assert.deepEqual(check.sourceIds, idsA);
    assert(!check.evidence.text.includes('wages'));
    await request('/api/assessment/grade', { id: check.id, selectedIndex: 0, sourceIds: idsB }, 409);
    const grade = await request('/api/assessment/grade', { id: check.id, selectedIndex: 0, sourceIds: idsA });
    assert.deepEqual(grade.sourceIds, idsA);
    await request('/api/study-path/follow-up', { id: check.id, sourceIds: idsB }, 409);
    const follow = await request('/api/study-path/follow-up', { id: check.id, sourceIds: idsA }, 201);
    assert.deepEqual(follow.sourceIds, idsA);
    assert(!follow.evidence.text.includes('wages'));
    const demo = await request('/api/demo', {}, 201);
    assert.equal(demo.alreadyLoaded, false, 'An upload called Demo must not suppress the sample module');
    assert.equal(demo.sources.filter(source => source.isDemo).length, 3);
    const again = await request('/api/ask', { question: 'resource', sourceIds: idsB });
    assert(again.evidence.every(item => idsB.includes(item.sourceId)), 'Loading samples must not broaden a later selection');
    console.log('Source-scope HTTP tests passed: independent source IDs, tutor/concept/check/follow-up isolation, invalid selections and sample separation.');
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
