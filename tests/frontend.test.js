const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.argv[2] || path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const source = fs.readFileSync(process.argv[3] || path.join(root, 'dist/app.js'), 'utf8');
const ready = { retrievalReady: true, chunks: 0, modelReady: true, playlistReady: true };
function response(value, status = 200) { return { ok: status < 400, status, json: async () => value }; }
function harness({ missing = [], fetchImpl } = {}) {
  const nodes = new Map(); const calls = [];
  function element() {
    return { textContent: '', innerHTML: '', className: '', value: '', files: [], disabled: false, handlers: {}, children: [], dataset: {}, queryNodes: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return true; } },
      addEventListener(name, fn) { this.handlers[name] = fn; },
      append(...items) { this.children.push(...items); }, replaceChildren() { this.children = []; }, scrollIntoView() {}, focus() {}, setAttribute() {},
      querySelector(selector) { return this.queryNodes[selector] ||= element(); } };
  }
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) nodes.set('#' + match[1], element());
  nodes.set('#answer .grounded', element());
  missing.forEach(id => nodes.delete(id));
  const context = vm.createContext({
    document: { querySelector: selector => nodes.get(selector) || null, querySelectorAll: selector => selector === '.option' ? nodes.get('#options')?.children || [] : [], createElement: element },
    localStorage: { getItem: () => null, setItem() {} },
    location: { protocol: 'http:', origin: 'http://127.0.0.1:4173' },
    window: { setTimeout }, URLSearchParams, AbortSignal, Uint8Array, btoa, console,
    fetch: async (route, options) => {
      calls.push({ route, options });
      if (fetchImpl) return fetchImpl(route, options);
      return response(route === '/api/status' ? ready : route === '/api/sources' ? { sources: [] } : { items: [] });
    }
  });
  vm.runInContext(source, context, { filename: 'dist/app.js' });
  return { context, nodes, calls, run: code => vm.runInContext(code, context) };
}
(async () => {
  // Use the actual HTML: its absent source-count caused a successful probe to be reset to false.
  const app = harness();
  await app.run('refreshServerStatus()');
  assert.equal(app.run('serverReady'), true, 'Healthy backend must remain ready when optional source-count is absent');
  assert.match(app.nodes.get('#server-status').textContent, /AI tutor configured/);
  const optional = harness({ missing: ['#server-status', '#source-count', '#playlist-filter', '#playlist-form', '#media-form', '#reset-progress', '#source-grid', '#mastery-list', '#overall-score'] });
  await optional.run('refreshServerStatus()');
  assert.equal(optional.run('serverReady'), true, 'Missing optional panels must not crash initialization');
  const libraryError = harness({ fetchImpl: async route => route === '/api/sources' ? response({ error: 'Unavailable' }, 503) : response(ready) });
  await libraryError.run('refreshServerStatus()');
  assert.equal(libraryError.run('serverReady'), true, 'Library failure is not a failed backend status probe');
  let fail = true;
  const recovery = harness({ fetchImpl: async route => route === '/api/status' ? fail ? response({ error: 'Busy' }, 503) : response(ready) : response(route === '/api/sources' ? { sources: [] } : { items: [] }) });
  await recovery.run('refreshServerStatus()');
  assert.equal(recovery.run('serverReady'), false);
  assert.match(recovery.nodes.get('#server-status').textContent, /GET \/api\/status.*503/);
  fail = false;
  recovery.nodes.get('#playlist-url').value = 'https://www.youtube.com/playlist?list=PLtest';
  await recovery.nodes.get('#playlist-form').handlers.submit({ preventDefault() {} });
  assert.equal(recovery.run('serverReady'), true, 'An action must recheck readiness and recover without a reload');
  assert(recovery.calls.some(call => call.route === '/api/playlist'));
  let release;
  const startup = new Promise(resolve => { release = resolve; });
  const early = harness({ fetchImpl: async route => route === '/api/status' ? response(await startup) : response(route === '/api/sources' ? { sources: [] } : { items: [] }) });
  early.nodes.get('#playlist-url').value = 'https://www.youtube.com/playlist?list=PLtest';
  const earlySubmit = early.nodes.get('#playlist-form').handlers.submit({ preventDefault() {} });
  release(ready); await earlySubmit;
  assert.equal(early.calls.filter(call => call.route === '/api/status').length, 1, 'Early submit must await the in-flight startup probe');
  assert(early.calls.some(call => call.route === '/api/playlist'));
  const malformed = harness({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('HTML'); } }) });
  await malformed.run('refreshServerStatus()');
  assert.match(malformed.nodes.get('#server-status').textContent, /GET \/api\/status.*without valid JSON/);
  const offline = harness({ fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  await offline.run('refreshServerStatus()');
  assert.match(offline.nodes.get('#server-status').textContent, /GET \/api\/status.*127\.0\.0\.1:4173/);
  const media = harness({ fetchImpl: async route => route === '/api/status' ? response(ready) : route === '/api/sources' ? response({ sources: [] }) : response({ error: 'No speech was detected in this media file.' }, 500) });
  await media.run('refreshServerStatus()');
  media.nodes.get('#media-file').files = [{ name: 'lecture.wav', size: 1, arrayBuffer: async () => new Uint8Array([0]).buffer }];
  await media.nodes.get('#media-form').handlers.submit({ preventDefault() {} });
  assert(media.calls.some(call => call.route === '/api/transcribe-media'), 'Media handler must reach the backend with optional count absent');
  assert.equal(media.run('serverReady'), true);
  assert.match(media.nodes.get('#media-status').textContent, /No clear speech/);
  await app.nodes.get('#source-file').handlers.change({ target: { files: [{ name: 'notes.txt' }] } });
  const upload = harness({ fetchImpl: async route => route === '/api/status' ? response(ready) : route === '/api/sources' ? response({ sources: [] }) : response({ added: 1, topics: [] }) });
  await upload.run('refreshServerStatus()');
  upload.nodes.get('#source-text').value = 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nA cycle can indicate deadlock.';
  await upload.nodes.get('#ingest-form').handlers.submit({ preventDefault() {}, currentTarget: upload.nodes.get('#ingest-form') });
  assert.match(upload.nodes.get('#ingest-status').textContent, /Added/, 'Missing file-name and lecture-tools must not turn successful ingestion into an error');
  const scopedSources = [
    { id: 'a', title: 'Course A', type: 'textbook', chunks: 1, locations: ['Page 1'] },
    { id: 'b', title: 'Course B', type: 'textbook', chunks: 1, locations: ['Page 2'] }
  ];
  const scopedEvidence = { text: 'A deadlock occurs when processes wait for resources.', sourceTitle: 'Course A', locationLabel: 'Page 1', sourceType: 'textbook', matchedTerms: ['deadlock'] };
  const scopedApp = harness({ fetchImpl: async route => {
    if (route === '/api/status') return response({ ...ready, sourceScopingReady: true });
    if (route === '/api/sources') return response({ sources: scopedSources });
    if (route === '/api/ask') return response({ answer: 'A deadlock occurs [1].', mode: 'model_grounded', practiceEligible: true, answerId: 'answer-a', evidence: [scopedEvidence] });
    if (route === '/api/assessment') return response({ id: 'check-a', concept: 'Deadlock', generator: 'template', sourceIds: ['a'], question: 'Which statement?', options: ['a', 'b', 'c', 'd'], evidence: scopedEvidence });
    if (route.startsWith('/api/concept-map')) return response({ concepts: [] });
    return response({});
  } });
  await scopedApp.run('refreshServerStatus()');
  assert.throws(() => scopedApp.run('sourceScope()'), /Choose at least one source/);
  scopedApp.run("chooseSources(['a'])");
  scopedApp.nodes.get('#question').value = 'Explain deadlock.';
  await scopedApp.nodes.get('#question-form').handlers.submit({ preventDefault() {}, currentTarget: scopedApp.nodes.get('#question-form') });
  assert.deepEqual(JSON.parse(scopedApp.calls.find(call => call.route === '/api/ask').options.body).sourceIds, ['a']);
  assert.deepEqual(JSON.parse(scopedApp.calls.find(call => call.route === '/api/assessment').options.body).sourceIds, ['a']);
  assert.equal(JSON.parse(scopedApp.calls.find(call => call.route === '/api/assessment').options.body).answerId, 'answer-a');
  assert.equal(scopedApp.run('activeAssessment.id'), 'check-a', 'A successful response must actually render an active quiz');
  assert.equal(scopedApp.nodes.get('#options').children.length, 4);
  assert.equal(scopedApp.nodes.get('#check-answer').disabled, false);
  await scopedApp.run('loadConceptMap()');
  assert(scopedApp.calls.some(call => call.route === '/api/concept-map?sourceId=a'));
  scopedApp.run("chooseSources(['b'])");
  assert.equal(scopedApp.run('activeAssessment'), null, 'Changing sources must clear an earlier check');
  assert.deepEqual(JSON.parse(scopedApp.run('JSON.stringify(sourceScope().sourceIds)')), ['b']);
  for (const mode of ['related_evidence', 'insufficient_evidence']) {
    const unsupported = harness({ fetchImpl: async route => {
      if (route === '/api/status') return response({ ...ready, sourceScopingReady: true });
      if (route === '/api/sources') return response({ sources: scopedSources });
      if (route === '/api/ask') return response({ answer: 'No supported answer established.', mode, answerId: 'unsupported', practiceEligible: false, evidence: [scopedEvidence] });
      throw new Error('Unexpected automatic practice call');
    } });
    await unsupported.run('refreshServerStatus()'); unsupported.run("chooseSources(['a'])");
    unsupported.nodes.get('#question').value = 'What year was deadlock invented?';
    await unsupported.nodes.get('#question-form').handlers.submit({ preventDefault() {}, currentTarget: unsupported.nodes.get('#question-form') });
    assert(!unsupported.calls.some(call => call.route === '/api/assessment'), `${mode} must not trigger a quiz`);
    assert.match(unsupported.nodes.get('#quiz-question').textContent, /No automatic quiz/);
    assert.equal(unsupported.nodes.get('#check-answer').disabled, true);
    assert.match(unsupported.nodes.get('#answer-title').textContent, mode === 'related_evidence' ? /Related passages/ : /No supported answer/);
  }
  function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
  const quiz = id => ({ id, concept: id, generator: 'template', sourceIds: ['a'], question: `${id} question`, options: ['a', 'b', 'c', 'd'], evidence: scopedEvidence });
  const answer = id => ({ answer: `${id} answer`, mode: 'model_grounded', practiceEligible: true, answerId: id, evidence: [scopedEvidence] });
  async function raceApp(extraFetch) {
    const instance = harness({ fetchImpl: async (route, options) => {
      if (route === '/api/status') return response({ ...ready, sourceScopingReady: true });
      if (route === '/api/sources') return response({ sources: scopedSources });
      return extraFetch(route, options?.body ? JSON.parse(options.body) : {});
    } });
    await instance.run('refreshServerStatus()'); instance.run("chooseSources(['a'])");
    return instance;
  }
  function ask(instance, question) {
    instance.nodes.get('#question').value = question;
    return instance.nodes.get('#question-form').handlers.submit({ preventDefault() {}, currentTarget: instance.nodes.get('#question-form') });
  }
  for (const rejectOld of [false, true]) {
    const oldResult = deferred(), newResult = deferred(), newStarted = deferred();
    const instance = await raceApp(async (route, body) => {
      if (route === '/api/ask') return response(answer('B'));
      if (route === '/api/assessment' && body.focus === 'A') return response(await oldResult.promise);
      if (route === '/api/assessment' && body.focus === 'B') { newStarted.resolve(); return response(await newResult.promise); }
      throw new Error(`Unexpected request ${route}`);
    });
    const oldRequest = instance.run("loadSourceCheck('A', { answerId: 'A' })");
    const newRequest = ask(instance, 'B');
    // A newer quiz must start while the obsolete one is still pending (not wait/skip).
    await Promise.race([newStarted.promise, new Promise((_, reject) => setTimeout(() => reject(new Error('New quiz B was blocked by old quiz A')), 500))]);
    assert.equal(instance.nodes.get('#question-form').querySelector('button').disabled, false, 'Asking must not remain locked during background quiz generation');
    if (rejectOld) oldResult.reject(new Error('Old quiz A failed')); else oldResult.resolve(quiz('A'));
    await oldRequest;
    assert.equal(instance.run('assessmentLoading'), true, 'Old completion must not release the new loading state');
    assert.match(instance.nodes.get('#quiz-question').textContent, /Preparing/);
    newResult.resolve(quiz('B')); await newRequest;
    assert.equal(instance.nodes.get('#answer-text').textContent, 'B answer');
    assert.equal(instance.nodes.get('#quiz-question').textContent, 'B question');
    assert.equal(instance.run('activeAssessment.id'), 'B');
  }
  for (const rejectOld of [false, true]) {
    const oldResult = deferred(), oldStarted = deferred();
    const instance = await raceApp(async route => {
      if (route === '/api/ask') { oldStarted.resolve(); return response(await oldResult.promise); }
      if (route === '/api/assessment') return response(quiz('B'));
      throw new Error(`Unexpected request ${route}`);
    });
    const oldRequest = ask(instance, 'A'); await oldStarted.promise;
    await instance.run("loadSourceCheck('B', { practiceMode: 'source_reading', chunkId: 'b' })");
    if (rejectOld) oldResult.reject(new Error('Old answer A failed')); else oldResult.resolve(answer('A'));
    await oldRequest;
    assert.equal(instance.nodes.get('#quiz-question').textContent, 'B question', 'Late answers/errors must not replace explicitly chosen practice');
    assert.notEqual(instance.nodes.get('#answer-text').textContent, 'A answer');
    assert.equal(instance.nodes.get('#question-status').textContent, '');
    assert.equal(instance.nodes.get('#question-form').querySelector('button').disabled, false);
  }
  for (const rejectOld of [false, true]) {
    const oldResult = deferred();
    const instance = await raceApp(async route => {
      if (route === '/api/study-path/follow-up') return response(await oldResult.promise);
      if (route === '/api/ask') return response(answer('B'));
      if (route === '/api/assessment') return response(quiz('B'));
      throw new Error(`Unexpected request ${route}`);
    });
    instance.run("activeStudyPath = { assessmentId: 'parent' }; document.querySelector('#start-check').disabled = false");
    const oldRequest = instance.run('loadFollowUpCheck()');
    await ask(instance, 'B');
    if (rejectOld) oldResult.reject(new Error('Old follow-up failed')); else oldResult.resolve(quiz('old-follow-up'));
    await oldRequest;
    assert.equal(instance.run('activeAssessment.id'), 'B');
    assert.equal(instance.nodes.get('#quiz-question').textContent, 'B question');
    assert.equal(instance.nodes.get('#start-check').disabled, true, 'Old follow-up must not re-enable the new next-step card');
    assert(!instance.nodes.get('#next-copy').textContent.includes('Old follow-up'));
  }
  {
    const pending = deferred(), started = deferred();
    const instance = await raceApp(async route => {
      if (route === '/api/ask') { started.resolve(); return response(await pending.promise); }
      throw new Error('Obsolete answer should not start a quiz');
    });
    const request = ask(instance, 'A'); await started.promise;
    instance.run("chooseSources(['b'])");
    pending.resolve(answer('A')); await request;
    assert.equal(instance.run('activeAssessment'), null);
    assert.notEqual(instance.nodes.get('#answer-text').textContent, 'A answer');
    assert.equal(instance.nodes.get('#question-form').querySelector('button').disabled, false);
  }
  {
    const first = deferred(), firstStarted = deferred(), second = deferred(), secondStarted = deferred();
    const instance = await raceApp(async (route, body) => {
      if (route === '/api/ask' && body.question === 'A') { firstStarted.resolve(); return response(await first.promise); }
      if (route === '/api/ask' && body.question === 'B') { secondStarted.resolve(); return response(await second.promise); }
      if (route === '/api/assessment') return response(quiz('direct'));
      throw new Error('Unexpected request');
    });
    const oldRequest = ask(instance, 'A'); await firstStarted.promise;
    await instance.run("loadSourceCheck('direct', { practiceMode: 'source_reading', chunkId: 'chunk' })");
    const latest = ask(instance, 'B'); await secondStarted.promise;
    first.resolve(answer('A')); await oldRequest;
    assert.equal(instance.nodes.get('#question-form').querySelector('button').disabled, true, 'Old finally must not unlock a newer pending question');
    second.resolve({ ...answer('B'), practiceEligible: false }); await latest;
    assert.equal(instance.nodes.get('#answer-text').textContent, 'B answer');
    assert.equal(instance.nodes.get('#question-form').querySelector('button').disabled, false);
  }
  {
    const oldGrade = deferred();
    const instance = await raceApp(async route => route === '/api/assessment/grade' ? response(await oldGrade.promise) : response(quiz('B')));
    instance.run("showAssessment(" + JSON.stringify(quiz('A')) + ", 'Practice'); selected = 0");
    const grading = instance.nodes.get('#check-answer').handlers.click();
    await instance.run("loadSourceCheck('B', { practiceMode: 'source_reading', chunkId: 'b' })");
    oldGrade.reject(new Error('Old grading failed')); await grading;
    assert.equal(instance.run('activeAssessment.id'), 'B');
    assert.notEqual(instance.nodes.get('#feedback').textContent, 'Old grading failed');
  }
  console.log('Frontend regression tests passed: readiness, actual quiz rendering, source scope and delayed answer/quiz/follow-up/grading success/error isolation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
