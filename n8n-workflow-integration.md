# n8n Workflow Integration Reference

This document is the authoritative reference for the integration between the Simplify webapp and an n8n workflow instance. Every field name and type listed here is derived directly from the production source code — nothing is fabricated or inferred from convention alone.

---

## Quick Start

The integration is a two-leg HTTP handshake:

1. **Webapp to n8n (outbound):** When a user triggers an analysis, a Next.js Server Action sends a single `POST` request to your n8n Webhook node. The body is a JSON object with project context, an `analysisId` that ties this run to a database record, the list of documents to process, and a callback URL.

2. **n8n to webapp (inbound):** When the workflow finishes, n8n sends a `POST` request to the callback URL (`webhookUrl`) that was passed in the original payload. The body reports the outcome (`completed` or `failed`) and the URL of the produced ZIP file.

The webapp does not poll. It relies entirely on receiving the callback to update the database record and refresh the UI.

---

## System Overview

```
[Browser]
    |
    | user clicks "Run Analysis"
    v
[Next.js Server Action — triggerAnalysis]
    |  1. Validates document selection (Zod)
    |  2. Confirms ETT document present
    |  3. Resolves blob URLs from Supabase (server-side, not from client)
    |  4. Inserts analysis_results row (status: 'processing')
    |  5. POSTs payload to N8N_WEBHOOK_URL (30s timeout)
    v
[n8n Webhook Trigger node]
    |
    | for each document in selectedDocuments:
    |   — download PDF binary from Vercel Blob
    |   — run Python annotation script
    |   — upload annotated PDF to Vercel Blob
    |
    | — build ZIP from all annotated PDFs + manifest.json
    | — upload ZIP to Vercel Blob
    v
[Next.js Webhook Receiver — POST /api/webhooks/n8n]
    |
    |  updates analysis_results:
    |    status → 'completed' | 'failed'
    |    zip_file_url, analysis_metadata, completed_at
    v
[Supabase — analysis_results table]
```

---

## Part 1: Outbound Payload (Webapp to n8n)

### Transport

The webapp sends a `POST` request to the URL configured in the `N8N_WEBHOOK_URL` environment variable. The request carries a single header:

```
Content-Type: application/json
```

There is no authentication token on the outbound request in the current implementation. If your n8n instance is publicly reachable, you should add a shared secret header at both ends.

The client sets a **30-second timeout**. If n8n does not respond with a 2xx status within that window, the server action catches the error, marks the `analysis_results` row as `failed`, and returns an error to the browser.

### Payload Schema

The TypeScript interface that governs this payload is `N8nWorkflowPayload` in `src/lib/n8n/client.ts`. The exact shape sent by `triggerN8nWorkflow` is:

```json
{
  "projectId": "3f1c2e4a-8b5d-4e7f-9a6c-1d2e3f4a5b6c",
  "projectName": "ETT Antenna Module Q3",
  "analysisId": "9b4a7f2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b",
  "selectedDocuments": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "filename": "ett-spec-rev3.pdf",
      "originalFileUrl": "https://abc123.public.blob.vercel-storage.com/ett-spec-rev3.pdf",
      "documentType": "ett"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "filename": "hardware-inventory.pdf",
      "originalFileUrl": "https://abc123.public.blob.vercel-storage.com/hardware-inventory.pdf",
      "documentType": "hardware"
    }
  ],
  "webhookUrl": "https://your-app.vercel.app/api/webhooks/n8n",
  "requirements": [
    {
      "requirementId": "REQ-001",
      "text": "The antenna module must support the 2.4 GHz frequency band with a gain of no less than 3 dBi.",
      "sourceDocumentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "matchedHardwareDocuments": [
        {
          "documentId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          "filename": "hardware-inventory.pdf",
          "originalFileUrl": "https://abc123.public.blob.vercel-storage.com/hardware-inventory.pdf",
          "similarityScore": 0.94
        }
      ]
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `projectId` | `string` (UUID v4) | Yes | The Supabase `id` of the project that triggered this analysis. |
| `projectName` | `string` | Yes | The human-readable project name, sourced from the `projects` table. Used for labelling in output artefacts. |
| `analysisId` | `string` (UUID v4) | Yes | The `id` of the newly created `analysis_results` row. n8n must echo this back in the callback so the webapp can update the correct record. |
| `selectedDocuments` | `Array<SelectedDocument>` | Yes | The documents chosen by the user for this analysis run. Always contains at least one entry. Always contains at least one document with `documentType: 'ett'` (enforced server-side before dispatch). |
| `webhookUrl` | `string` (URL) | Yes | The full URL of the webapp's inbound webhook endpoint. n8n must POST its result to exactly this URL. It is constructed server-side from `NEXT_PUBLIC_APP_URL`. |
| `requirements` | `Array<TracedRequirement>` | No | Pre-computed requirement-to-hardware-document trace map. Present when ETT documents have extractable text and the enrichment step succeeds. May be absent or empty — n8n must fall back to full document scanning when not provided. See Part 6 for the full field reference. |

### SelectedDocument Object

Each item in the `selectedDocuments` array has the following fields:

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID v4) | The Supabase `id` of the document record. |
| `filename` | `string` | The original filename of the uploaded PDF (e.g. `"hardware-inventory.pdf"`). |
| `originalFileUrl` | `string` (URL) | The direct URL to the PDF stored in Vercel Blob. This is what n8n downloads. |
| `documentType` | `"ett"` or `"hardware"` | Indicates the role of this document in the analysis. |

### The `documentType` Field

The `documentType` field is critical to the analysis workflow. It is a strict enum with exactly two values.

`"ett"` identifies an Engineering Test Template document — the specification source that contains the requirements to be matched against. At least one ETT document is mandatory; the server action rejects any analysis request that does not include one.

`"hardware"` identifies a hardware inventory or specifications document. These are the reference documents that n8n should annotate with highlights where they satisfy requirements found in the ETT.

The intended workflow logic is: extract requirements from all ETT documents, then locate and annotate matching sections in all hardware documents.

### Vercel Blob URL Behaviour

The `originalFileUrl` values in `selectedDocuments` are direct HTTPS URLs to files stored in Vercel Blob. In the current configuration they are public-read URLs, meaning n8n can download them with a plain HTTP GET request — no authentication header is required.

If Vercel Blob protection is enabled on the project in the future, the URLs will require a `Authorization: Bearer <BLOB_READ_WRITE_TOKEN>` header on every download request. The n8n builder should be aware of this and plan for it: the download node should be configurable to add this header when needed, even if it is not required today.

---

## Part 2: Inbound Result (n8n to Webapp)

### Transport

n8n sends a `POST` request to the URL it received in `webhookUrl`. The body must be `Content-Type: application/json`.

The webapp's receiver is at:

```
POST /api/webhooks/n8n
```

It uses `supabaseAdmin` (the service-role key) to update the `analysis_results` table, so it bypasses Row Level Security intentionally. There is no authentication check on the inbound request in the current implementation. If your n8n instance is publicly reachable, add a shared secret header and verify it in `route.ts`.

### Success Payload

When the workflow completes without error:

```json
{
  "analysisId": "9b4a7f2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b",
  "projectId": "3f1c2e4a-8b5d-4e7f-9a6c-1d2e3f4a5b6c",
  "status": "completed",
  "zipFileUrl": "https://abc123.public.blob.vercel-storage.com/analysis-9b4a7f2e.zip",
  "analysisMetadata": {
    "documentCount": 2,
    "totalPages": 47,
    "generatedAt": "2026-06-02T14:30:00.000Z"
  }
}
```

### Failure Payload

When the workflow fails at any step:

```json
{
  "analysisId": "9b4a7f2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b",
  "projectId": "3f1c2e4a-8b5d-4e7f-9a6c-1d2e3f4a5b6c",
  "status": "failed",
  "errorMessage": "Failed to download PDF: HTTP 403 from Vercel Blob"
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `analysisId` | `string` | Yes | The `analysisId` received in the original outbound payload. The webapp uses this to identify which `analysis_results` row to update. Missing this field causes a `400` response. |
| `projectId` | `string` | Yes | The `projectId` received in the original outbound payload. Used to revalidate the project page cache after the update. Missing this field causes a `400` response. |
| `status` | `"completed"` or `"failed"` | Yes | The outcome of the workflow. Any value other than these two strings causes the receiver to skip the database update silently and still return `{ success: true }`. |
| `zipFileUrl` | `string` (URL) | Conditional | Required when `status` is `"completed"`. The public URL of the ZIP archive containing annotated PDFs. Stored in `analysis_results.zip_file_url`. |
| `analysisMetadata` | `object` | Optional | Free-form JSON object stored verbatim in `analysis_results.analysis_metadata` (a JSONB column). No schema is enforced by the receiver — any serialisable object is accepted. |
| `errorMessage` | `string` | Conditional | Required when `status` is `"failed"`. A human-readable description of what went wrong. Stored in `analysis_results.error_message`. |

### What the Receiver Does

On receiving a valid request, the webhook handler at `src/app/api/webhooks/n8n/route.ts` performs the following in order:

1. Parses the JSON body. Returns `400 Invalid JSON` if parsing fails.
2. Checks that `analysisId` and `projectId` are present. Returns `400` if either is missing.
3. If `status === 'completed'`: updates the `analysis_results` row with `status: 'completed'`, `zip_file_url`, `analysis_metadata`, and `completed_at` set to the current ISO timestamp.
4. If `status === 'failed'`: updates the `analysis_results` row with `status: 'failed'` and `error_message`.
5. Calls `revalidatePath` for the project page so the Next.js cache is invalidated and the browser sees the updated state on next visit.
6. Returns `{ "success": true }` with HTTP 200.

---

## Part 3: n8n Workflow Configuration

### Recommended Node Sequence

The following nine-node sequence is the target configuration defined in TASK-44:

**Node 1 — Webhook Trigger**
Set the node to listen on HTTP `POST`. Set the response mode to "When last node finishes" if you want to hold the connection open, or "Immediately" to respond to the webapp quickly and process asynchronously. The webapp's 30-second timeout means "Immediately" is the safer default.

**Node 2 — Set Variables**
Extract and store the top-level fields from the incoming body for use by downstream nodes:
- `{{ $json.projectId }}`
- `{{ $json.analysisId }}`
- `{{ $json.webhookUrl }}`
- `{{ $json.selectedDocuments }}`

**Node 3 — SplitInBatches**
Iterate over `selectedDocuments`, processing one document at a time. Set batch size to 1. Each iteration produces one item containing a single `SelectedDocument` object.

**Node 4 — HTTP Request (download PDF)**
`GET {{ $json.originalFileUrl }}`. Set the response format to binary. This downloads the raw PDF bytes from Vercel Blob. If Vercel Blob protection is enabled, add `Authorization: Bearer {{ $env.VERCEL_BLOB_TOKEN }}`.

**Node 5 — Code node (Python annotation)**
Execute `scripts/annotate_pdf.py`. The script receives the PDF binary and the document metadata. It identifies sections that match ETT requirements, applies highlight annotations, and outputs the annotated PDF binary. See TASK-45 for the Python script specification.

**Node 6 — HTTP Request (upload annotated PDF)**
Upload the annotated PDF binary to Vercel Blob. Store the returned URL for inclusion in the ZIP manifest.

**Node 7 — Code node (Python ZIP builder)**
After all documents are processed, collect the annotated PDF URLs and create a ZIP archive containing all annotated PDFs plus a `manifest.json`. The manifest should include `projectId`, `analysisId`, `documentCount`, and `generatedAt`.

**Node 8 — HTTP Request (upload ZIP)**
Upload the ZIP binary to Vercel Blob. The returned URL becomes the `zipFileUrl` in the callback payload.

**Node 9 — HTTP Request (completion callback)**
`POST {{ $vars.webhookUrl }}` with the body:

```json
{
  "analysisId": "{{ $vars.analysisId }}",
  "projectId": "{{ $vars.projectId }}",
  "status": "completed",
  "zipFileUrl": "{{ $node['Upload ZIP'].json.url }}",
  "analysisMetadata": {
    "documentCount": "{{ $vars.selectedDocuments.length }}",
    "generatedAt": "{{ $now.toISO() }}"
  }
}
```

### Error Branch

Every node from Node 4 onward needs an error output connected to a final error callback node. That node sends:

```json
{
  "analysisId": "{{ $vars.analysisId }}",
  "projectId": "{{ $vars.projectId }}",
  "status": "failed",
  "errorMessage": "{{ $execution.lastError.message }}"
}
```

to `{{ $vars.webhookUrl }}`. Without this branch, any workflow failure will leave the `analysis_results` row permanently in `status: 'processing'` with no way for the user to know what went wrong.

### Workflow Response Mode

Configure the Webhook node with **"Respond Immediately"**. This sends an HTTP 200 back to the webapp as soon as the workflow is triggered, before any processing begins. The webapp does not expect a body in this 200 response — it only requires the response status to be 2xx so it does not throw an `N8nTriggerError`.

---

## Part 4: Environment Variables Required in n8n

The following values must be configured as credentials or environment variables in the n8n instance:

| Variable | Description |
|---|---|
| `VERCEL_BLOB_TOKEN` | The `BLOB_READ_WRITE_TOKEN` from the webapp's Vercel project. Required if n8n must upload annotated PDFs and ZIP files to Vercel Blob, and also required to download files if Blob access protection is enabled. |
| Webapp webhook URL | The callback URL is passed dynamically in each payload as `webhookUrl`, so n8n does not need to store it separately. However, if you want to validate it against an allowlist, configure that allowlist as an n8n environment variable. |

The `N8N_WEBHOOK_URL` needed by the webapp is the URL of Node 1 (the Webhook Trigger node) in your n8n instance. It is configured in Vercel as a server-side environment variable and is never exposed to the browser.

---

## Part 5: Edge Cases and Constraints

**The 30-second timeout.** The webapp's `fetch` call to n8n is wrapped in a 30-second `AbortController` timeout. If the n8n webhook node is configured to hold the connection open until the workflow finishes, and the workflow takes longer than 30 seconds, the webapp will record the analysis as `failed` even if n8n eventually succeeds. Always configure the n8n Webhook node in "Respond Immediately" mode.

**The ETT document requirement.** The server action enforces that `selectedDocuments` must contain at least one document with `documentType: 'ett'` before the payload is dispatched. n8n will never receive a payload without an ETT document.

**`analysisId` must be echoed exactly.** The `analysisId` in the callback payload must match exactly what was received. The webapp identifies the database row to update solely by this value. A mismatch means the row stays permanently in `status: 'processing'`.

**Empty `analysisMetadata` is acceptable.** The receiver treats `analysisMetadata` as optional. If n8n omits the field or sends `null`, the JSONB column is set to `null`. The UI code must handle a null `analysisMetadata` gracefully.

**Idempotency.** The webapp's webhook receiver does not implement idempotency checks. If n8n retries the callback (for example due to a network failure on the first delivery), the receiver will overwrite the `analysis_results` row again with the same values. This is safe for the `completed` case because the data is the same. For the `failed` case it is also benign. No deduplication logic is needed on the n8n side, but you should avoid sending conflicting callbacks (e.g., `completed` followed by `failed`) for the same `analysisId`.

**One analysis per project.** The `analysis_results` table has a `UNIQUE` constraint on `project_id`. A second `triggerAnalysis` call for the same project will fail at the `INSERT` step in the server action, not at the n8n layer. n8n will therefore never receive two concurrent analysis payloads for the same project.

**URL-resolved documents only.** The `originalFileUrl` values in the payload are resolved server-side from the `documents` table using the authenticated user's Supabase session. The client cannot inject arbitrary URLs into the payload — the server action ignores any URL the client provides and overwrites it from the database before dispatching to n8n. This means the URLs are always valid Vercel Blob URLs for documents that exist in the platform's database.

**No authentication on the inbound webhook (current state).** The `POST /api/webhooks/n8n` endpoint does not currently verify the caller's identity. Any client that can reach the production URL can update any `analysis_results` row by guessing a valid `analysisId`. For production hardening, add a shared secret header (e.g., `X-N8N-Secret`) that n8n sends and the receiver validates before processing.

---

## Part 6: Enriched Requirement-Traced Payload

This section documents the implemented enrichment of the outbound payload. Before dispatching to n8n, the webapp pre-computes a semantic match map between each ETT requirement chunk and the most relevant selected hardware documents. n8n receives the analysis already structured by requirement rather than a flat document list.

### Motivation

In the prior payload, n8n received all selected documents as a flat array and had to determine relevance itself — typically by running its own LLM calls, which is expensive, slow, and non-deterministic. The webapp already has all the capabilities needed to answer "which hardware document is most relevant to this requirement?" before dispatch: ETT text is stored in `documents.extracted_text`, embeddings are generated via `generateEmbeddingsBatch`, and the `search_documents_semantic` Postgres RPC performs vector similarity search. Computing the trace map in the webapp makes annotation decisions deterministic, auditable, and reproducible.

### Implementation Architecture

The enrichment is implemented across three files:

**`src/lib/search/semantic.ts` — `searchDocumentsByEmbedding`**

A thin RPC wrapper that accepts a pre-computed embedding vector instead of a query string. Unlike `semanticSearchDocuments`, it never calls the embedding API — the caller is responsible for the embedding. When `documentIds` is provided, results are filtered to only those IDs, scoping the search to the hardware PDFs selected for the current analysis run. Calls the same `search_documents_semantic` Postgres RPC as `semanticSearchDocuments`, using the authenticated `supabase` client so RLS applies correctly.

**`src/lib/validation/schemas.ts` — `MatchedHardwareDocumentSchema`, `TracedRequirementSchema`**

Two new Zod schemas that are the single source of truth for the trace map types. `MatchedHardwareDocumentSchema` describes one hardware document match. `TracedRequirementSchema` describes one requirement with its array of matches. Both export their inferred TypeScript types (`MatchedHardwareDocument`, `TracedRequirement`).

**`src/app/[lang]/projects/[id]/analysis/actions.ts` — `buildRequirementTraceMap`**

A module-private async function that:
1. Splits each ETT document's `extracted_text` into requirement candidates (split on `\n\n`, then on single `\n` preceding an uppercase letter or pattern keyword `REQ`, digit, or bullet; chunks shorter than 60 characters are discarded).
2. Labels candidates sequentially: `REQ-001`, `REQ-002`, …
3. Calls `generateEmbeddingsBatch` once with all candidate texts.
4. Calls `searchDocumentsByEmbedding` for each embedding via `Promise.all`, with `limit: 3`, `threshold: 0.65`, and `documentIds` scoped to the hardware documents selected for this run.
5. Enriches the matched entries with their Vercel Blob URLs (resolved from the same URL map already built during the document query).

The function is wrapped in try/catch. On any failure it logs with `console.warn` and returns `[]`, so the analysis is never blocked by an enrichment failure.

`triggerAnalysis` fetches `extracted_text` and `document_type` alongside `original_file_url` in its single documents query, then calls `buildRequirementTraceMap` after URL resolution and before the `triggerN8nWorkflow` call. The resulting `requirementsWithUrls` array is passed as the optional `requirements` field in the n8n payload.

### Payload Example

```json
{
  "projectId": "3f1c2e4a-8b5d-4e7f-9a6c-1d2e3f4a5b6c",
  "projectName": "ETT Antenna Module Q3",
  "analysisId": "9b4a7f2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b",
  "webhookUrl": "https://your-app.vercel.app/api/webhooks/n8n",
  "selectedDocuments": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "filename": "ett-spec-rev3.pdf",
      "originalFileUrl": "https://abc123.public.blob.vercel-storage.com/ett-spec-rev3.pdf",
      "documentType": "ett"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "filename": "hardware-inventory.pdf",
      "originalFileUrl": "https://abc123.public.blob.vercel-storage.com/hardware-inventory.pdf",
      "documentType": "hardware"
    }
  ],
  "requirements": [
    {
      "requirementId": "REQ-001",
      "text": "The antenna module must support the 2.4 GHz frequency band with a gain of no less than 3 dBi.",
      "sourceDocumentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "matchedHardwareDocuments": [
        {
          "documentId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          "filename": "hardware-inventory.pdf",
          "originalFileUrl": "https://abc123.public.blob.vercel-storage.com/hardware-inventory.pdf",
          "similarityScore": 0.94
        }
      ]
    },
    {
      "requirementId": "REQ-002",
      "text": "Operating temperature range shall be −40°C to +85°C.",
      "sourceDocumentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "matchedHardwareDocuments": [
        {
          "documentId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          "filename": "hardware-inventory.pdf",
          "originalFileUrl": "https://abc123.public.blob.vercel-storage.com/hardware-inventory.pdf",
          "similarityScore": 0.81
        }
      ]
    },
    {
      "requirementId": "REQ-003",
      "text": "Connector interface shall be SMA female, 50Ω impedance.",
      "sourceDocumentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "matchedHardwareDocuments": []
    }
  ]
}
```

### Field Reference for `requirements[n]`

All field names and types are enforced by `TracedRequirementSchema` in `src/lib/validation/schemas.ts`.

| Field | Type | Description |
|---|---|---|
| `requirementId` | `string` | Sequential identifier for this requirement within the run. Format: `REQ-{zero-padded index}` (e.g. `REQ-001`). Index is 1-based and continuous across all ETT documents in the selection. |
| `text` | `string` | The verbatim requirement chunk as extracted from the ETT document's `extracted_text` column. Minimum 60 characters. |
| `sourceDocumentId` | `string` (UUID v4) | The `id` of the ETT document from which this chunk was extracted. Used by n8n to correlate annotations back to the correct source ETT PDF. |
| `matchedHardwareDocuments` | `Array<MatchedHardwareDocument>` | Hardware documents from `selectedDocuments` that scored above the 0.65 similarity threshold. Maximum 3 entries per requirement, ordered descending by `similarityScore`. Empty when no hardware document reaches the threshold. |

### Field Reference for `requirements[n].matchedHardwareDocuments[m]`

All field names and types are enforced by `MatchedHardwareDocumentSchema` in `src/lib/validation/schemas.ts`.

| Field | Type | Description |
|---|---|---|
| `documentId` | `string` (UUID v4) | The Supabase `id` of the hardware document. Always matches an `id` in `selectedDocuments`. |
| `filename` | `string` | The original filename of the hardware PDF. Included for convenience so n8n does not need to cross-reference `selectedDocuments` by ID. |
| `originalFileUrl` | `string` (URL) | The Vercel Blob URL of the hardware PDF. Identical to `originalFileUrl` in `selectedDocuments` for the same document. |
| `similarityScore` | `number` | Cosine similarity score in `[0, 1]`. Produced by the `search_documents_semantic` Postgres RPC and clamped to `[0, 1]`. Values at or above `0.65` are included; values below are filtered out before the payload is assembled. |

### How n8n Should Consume This Field

For each item in `requirements`, n8n knows exactly which hardware PDFs to examine for that requirement, ranked by relevance. The recommended Node 5 (Python annotation script) behaviour is:

1. Receive the `requirements` array alongside the document binary.
2. Filter `requirements` to those whose `matchedHardwareDocuments` contains the current document's `documentId`.
3. For each matched requirement, use the `text` field as the search query when locating the relevant passage in the PDF for annotation.
4. Apply a highlight or margin annotation that includes the `requirementId` label so the reader can trace each annotation back to its source requirement.

When `requirements` is absent or empty, the annotation script should fall back to its existing full-document scanning logic.

### Performance Characteristics

For a typical ETT with 20 requirements and 1–5 hardware documents selected:

- Requirement extraction (paragraph chunking): under 5ms, deterministic, no API call.
- `generateEmbeddingsBatch(20 texts)` via OpenRouter: approximately 400–800ms as a single HTTP request.
- 20 × `searchDocumentsByEmbedding` RPC calls executed in parallel via `Promise.all`: approximately 50–100ms each, total approximately 100–200ms with parallelism.
- Total enrichment overhead added to `triggerAnalysis`: approximately 1–2 seconds.

This is well within the 30-second n8n webhook timeout. For ETTs producing more than 40 requirements, the parallel `Promise.all` pattern remains effective; the bottleneck shifts to the single batch embedding call, which scales sub-linearly with token count.
