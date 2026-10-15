# LearnTrace — what to keep and how to push safely

## Use the existing repository folder

Use `D:\projects\LearnTrace-submission` as the project root. This is the Git repository receiving the current refinements. Do not upload the entire older `Multimodal AI hackathon` working folder, its temporary copies, or a nested second copy of LearnTrace.

You already created README.md and .gitignore on GitHub, pulled, merged and pushed. That initial integration is done: keep those files and their history. You do not need to initialize another repository, recreate the remote, or repeat the unrelated-history merge. This guide does not fetch, merge, commit or push anything for you.

## Files to keep in GitHub

```text
LearnTrace-submission/
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── requirements.txt
├── server.js
├── runtime.js
├── dist/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── tests/                 # All test scripts and self-contained fixtures
├── eval/                  # Retrieval smoke-check script and authored cases
├── ARCHITECTURE.md
├── PROJECT_BRIEF.md
├── FEATURE_ROADMAP.md
├── AUDIT_BACKLOG.md
├── REVIEW.md
├── PROJECT_LOG.md
├── SUBMISSION.md
├── DEMO_SPEECH.md
└── GITHUB_GUIDE.md
```

Keep any additional intentional frontend assets if added later. The current dist folder is the actual frontend served by Node—not a disposable generated build. Do NOT add `dist/` to .gitignore. No separate source/build toolchain recreates it today.

server.js runs the APIs and serves the frontend; runtime.js discovers Python; requirements.txt describes Python extraction/transcription dependencies. package.json contains commands. The current package-lock.json matches this dependency-free Node package and is appropriate to commit; it was inspected but not modified by this refinement. Tests need their fixtures, including tests/pdf-fixture.js. eval is an optional developer retrieval smoke check, NOT an internal LLM judge and NOT a real-course accuracy score.

The Markdown files are useful project documentation. README is the entry point; PROJECT_LOG is the learning/history record; AUDIT_BACKLOG and REVIEW preserve honest limitations. Historical log claims can be superseded by newer entries: do not turn an old plan into a current feature claim. If the old initial README contains useful remote text, retain it while combining it with the current setup instructions. Do not blindly replace the README with an older copy.

Keep the hidden `.git` directory locally so Git retains your history, but do not manually upload that directory. `git push` transfers commits, not a raw copy of `.git`.

## Keep these out of GitHub

| Do not commit | Why |
| --- | --- |
| .env, .env.*, API keys, credentials, tokens | Secrets; keys belong in the launching environment, never browser code |
| .venv/, node_modules/, __pycache__/, *.pyc | Local environments/cache; recreate from setup instructions |
| tmp/, copied test servers, temporary extraction/transcription files | Disposable working material |
| Downloaded Whisper model caches | Large machine-local assets; download/cache during setup |
| Personal recordings, private PDFs/slides, student data | Privacy and permission concerns; use permitted small fixtures only |
| Generated logs/reports containing private source text or keys | Review and redact before sharing |
| Unreviewed external patches, ZIPs and duplicate project folders | Not application source and can confuse reviewers |

Your current .gitignore already excludes node_modules/, tmp/, .env, .env.*, .venv/, __pycache__/ and *.pyc, while allowing .env.example. It was preserved. An .env.example is optional and must contain placeholders only; the application does not automatically load .env files. Do not commit actual keys just because a file is named example.

Ignore rules do not remove secrets already tracked or present in Git history. If a real credential was ever pushed, revoke/rotate it first and then follow the provider's history-cleanup guidance. Deleting the visible file alone is not enough. Do not attempt a force-push/history rewrite casually.

Do not blanket-ignore every PDF/audio/video extension if you later need a small authorised test fixture. Prefer a named ignored local-data directory. Do not select a license on someone else's behalf; if you add one, choose it deliberately and ensure you can publish all included material.

## Safe update workflow from PowerShell

These commands are instructions for you to run after reviewing the changes. No push was performed by this task.

### 1. Confirm the repository and inspect changes

```powershell
Set-Location 'D:\projects\LearnTrace-submission'
git status
git branch --show-current
git diff --stat
git diff
git ls-files
```

Confirm that changes are intentional and no secrets or personal material are included. Remote URL inspection, if needed, is local-only; do not share a URL containing an embedded token.

### 2. Run the tests

```powershell
npm.cmd test
```

The current package runs seven suites. Python dependencies must be available for extraction tests. No paid API credentials are needed for these tests: external model behavior is stubbed and journey servers disable keys. A pass is not proof of live model quality.

If npm is unavailable, run the seven `node tests/...test.js` commands listed in README. Do not start another app server on the occupied main port just to run tests.

### 3. Stage only the intended project files

```powershell
git add -- .gitignore README.md package.json package-lock.json requirements.txt server.js runtime.js dist tests eval ARCHITECTURE.md PROJECT_BRIEF.md FEATURE_ROADMAP.md AUDIT_BACKLOG.md REVIEW.md PROJECT_LOG.md SUBMISSION.md DEMO_SPEECH.md GITHUB_GUIDE.md
git diff --cached --name-status
git diff --cached --check
git diff --cached
```

Only proceed if the staged file list and content are correct. Named folders include their contents, so inspect them too. Prefer this reviewed list over blindly staging every file in a workspace. If a file listed above is intentionally absent, omit that name; do not create dummy files merely to satisfy the command.

### 4. Commit, synchronize safely, then push

```powershell
git commit -m "Refine source-grounded tutoring and focused practice"
git fetch origin
git pull --ff-only
git push
git status
```

These assume your current branch already tracks the correct remote branch, as is typical after the push you described. If Git says there is nothing to commit, review git status and continue only if you understand why. If no upstream exists, inspect the intended remote and branch before setting it; do not guess a repository URL or branch name.

If `git pull --ff-only` reports divergent branches, STOP. Your local and remote have different commits. Review the histories and merge/rebase deliberately; do not use `--force`, `reset --hard`, or another unrelated-history merge as a shortcut. If a merge conflict appears, preserve both sides, resolve the content deliberately, then rerun tests. Do not start pulling into uncommitted refinements without first preserving them.

Because you already integrated the GitHub README/.gitignore, the ordinary workflow above is enough unless new remote changes cause divergence. Do not run `git init` again or delete `.git`.

## Confirm the final public repository

After your successful push, open the repository on GitHub and confirm:

- The latest commit is visible on the intended branch.
- The root shows server.js, runtime.js, package.json and README—not a nested duplicate directory.
- dist and all tests/fixtures are present; .venv and secrets are absent.
- README explains setup, supported formats, optional services and current limits.
- Any screenshots/demo links are intentional and contain no private information.
- A fresh clone can run using the documented setup. GitHub Pages alone will not run this Node backend, Python extraction or local transcription; pushing the repo is not deployment of the whole app.

Publishing the repository, making it public, deploying it, uploading a demo and submitting the hackathon entry are separate actions. This guide does not perform them or verify remote repository contents. We should do a clean-clone rehearsal before final submission.
