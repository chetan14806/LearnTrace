const assert = require('node:assert/strict');
const { chunkText, createAssessmentAI, createFollowUpAssessmentAI, gradeAssessment } = require('../server');
const text = 'Deadlock occurs when processes wait indefinitely for resources. A resource-allocation graph represents processes and resources as nodes. With one instance of each resource, a graph cycle indicates deadlock.';
const corpus = chunkText(text, { title: 'OS notes', sourceType: 'textbook' });
const focus = 'How does a graph cycle indicate deadlock?';
const item = { concept: 'Graph cycles', question: 'When can a graph cycle establish deadlock?', options: ['When each resource has one instance', 'When the graph has no requests', 'When every process finishes', 'When no resources exist'], correctIndex: 0, explanation: 'The passage states the single-instance condition.', misconception: 'A cycle alone is not sufficient in all settings.', supportQuote: 'With one instance of each resource, a graph cycle indicates deadlock.' };
const fake = value => async () => ({ ok: true, json: async () => ({ output_text: JSON.stringify(value) }) });
(async () => {
  delete process.env.OPENAI_API_KEY;
  const reading = await createAssessmentAI(focus, corpus);
  const grade = gradeAssessment(reading.id, 0);
  assert.equal(grade.correctText, item.supportQuote, 'Fallback must target the graph-cycle sentence, not the first definition');
  await assert.rejects(() => createFollowUpAssessmentAI(reading.id, corpus), /No new source check/, 'Do not drift to an unrelated sentence just to produce a follow-up');
  process.env.OPENAI_API_KEY = 'stub-only';
  const requests = [];
  const generated = await createAssessmentAI(focus, corpus, async (url, options) => { requests.push(JSON.parse(options.body)); return fake(item)(); });
  assert.equal(generated.generator, 'model');
  assert.equal(requests.length, 1, 'No judge call');
  assert.equal(JSON.parse(requests[0].input).learnerFocus, focus);
  assert(requests[0].text.format.schema.required.includes('supportQuote'));
  const correct = generated.options.indexOf(item.options[0]);
  const result = gradeAssessment(generated.id, correct);
  assert.equal(result.correct, true); assert.match(result.feedback, /AI-generated answer key/); assert(result.feedback.includes(item.supportQuote));
  const wrong = await createAssessmentAI(focus, corpus, fake(item));
  const wrongResult = gradeAssessment(wrong.id, (wrong.options.indexOf(item.options[0]) + 1) % 4);
  assert.match(wrongResult.feedback, /not a diagnosis/);
  let followInput;
  await createFollowUpAssessmentAI(generated.id, corpus, async (url, options) => { followInput = JSON.parse(JSON.parse(options.body).input); return fake({ ...item, question: 'Which graph-cycle condition is needed for deadlock?' })(); });
  assert.equal(followInput.learnerFocus, focus, 'Follow-ups must retain the original focus, not only a truncated concept label');
  assert(followInput.earlierQuestions.includes(item.question));
  for (const invalid of [
    { ...item, supportQuote: undefined },
    { ...item, supportQuote: 'A false quote not found in the supplied passage.' },
    { ...item, supportQuote: 'deadlock' },
    { ...item, question: 'How many moons orbit Mars?', options: ['Two moons', 'One moon', 'Three moons', 'No moons'] },
    { ...item, options: ['A cycle!', 'a cycle', 'Something else', 'Another choice'] },
    { ...item, correctIndex: 7 }
  ]) {
    assert.equal((await createAssessmentAI(focus, corpus, fake(invalid))).generator, 'template', 'Invalid generated items must safely fall back');
  }
  delete process.env.OPENAI_API_KEY;
  console.log('Quiz-focus tests passed: focused reading, original intent in model/follow-up requests, quote/relevance/duplicate checks, transparent feedback, no judge call.');
})().catch(error => { delete process.env.OPENAI_API_KEY; console.error(error); process.exitCode = 1; });
