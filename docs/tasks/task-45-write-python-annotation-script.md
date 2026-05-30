---
id: TASK-45
phase: "Phase 6 — Analysis Module and n8n Integration (Days 9–10)"
title: "Write Python annotation script"
status: pending
---

# TASK-45 — Write Python annotation script

## Phase
Phase 6 — Analysis Module and n8n Integration (Days 9–10)

## Description
Create `scripts/annotate_pdf.py`. Takes PDF binary and a list of search terms. Uses `pdfplumber` to extract per-page text, identifies pages where any term appears, uses `PyPDF2` to write the output PDF (with a text annotation marking matching pages). Returns a dict with `pdf_binary`, `annotated_pages` list, and `total_matches`.

## Acceptance Criteria
Given a PDF with the word "antenna" on page 3, the returned `annotated_pages` list includes `{"page": 3, "term": "antenna"}`.
