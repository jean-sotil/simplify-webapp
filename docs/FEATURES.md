# Simplify — Document Intelligence Platform

## Core Purpose

Plataforma de análisis documental para empresas de ingeniería que licitan proyectos del estado. Automatiza la generación de la **Matriz de Cumplimiento** — el documento que cruza especificaciones técnicas requeridas (ETT) contra fichas técnicas de productos ofertados.

---

## Features

### Gestión de Documentos

- Upload múltiple con drag & drop (PDFs hasta 50 MB)
- 3 tipos de documentos: ETT, Hardware, Software
- Indexación automática con chunked embeddings (per-page vectors)
- Almacenamiento en Vercel Blob (privado)

### Búsqueda Semántica

- Búsqueda por significado en todos los documentos
- Resultados granulares a nivel de chunk (página/sección)
- Filtro opcional por documentos específicos
- Scores de similitud visibles

### Análisis de Cumplimiento

- Selección de documentos para comparar (HW + SW vs ETT)
- Extracción inteligente de requerimientos del ETT
- Matching semántico: requirements → chunks de documentos
- LLM (GPT-4o via OpenRouter) identifica evidencia exacta en cada PDF
- PDFs anotados con highlights amarillos
- Generación de Excel (Matriz de Cumplimiento) con tabs por documento
- Empaquetado en ZIP descargable
- Progreso en tiempo real (polling cada 2s con log de etapas)
- Mock mode para testing sin gastar tokens

### Gestión de Proyectos

- CRUD de proyectos con pipeline de etapas (Initiation → Completed)
- Adjuntar/desadjuntar documentos ETT a proyectos
- Dashboard con métricas (proyectos, documentos, análisis completados)

### Autenticación

- Email + password (Supabase Auth)
- Row Level Security — cada usuario ve solo sus datos

### Internacionalización

- 3 idiomas: Inglés, Español, Portugués
- Switcher de idioma en el nav
- Todas las strings traducidas

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16, Tailwind CSS, Radix UI |
| Backend | Server Actions, Route Handlers (Vercel Serverless) |
| Database | Supabase (Postgres + pgvector) |
| Storage | Vercel Blob (privado) |
| AI | OpenRouter (text-embedding-3-large + GPT-4o) |
| PDF | unpdf (extracción), pdf-lib (anotación) |
| Excel | xlsx |
| Deploy | Vercel Pro (Fluid Compute) |

---

## Architecture

```
UI (Next.js)
  → Server Actions (auth, CRUD, trigger analysis)
  → /api/analyze-documents (background processing)
    → Extract PDF text (unpdf via blob URL)
    → LLM identifies evidence per requirement (OpenRouter GPT-4o)
    → Annotate PDFs with highlights (pdf-lib)
    → Generate compliance matrix Excel (xlsx)
    → Package ZIP and upload to Blob
    → Update DB (analysis_results)
  → Supabase (Postgres + pgvector)
    → documents, document_chunks, projects, analysis_results
    → Chunked semantic search (cosine similarity)
```

---

## Key Flows

### Document Upload
1. User drags PDFs → client upload to Vercel Blob (files > 4MB)
2. Server extracts text (unpdf)
3. Text chunked by page (~2000 chars each)
4. Each chunk embedded (text-embedding-3-large, 1536 dims)
5. Stored in `document_chunks` table with page numbers

### Analysis
1. User selects ETT + hardware/software documents
2. Requirements extracted from ETT (intelligent parsing)
3. Each requirement embedded and searched against document chunks
4. Matched documents sent to `/api/analyze-documents`
5. For each document with matches:
   - PDF text extracted
   - LLM finds exact evidence text + page number
   - PDF annotated with yellow highlights
6. Compliance matrix Excel generated (one tab per document)
7. Everything packaged in ZIP → uploaded to Blob
8. UI shows download link when complete
