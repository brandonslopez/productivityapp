const DEFAULT_API_VERSION = '2024-10-21'
const MAX_COMPLETED_EXAMPLES = 12

function jsonResponse(status, body) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  }
}

function clampEstimate(minutes) {
  if (!Number.isFinite(minutes)) {
    return null
  }

  return Math.min(Math.max(Math.round(minutes / 5) * 5, 5), 480)
}

function parseJsonContent(content) {
  const trimmedContent = content.trim().replace(/^```json\s*|\s*```$/g, '')
  return JSON.parse(trimmedContent)
}

function normalizeSuggestion(rawSuggestion) {
  const estimatedMinutes = clampEstimate(Number(rawSuggestion.estimatedMinutes))
  const subtasks = Array.isArray(rawSuggestion.subtasks)
    ? rawSuggestion.subtasks
        .map((subtask) => String(subtask).trim())
        .filter(Boolean)
        .slice(0, 8)
    : []
  const rationale = String(rawSuggestion.rationale || '').trim().slice(0, 280)

  if (!estimatedMinutes || subtasks.length < 2 || !rationale) {
    throw new Error('Azure AI returned an incomplete task suggestion.')
  }

  return {
    estimatedMinutes,
    subtasks,
    rationale,
  }
}

module.exports = async function taskAssistant(context, req) {
  const endpoint = process.env.AZURE_AI_ENDPOINT
  const apiKey = process.env.AZURE_AI_API_KEY
  const deployment = process.env.AZURE_AI_DEPLOYMENT
  const apiVersion = process.env.AZURE_AI_API_VERSION || DEFAULT_API_VERSION

  if (!endpoint || !apiKey || !deployment) {
    context.res = jsonResponse(500, {
      error:
        'Azure AI is not configured. Set AZURE_AI_ENDPOINT, AZURE_AI_API_KEY, and AZURE_AI_DEPLOYMENT in the Static Web App API settings.',
    })
    return
  }

  const task = req.body?.task
  if (!task || (!task.title && !task.description)) {
    context.res = jsonResponse(400, { error: 'Add a task title or description before asking Azure AI.' })
    return
  }

  const completedTasks = Array.isArray(req.body?.completedTasks)
    ? req.body.completedTasks.slice(0, MAX_COMPLETED_EXAMPLES)
    : []
  const baseUrl = endpoint.replace(/\/+$/, '')
  const chatCompletionsUrl = `${baseUrl}/openai/deployments/${encodeURIComponent(
    deployment,
  )}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`

  try {
    const aiResponse = await fetch(chatCompletionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'You help a product manager with ADHD estimate task duration and split work into small concrete steps. Respond only with valid JSON matching this shape: {"estimatedMinutes": number, "subtasks": string[], "rationale": string}. Keep subtasks action-oriented, specific, and short. Estimate realistic focused-work minutes, not calendar elapsed time.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              task,
              completedTaskTimingExamples: completedTasks,
            }),
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    })

    const aiBody = await aiResponse.json()
    if (!aiResponse.ok) {
      context.log.error('Azure AI request failed.', aiBody)
      context.res = jsonResponse(aiResponse.status, {
        error: aiBody.error?.message || 'Azure AI request failed.',
      })
      return
    }

    const content = aiBody.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      context.res = jsonResponse(502, { error: 'Azure AI response did not include a message.' })
      return
    }

    context.res = jsonResponse(200, normalizeSuggestion(parseJsonContent(content)))
  } catch (error) {
    context.log.error('Could not create Azure AI task suggestion.', error)
    context.res = jsonResponse(502, {
      error: error instanceof Error ? error.message : 'Could not create Azure AI task suggestion.',
    })
  }
}
