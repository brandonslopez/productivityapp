import { useState } from 'react'
import type { TodoTask, TaskStatus, Recurrence, RecurrenceType } from '../../types'
import { allCategories, parseTags } from '../../utils/tasks'
import { formatDuration } from '../../utils/formatting'
import './EditTaskModal.css'

type Props = {
  task: TodoTask
  onSave: (taskId: string, updates: Partial<TodoTask>) => void
  onClose: () => void
  onDelete: (taskId: string) => void
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function EditTaskModal({ task, onSave, onClose, onDelete }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [dueDate, setDueDate] = useState(task.dueDate)
  const [stakeholders, setStakeholders] = useState(task.stakeholders)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [blockers, setBlockers] = useState(task.blockers)
  const [anticipatedMinutes, setAnticipatedMinutes] = useState(String(task.anticipatedMinutes))
  const [actualMinutes, setActualMinutes] = useState(task.actualMinutes != null ? String(task.actualMinutes) : '')
  const [tags, setTags] = useState((task.tags ?? []).join(', '))
  const [category, setCategory] = useState(task.category ?? '')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | ''>(task.recurrence?.type ?? '')
  const [recurrenceInterval, setRecurrenceInterval] = useState(String(task.recurrence?.interval ?? 1))
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(task.recurrence?.daysOfWeek ?? [])

  const handleSave = () => {
    let recurrence: Recurrence | null = null
    if (recurrenceType) {
      recurrence = {
        type: recurrenceType,
        interval: Math.max(1, parseInt(recurrenceInterval) || 1),
        ...(recurrenceType === 'weekly' && recurrenceDays.length ? { daysOfWeek: recurrenceDays } : {}),
      }
    }

    onSave(task.id, {
      title: title.trim(),
      description: description.trim(),
      dueDate,
      stakeholders: stakeholders.trim(),
      status,
      blockers: blockers.trim(),
      anticipatedMinutes: Math.max(0, parseInt(anticipatedMinutes) || 0),
      actualMinutes: actualMinutes ? Math.max(0, parseInt(actualMinutes) || 0) : null,
      tags: parseTags(tags),
      category: category || undefined,
      recurrence,
      ...(status === 'Done' && !task.completedAt ? { completedAt: new Date().toISOString() } : {}),
      ...(status !== 'Done' ? { completedAt: null } : {}),
    })
    onClose()
  }

  const toggleDay = (day: number) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit task</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        <form className="modal-form" onSubmit={(e) => { e.preventDefault(); handleSave() }}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label>
            Notes
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="form-row">
            <label>
              Due date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                <option>Not started</option>
                <option>In progress</option>
                <option>Blocked</option>
                <option>Scheduled</option>
                <option>Done</option>
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Stakeholders
              <input value={stakeholders} onChange={(e) => setStakeholders(e.target.value)} placeholder="Names, teams" />
            </label>
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">None</option>
                {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <label>
            Tags (comma-separated)
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="urgent, customer, sprint-3" />
          </label>

          <label>
            Blockers
            <textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} placeholder="What might stop you?" />
          </label>

          <div className="form-row">
            <label>
              Anticipated time (min)
              <input type="number" min="1" value={anticipatedMinutes} onChange={(e) => setAnticipatedMinutes(e.target.value)} />
            </label>
            <label>
              Actual time (min)
              <input type="number" min="1" value={actualMinutes} onChange={(e) => setActualMinutes(e.target.value)} placeholder={formatDuration(task.actualMinutes)} />
            </label>
          </div>

          <fieldset className="recurrence-fieldset">
            <legend>Recurrence</legend>
            <select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType | '')}>
              <option value="">No recurrence</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom interval</option>
            </select>
            {recurrenceType && (
              <label>
                Every
                <input type="number" min="1" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(e.target.value)} className="recurrence-interval" />
                {recurrenceType === 'daily' ? 'day(s)' : recurrenceType === 'weekly' ? 'week(s)' : recurrenceType === 'monthly' ? 'month(s)' : 'day(s)'}
              </label>
            )}
            {recurrenceType === 'weekly' && (
              <div className="day-picker">
                {dayLabels.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`day-btn ${recurrenceDays.includes(i) ? 'day-active' : ''}`}
                    onClick={() => toggleDay(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <div className="modal-actions">
            <button type="submit" className="wide-button">Save changes</button>
            <button type="button" className="secondary-button danger-button" onClick={() => { onDelete(task.id); onClose() }}>
              Delete task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
