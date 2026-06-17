import { useState, useCallback } from 'react'
import type { AiTaskSuggestion, TodoDraft, TodoTask } from '../types'
import { formatSubtasksForDraft } from '../utils/tasks'

export function useAiSuggestion() {
  const [aiSuggestion, setAiSuggestion] = useState<AiTaskSuggestion | null>(null)
  const [aiMessage, setAiMessage] = useState('')
  const [isSuggestingWithAi, setIsSuggestingWithAi] = useState(false)

  const requestSuggestion = useCallback(async (
    draft: TodoDraft,
    tasks: TodoTask[],
    onSuggestion: (suggestion: AiTaskSuggestion) => void,
  ) => {
    if (!draft.title.trim() && !draft.description.trim()) {
      setAiMessage('Add a todo title or notes before asking Azure AI.')
      return
    }

    setIsSuggestingWithAi(true)
    setAiMessage('Asking Azure AI for an estimate and smaller steps...')

    try {
      const response = await fetch('/api/task-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            title: draft.title.trim(),
            description: draft.description.trim(),
            dueDate: draft.dueDate,
            stakeholders: draft.stakeholders.trim(),
            blockers: draft.blockers.trim(),
          },
          completedTasks: tasks
            .filter((t) => t.actualMinutes && t.actualMinutes > 0)
            .slice(0, 12)
            .map((t) => ({
              title: t.title,
              description: t.description,
              stakeholders: t.stakeholders,
              anticipatedMinutes: t.anticipatedMinutes,
              actualMinutes: t.actualMinutes,
            })),
        }),
      })

      const body = (await response.json()) as { error?: string } | AiTaskSuggestion

      if (!response.ok) {
        throw new Error('error' in body && body.error ? body.error : 'Azure AI request failed.')
      }

      const suggestion = body as AiTaskSuggestion
      setAiSuggestion(suggestion)
      onSuggestion(suggestion)
      setAiMessage('Azure AI added an estimate and smaller steps. You can edit them before saving.')
    } catch (err: unknown) {
      setAiMessage(`Could not get Azure AI suggestion: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsSuggestingWithAi(false)
    }
  }, [])

  const clearSuggestion = useCallback(() => {
    setAiSuggestion(null)
    setAiMessage('')
  }, [])

  return { aiSuggestion, aiMessage, isSuggestingWithAi, requestSuggestion, clearSuggestion, formatSubtasksForDraft }
}
