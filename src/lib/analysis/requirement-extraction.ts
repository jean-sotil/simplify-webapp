import 'server-only'

/**
 * Intelligent requirement extraction from ETT documents.
 * Works with the extracted text format stored in the DB where pages may be
 * concatenated into single lines with space separators.
 *
 * Strategy:
 * 1. Pre-process: split concatenated text into logical sentences/fragments
 * 2. Find the target section (e.g., 06.11 - Control de Acceso)
 * 3. Extract individual requirements/specs from within that section
 */

interface ExtractedRequirement {
  requirementId: string
  text: string
  partida: string
  sourceDocumentId: string
}

/**
 * Extract structured requirements from an ETT document's text.
 */
export function extractRequirementsFromETT(
  rawText: string,
  sourceDocumentId: string,
  targetPartidaPrefix?: string
): ExtractedRequirement[] {
  // Step 1: Normalize — split on sentence boundaries and partida patterns
  // This handles the case where pdfjs concatenates everything into few long lines
  const normalized = normalizeText(rawText)
  const lines = normalized.split('\n')

  const requirements: ExtractedRequirement[] = []
  let currentPartida = ''
  let currentReqLines: string[] = []
  let inTargetSection = !targetPartidaPrefix
  let reqCounter = 0

  function flushRequirement() {
    if (currentReqLines.length === 0) return
    const text = currentReqLines.join('\n').trim()
    if (text.length < 15) {
      currentReqLines = []
      return
    }
    // Skip lines that are clearly section descriptions, not specs
    if (text.length > 300 && !text.includes('\n')) {
      currentReqLines = []
      return
    }
    reqCounter++
    requirements.push({
      requirementId: `REQ-${String(reqCounter).padStart(3, '0')}`,
      text,
      partida: currentPartida,
      sourceDocumentId,
    })
    currentReqLines = []
  }

  // Noise patterns
  const NOISE = [
    /^NUEVO HOSPITAL/i,
    /^.Mejoramiento de los Servicios/i,
    /^Av\.\s*Circunvalaci/i,
    /^Provincia de Lambayeque/i,
    /Página\s*\d+/i,
    /Santiago de Surco/i,
    /^--- Page \d+ ---$/,
  ]

  // Partida pattern
  const PARTIDA = /^(\d{2}\.\d{2}(?:\.\d{2}){0,2})\s+(.+)/

  // Spec/requirement start indicators
  const SPEC_STARTERS = [
    /^Debe\b/i, /^Deberá\b/i, /^Puerto[s]?\b/i, /^Incluir\b/i, /^Incluye\b/i,
    /^Soporta[r]?\b/i, /^Voltaje\b/i, /^Protección\b/i, /^Temperatura\b/i,
    /^Humedad\b/i, /^Algoritmo\b/i, /^Certificación\b/i, /^Listado\s+por\b/i,
    /^Procesador\b/i, /^Frecuencia\b/i, /^Memoria\b/i, /^Almacenamiento\b/i,
    /^Arquitectura\b/i, /^Unidad\b/i, /^Tarjeta\b/i, /^Material\b/i,
    /^Tipo\s+de\b/i, /^Licencia\b/i, /^Autenticación\b/i,
    /^El\s+controlador\b/i, /^El\s+sistema\b/i, /^La\s+(identificación|interfaz|comunicación)\b/i,
    /^Los\s+controladores\b/i, /^Se\s+(listan|pueden|instalará|debe|requiere)\b/i,
    /^Reporte\b/i, /^Informe\b/i, /^Reportes\b/i,
    /^Alarma[s]?\b/i, /^Las\s+alarmas\b/i,
    /^\d{2,4}\s*(GB|MB|TB|MHz|GHz|Mbps|VDC|VAC|LBS|bits)\b/i,
    /^\d+\s*(puertos?|entradas?|salidas?|núcleos?)\b/i,
    /^Con\s+(reducción|optimizador|protección)\b/i,
    /^Mínimo\b/i, /^Máximo\b/i, /^Para\s+ser\b/i,
    /^Señalizado\b/i, /^Retornar\b/i, /^Acabado\b/i,
    /^LED\b/i, /^RS-485\b/i, /^Wiegand\b/i, /^IP\d{2}\b/i,
  ]

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (NOISE.some(p => p.test(trimmed))) continue

    // Check for partida header
    const partidaMatch = trimmed.match(PARTIDA)
    if (partidaMatch) {
      flushRequirement()
      currentPartida = `${partidaMatch[1]} ${partidaMatch[2].trim()}`
      if (targetPartidaPrefix) {
        inTargetSection = partidaMatch[1].startsWith(targetPartidaPrefix)
      }
      continue
    }

    if (!inTargetSection) continue

    // Check if this is a new spec/requirement
    const isNewSpec = SPEC_STARTERS.some(p => p.test(trimmed))
    if (isNewSpec) {
      flushRequirement()
      currentReqLines.push(trimmed)
      continue
    }

    // If we have an open requirement and this looks like a continuation
    if (currentReqLines.length > 0 && trimmed.length < 250) {
      // Don't continue if this starts another partida or is all-caps header
      if (/^[A-ZÁÉÍÓÚÑ]{4,}(\s+[A-ZÁÉÍÓÚÑ]+)*$/.test(trimmed)) {
        flushRequirement()
        continue
      }
      currentReqLines.push(trimmed)
    }
  }

  flushRequirement()
  return requirements
}

/**
 * Normalize extracted PDF text into individual lines.
 * Handles the case where entire pages are concatenated into single strings.
 * Splits on partida patterns and sentence-like boundaries.
 */
function normalizeText(text: string): string {
  // First, split on page markers if they exist
  let result = text.replace(/--- Page \d+ ---/g, '\n')

  // Split before partida numbers (06.11.01.02 etc.)
  result = result.replace(/(\s)(\d{2}\.\d{2}\.\d{2}\.\d{2}\s)/g, '\n$2')
  result = result.replace(/(\s)(\d{2}\.\d{2}\.\d{2}\s)/g, '\n$2')
  result = result.replace(/(\s)(\d{2}\.\d{2}\s)/g, '\n$2')

  // Split on common sentence starters that indicate new requirements
  // (lookbehind for period/space before these keywords)
  const splitBefore = [
    'Debe ', 'Deberá ', 'Incluir ', 'Incluye ', 'Puerto ',
    'Procesador ', 'Frecuencia ', 'Memoria ', 'Almacenamiento ',
    'Arquitectura ', 'Tarjeta ', 'Sistema ', 'Unidad ',
    'El controlador ', 'El sistema ', 'El acceso ',
    'Los controladores ', 'La identificación ', 'La comunicación ',
    'Se listan ', 'Se pueden ', 'Se instalará ',
    'Reporte de ', 'Informe de ', 'Reportes ',
    'Alarma ', 'Las alarmas ',
    'Soporta ', 'Voltaje ', 'Protección ', 'Temperatura ',
    'Humedad ', 'Algoritmo ', 'Certificación ', 'Listado por ',
    'Material:', 'Acabado ', 'Tipo de ',
    'Licencia ', 'Autenticación ', 'Mínimo ', 'Máximo ',
  ]

  for (const keyword of splitBefore) {
    // Split before keyword when preceded by a period+space or double-space
    result = result.replace(new RegExp(`([.!?])\\s+(${escapeRegex(keyword)})`, 'g'), '$1\n$2')
    // Also split when preceded by just a space (common in PDF extraction)
    result = result.replace(new RegExp(`(\\s{2,})(${escapeRegex(keyword)})`, 'g'), '\n$2')
  }

  // Split on bullet patterns
  result = result.replace(/\s+(o\s{2,})/g, '\n$1')

  // Clean up multiple newlines
  result = result.replace(/\n{3,}/g, '\n\n')

  return result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
