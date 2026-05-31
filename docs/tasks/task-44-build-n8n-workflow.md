---
id: TASK-44
phase: "Phase 6 — Analysis Module and n8n Integration (Days 9–10)"
title: "Build n8n workflow"
status: deferred
---

# TASK-44 — Build n8n workflow

## Phase
Phase 6 — Analysis Module and n8n Integration (Days 9–10)

## Description
In n8n, create a workflow with nodes: (1) Webhook listener, (2) Set Variables, (3) SplitInBatches loop over `selectedDocuments`, (4) HTTP Request node to download each PDF binary from Vercel Blob, (5) Code node (Python) running `annotate_pdf.py` — extracts text with `pdfplumber`, identifies sections matching a keyword list, writes highlight annotations, returns binary PDF, (6) HTTP Request to upload annotated PDF to Vercel Blob, (7) Code node (Python) to create a ZIP from all annotated PDFs plus a `manifest.json`, (8) HTTP Request to upload ZIP to Vercel Blob, (9) HTTP Request to send the completion webhook back to Next.js.

## Acceptance Criteria
Running the workflow with two test PDFs produces a downloadable ZIP containing two annotated PDFs and a `manifest.json`.

## Manual Steps Required

This task requires configuring the workflow directly inside the n8n dashboard UI and cannot be automated via code. The following 9 nodes must be created in order:

1. **Webhook listener** — receives the POST from `triggerN8nWorkflow` with `{ projectId, projectName, analysisId, selectedDocuments, webhookUrl }`.
2. **Set Variables** — extracts and stores `analysisId`, `projectId`, `webhookUrl`, and the `selectedDocuments` array for downstream nodes.
3. **SplitInBatches** — iterates over each item in `selectedDocuments` one at a time.
4. **HTTP Request (download PDF)** — downloads each PDF binary from Vercel Blob using `originalFileUrl`.
5. **Code node (Python — annotate_pdf.py)** — runs `scripts/annotate_pdf.py --pdf <path> --terms <terms>`; returns `annotated_pages`, `total_matches`, `output_pdf_path`.
6. **HTTP Request (upload annotated PDF)** — uploads the annotated PDF binary to Vercel Blob; stores the resulting URL.
7. **Code node (Python — build ZIP)** — collects all annotated PDF URLs and creates a ZIP archive plus a `manifest.json` listing each document and its annotated pages.
8. **HTTP Request (upload ZIP)** — uploads the ZIP to Vercel Blob; stores the `zipFileUrl`.
9. **HTTP Request (completion webhook)** — POSTs `{ analysisId, projectId, status: "completed", zipFileUrl, analysisMetadata }` to the `webhookUrl` received in step 1.

On failure at any step, add an error branch that POSTs `{ analysisId, projectId, status: "failed", errorMessage }` to the same `webhookUrl`.
