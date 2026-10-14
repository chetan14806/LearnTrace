/* Retrieval baseline. Replace retrieval-cases.json and demoEvidenceChunks() with held-out real course material before publishing a score. */
const fs = require("fs");
const path = require("path");
const { retrieve, demoEvidenceChunks } = require("../server");
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "retrieval-cases.json"), "utf8"));
const corpus = demoEvidenceChunks();
let supported = 0, hit1 = 0, hit3 = 0, unsupported = 0, refused = 0;
for (const item of cases) {
  const results = retrieve(item.question, corpus, 3);
  if (item.expectUnsupported) { unsupported += 1; if (!results.length) refused += 1; continue; }
  supported += 1;
  if (results[0]?.sourceTitle === item.expectedSource) hit1 += 1;
  if (results.some(result => result.sourceTitle === item.expectedSource)) hit3 += 1;
}
console.log(`Starter retrieval check — hit@1 ${hit1}/${supported}; hit@3 ${hit3}/${supported}; correct refusals ${refused}/${unsupported}.`);
console.log("Do not report this demo-corpus result as a product metric. Use unseen questions and real course sources first.");
