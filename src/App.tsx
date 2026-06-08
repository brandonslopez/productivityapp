import { useEffect, useMemo, useState } from 'react'
import { PublicClientApplication, type AccountInfo } from '@azure/msal-browser'
import './App.css'

type TaskStatus = 'Not started' | 'In progress' | 'Blocked' | 'Scheduled' | 'Done'

type TodoTask = {
  id: string
  title: string
  description: string
  dueDate: string
  stakeholders: string
  status: TaskStatus
  blockers: string
  anticipatedMinutes: number
  actualMinutes: number | null
  completedAt: string | null
  calendarStart: string | null
  calendarEnd: string | null
  createdAt: string
}

type TodoDraft = {
  title: string
  description: string
  dueDate: string
  stakeholders: string
  status: TaskStatus
  blockers: string
  anticipatedMinutes: string
}

type SuggestedSlot = {
  label: string
  start: Date
  end: Date
}

const authConfig = {
  clientId: import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined,
  tenantId: (import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined) || 'consumers',
  redirectUri: import.meta.env.VITE_REDIRECT_URI as string | undefined,
}

let authClient: PublicClientApplication | null | undefined

const initialDraft: TodoDraft = {
  title: '',
  description: '',
  dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
  stakeholders: '',
  status: 'Not started',
  blockers: '',
  anticipatedMinutes: '',
}

const initialTasks: TodoTask[] = [
  {
    id: 'task-sample-focus-block',
    title: 'Plan this week',
    description: 'Review open work, pick the next focus blocks, and protect time on the calendar.',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
    stakeholders: 'Me',
    status: 'Not started',
    blockers: '',
    anticipatedMinutes: 45,
    actualMinutes: null,
    completedAt: null,
    calendarStart: null,
    calendarEnd: null,
    createdAt: new Date().toISOString(),
  },
]

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const savedValue = window.localStorage.getItem(key)

    if (!savedValue) {
      return initialValue
    }

    try {
      return JSON.parse(savedValue) as T
    } catch (error) {
      console.warn(`Could not load ${key} from local storage.`, error)
      return initialValue
    }
  })

  const saveValue = (nextValue: T) => {
    setValue(nextValue)
    window.localStorage.setItem(key, JSON.stringify(nextValue))
  }

  return [value, saveValue] as const
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function createAuthClient() {
  if (authClient !== undefined) {
    return authClient
  }

  if (!authConfig.clientId) {
    authClient = null
    return null
  }

  authClient = new PublicClientApplication({
    auth: {
      clientId: authConfig.clientId,
      authority: `https://login.microsoftonline.com/${authConfig.tenantId}`,
      redirectUri: authConfig.redirectUri || window.location.origin,
    },
    cache: {
      cacheLocation: 'localStorage',
    },
  })

  return authClient
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function parseMinutes(value: string) {
  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return 'Not logged'
  }

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function sortByPriority(tasks: TodoTask[]) {
  const statusRank: Record<TaskStatus, number> = {
    'In progress': 0,
    Scheduled: 1,
    'Not started': 2,
    Blocked: 3,
    Done: 4,
  }

  return [...tasks].sort((first, second) => {
    const statusDifference = statusRank[first.status] - statusRank[second.status]
    if (statusDifference !== 0) {
      return statusDifference
    }

    return first.dueDate.localeCompare(second.dueDate)
  })
}

function estimateMinutesForDraft(tasks: TodoTask[], draft: TodoDraft) {
  const completedTasks = tasks.filter((task) => task.actualMinutes && task.actualMinutes > 0)
  const stakeholder = draft.stakeholders.trim().toLowerCase()
  const matchingStakeholderTasks = stakeholder
    ? completedTasks.filter((task) => task.stakeholders.toLowerCase().includes(stakeholder))
    : []
  const sourceTasks = matchingStakeholderTasks.length ? matchingStakeholderTasks : completedTasks

  if (sourceTasks.length) {
    const average =
      sourceTasks.reduce((total, task) => total + (task.actualMinutes ?? 0), 0) / sourceTasks.length
    return Math.round(average / 5) * 5
  }

  return parseMinutes(draft.anticipatedMinutes) || 45
}

function getEstimatedMinutes(task: TodoTask, tasks: TodoTask[]) {
  if (task.actualMinutes) {
    return task.actualMinutes
  }

  if (task.anticipatedMinutes) {
    return task.anticipatedMinutes
  }

  const completedTasks = tasks.filter((completedTask) => completedTask.actualMinutes)
  if (!completedTasks.length) {
    return 45
  }

  return Math.round(
    completedTasks.reduce((total, completedTask) => total + (completedTask.actualMinutes ?? 0), 0) /
      completedTasks.length,
  )
}

function combineDateAndHour(date: Date, hour: number) {
  const nextDate = new Date(date)
  nextDate.setHours(hour, 0, 0, 0)
  return nextDate
}

function isWeekend(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6
}

function overlapsExistingTask(start: Date, end: Date, tasks: TodoTask[]) {
  return tasks.some((task) => {
    if (!task.calendarStart || !task.calendarEnd || task.status === 'Done') {
      return false
    }

    const taskStart = new Date(task.calendarStart)
    const taskEnd = new Date(task.calendarEnd)
    return start < taskEnd && end > taskStart
  })
}

function getScheduleSuggestions(task: TodoTask, tasks: TodoTask[]) {
  const suggestions: SuggestedSlot[] = []
  const now = new Date()
  const dueDate = task.dueDate ? new Date(`${task.dueDate}T17:00:00`) : new Date(now)
  const durationMinutes = getEstimatedMinutes(task, tasks)
  const workHours = [9, 11, 14, 16]

  for (let dayOffset = 0; dayOffset < 14 && suggestions.length < 3; dayOffset += 1) {
    const candidateDate = new Date(now)
    candidateDate.setDate(now.getDate() + dayOffset)

    if (isWeekend(candidateDate) || candidateDate > dueDate) {
      continue
    }

    for (const hour of workHours) {
      const start = combineDateAndHour(candidateDate, hour)
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

      if (start <= now || end > dueDate || overlapsExistingTask(start, end, tasks)) {
        continue
      }

      suggestions.push({
        label: `${formatDateTime(start)} for ${formatDuration(durationMinutes)}`,
        start,
        end,
      })

      if (suggestions.length === 3) {
        break
      }
    }
  }

  return suggestions
}

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

function downloadCalendarBlock(task: TodoTask) {
  if (!task.calendarStart || !task.calendarEnd) {
    return
  }

  const start = new Date(task.calendarStart)
  const end = new Date(task.calendarEnd)
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FocusPlanner//Todo Calendar Block//EN',
    'BEGIN:VEVENT',
    `UID:${task.id}@focusplanner.local`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(task.title)}`,
    `DESCRIPTION:${escapeIcsText(
      [
        task.description,
        task.stakeholders ? `Stakeholders: ${task.stakeholders}` : '',
        task.blockers ? `Blockers: ${task.blockers}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${task.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${task.id}.ics`
  link.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [tasks, setTasks] = useLocalStorage<TodoTask[]>('focusplanner.tasks', initialTasks)
  const [draft, setDraft] = useState<TodoDraft>(initialDraft)
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [authMessage, setAuthMessage] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    const authClient = createAuthClient()

    if (!authClient) {
      return
    }

    const loadExistingAccount = async () => {
      await authClient.initialize()
      const redirectResult = await authClient.handleRedirectPromise()
      const existingAccount = redirectResult?.account ?? authClient.getAllAccounts()[0]

      if (existingAccount) {
        setAccount(existingAccount)
        setAuthMessage('Signed in with Microsoft.')
      }
    }

    void loadExistingAccount().catch((error: unknown) => {
      setAuthMessage(`Microsoft sign-in could not be restored: ${getAuthErrorMessage(error)}`)
    })
  }, [])

  const suggestedDraftMinutes = useMemo(() => estimateMinutesForDraft(tasks, draft), [tasks, draft])
  const activeTasks = useMemo(
    () => sortByPriority(tasks.filter((task) => task.status !== 'Done')).slice(0, 5),
    [tasks],
  )
  const blockedTasks = tasks.filter((task) => task.status === 'Blocked')
  const completedTasks = tasks.filter((task) => task.status === 'Done' && task.actualMinutes)
  const averageActualMinutes = completedTasks.length
    ? Math.round(
        completedTasks.reduce((total, task) => total + (task.actualMinutes ?? 0), 0) /
          completedTasks.length,
      )
    : null

  const addTask = () => {
    const title = draft.title.trim()

    if (!title) {
      return
    }

    const anticipatedMinutes = parseMinutes(draft.anticipatedMinutes) || suggestedDraftMinutes

    const task: TodoTask = {
      id: createId('task'),
      title,
      description: draft.description.trim(),
      dueDate: draft.dueDate,
      stakeholders: draft.stakeholders.trim(),
      status: draft.status,
      blockers: draft.blockers.trim(),
      anticipatedMinutes,
      actualMinutes: null,
      completedAt: null,
      calendarStart: null,
      calendarEnd: null,
      createdAt: new Date().toISOString(),
    }

    setTasks([task, ...tasks])
    setDraft({
      ...initialDraft,
      dueDate: toDateInput(new Date(Date.now() + 1000 * 60 * 60 * 24)),
    })
  }

  const updateTask = (taskId: string, updates: Partial<TodoTask>) => {
    setTasks(
      tasks.map((task) => {
        if (task.id !== taskId) {
          return task
        }

        const nextTask = { ...task, ...updates }
        if (updates.status === 'Done' && !nextTask.completedAt) {
          nextTask.completedAt = new Date().toISOString()
        }

        if (updates.status && updates.status !== 'Done') {
          nextTask.completedAt = null
        }

        return nextTask
      }),
    )
  }

  const scheduleTask = (task: TodoTask, slot: SuggestedSlot) => {
    const scheduledTask = {
      ...task,
      status: 'Scheduled' as TaskStatus,
      calendarStart: slot.start.toISOString(),
      calendarEnd: slot.end.toISOString(),
    }

    setTasks(tasks.map((currentTask) => (currentTask.id === task.id ? scheduledTask : currentTask)))
    downloadCalendarBlock(scheduledTask)
  }

  const signIn = async () => {
    const authClient = createAuthClient()

    if (!authClient) {
      setAuthMessage(
        'Microsoft sign-in needs an approved Microsoft Entra app registration. Local planning works without it.',
      )
      return
    }

    if (isSigningIn) {
      return
    }

    setIsSigningIn(true)

    try {
      await authClient.initialize()
      await authClient.loginRedirect()
    } catch (error: unknown) {
      setAuthMessage(`Microsoft sign-in failed: ${getAuthErrorMessage(error)}`)
      setIsSigningIn(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">FocusPlanner</p>
          <h1>Calendar-aware todos that learn your real effort.</h1>
          <p className="hero-copy">
            Capture work, estimate time, track blockers, log actual effort, and turn tasks into
            calendar blocks without a noisy project-management system.
          </p>
        </div>
        <section className="sign-in-card" aria-label="Microsoft sign-in">
          <span className="status-pill">{account ? account.username : 'Local calendar planner'}</span>
          <button type="button" onClick={() => void signIn()} disabled={isSigningIn}>
            {isSigningIn
              ? 'Connecting...'
              : account
                ? 'Microsoft connected'
                : 'Connect Microsoft 365'}
          </button>
          <p>
            {authMessage ||
              'Local mode creates downloadable calendar blocks now. Microsoft sign-in can power Outlook sync later.'}
          </p>
        </section>
      </header>

      <section className="dashboard-grid" aria-label="Calendar task planner">
        <section className="panel task-form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Add todo</p>
              <h2>Capture enough to schedule it</h2>
            </div>
            <span className="count-badge">AI estimate: {formatDuration(suggestedDraftMinutes)}</span>
          </div>
          <form
            className="task-form"
            onSubmit={(event) => {
              event.preventDefault()
              addTask()
            }}
          >
            <label>
              Todo
              <input
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Example: draft customer email"
                value={draft.title}
              />
            </label>
            <label>
              Notes
              <textarea
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="What outcome do you need?"
                value={draft.description}
              />
            </label>
            <div className="form-row">
              <label>
                Due date
                <input
                  onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
                  type="date"
                  value={draft.dueDate}
                />
              </label>
              <label>
                Stakeholders
                <input
                  onChange={(event) => setDraft({ ...draft, stakeholders: event.target.value })}
                  placeholder="Names, teams, or customers"
                  value={draft.stakeholders}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Status
                <select
                  onChange={(event) =>
                    setDraft({ ...draft, status: event.target.value as TaskStatus })
                  }
                  value={draft.status}
                >
                  <option>Not started</option>
                  <option>In progress</option>
                  <option>Blocked</option>
                  <option>Scheduled</option>
                </select>
              </label>
              <label>
                Anticipated time
                <input
                  min="1"
                  onChange={(event) =>
                    setDraft({ ...draft, anticipatedMinutes: event.target.value })
                  }
                  placeholder={`${suggestedDraftMinutes} minutes`}
                  type="number"
                  value={draft.anticipatedMinutes}
                />
              </label>
            </div>
            <label>
              Blockers
              <textarea
                onChange={(event) => setDraft({ ...draft, blockers: event.target.value })}
                placeholder="What might stop you? Missing input, decision, access, energy?"
                value={draft.blockers}
              />
            </label>
            <button className="wide-button" type="submit">
              Add todo and suggest calendar times
            </button>
          </form>
        </section>

        <section className="panel stats-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Learning loop</p>
              <h2>Actual time improves future estimates</h2>
            </div>
          </div>
          <div className="metric-grid">
            <article>
              <strong>{tasks.length}</strong>
              <span>Total todos</span>
            </article>
            <article>
              <strong>{completedTasks.length}</strong>
              <span>Completed with time logged</span>
            </article>
            <article>
              <strong>{formatDuration(averageActualMinutes)}</strong>
              <span>Average actual time</span>
            </article>
          </div>
          <p className="guardrail">
            The current estimate engine learns locally from your completed tasks. A future AI
            service can use the same actual-time history to personalize estimates further.
          </p>
        </section>

        <section className="panel today-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Focus queue</p>
              <h2>Next tasks to work or schedule</h2>
            </div>
            <span className="count-badge">{activeTasks.length}/5 visible</span>
          </div>
          <div className="task-stack">
            {activeTasks.map((task) => {
              const suggestions = getScheduleSuggestions(task, tasks)
              return (
                <article className="task-card" key={task.id}>
                  <div className="task-topline">
                    <span className={`status-pill status-${task.status.toLowerCase().replace(/\s/g, '-')}`}>
                      {task.status}
                    </span>
                    <select
                      aria-label={`Status for ${task.title}`}
                      value={task.status}
                      onChange={(event) =>
                        updateTask(task.id, { status: event.target.value as TaskStatus })
                      }
                    >
                      <option>Not started</option>
                      <option>In progress</option>
                      <option>Blocked</option>
                      <option>Scheduled</option>
                      <option>Done</option>
                    </select>
                  </div>
                  <h3>{task.title}</h3>
                  <p>{task.description || 'No notes yet.'}</p>
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
                      onChange={(event) => updateTask(task.id, { blockers: event.target.value })}
                      placeholder="No blockers logged."
                      value={task.blockers}
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      When completed, how long did it take?
                      <input
                        min="1"
                        onChange={(event) =>
                          updateTask(task.id, {
                            actualMinutes: parseMinutes(event.target.value) || null,
                          })
                        }
                        placeholder="Minutes"
                        type="number"
                        value={task.actualMinutes ?? ''}
                      />
                    </label>
                    <button
                      className="secondary-button"
                      onClick={() => updateTask(task.id, { status: 'Done' })}
                      type="button"
                    >
                      Mark done
                    </button>
                  </div>
                  {task.calendarStart && task.calendarEnd ? (
                    <div className="calendar-callout">
                      <strong>Scheduled:</strong> {formatDateTime(new Date(task.calendarStart))}
                      <button
                        className="secondary-button"
                        onClick={() => downloadCalendarBlock(task)}
                        type="button"
                      >
                        Download calendar block
                      </button>
                    </div>
                  ) : (
                    <div className="schedule-list">
                      <strong>Suggested calendar times</strong>
                      {suggestions.length ? (
                        suggestions.map((slot) => (
                          <button key={slot.start.toISOString()} onClick={() => scheduleTask(task, slot)} type="button">
                            {slot.label}
                          </button>
                        ))
                      ) : (
                        <p className="empty-state">
                          No open work-hour slots before the due date. Try a later due date or
                          shorter estimate.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Blocked</p>
              <h2>Things that need unblockers</h2>
            </div>
            <span className="count-badge">{blockedTasks.length}</span>
          </div>
          {blockedTasks.length ? (
            <div className="task-stack">
              {blockedTasks.map((task) => (
                <article className="waiting-item" key={task.id}>
                  <strong>{task.title}</strong>
                  <p>{task.blockers || 'No blocker details yet.'}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No blocked todos right now.</p>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
