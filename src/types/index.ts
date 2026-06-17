export type TaskStatus = 'Not started' | 'In progress' | 'Blocked' | 'Scheduled' | 'Done'

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom'

export type Recurrence = {
  type: RecurrenceType
  interval: number
  daysOfWeek?: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  nextOccurrence?: string
}

export type NotificationPreference = {
  enabled: boolean
  dueDateHoursBefore: number[]    // e.g. [1, 24]
  focusBlockMinutesBefore: number // e.g. 15
  customReminders: string[]       // ISO datetime strings
  phoneNumber?: string
}

export type TaskStep = {
  id: string
  title: string
  done: boolean
}

export type TodoTask = {
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
  tags?: string[]
  category?: string
  recurrence?: Recurrence | null
  sortOrder?: number
  notifications?: NotificationPreference | null
}

export type TodoDraft = {
  title: string
  description: string
  dueDate: string
  stakeholders: string
  status: TaskStatus
  blockers: string
  anticipatedMinutes: string
  subtasks: string
  tags: string
  category: string
  recurrenceType: RecurrenceType | ''
  recurrenceInterval: string
  recurrenceDays: number[]
}

export type AiTaskSuggestion = {
  estimatedMinutes: number
  subtasks: string[]
  rationale: string
}

export type SuggestedSlot = {
  label: string
  start: Date
  end: Date
}

export type CalendarBusyBlock = {
  id: string
  subject: string
  start: Date
  end: Date
  source: 'outlook' | 'ics-subscription'
}

export type CalendarViewItem = {
  id: string
  title: string
  start: Date
  end: Date
  type: 'outlook' | 'due' | 'focus' | 'work-calendar'
}

export type GraphCalendarEvent = {
  id: string
  subject?: string
  showAs?: string
  isCancelled?: boolean
  isAllDay?: boolean
  start?: { dateTime?: string }
  end?: { dateTime?: string }
}

export type GraphCalendarViewResponse = {
  value: GraphCalendarEvent[]
  '@odata.nextLink'?: string
}

export type GraphCreatedEvent = {
  id?: string
}

export type ToastMessage = {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

export type SearchFilter = {
  query: string
  status: TaskStatus | 'All'
  category: string
  dateFrom: string
  dateTo: string
}

export type AppSettings = {
  darkMode: boolean
  phoneNumber: string
  defaultNotifications: NotificationPreference
  workCalendarIcsUrl: string
  workCalendarRefreshMinutes: number
}
