import type { TodoTask, TodoDraft, TaskStatus, TaskStep, Recurrence } from '../types'
import { parseMinutes, createId } from './formatting'

export const statusRank: Record<TaskStatus, number> = {
  'In progress': 0,
  Scheduled: 1,
  'Not started': 2,
  Blocked: 3,
  Done: 4,
}

export function sortByPriority(tasks: TodoTask[]) {
  return [...tasks].sort((a, b) => {
    const statusDiff = statusRank[a.status] - statusRank[b.status]
    if (statusDiff !== 0) return statusDiff
    return a.dueDate.localeCompare(b.dueDate)
  })
}

export function estimateMinutesForDraft(tasks: TodoTask[], draft: TodoDraft) {
  const completed = tasks.filter((t) => t.actualMinutes && t.actualMinutes > 0)
  const stakeholder = draft.stakeholders.trim().toLowerCase()
  const matched = stakeholder
    ? completed.filter((t) => t.stakeholders.toLowerCase().includes(stakeholder))
    : []
  const source = matched.length ? matched : completed

  if (source.length) {
    const avg = source.reduce((sum, t) => sum + (t.actualMinutes ?? 0), 0) / source.length
    return Math.round(avg / 5) * 5
  }

  return parseMinutes(draft.anticipatedMinutes) || 45
}

export function parseSubtasks(value: string): TaskStep[] {
  return value
    .split('\n')
    .map((line) => line.trim().replace(/^[-*]\s*/, ''))
    .filter(Boolean)
    .map((title) => ({ id: createId('step'), title, done: false }))
}

export function formatSubtasksForDraft(subtasks: string[]) {
  return subtasks.map((s) => `- ${s}`).join('\n')
}

export function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function computeNextOccurrence(recurrence: Recurrence, baseDate: string): string {
  const base = new Date(baseDate)
  const now = new Date()
  let next = new Date(Math.max(base.getTime(), now.getTime()))

  switch (recurrence.type) {
    case 'daily':
      next.setDate(next.getDate() + recurrence.interval)
      break
    case 'weekly':
      if (recurrence.daysOfWeek?.length) {
        // Find next matching day
        for (let i = 1; i <= 7; i++) {
          const candidate = new Date(next)
          candidate.setDate(candidate.getDate() + i)
          if (recurrence.daysOfWeek.includes(candidate.getDay())) {
            next = candidate
            break
          }
        }
      } else {
        next.setDate(next.getDate() + 7 * recurrence.interval)
      }
      break
    case 'monthly':
      next.setMonth(next.getMonth() + recurrence.interval)
      break
    case 'custom':
      next.setDate(next.getDate() + recurrence.interval)
      break
  }

  return next.toISOString().slice(0, 10)
}

export function createRecurringCopy(task: TodoTask): TodoTask {
  if (!task.recurrence) return task

  const nextDueDate = computeNextOccurrence(task.recurrence, task.dueDate)

  return {
    ...task,
    id: createId('task'),
    status: 'Not started',
    actualMinutes: null,
    completedAt: null,
    calendarStart: null,
    calendarEnd: null,
    dueEventId: null,
    workEventId: null,
    dueDate: nextDueDate,
    subtasks: task.subtasks?.map((s) => ({ ...s, id: createId('step'), done: false })),
    createdAt: new Date().toISOString(),
    sortOrder: undefined,
  }
}

export const allCategories = [
  'Work',
  'Personal',
  'Meeting prep',
  'Writing',
  'Research',
  'Admin',
  'Follow-up',
  'Learning',
]

export const initialDraft: TodoDraft = {
  title: '',
  description: '',
  dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
  stakeholders: '',
  status: 'Not started',
  blockers: '',
  anticipatedMinutes: '',
  subtasks: '',
  tags: '',
  category: '',
  recurrenceType: '',
  recurrenceInterval: '1',
  recurrenceDays: [],
}

export const initialTasks: TodoTask[] = [
  {
    id: 'task-sample-focus-block',
    title: 'Plan this week',
    description:
      'Review open work, pick the next focus blocks, and protect time on the calendar.',
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
    tags: ['planning'],
    category: 'Work',
  },
]
