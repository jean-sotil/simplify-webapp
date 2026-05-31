export class N8nTriggerError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'N8nTriggerError'
  }
}

export interface N8nWorkflowPayload {
  projectId: string
  projectName: string
  analysisId: string
  selectedDocuments: Array<{
    id: string
    filename: string
    originalFileUrl: string
    documentType: string
  }>
  webhookUrl: string
}

export async function triggerN8nWorkflow(payload: N8nWorkflowPayload): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl || webhookUrl.includes('<your-n8n')) {
    throw new N8nTriggerError('N8N_WEBHOOK_URL is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new N8nTriggerError(
        `n8n webhook responded with ${response.status}`,
        response.status
      )
    }
  } catch (err) {
    if (err instanceof N8nTriggerError) throw err
    throw new N8nTriggerError('Failed to reach n8n webhook', undefined, err)
  } finally {
    clearTimeout(timeout)
  }
}
