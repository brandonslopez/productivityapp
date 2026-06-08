import { useEffect, useMemo, useState, type SetStateAction } from 'react'
import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser'
import './App.css'

type TaskStatus = 'Not started' | 'In progress' | 'Blocked' | 'Scheduled' | 'Done'

type TaskStep = {
  id: string
  title: string
  done: boolean
}

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
  dueEventId?: string | null
  workEventId?: string | null
  subtasks?: TaskStep[]
  aiEstimateRationale?: string | null
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
  subtasks: string
}

type AiTaskSuggestion = {
  estimatedMinutes: number
  subtasks: string[]
  rationale: string
}

type SuggestedSlot = {
  label: string
  start: Date
  end: Date
}

type CalendarBusyBlock = {
  id: string
  subject: string
  start: Date
  end: Date
}

type CalendarViewItem = {
  id: string
  title: string
  start: Date
  end: Date
  type: 'outlook' | 'due' | 'focus'
}

type GraphCalendarEvent = {
  id: string
  subject?: string
  showAs?: string
  isCancelled?: boolean
  start?: {
    dateTime?: string
  }
  end?: {
    dateTime?: string
  }
}

type GraphCalendarViewResponse = {
  value: GraphCalendarEvent[]
  '@odata.nextLink'?: string
}

type GraphCreatedEvent = {
  id?: string
}

const authConfig = {
  clientId: import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined,
  tenantId: (import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined) || 'common',
  redirectUri: import.meta.env.VITE_REDIRECT_URI as string | undefined,
}

const graphScopes = ['Calendars.ReadWrite']
const graphBaseUrl = 'https://graph.microsoft.com/v1.0'

let authClient: PublicClientApplication | null | undefined

const initialDraft: TodoDraft = {
  title: '',
  description: '',
  dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
  stakeholders: '',
  status: 'Not started',
  blockers: '',
  anticipatedMinutes: '',
  subtasks: '',
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
    dueEventId: null,
    workEventId: null,
    subtasks: [
      { id: 'step-sample-review', title: 'Review current commitments', done: false },
      { id: 'step-sample-prioritize', title: 'Pick the top three focus blocks', done: false },
      { id: 'step-sample-schedule', title: 'Schedule protected calendar time', done: false },
    ],
    aiEstimateRationale: 'Sample ADHD-friendly breakdown.',
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

  const saveValue = (nextValue: SetStateAction<T>) => {
    setValue((currentValue) => {
      const resolvedValue =
        typeof nextValue === 'function'
          ? (nextValue as (previousValue: T) => T)(currentValue)
          : nextValue
      window.localStorage.setItem(key, JSON.stringify(resolvedValue))
      return resolvedValue
    })
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

function getGraphErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function getMsalErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'errorCode' in error) {
    const errorCode = (error as { errorCode?: unknown }).errorCode
    return typeof errorCode === 'string' ? errorCode : null
  }

  return null
}

function needsInteractiveToken(error: unknown) {
  return error instanceof InteractionRequiredAuthError || getMsalErrorCode(error) === 'timed_out'
}

function parseMinutes(value: string) {
  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function parseSubtasks(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim().replace(/^[-*]\s*/, ''))
    .filter(Boolean)
    .map((title) => ({
      id: createId('step'),
      title,
      done: false,
    }))
}

function formatSubtasksForDraft(subtasks: string[]) {
  return subtasks.map((subtask) => `- ${subtask}`).join('\n')
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

function formatDayHeading(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatTimeRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${formatter.format(start)} - ${formatter.format(end)}`
}

function startOfDay(date: Date) {
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(date.getDate() + days)
  return nextDate
}

function isSameDay(first: Date, second: Date) {
  return startOfDay(first).getTime() === startOfDay(second).getTime()
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

function overlapsBusyBlock(start: Date, end: Date, calendarBusyBlocks: CalendarBusyBlock[]) {
  return calendarBusyBlocks.some((block) => start < block.end && end > block.start)
}

function getScheduleSuggestions(
  task: TodoTask,
  tasks: TodoTask[],
  calendarBusyBlocks: CalendarBusyBlock[],
) {
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

      if (
        start <= now ||
        end > dueDate ||
        overlapsExistingTask(start, end, tasks) ||
        overlapsBusyBlock(start, end, calendarBusyBlocks)
      ) {
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

function toGraphUtcDateTime(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, '')
}

function toDueEventWindow(dueDate: string) {
  const start = new Date(`${dueDate}T16:30:00`)
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  return { start, end }
}

function buildTaskEventBody(task: TodoTask, purpose: 'due' | 'work') {
  return [
    task.description,
    task.dueDate ? `Due: ${task.dueDate}` : '',
    task.stakeholders ? `Stakeholders: ${task.stakeholders}` : '',
    task.blockers ? `Blockers: ${task.blockers}` : '',
    purpose === 'work' ? 'Created by FocusPlanner as a protected focus block.' : '',
  ]
    .filter(Boolean)
    .join('<br>')
}

function getCalendarViewItems(tasks: TodoTask[], calendarBusyBlocks: CalendarBusyBlock[]) {
  const taskEventIds = new Set<string>()
  const taskItems = tasks.flatMap((task): CalendarViewItem[] => {
    const items: CalendarViewItem[] = []

    if (task.calendarStart && task.calendarEnd) {
      if (task.workEventId) {
        taskEventIds.add(task.workEventId)
      }

      items.push({
        id: task.workEventId ?? `${task.id}-focus`,
        title: `Focus: ${task.title}`,
        start: new Date(task.calendarStart),
        end: new Date(task.calendarEnd),
        type: 'focus',
      })
    }

    if (task.dueDate) {
      const { start, end } = toDueEventWindow(task.dueDate)
      if (task.dueEventId) {
        taskEventIds.add(task.dueEventId)
      }

      items.push({
        id: task.dueEventId ?? `${task.id}-due`,
        title: `Due: ${task.title}`,
        start,
        end,
        type: 'due',
      })
    }

    return items
  })

  const outlookItems = calendarBusyBlocks
    .filter((block) => !taskEventIds.has(block.id))
    .map(
      (block): CalendarViewItem => ({
        id: block.id,
        title: block.subject,
        start: block.start,
        end: block.end,
        type: 'outlook',
      }),
    )

  return [...taskItems, ...outlookItems].sort((first, second) => {
    const startDifference = first.start.getTime() - second.start.getTime()
    return startDifference || first.title.localeCompare(second.title)
  })
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
  const [calendarAccessToken, setCalendarAccessToken] = useState<string | null>(null)
  const [calendarBusyBlocks, setCalendarBusyBlocks] = useState<CalendarBusyBlock[]>([])
  const [calendarMessage, setCalendarMessage] = useState('')
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AiTaskSuggestion | null>(null)
  const [aiMessage, setAiMessage] = useState('')
  const [isSuggestingWithAi, setIsSuggestingWithAi] = useState(false)

  useEffect(() => {
    const authClient = createAuthClient()

    if (!authClient) {
      return
    }

    const loadExistingAccount = async () => {
      await authClient.initialize()
      const redirectResult = await authClient.handleRedirectPromise()
      const existingAccount = redirectResult?.account ?? authClient.getAllAccounts()[0]

      if (redirectResult?.accessToken) {
        setCalendarAccessToken(redirectResult.accessToken)
      }

      if (existingAccount) {
        authClient.setActiveAccount(existingAccount)
        setAccount(existingAccount)
        setAuthMessage('Signed in with Microsoft Outlook calendar access.')
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
  const calendarDays = useMemo(() => {
    const today = startOfDay(new Date())
    return Array.from({ length: 7 }, (_, index) => addDays(today, index))
  }, [])
  const calendarViewItems = useMemo(
    () => getCalendarViewItems(tasks, calendarBusyBlocks),
    [tasks, calendarBusyBlocks],
  )
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
      dueEventId: null,
      workEventId: null,
      subtasks: parseSubtasks(draft.subtasks),
      aiEstimateRationale: aiSuggestion?.rationale ?? null,
      createdAt: new Date().toISOString(),
    }

    setTasks([task, ...tasks])
    setDraft({
      ...initialDraft,
      dueDate: initialDraft.dueDate,
    })
    setAiSuggestion(null)
    setAiMessage('')

    if (account) {
      void createDueDateEvent(task).catch((error: unknown) => {
        setCalendarMessage(`Could not add due-date event: ${getGraphErrorMessage(error)}`)
      })
    }
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

  const updateTaskStep = (taskId: string, stepId: string, done: boolean) => {
    setTasks(
      tasks.map((task) => {
        if (task.id !== taskId) {
          return task
        }

        return {
          ...task,
          subtasks: (task.subtasks ?? []).map((subtask) =>
            subtask.id === stepId ? { ...subtask, done } : subtask,
          ),
        }
      }),
    )
  }

  const requestAiSuggestion = async () => {
    if (!draft.title.trim() && !draft.description.trim()) {
      setAiMessage('Add a todo title or notes before asking Azure AI.')
      return
    }

    setIsSuggestingWithAi(true)
    setAiMessage('Asking Azure AI for an estimate and smaller steps...')

    try {
      const response = await fetch('/api/task-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: {
            title: draft.title.trim(),
            description: draft.description.trim(),
            dueDate: draft.dueDate,
            stakeholders: draft.stakeholders.trim(),
            blockers: draft.blockers.trim(),
          },
          completedTasks: tasks
            .filter((task) => task.actualMinutes && task.actualMinutes > 0)
            .slice(0, 12)
            .map((task) => ({
              title: task.title,
              description: task.description,
              stakeholders: task.stakeholders,
              anticipatedMinutes: task.anticipatedMinutes,
              actualMinutes: task.actualMinutes,
            })),
        }),
      })

      const responseBody = (await response.json()) as { error?: string } | AiTaskSuggestion

      if (!response.ok) {
        throw new Error('error' in responseBody && responseBody.error ? responseBody.error : 'Azure AI request failed.')
      }

      const suggestion = responseBody as AiTaskSuggestion
      setAiSuggestion(suggestion)
      setDraft((currentDraft) => ({
        ...currentDraft,
        anticipatedMinutes: String(suggestion.estimatedMinutes),
        subtasks: formatSubtasksForDraft(suggestion.subtasks),
      }))
      setAiMessage('Azure AI added an estimate and smaller steps. You can edit them before saving.')
    } catch (error: unknown) {
      setAiMessage(`Could not get Azure AI suggestion: ${getGraphErrorMessage(error)}`)
    } finally {
      setIsSuggestingWithAi(false)
    }
  }

  const getGraphAccessToken = async () => {
    const authClient = createAuthClient()

    if (!authClient || !account) {
      throw new Error('Connect Microsoft 365 before syncing with Outlook calendar.')
    }

    if (calendarAccessToken) {
      return calendarAccessToken
    }

    await authClient.initialize()

    try {
      const tokenResult = await authClient.acquireTokenSilent({
        account,
        scopes: graphScopes,
      })
      setCalendarAccessToken(tokenResult.accessToken)
      return tokenResult.accessToken
    } catch (error) {
      if (needsInteractiveToken(error)) {
        throw new Error(
          'Microsoft needs an interactive Outlook consent step. Click Connect Outlook calendar again, then return to the app.',
          { cause: error },
        )
      }

      throw error
    }
  }

  const graphRequest = async <T,>(pathOrUrl: string, options: RequestInit = {}) => {
    const accessToken = await getGraphAccessToken()
    const url = pathOrUrl.startsWith('https://') ? pathOrUrl : `${graphBaseUrl}${pathOrUrl}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'outlook.timezone="UTC"',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Microsoft Graph request failed (${response.status}): ${errorText}`)
    }

    return (await response.json()) as T
  }

  const refreshCalendar = async () => {
    if (!account) {
      setCalendarMessage('Connect Microsoft 365 to read your Outlook calendar.')
      return
    }

    setIsSyncingCalendar(true)
    setCalendarMessage('Reading your Outlook calendar...')

    try {
      const now = new Date()
      const rangeEnd = new Date(now)
      rangeEnd.setDate(now.getDate() + 14)
      const query = new URLSearchParams({
        startDateTime: now.toISOString(),
        endDateTime: rangeEnd.toISOString(),
        $select: 'id,subject,start,end,showAs,isCancelled',
        $top: '100',
      })
      let nextUrl: string | undefined = `/me/calendarView?${query.toString()}`
      const busyBlocks: CalendarBusyBlock[] = []

      while (nextUrl) {
        const response: GraphCalendarViewResponse = await graphRequest(nextUrl)
        response.value.forEach((event) => {
          if (
            event.isCancelled ||
            event.showAs === 'free' ||
            !event.id ||
            !event.start?.dateTime ||
            !event.end?.dateTime
          ) {
            return
          }

          busyBlocks.push({
            id: event.id,
            subject: event.subject || 'Busy',
            start: new Date(`${event.start.dateTime}Z`),
            end: new Date(`${event.end.dateTime}Z`),
          })
        })
        nextUrl = response['@odata.nextLink']
      }

      setCalendarBusyBlocks(busyBlocks)
      setCalendarMessage(`Outlook calendar connected. Found ${busyBlocks.length} busy blocks.`)
    } catch (error: unknown) {
      setCalendarMessage(`Could not read Outlook calendar: ${getGraphErrorMessage(error)}`)
    } finally {
      setIsSyncingCalendar(false)
    }
  }

  useEffect(() => {
    if (!account) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void refreshCalendar()
    }, 0)

    return () => window.clearTimeout(timeoutId)
    // refreshCalendar intentionally stays outside the dependency list because it is recreated with request state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  const createCalendarEvent = async (
    task: TodoTask,
    subject: string,
    start: Date,
    end: Date,
    purpose: 'due' | 'work',
  ) => {
    const event = await graphRequest<GraphCreatedEvent>('/me/events', {
      method: 'POST',
      body: JSON.stringify({
        subject,
        body: {
          contentType: 'HTML',
          content: buildTaskEventBody(task, purpose),
        },
        start: {
          dateTime: toGraphUtcDateTime(start),
          timeZone: 'UTC',
        },
        end: {
          dateTime: toGraphUtcDateTime(end),
          timeZone: 'UTC',
        },
        isReminderOn: true,
        reminderMinutesBeforeStart: purpose === 'due' ? 60 : 15,
        categories: ['FocusPlanner'],
      }),
    })

    if (!event.id) {
      throw new Error('Outlook created an event without returning an event ID.')
    }

    return event.id
  }

  const createDueDateEvent = async (task: TodoTask) => {
    if (!task.dueDate || task.dueEventId) {
      return null
    }

    setCalendarMessage(`Adding due-date reminder for "${task.title}" to Outlook...`)

    const { start, end } = toDueEventWindow(task.dueDate)
    const dueEventId = await createCalendarEvent(task, `Due: ${task.title}`, start, end, 'due')
    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id ? { ...currentTask, dueEventId } : currentTask,
      ),
    )
    setCalendarMessage(`Added due-date reminder for "${task.title}" to Outlook.`)
    await refreshCalendar()
    return dueEventId
  }

  const scheduleTask = async (task: TodoTask, slot: SuggestedSlot) => {
    const scheduledTask = {
      ...task,
      status: 'Scheduled' as TaskStatus,
      calendarStart: slot.start.toISOString(),
      calendarEnd: slot.end.toISOString(),
    }

    if (!account) {
      setTasks(tasks.map((currentTask) => (currentTask.id === task.id ? scheduledTask : currentTask)))
      downloadCalendarBlock(scheduledTask)
      setCalendarMessage('Saved locally and downloaded an .ics file. Connect Microsoft 365 to write directly to Outlook.')
      return
    }

    setIsSyncingCalendar(true)
    setCalendarMessage(`Adding work block for "${task.title}" to Outlook...`)

    try {
      const workEventId = await createCalendarEvent(
        scheduledTask,
        `Focus: ${task.title}`,
        slot.start,
        slot.end,
        'work',
      )
      const dueEventId = task.dueEventId ?? (await createDueDateEvent(scheduledTask))
      const syncedTask = {
        ...scheduledTask,
        dueEventId,
        workEventId,
      }

      setTasks(tasks.map((currentTask) => (currentTask.id === task.id ? syncedTask : currentTask)))
      setCalendarMessage(`Added due-date reminder and work block for "${task.title}" to Outlook.`)
      await refreshCalendar()
    } catch (error: unknown) {
      setCalendarMessage(`Could not schedule Outlook event: ${getGraphErrorMessage(error)}`)
    } finally {
      setIsSyncingCalendar(false)
    }
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
      await authClient.loginRedirect({
        scopes: graphScopes,
        prompt: account ? 'consent' : 'select_account',
      })
    } catch (error: unknown) {
      setAuthMessage(`Microsoft sign-in failed: ${getAuthErrorMessage(error)}`)
      setIsSigningIn(false)
    }
  }

  const signOut = async () => {
    const authClient = createAuthClient()

    setAccount(null)
    setCalendarAccessToken(null)
    setCalendarBusyBlocks([])
    setCalendarMessage('Signed out of Outlook calendar. Local todo planning is still available.')

    if (!authClient) {
      return
    }

    try {
      await authClient.initialize()
      const signedOutAccount = account ?? authClient.getActiveAccount() ?? authClient.getAllAccounts()[0]
      await authClient.logoutRedirect({
        account: signedOutAccount ?? undefined,
        postLogoutRedirectUri: window.location.origin,
      })
    } catch (error: unknown) {
      setAuthMessage(`Microsoft sign-out failed: ${getAuthErrorMessage(error)}`)
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
                ? 'Outlook calendar connected'
                : 'Connect Outlook calendar'}
          </button>
          {account ? (
            <div className="auth-actions">
              <button
                className="secondary-button"
                disabled={isSyncingCalendar}
                onClick={() => void refreshCalendar()}
                type="button"
              >
                {isSyncingCalendar ? 'Syncing calendar...' : 'Refresh calendar'}
              </button>
              <button className="secondary-button" onClick={() => void signOut()} type="button">
                Sign out
              </button>
            </div>
          ) : null}
          <p>
            {authMessage ||
              'Connect Microsoft 365 so FocusPlanner can read busy times and add Outlook calendar events.'}
          </p>
          <p>{calendarMessage || 'Local mode still creates downloadable calendar blocks.'}</p>
        </section>
      </header>

      <section className="panel calendar-panel" aria-label="Connected calendar view">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Calendar view</p>
            <h2>Your next 7 days</h2>
          </div>
          <span className="count-badge">
            {calendarViewItems.length} calendar {calendarViewItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <div className="calendar-legend" aria-label="Calendar legend">
          <span className="legend-item legend-outlook">Outlook busy</span>
          <span className="legend-item legend-focus">Focus block</span>
          <span className="legend-item legend-due">Due reminder</span>
        </div>
        <div className="calendar-week" role="list" aria-label="Seven day calendar">
          {calendarDays.map((day) => {
            const dayItems = calendarViewItems.filter((item) => isSameDay(item.start, day))

            return (
              <article className="calendar-day" key={day.toISOString()} role="listitem">
                <div className="calendar-day-heading">
                  <strong>{formatDayHeading(day)}</strong>
                  <span>{dayItems.length}</span>
                </div>
                <div className="calendar-day-events">
                  {dayItems.length ? (
                    dayItems.map((item) => (
                      <div className={`calendar-event calendar-event-${item.type}`} key={item.id}>
                        <span>{formatTimeRange(item.start, item.end)}</span>
                        <strong>{item.title}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="calendar-empty">No blocks</p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
        <p className="guardrail">
          Outlook events appear after you connect or refresh calendar. FocusPlanner todo due dates and
          selected focus blocks stay visible here even before Outlook finishes syncing.
        </p>
      </section>

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
            <div className="ai-assistant-card">
              <div>
                <strong>Azure AI estimate and breakdown</strong>
                <p>
                  Send the title, notes, blockers, and your completed-task timing examples to Azure AI
                  for a duration estimate and ADHD-friendly next steps.
                </p>
              </div>
              <button
                className="secondary-button"
                disabled={isSuggestingWithAi}
                onClick={() => void requestAiSuggestion()}
                type="button"
              >
                {isSuggestingWithAi ? 'Asking Azure AI...' : 'Ask Azure AI to estimate and split'}
              </button>
              {aiMessage ? <p className="guardrail">{aiMessage}</p> : null}
              {aiSuggestion ? (
                <p className="ai-rationale">
                  <strong>Why:</strong> {aiSuggestion.rationale}
                </p>
              ) : null}
            </div>
            <label>
              Smaller steps
              <textarea
                onChange={(event) => setDraft({ ...draft, subtasks: event.target.value })}
                placeholder="One step per line. Azure AI can draft these for you."
                value={draft.subtasks}
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
            <article>
              <strong>{calendarBusyBlocks.length}</strong>
              <span>Busy Outlook blocks found</span>
            </article>
          </div>
          <p className="guardrail">
            The estimate engine learns locally from completed tasks. When Outlook is connected,
            schedule suggestions avoid calendar events that already make you busy.
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
              const suggestions = getScheduleSuggestions(task, tasks, calendarBusyBlocks)
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
                  {task.subtasks?.length ? (
                    <div className="subtask-list">
                      <strong>Smaller steps</strong>
                      {task.aiEstimateRationale ? <p>{task.aiEstimateRationale}</p> : null}
                      <ul>
                        {task.subtasks.map((subtask) => (
                          <li key={subtask.id}>
                            <label>
                              <input
                                checked={subtask.done}
                                onChange={(event) =>
                                  updateTaskStep(task.id, subtask.id, event.target.checked)
                                }
                                type="checkbox"
                              />
                              <span>{subtask.title}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
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
                          <button
                            disabled={isSyncingCalendar}
                            key={slot.start.toISOString()}
                            onClick={() => void scheduleTask(task, slot)}
                            type="button"
                          >
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
