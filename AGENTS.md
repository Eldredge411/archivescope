<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Chinese terminology

Translate `record` and `records` as `文件`, not `记录`, in user-facing resource content. Keep `未记录` only for missing-value UI states. Generated resource imports and AI enrichment drafts must pass through `scripts/terminology/normalizeRecordTerminology.mjs`.
