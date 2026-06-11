import 'server-only'

/**
 * Intelligent requirement extraction from ETT documents.
 * Fixes:
 * - Filters out headers, page numbers, and irrelevant content
 * - Merges split requirements that span across chunks
 * - Only extracts actual technical requirements (bullet points)
 */

// Patterns that indicate header/footer noise to discard
const NOISE_PATTERNS = [
  /^NUEVO HOSPITAL/i,
  /^"Mejoramiento de los Servicios/i,
  /^de Salud Motupe/i,
  /^Av\. Circunvalación/i,
  /^Lambayeque.*Departamento/i,
  /Página\s*\d+/i,
  /^\s*Santiago de Surco\s*/i,
]

// Pattern to detect a partida section header (e.g., "06.11.01.02 CERRADURA...")
const PARTIDA_PATTERN = /^(\d{2}\.\d{2}\.\d{2}\.\d{2})\s+(.+)/

// Pattern to detect sub-section headers (e.g., "LECTOR BIOMÉTRICO", "CONSIDERACIONES")
const SUBSECTION_PATTERN = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{3,}$/

// Pattern to detect a bullet point (requirement start)
const BULLET_PATTERN = /^\s*[•\-]\s+|^\s*o\s+|^\s*\d+[\.\)]\s+/

interface ExtractedRequirement {
  requirementId: string
  text: string
  partida: string
  sourceDocumentId: string
}

/**
 * Extract structured requirements from an ETT document's text.
 * Filters noise, merges multi-line specs, and returns clean requirements.
 */
export function extractRequirementsFromETT(
  rawText: string,
  sourceDocumentId: string,
  targetPartidaPrefix?: string
): ExtractedRequirement[] {
  const lines = rawText.split('\n')
  const requirements: ExtractedRequirement[] = []
  let currentPartida = ''
  let currentSubsection = ''
  let currentReqLines: string[] = []
  let inTargetSection = !targetPartidaPrefix // if no filter, accept all
  let reqCounter = 0

  function flushRequirement() {
    if (currentReqLines.length === 0) return
    const text = currentReqLines.join('\n').trim()
    if (text.length < 30) {
      currentReqLines = []
      return
    }
    reqCounter++
    requirements.push({
      requirementId: `REQ-${String(reqCounter).padStart(3, '0')}`,
      text,
      partida: currentSubsection
        ? `${currentPartida} - ${currentSubsection}`
        : currentPartida,
      sourceDocumentId,
    })
    currentReqLines = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Skip noise (headers, page numbers, addresses)
    if (NOISE_PATTERNS.some(p => p.test(trimmed))) continue

    // Check for partida header
    const partidaMatch = trimmed.match(PARTIDA_PATTERN)
    if (partidaMatch) {
      flushRequirement()
      currentPartida = `${partidaMatch[1]} ${partidaMatch[2]}`
      currentSubsection = ''

      // Check if we should start/stop processing based on target prefix
      if (targetPartidaPrefix) {
        inTargetSection = partidaMatch[1].startsWith(targetPartidaPrefix)
      }
      continue
    }

    // Skip if not in target section
    if (!inTargetSection) continue

    // Check for sub-section header
    if (SUBSECTION_PATTERN.test(trimmed) && trimmed.length < 80) {
      flushRequirement()
      currentSubsection = trimmed
      continue
    }

    // Check if line starts a new requirement (bullet)
    if (BULLET_PATTERN.test(trimmed)) {
      flushRequirement()
      // Remove the bullet prefix for clean text
      const cleanedLine = trimmed
        .replace(/^\s*[•\-]\s+/, '')
        .replace(/^\s*o\s+/, '')
        .replace(/^\s*\d+[\.\)]\s+/, '')
      currentReqLines.push(cleanedLine)
      continue
    }

    // Continuation line — append to current requirement
    if (currentReqLines.length > 0) {
      currentReqLines.push(trimmed)
    }
  }

  // Flush any remaining requirement
  flushRequirement()

  return requirements
}
