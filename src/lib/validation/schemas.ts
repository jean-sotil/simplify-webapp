import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const PDF_MIME_TYPE = "application/pdf";
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// ---------------------------------------------------------------------------
// Project stage enum
// Matches the `stage` column values defined in TASK-15 (Supabase tables).
// ---------------------------------------------------------------------------

export const ProjectStageSchema = z.enum([
  "initiation",
  "planning",
  "docs_analysis",
  "sustento_letters",
  "development",
  "deployment",
  "completed",
]);

export type ProjectStage = z.infer<typeof ProjectStageSchema>;

// ---------------------------------------------------------------------------
// CreateProjectSchema
// Validates the payload sent when a user creates a new project.
// ---------------------------------------------------------------------------

export const CreateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Project name is required." })
    .max(255, { message: "Project name must be 255 characters or fewer." }),

  description: z
    .string()
    .trim()
    .max(2000, { message: "Description must be 2 000 characters or fewer." })
    .optional()
    .default(""),

  stage: ProjectStageSchema.optional().default("initiation"),

  // Optional in POC — team_id is nullable until multi-tenant setup is complete
  teamId: z
    .string()
    .uuid({ message: "teamId must be a valid UUID." })
    .optional()
    .nullable(),

  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .default({}),
});

export type CreateProject = z.infer<typeof CreateProjectSchema>;

// ---------------------------------------------------------------------------
// UpdateProjectSchema
// Every field is optional — callers supply only the fields they intend to
// change.  At least one field must be present to prevent no-op mutations.
// ---------------------------------------------------------------------------

export const UpdateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Project name cannot be empty." })
      .max(255, { message: "Project name must be 255 characters or fewer." })
      .optional(),

    description: z
      .string()
      .trim()
      .max(2000, { message: "Description must be 2 000 characters or fewer." })
      .optional(),

    stage: ProjectStageSchema.optional(),

    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "At least one field must be provided for an update." },
  );

export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

// ---------------------------------------------------------------------------
// DocumentUploadSchema
// Validates the metadata accompanying a file upload.
// The `file` field accepts a browser File object (client) or a plain object
// with { name, size, type } so the schema works in both client and server
// contexts (e.g. FormData parsing in a Server Action).
// ---------------------------------------------------------------------------

const DocumentTypeSchema = z.enum(["ett", "hardware", "software", "sustento"], {
  message: "Document type must be 'ett', 'hardware', 'software', or 'sustento'.",
});

export type DocumentType = z.infer<typeof DocumentTypeSchema>;

const FileLikeSchema = z
  .object({
    name: z.string().min(1),
    size: z.number().int().nonnegative(),
    type: z.string(),
  })
  .refine((f) => f.type === PDF_MIME_TYPE, {
    message: "Only PDF files are accepted.",
  })
  .refine((f) => f.size <= MAX_FILE_SIZE_BYTES, {
    message: "File size must not exceed 50 MB.",
  })
  .refine((f) => f.name.toLowerCase().endsWith(".pdf"), {
    message: "File must have a .pdf extension.",
  });

export const DocumentUploadSchema = z.object({
  file: FileLikeSchema,

  documentType: DocumentTypeSchema,

  teamId: z
    .string()
    .uuid({ message: "teamId must be a valid UUID." })
    .optional()
    .nullable(),

  metadata: z
    .object({
      category: z.string().trim().optional(),
      version: z.string().trim().optional(),
      source: z.string().trim().optional(),
    })
    .optional()
    .default({}),
});

export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;

// ---------------------------------------------------------------------------
// SelectedDocumentSchema
// Represents a single document the user has chosen to include in an analysis
// run.  Matches the shape stored in `selected_documents JSONB` (TASK-15) and
// sent to the n8n webhook payload (revised-analysis-architecture.md).
// ---------------------------------------------------------------------------

export const SelectedDocumentSchema = z.object({
  id: z
    .string()
    .uuid({ message: "Document id must be a valid UUID." }),

  filename: z
    .string()
    .trim()
    .min(1, { message: "Filename is required." }),

  // URL is resolved server-side from the documents table using the document id.
  // Clients may supply an empty string; the server action overwrites it before
  // forwarding the payload to n8n.
  url: z.string(),

  documentType: DocumentTypeSchema,

  relatedRequirements: z
    .array(z.string().trim().min(1))
    .min(0)
    .default([]),
});

export type SelectedDocument = z.infer<typeof SelectedDocumentSchema>;

// ---------------------------------------------------------------------------
// MatchedHardwareDocumentSchema
// Represents a single hardware document that was semantically matched against
// an ETT requirement.  Embedded inside TracedRequirementSchema.
// ---------------------------------------------------------------------------

export const MatchedHardwareDocumentSchema = z.object({
  documentId: z
    .string()
    .uuid({ message: "documentId must be a valid UUID." }),

  filename: z
    .string()
    .trim()
    .min(1, { message: "filename is required." }),

  originalFileUrl: z
    .string()
    .min(1, { message: "originalFileUrl is required." }),

  similarityScore: z
    .number()
    .min(0)
    .max(1),

  pageNumber: z
    .number()
    .int()
    .positive()
    .optional(),
});

export type MatchedHardwareDocument = z.infer<typeof MatchedHardwareDocumentSchema>;

// ---------------------------------------------------------------------------
// TracedRequirementSchema
// A single ETT requirement with its ranked list of semantically matched
// hardware documents.  Used to build the `requirements` array in the n8n
// outbound payload so n8n can direct each annotation to the correct hardware
// PDF without running its own relevance search.
// ---------------------------------------------------------------------------

export const TracedRequirementSchema = z.object({
  requirementId: z
    .string()
    .trim()
    .min(1, { message: "requirementId is required." }),

  text: z
    .string()
    .trim()
    .min(1, { message: "Requirement text is required." }),

  sourceDocumentId: z
    .string()
    .uuid({ message: "sourceDocumentId must be a valid UUID." }),

  matchedHardwareDocuments: z.array(MatchedHardwareDocumentSchema),
});

export type TracedRequirement = z.infer<typeof TracedRequirementSchema>;
