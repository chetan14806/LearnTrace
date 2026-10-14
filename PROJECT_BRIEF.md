# LearnTrace
## An evidence-first adaptive study coach

> This document describes the product ambition. For the verified implementation, read REVIEW.md and FEATURE_ROADMAP.md. Current retrieval is lexical BM25; semantic search is not implemented. Practice history records attempts; it is not a validated mastery diagnosis. Citations reveal extracted passages, not original document/video viewers. Model-generated tutoring and quizzes still need live verification.

## One-sentence pitch

LearnTrace turns a course's lecture video, slides, and textbook into a source-cited study space that identifies what a learner does not understand and creates the most useful next step.

## The learner we are designing for

An undergraduate engineering student preparing for an exam from fragmented course material: recorded lectures, slide decks, and textbook extracts. They have limited time, do not know what to study first, and cannot easily verify whether an AI answer came from their instructor's material.

## Why this is stronger than a generic AI tutor

Many tools can answer questions about an uploaded PDF. LearnTrace makes the answer *verifiable* and uses the learner's demonstrated understanding to decide what happens next.

Our two proof points are:

1. **Evidence:** Each answer links back to its supporting source, including page/slide number or lecture timestamp.
2. **Adaptation:** A quiz result updates a visible mastery map and produces a targeted recommendation rather than another generic quiz.

### Differentiator: Playlist Map

Before study begins, a learner can paste a public YouTube playlist and receive a concise map of what each lecture is likely to cover. They can choose the videos relevant to their immediate goal rather than watching an entire playlist blindly. LearnTrace will clearly label whether this map is inferred from public titles/descriptions or grounded in a supplied/authorised transcript.

## Hero demo scenario

Use one compact, coherent course module such as **Operating Systems: Deadlocks**.

1. The learner opens a module assembled from a lecture clip, instructor slides, and a textbook excerpt.
2. LearnTrace displays the extracted concepts and where each source discusses them.
3. The learner asks: "How does the resource-allocation graph help detect a deadlock?"
4. LearnTrace answers and cites the supporting slide, textbook page, and/or lecture timestamp. The learner can open the cited evidence.
5. The learner takes a short diagnostic quiz. An incorrect answer about the four Coffman conditions lowers mastery for that concept.
6. LearnTrace explains the misconception, points the learner to the most relevant source segment, and creates the next targeted practice question.

## Track D requirement -> visible product evidence

| Track D requirement | What the evaluator sees |
| --- | --- |
| Lecture videos, textbooks, and slides unified | A module with all three source types and a concept map/source list |
| Source-cited knowledge base | Answers with clickable page, slide, and timestamp citations |
| Adaptive assessments | Diagnostic questions selected by weak concepts |
| Personalised tutoring | A mastery map, misconception explanation, and "study this next" path |

## MVP: must work end-to-end

- Add or load study materials from PDF, PPTX, and video/audio.
- Extract text and preserve source metadata: document page, slide number, video timestamp.
- Search material semantically and generate grounded answers with citations.
- Generate and score a short concept-tagged quiz.
- Store learner answers and calculate simple per-concept mastery.
- Recommend the next concept, source reference, and practice item.

## Deliberately out of scope for the first build

- Supporting every file type or every academic subject.
- A fully autonomous long-term learning plan.
- Perfect automatic grading of essays.
- Multi-user accounts, payments, or complex collaboration.

## Product principles

- **Grounded over fluent:** if the supplied material does not support an answer, say so.
- **Show the evidence:** citations are a core interaction, not a footnote.
- **One learner journey:** every screen should advance study, assessment, or revision.
- **Small, real, demoable:** a polished course module beats an unfinished universal platform.

## Build order

1. Prepare one high-quality demo module and source assets.
2. Build ingestion and source-aware retrieval.
3. Build cited question answering.
4. Build diagnostic assessment and mastery calculation.
5. Connect mastery to personalised feedback and next-step recommendations.
6. Polish the story, README, and demo video.
