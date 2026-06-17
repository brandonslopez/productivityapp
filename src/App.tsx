import { useCallback, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './App.css'

import type { TodoTask, TodoDraft, SuggestedSlot, SearchFilter as SearchFilterType, AppSettings, TaskStatus, Recurrence } from './types'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useAuth } from './hooks/useAuth'
import { useCalendar } from './hooks/useCalendar'
import { useAiSuggestion } from './hooks/useAiSuggestion'
import { useToast } from './hooks/useToast'
import { useDarkMode } from './hooks/useDarkMode'
import { sortByPriority, estimateMinutesForDraft, parseSubtasks, initialDraft, initialTasks, parseTags, createRecurringCopy } from './utils/tasks'
import { getScheduleSuggestions, getCalendarViewItems } from './utils/calendar'
import { downloadCalendarBlock } from './utils/ics'
import { formatDuration, parseMinutes, createId } from './utils/formatting'

import { CalendarView } from './components/CalendarView/CalendarView'
import { TaskForm } from './components/TaskForm/TaskForm'
import { TaskCard } from './components/TaskCard/TaskCard'
import { EditTaskModal } from './components/EditTaskModal/EditTaskModal'
import { SearchFilterBar } from './components/SearchFilter/SearchFilter'
import { ToastContainer } from './components/Toast/Toast'
import { DarkModeToggle } from './components/DarkModeToggle/DarkModeToggle'
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel'

const defaultSettings: AppSettings = {
  darkMode: false,
  phoneNumber: '',
  defaultNotifications: {
    enabled: true,
    dueDateHoursBefore: [1, 24],
    focusBlockMinutesBefore: 15,
    customReminders: [],
  },
  workCalendarIcsUrl: '',
  workCalendarRefreshMinutes: 15,
  includeWeekends: false,
}

const defaultFilter: SearchFilterType = {
  query: '',
  status: 'All',
  category: '',
  dateFrom: '',
  dateTo: '',
}

function SortableTaskCard({
  task,
  suggestions,
  isSyncingCalendar,
  onUpdateTask,
  onUpdateStep,
  onSchedule,
  onEdit,
}: {
  task: TodoTask
  suggestions: SuggestedSlot[]
  isSyncingCalendar: boolean
  onUpdateTask: (id: string, updates: Partial<TodoTask>) => void
  onUpdateStep: (taskId: string, stepId: string, done: boolean) => void
  onSchedule: (task: TodoTask, slot: SuggestedSlot) => void
  onEdit: (taskId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">⠿</div>
      <TaskCard
        task={task}
        suggestions={suggestions}
        isSyncingCalendar={isSyncingCalendar}
        onUpdateTask={onUpdateTask}
        onUpdateStep={onUpdateStep}
        onSchedule={onSchedule}
        onEdit={onEdit}
      />
    </div>
  )
}

function App() {
  const [tasks, setTasks] = useLocalStorage<TodoTask[]>('focusplanner.tasks', initialTasks)
  const [draft, setDraft] = useState<TodoDraft>(initialDraft)
  const [settings, setSettings] = useLocalStorage<AppSettings>('focusplanner.settings', defaultSettings)
  const [filter, setFilter] = useState<SearchFilterType>(defaultFilter)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const { darkMode, toggle: toggleDarkMode } = useDarkMode()
  const { toasts, removeToast, success, error: showError } = useToast()
  const auth = useAuth()
  const calendar = useCalendar(auth.account, auth.graphRequest, settings.workCalendarIcsUrl)
  const ai = useAiSuggestion()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const suggestedDraftMinutes = useMemo(() => estimateMinutesForDraft(tasks, draft), [tasks, draft])

  // Apply search and filter
  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => t.status !== 'Done')

    if (filter.query) {
      const q = filter.query.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q)) ||
          (t.stakeholders ?? '').toLowerCase().includes(q),
      )
    }

    if (filter.status !== 'All') {
      result = result.filter((t) => t.status === filter.status)
    }

    if (filter.category) {
      result = result.filter((t) => t.category === filter.category)
    }

    if (filter.dateFrom) {
      result = result.filter((t) => t.dueDate >= filter.dateFrom)
    }

    if (filter.dateTo) {
      result = result.filter((t) => t.dueDate <= filter.dateTo)
    }

    return result
  }, [tasks, filter])

  const activeTasks = useMemo(
    () => {
      // If tasks have sortOrder, respect it; otherwise sort by priority
      const sorted = filteredTasks.some((t) => t.sortOrder != null)
        ? [...filteredTasks].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
        : sortByPriority(filteredTasks)
      return sorted.slice(0, 10)
    },
    [filteredTasks],
  )

  const blockedTasks = tasks.filter((t) => t.status === 'Blocked' || (t.blockers && t.blockers.trim() !== ''))
  const completedTasks = tasks.filter((t) => t.status === 'Done' && t.actualMinutes)
  const calendarViewItems = useMemo(
    () => getCalendarViewItems(tasks, calendar.calendarBusyBlocks),
    [tasks, calendar.calendarBusyBlocks],
  )
  const averageActualMinutes = completedTasks.length
    ? Math.round(completedTasks.reduce((sum, t) => sum + (t.actualMinutes ?? 0), 0) / completedTasks.length)
    : null

  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null

  const addTask = useCallback(() => {
    const title = draft.title.trim()
    if (!title) return

    const anticipated = parseMinutes(draft.anticipatedMinutes) || suggestedDraftMinutes

    let recurrence: Recurrence | null = null
    if (draft.recurrenceType) {
      recurrence = {
        type: draft.recurrenceType,
        interval: Math.max(1, parseInt(draft.recurrenceInterval) || 1),
        ...(draft.recurrenceType === 'weekly' && draft.recurrenceDays.length ? { daysOfWeek: draft.recurrenceDays } : {}),
      }
    }

    const task: TodoTask = {
      id: createId('task'),
      title,
      description: draft.description.trim(),
      dueDate: draft.dueDate,
      stakeholders: draft.stakeholders.trim(),
      status: draft.status,
      blockers: draft.blockers.trim(),
      anticipatedMinutes: anticipated,
      actualMinutes: null,
      completedAt: null,
      calendarStart: null,
      calendarEnd: null,
      dueEventId: null,
      workEventId: null,
      subtasks: parseSubtasks(draft.subtasks),
      aiEstimateRationale: ai.aiSuggestion?.rationale ?? null,
      createdAt: new Date().toISOString(),
      tags: parseTags(draft.tags),
      category: draft.category || undefined,
      recurrence,
    }

    setTasks([task, ...tasks])
    setDraft({ ...initialDraft, dueDate: initialDraft.dueDate })
    ai.clearSuggestion()
    success(`Added "${title}"`)

    if (auth.account) {
      void calendar.createDueDateEvent(task).then((dueEventId) => {
        if (dueEventId) {
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, dueEventId } : t)),
          )
        }
      }).catch((err: unknown) => {
        showError(`Could not add due-date event: ${err instanceof Error ? err.message : String(err)}`)
      })
    }
  }, [draft, tasks, suggestedDraftMinutes, ai, auth.account, calendar, setTasks, success, showError])

  const updateTask = useCallback((taskId: string, updates: Partial<TodoTask>) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task
        const next = { ...task, ...updates }

        if (updates.status === 'Done' && !next.completedAt) {
          next.completedAt = new Date().toISOString()

          // Create recurring copy if task has recurrence
          if (task.recurrence) {
            const copy = createRecurringCopy(next)
            // We'll add it after this map
            setTimeout(() => {
              setTasks((current) => [copy, ...current])
              success(`Created next occurrence of "${task.title}" due ${copy.dueDate}`)
            }, 0)
          }
        }

        if (updates.status && updates.status !== 'Done') {
          next.completedAt = null
        }

        return next
      }),
    )
  }, [setTasks, success])

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    success('Task deleted')
  }, [setTasks, success])

  const updateTaskStep = useCallback((taskId: string, stepId: string, done: boolean) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task
        return {
          ...task,
          subtasks: (task.subtasks ?? []).map((s) =>
            s.id === stepId ? { ...s, done } : s,
          ),
        }
      }),
    )
  }, [setTasks])

  const scheduleTask = useCallback(async (task: TodoTask, slot: SuggestedSlot) => {
    const scheduled: TodoTask = {
      ...task,
      status: 'Scheduled' as TaskStatus,
      calendarStart: slot.start.toISOString(),
      calendarEnd: slot.end.toISOString(),
    }

    if (!auth.account) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? scheduled : t)))
      downloadCalendarBlock(scheduled)
      calendar.setCalendarMessage('Saved locally and downloaded an .ics file.')
      success('Downloaded calendar block')
      return
    }

    try {
      const workEventId = await calendar.createCalendarEvent(scheduled, `Focus: ${task.title}`, slot.start, slot.end, 'work')
      const dueEventId = task.dueEventId ?? (await calendar.createDueDateEvent(scheduled))
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...scheduled, dueEventId, workEventId } : t)),
      )
      success(`Scheduled "${task.title}" on Outlook`)
      await calendar.refreshCalendar()
    } catch (err: unknown) {
      showError(`Could not schedule: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [auth.account, calendar, setTasks, success, showError])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setTasks((prev) => {
      const activeIds = activeTasks.map((t) => t.id)
      const oldIndex = activeIds.indexOf(active.id as string)
      const newIndex = activeIds.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return prev

      const reordered = arrayMove(activeIds, oldIndex, newIndex)
      return prev.map((task) => {
        const orderIndex = reordered.indexOf(task.id)
        return orderIndex >= 0 ? { ...task, sortOrder: orderIndex } : task
      })
    })
  }, [activeTasks, setTasks])

  const handleRequestAi = useCallback(() => {
    void ai.requestSuggestion(draft, tasks, (suggestion) => {
      setDraft((d) => ({
        ...d,
        anticipatedMinutes: String(suggestion.estimatedMinutes),
        subtasks: ai.formatSubtasksForDraft(suggestion.subtasks),
      }))
    })
  }, [ai, draft, tasks])

  return (
    <main className="app-shell">
      <header className="hero-card">
        <div>
          <div className="hero-title-row">
            <p className="eyebrow">FocusPlanner</p>
            <div className="hero-actions">
              <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
              <button className="secondary-button settings-btn" onClick={() => setShowSettings(true)} type="button">
                ⚙️ Settings
              </button>
            </div>
          </div>
          <h1>Calendar-aware todos that learn your real effort.</h1>
          <p className="hero-copy">
            Capture work, estimate time, track blockers, log actual effort, and turn tasks into
            calendar blocks without a noisy project-management system.
          </p>
        </div>
        <section className="sign-in-card" aria-label="Microsoft sign-in">
          <span className="status-pill">{auth.account ? auth.account.username : 'Local calendar planner'}</span>
          <button type="button" onClick={() => void auth.signIn()} disabled={auth.isSigningIn}>
            {auth.isSigningIn
              ? 'Connecting...'
              : auth.account
                ? 'Outlook calendar connected'
                : 'Connect Outlook calendar'}
          </button>
          {auth.account ? (
            <div className="auth-actions">
              <button className="secondary-button" disabled={calendar.isSyncingCalendar} onClick={() => void calendar.refreshCalendar()} type="button">
                {calendar.isSyncingCalendar ? 'Syncing...' : 'Refresh calendar'}
              </button>
              <button className="secondary-button" onClick={() => void auth.signOut()} type="button">
                Sign out
              </button>
            </div>
          ) : null}
          <p>{auth.authMessage || 'Connect Microsoft 365 so FocusPlanner can read busy times and add Outlook calendar events.'}</p>
          <p>{calendar.calendarMessage || 'Local mode still creates downloadable calendar blocks.'}</p>
        </section>
      </header>

      <CalendarView calendarViewItems={calendarViewItems} includeWeekends={settings.includeWeekends} />

      <section className="dashboard-grid" aria-label="Calendar task planner">
        <TaskForm
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={addTask}
          suggestedMinutes={suggestedDraftMinutes}
          aiSuggestion={ai.aiSuggestion}
          aiMessage={ai.aiMessage}
          isSuggestingWithAi={ai.isSuggestingWithAi}
          onRequestAi={handleRequestAi}
        />

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
            <article>
              <strong>{calendar.calendarBusyBlocks.length}</strong>
              <span>Busy blocks found</span>
            </article>
          </div>
          <p className="guardrail">
            The estimate engine learns locally from completed tasks. Calendar suggestions avoid events that already make you busy.
          </p>
        </section>

        <section className="panel today-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Focus queue</p>
              <h2>Next tasks to work or schedule</h2>
            </div>
            <span className="count-badge">{activeTasks.length}/{filteredTasks.length} visible</span>
          </div>

          <SearchFilterBar filter={filter} onFilterChange={setFilter} />

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="task-stack">
                {activeTasks.map((task) => {
                  const suggestions = getScheduleSuggestions(task, tasks, calendar.calendarBusyBlocks)
                  return (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      suggestions={suggestions}
                      isSyncingCalendar={calendar.isSyncingCalendar}
                      onUpdateTask={updateTask}
                      onUpdateStep={updateTaskStep}
                      onSchedule={scheduleTask}
                      onEdit={setEditingTaskId}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
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
                <article className="waiting-item" key={task.id} onClick={() => setEditingTaskId(task.id)} style={{ cursor: 'pointer' }}>
                  <strong>{task.title}</strong>
                    {task.status !== 'Blocked' && <span className="status-badge">{task.status}</span>}
                    <p>{task.blockers || 'No blocker details yet.'}</p>
                  </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No blocked todos right now.</p>
          )}
        </section>
      </section>

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onSave={updateTask}
          onClose={() => setEditingTaskId(null)}
          onDelete={deleteTask}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </main>
  )
}

export default App
