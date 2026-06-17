import type { TodoTask, TaskStatus, SuggestedSlot, TaskStep } from '../../types'
import { formatDuration, formatDateTime } from '../../utils/formatting'
import { parseMinutes } from '../../utils/formatting'
import { downloadCalendarBlock } from '../../utils/ics'

type Props = {
  task: TodoTask
  suggestions: SuggestedSlot[]
  isSyncingCalendar: boolean
  onUpdateTask: (taskId: string, updates: Partial<TodoTask>) => void
  onUpdateStep: (taskId: string, stepId: string, done: boolean) => void
  onSchedule: (task: TodoTask, slot: SuggestedSlot) => void
  onEdit: (taskId: string) => void
}

export function TaskCard({
  task,
  suggestions,
  isSyncingCalendar,
  onUpdateTask,
  onUpdateStep,
  onSchedule,
  onEdit,
}: Props) {
  return (
    <article className="task-card">
      <div className="task-topline">
        <div className="task-topline-left">
          <span className={`status-pill status-${task.status.toLowerCase().replace(/\s/g, '-')}`}>
            {task.status}
          </span>
          {task.category && <span className="category-badge">{task.category}</span>}
          {task.tags?.map((tag) => (
            <span className="tag-badge" key={tag}>{tag}</span>
          ))}
        </div>
        <div className="task-topline-right">
          <select
            aria-label={`Status for ${task.title}`}
            value={task.status}
            onChange={(e) => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
          >
            <option>Not started</option>
            <option>In progress</option>
            <option>Blocked</option>
            <option>Scheduled</option>
            <option>Done</option>
          </select>
          <button className="edit-task-btn" onClick={() => onEdit(task.id)} type="button" aria-label="Edit task">
            ✏️
          </button>
        </div>
      </div>

      <h3>{task.title}</h3>
      <p>{task.description || 'No notes yet.'}</p>

      {task.recurrence && (
        <div className="recurrence-badge">
          🔁 Repeats {task.recurrence.type}
          {task.recurrence.interval > 1 ? ` every ${task.recurrence.interval}` : ''}
          {task.recurrence.daysOfWeek?.length
            ? ` on ${task.recurrence.daysOfWeek.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`
            : ''}
        </div>
      )}

      {task.subtasks?.length ? (
        <SubtaskList
          subtasks={task.subtasks}
          rationale={task.aiEstimateRationale}
          taskId={task.id}
          onUpdateStep={onUpdateStep}
        />
      ) : null}

      <dl className="task-details">
        <div>
          <dt>Due</dt>
          <dd>{task.dueDate || 'Not set'}</dd>
        </div>
        <div>
          <dt>Stakeholders</dt>
          <dd>{task.stakeholders || 'Just me'}</dd>
        </div>
        <div>
          <dt>Anticipated</dt>
          <dd>{formatDuration(task.anticipatedMinutes)}</dd>
        </div>
        <div>
          <dt>Actual</dt>
          <dd>{formatDuration(task.actualMinutes)}</dd>
        </div>
      </dl>

      <label>
        Blockers
        <textarea
          onChange={(e) => onUpdateTask(task.id, { blockers: e.target.value })}
          placeholder="No blockers logged."
          value={task.blockers}
        />
      </label>

      <div className="form-row">
        <label>
          When completed, how long did it take?
          <input
            min="1"
            onChange={(e) => onUpdateTask(task.id, { actualMinutes: parseMinutes(e.target.value) || null })}
            placeholder="Minutes"
            type="number"
            value={task.actualMinutes ?? ''}
          />
        </label>
        <button className="secondary-button" onClick={() => onUpdateTask(task.id, { status: 'Done' })} type="button">
          Mark done
        </button>
      </div>

      {task.calendarStart && task.calendarEnd ? (
        <div className="calendar-callout">
          <strong>Scheduled:</strong> {formatDateTime(new Date(task.calendarStart))}
          <button className="secondary-button" onClick={() => downloadCalendarBlock(task)} type="button">
            Download calendar block
          </button>
        </div>
      ) : (
        <div className="schedule-list">
          <strong>Suggested calendar times</strong>
          {suggestions.length ? (
            suggestions.map((slot) => (
              <button
                disabled={isSyncingCalendar}
                key={slot.start.toISOString()}
                onClick={() => onSchedule(task, slot)}
                type="button"
              >
                {slot.label}
              </button>
            ))
          ) : (
            <p className="empty-state">
              No open work-hour slots before the due date. Try a later due date or shorter estimate.
            </p>
          )}
        </div>
      )}
    </article>
  )
}

function SubtaskList({
  subtasks,
  rationale,
  taskId,
  onUpdateStep,
}: {
  subtasks: TaskStep[]
  rationale?: string | null
  taskId: string
  onUpdateStep: (taskId: string, stepId: string, done: boolean) => void
}) {
  return (
    <div className="subtask-list">
      <strong>Smaller steps</strong>
      {rationale && <p>{rationale}</p>}
      <ul>
        {subtasks.map((step) => (
          <li key={step.id}>
            <label>
              <input
                checked={step.done}
                onChange={(e) => onUpdateStep(taskId, step.id, e.target.checked)}
                type="checkbox"
              />
              <span>{step.title}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
