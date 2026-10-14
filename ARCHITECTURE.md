# LearnTrace architecture — implemented behavior

```text
PDF / PPTX / notes                uploaded audio or video
       |                                    |
text extraction                     local faster-whisper
       |                                    |
page / slide references                timed transcript
       +----------------+-------------------+
                        |
            in-memory source passages
                        |
                BM25 word ranking
                        |
        retrieved text + title + location
                        |
         +--------------+-----------------+
         |                                |
  source excerpt                  optional model answer
  (no key / failure)                + numbered citations
         +--------------+-----------------+
                        |
           optional model-written quiz
          or simple source-reading check
                        |
           server-side answer comparison
                        |
       practice counts + revision passage
                        |
          another question / statement
```

server.js owns the corpus, retrieval, model boundary and assessment records. runtime.js discovers an interpreter with the required Python module. dist/app.js handles uploads, source inspection, questions and practice. Keys stay on the server.

## Why provenance matters

Each passage has a unique ID, source title/type, location label and text. Pages, slide numbers and transcript time ranges survive extraction. Uploaded files are processed temporarily and removed afterwards. Citation buttons reveal the extracted passage, not an original document viewer or video player.

## Retrieval versus generation

Retrieval uses BM25 to rank word matches, accounting for term frequency, rarity and passage length. It does not understand synonyms. A nonzero score proves word overlap, not answerability.

Generation optionally sends the question and passages to the Responses API. The prompt restricts the answer to excerpts and asks for numbered citations. Invalid numbers cause fallback; absent citations cause a warning. Neither behavior proves semantic truth. Without a key, the app displays a matching excerpt with its limitation stated.

## Assessment and adaptation

An optional model writes a four-option question from one passage. Structured JSON and validation reject malformed fields, duplicate options and exact repeated questions. API failures fall back to a simple source-reading check. There is no LLM judge or second model verification layer.

The correct answer remains in server memory. Each check is graded once: an identical retry returns the saved result, and changing an already submitted answer is rejected. Browser-local practice counts record attempts rather than an estimated exam-readiness percentage.

Follow-ups retain the concept and try another relevant passage. The model is instructed to avoid its previous question; template questions select unused statements. Exhaustion gives an explanation. This is a bounded revision loop, not a long-term adaptive curriculum.

## Optional discovery

Playlist Map uses YouTube titles/descriptions. It does not insert them into the course evidence. Lecture Topic Map groups transcript cues and suggests labels from their terms. Cross-source cards connect terms present in multiple source titles and display matching excerpts.

## Operational scope

The Node server binds to localhost. One server has one in-memory corpus. Restarting clears sources and pending checks; browser history persists separately. Hosted use requires authentication, per-user storage and upload/deployment controls.

See REVIEW.md for tests and limits. Embeddings, diagrams, original-source playback and real-course benchmarking remain future work.
