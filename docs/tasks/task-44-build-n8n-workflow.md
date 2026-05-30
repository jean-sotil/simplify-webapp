---
id: TASK-44
phase: "Phase 6 — Analysis Module and n8n Integration (Days 9–10)"
title: "Build n8n workflow"
status: pending
---

# TASK-44 — Build n8n workflow

## Phase
Phase 6 — Analysis Module and n8n Integration (Days 9–10)

## Description
In n8n, create a workflow with nodes: (1) Webhook listener, (2) Set Variables, (3) SplitInBatches loop over `selectedDocuments`, (4) HTTP Request node to download each PDF binary from Vercel Blob, (5) Code node (Python) running `annotate_pdf.py` — extracts text with `pdfplumber`, identifies sections matching a keyword list, writes highlight annotations, returns binary PDF, (6) HTTP Request to upload annotated PDF to Vercel Blob, (7) Code node (Python) to create a ZIP from all annotated PDFs plus a `manifest.json`, (8) HTTP Request to upload ZIP to Vercel Blob, (9) HTTP Request to send the completion webhook back to Next.js.

## Acceptance Criteria
Running the workflow with two test PDFs produces a downloadable ZIP containing two annotated PDFs and a `manifest.json`.
