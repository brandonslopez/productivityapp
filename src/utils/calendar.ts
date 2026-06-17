import type { TodoTask, CalendarBusyBlock, SuggestedSlot, CalendarViewItem } from '../types'
import { formatDuration, formatDateTime } from './formatting'

export function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(date.getDate() + days)
  return d
}

export function isSameDay(first: Date, second: Date) {
  return startOfDay(first).getTime() === startOfDay(second).getTime()
}

function isWeekend(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6
}

function overlapsExistingTask(start: Date, end: Date, tasks: TodoTask[]) {
  return tasks.some((task) => {
    if (!task.calendarStart || !task.calendarEnd || task.status === 'Done') return false
    const taskStart = new Date(task.calendarStart)
    const taskEnd = new Date(task.calendarEnd)
    return start < taskEnd && end > taskStart
  })
}

function overlapsBusyBlock(start: Date, end: Date, blocks: CalendarBusyBlock[]) {
  return blocks.some((block) => start < block.end && end > block.start)
}

export function getEstimatedMinutes(task: TodoTask, tasks: TodoTask[]) {
  if (task.actualMinutes) return task.actualMinutes
  if (task.anticipatedMinutes) return task.anticipatedMinutes
  const completed = tasks.filter((t) => t.actualMinutes)
  if (!completed.length) return 45
  return Math.round(
    completed.reduce((total, t) => total + (t.actualMinutes ?? 0), 0) / completed.length,
  )
}

export function getScheduleSuggestions(
  task: TodoTask,
  tasks: TodoTask[],
  busyBlocks: CalendarBusyBlock[],
): SuggestedSlot[] {
  const suggestions: SuggestedSlot[] = []
  const now = new Date()
  const dueDate = task.dueDate ? new Date(`${task.dueDate}T17:00:00`) : addDays(now, 14)
  const durationMinutes = getEstimatedMinutes(task, tasks)
  const WORK_START = 9
  const WORK_END = 17
  const SLOT_INCREMENT = 30 // scan in 30-minute steps

  for (let dayOffset = 0; dayOffset < 14 && suggestions.length < 5; dayOffset += 1) {
    const candidateDate = new Date(now)
    candidateDate.setDate(now.getDate() + dayOffset)

    if (isWeekend(candidateDate) || candidateDate > dueDate) continue

    // Scan every 30-minute slot within work hours
    for (let minutes = WORK_START * 60; minutes + durationMinutes <= WORK_END * 60; minutes += SLOT_INCREMENT) {
      const start = new Date(candidateDate)
      start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

      if (
        start <= now ||
        end > dueDate ||
        overlapsExistingTask(start, end, tasks) ||
        overlapsBusyBlock(start, end, busyBlocks)
      ) {
        continue
      }

      suggestions.push({
        label: `${formatDateTime(start)} for ${formatDuration(durationMinutes)}`,
        start,
        end,
      })

      if (suggestions.length === 5) break
    }
  }

  return suggestions
}

export function toGraphUtcDateTime(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, '')
}

export function toDueEventWindow(dueDate: string, busyBlocks: CalendarBusyBlock[] = [], tasks: TodoTask[] = []) {
  const dueDateObj = new Date(`${dueDate}T17:00:00`)
  const REMINDER_DURATION = 30 // 30-minute reminder block

  // Try to find a free 30-minute slot on the due date, working backwards from 5pm
  for (let minutes = 16 * 60; minutes >= 9 * 60; minutes -= 30) {
    const start = new Date(dueDateObj)
    start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
    const end = new Date(start.getTime() + REMINDER_DURATION * 60 * 1000)

    if (!overlapsBusyBlock(start, end, busyBlocks) && !overlapsExistingTask(start, end, tasks)) {
      return { start, end }
    }
  }

  // Fallback: end-of-day on the due date
  const start = new Date(`${dueDate}T16:30:00`)
  const end = new Date(start.getTime() + REMINDER_DURATION * 60 * 1000)
  return { start, end }
}

export function buildTaskEventBody(task: TodoTask, purpose: 'due' | 'work') {
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

export function getCalendarViewItems(
  tasks: TodoTask[],
  busyBlocks: CalendarBusyBlock[],
): CalendarViewItem[] {
  const taskEventIds = new Set<string>()
  const taskItems = tasks.flatMap((task): CalendarViewItem[] => {
    const items: CalendarViewItem[] = []

    if (task.calendarStart && task.calendarEnd) {
      if (task.workEventId) taskEventIds.add(task.workEventId)
      items.push({
        id: task.workEventId ?? `${task.id}-focus`,
        title: `Focus: ${task.title}`,
        start: new Date(task.calendarStart),
        end: new Date(task.calendarEnd),
        type: 'focus',
      })
    }

    if (task.dueDate) {
      const { start, end } = toDueEventWindow(task.dueDate, busyBlocks, tasks)
      if (task.dueEventId) taskEventIds.add(task.dueEventId)
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

  const outlookItems = busyBlocks
    .filter((block) => !taskEventIds.has(block.id))
    .map(
      (block): CalendarViewItem => ({
        id: block.id,
        title: block.subject,
        start: block.start,
        end: block.end,
        type: block.source === 'ics-subscription' ? 'work-calendar' : 'outlook',
      }),
    )

  return [...taskItems, ...outlookItems].sort((first, second) => {
    const diff = first.start.getTime() - second.start.getTime()
    return diff || first.title.localeCompare(second.title)
  })
}
