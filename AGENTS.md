<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Chinese terminology

Translate `record` and `records` as `文件`, not `记录`, in user-facing resource content. Keep `未记录` only for missing-value UI states. Generated resource imports and AI enrichment drafts must pass through `scripts/terminology/normalizeRecordTerminology.mjs`.

## Site positioning

The site is a knowledge base for archival data resource construction, not a repository of archival data resources themselves. Existing records describe governance, policies, platforms, standards, projects, and participation practices. When adding content, use `knowledgeRole` with one of `institutional_norm`, `policy_strategy`, `platform_system`, `method_standard`, `project_practice`, or `public_participation`; omit it only when the derived rule in `src/lib/display.ts` is correct.
