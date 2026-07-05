# EduPortal Diploma Workspace

## Scope

- Treat `C:\Users\1\EduPortal1` as the project root and keep project operations inside it.
- Preserve existing files and versions unless the user explicitly asks to replace or remove them.
- Work with both the software project and the diploma materials that describe it.

## Writing priorities

- Default to formal Russian academic prose for diploma text unless another language is requested.
- Prefer precise claims, explicit logical links, and concrete project details over generic statements.
- Avoid promotional language, inflated conclusions, canned introductions, excessive headings, and repetitive summaries.
- Do not invent facts, sources, citations, test results, requirements, or implementation details. Mark unsupported claims for verification.
- Preserve the author's meaning and terminology. Explain substantial changes briefly.
- Use `ё` consistently with the surrounding document; do not normalize it without a reason.

## Diploma workflow

- Read the relevant draft, nearby sections, technical assignment, diagrams, and source code before revising technical claims.
- Keep the chain `problem -> goal -> tasks -> design -> implementation -> testing -> conclusion` internally consistent.
- Check that chapter titles, figures, tables, citations, appendices, and terminology agree across the document.
- For source-based writing, distinguish verified facts, reasonable inferences, and points requiring a source.
- Apply `$academic-research-skills` for research structure and evidence handling.
- Apply `$stop-slop` during final prose revision.
- Apply `$diploma-writing` for the helper commands defined below.

## Development workflow

- Apply `$eduportal-development` for feature implementation, refactoring, navigation changes, shared UI work, and Supabase-backed application logic.
- Apply `$eduportal-debugging` for bug reproduction, defect isolation, regression diagnosis, broken role flows, and data or time-related faults.
- Apply `$eduportal-testing` for type checks, smoke checks, browser verification, release-sensitive regression checks, and evidence collection after changes.
- Prefer the sequence `development -> debugging -> testing` when a task spans implementation, defect fixing, and verification.

## Word documents

- When editing `.docx`, preserve styles, heading levels, captions, numbering, tables, references, page breaks, and image placement where possible.
- Create a backup or a clearly named new version before broad formatting changes.
- Prefer targeted edits over rebuilding a document from plain text.
- Report which file was changed and summarize formatting-sensitive changes.

## Helper commands

Interpret these phrases as project commands:

- `rewrite in academic style: <text or file/section>`: improve precision, cohesion, and academic register without changing meaning or adding facts.
- `summarize text: <text or file/section>`: return a compact summary containing the purpose, key points, and conclusion.
- `expand into structured paragraph: <notes>`: produce one coherent paragraph with a topic sentence, explanation, evidence or project detail, and a restrained conclusion.
- `convert notes into formal text: <notes>`: organize fragments into formal diploma prose and flag missing evidence or ambiguous claims.

## Project map

- Main application entry points: `App.tsx`, `index.ts`, `tablet-index.ts`.
- Application source: `src/`.
- Database schema changes: `supabase/migrations/`.
- Diploma documents and supporting media: `docs/`.
- Document, diagram, import, and verification utilities: `scripts/`.
- Build and project configuration: `package.json`, `app.json`, `tsconfig.json`, `tablet-config.json`.
- Treat `docs/diplom-draft.md`, `docs/diplom-draft.txt`, `_review_extracted.txt`, backup files, and versioned `.docx` files as drafts or intermediate material until the user identifies the authoritative version.
