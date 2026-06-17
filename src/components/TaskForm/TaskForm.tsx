import type { TodoDraft, AiTaskSuggestion, RecurrenceType } from '../../types'
import { allCategories } from '../../utils/tasks'
import { formatDuration } from '../../utils/formatting'

type Props = {
  draft: TodoDraft
  onDraftChange: (draft: TodoDraft) => void
  onSubmit: () => void
  suggestedMinutes: number
  aiSuggestion: AiTaskSuggestion | null
  aiMessage: string
  isSuggestingWithAi: boolean
  onRequestAi: () => void
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function TaskForm({
  draft,
  onDraftChange,
  onSubmit,
  suggestedMinutes,
  aiSuggestion,
  aiMessage,
  isSuggestingWithAi,
  onRequestAi,
}: Props) {
  const update = (partial: Partial<TodoDraft>) => onDraftChange({ ...draft, ...partial })

  const toggleDay = (day: number) => {
    const days = draft.recurrenceDays.includes(day)
      ? draft.recurrenceDays.filter((d) => d !== day)
      : [...draft.recurrenceDays, day].sort()
    update({ recurrenceDays: days })
  }

  return (
    <section className="panel task-form-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Add todo</p>
          <h2>Capture enough to schedule it</h2>
        </div>
        <span className="count-badge">AI estimate: {formatDuration(suggestedMinutes)}</span>
      </div>

      <form className="task-form" onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        <label>
          Todo
          <input onChange={(e) => update({ title: e.target.value })} placeholder="Example: draft customer email" value={draft.title} />
        </label>

        <label>
          Notes
          <textarea onChange={(e) => update({ description: e.target.value })} placeholder="What outcome do you need?" value={draft.description} />
        </label>

        <div className="form-row">
          <label>
            Due date
            <input type="date" onChange={(e) => update({ dueDate: e.target.value })} value={draft.dueDate} />
          </label>
          <label>
            Stakeholders
            <input onChange={(e) => update({ stakeholders: e.target.value })} placeholder="Names, teams, or customers" value={draft.stakeholders} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Status
            <select onChange={(e) => update({ status: e.target.value as TodoDraft['status'] })} value={draft.status}>
              <option>Not started</option>
              <option>In progress</option>
              <option>Blocked</option>
              <option>Scheduled</option>
            </select>
          </label>
          <label>
            Anticipated time
            <input min="1" onChange={(e) => update({ anticipatedMinutes: e.target.value })} placeholder={`${suggestedMinutes} minutes`} type="number" value={draft.anticipatedMinutes} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Category
            <select onChange={(e) => update({ category: e.target.value })} value={draft.category}>
              <option value="">None</option>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Tags (comma-separated)
            <input onChange={(e) => update({ tags: e.target.value })} placeholder="urgent, customer, sprint-3" value={draft.tags} />
          </label>
        </div>

        <label>
          Blockers
          <textarea onChange={(e) => update({ blockers: e.target.value })} placeholder="What might stop you? Missing input, decision, access, energy?" value={draft.blockers} />
        </label>

        <fieldset className="recurrence-fieldset">
          <legend>Recurrence</legend>
          <select value={draft.recurrenceType} onChange={(e) => update({ recurrenceType: e.target.value as RecurrenceType | '' })}>
            <option value="">No recurrence</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom interval</option>
          </select>
          {draft.recurrenceType && (
            <label>
              Every
              <input type="number" min="1" value={draft.recurrenceInterval} onChange={(e) => update({ recurrenceInterval: e.target.value })} className="recurrence-interval" />
              {draft.recurrenceType === 'daily' ? 'day(s)' : draft.recurrenceType === 'weekly' ? 'week(s)' : draft.recurrenceType === 'monthly' ? 'month(s)' : 'day(s)'}
            </label>
          )}
          {draft.recurrenceType === 'weekly' && (
            <div className="day-picker">
              {dayLabels.map((label, i) => (
                <button key={i} type="button" className={`day-btn ${draft.recurrenceDays.includes(i) ? 'day-active' : ''}`} onClick={() => toggleDay(i)}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <div className="ai-assistant-card">
          <div>
            <strong>Azure AI estimate and breakdown</strong>
            <p>Send the title, notes, blockers, and your completed-task timing examples to Azure AI for a duration estimate and actionable next steps.</p>
          </div>
          <button className="secondary-button" disabled={isSuggestingWithAi} onClick={onRequestAi} type="button">
            {isSuggestingWithAi ? 'Asking Azure AI...' : 'Ask Azure AI to estimate and split'}
          </button>
          {aiMessage && <p className="guardrail">{aiMessage}</p>}
          {aiSuggestion && (
            <p className="ai-rationale"><strong>Why:</strong> {aiSuggestion.rationale}</p>
          )}
        </div>

        <label>
          Smaller steps
          <textarea onChange={(e) => update({ subtasks: e.target.value })} placeholder="One step per line. Azure AI can draft these for you." value={draft.subtasks} />
        </label>

        <button className="wide-button" type="submit">Add todo and suggest calendar times</button>
      </form>
    </section>
  )
}
