import type { TodoTask } from '../types'

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

export function downloadCalendarBlock(task: TodoTask) {
  if (!task.calendarStart || !task.calendarEnd) return

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

export function parseIcsFeed(icsText: string): Array<{ uid: string; summary: string; start: Date; end: Date }> {
  const events: Array<{ uid: string; summary: string; start: Date; end: Date }> = []
  const lines = icsText.replace(/\r\n /g, '').split(/\r?\n/)
  let inEvent = false
  let uid = ''
  let summary = ''
  let dtstart = ''
  let dtend = ''

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      uid = ''
      summary = ''
      dtstart = ''
      dtend = ''
    } else if (line === 'END:VEVENT' && inEvent) {
      inEvent = false
      if (dtstart && dtend) {
        const start = parseIcsDateTime(dtstart)
        const end = parseIcsDateTime(dtend)
        if (start && end) {
          events.push({ uid: uid || crypto.randomUUID(), summary: summary || 'Busy', start, end })
        }
      }
    } else if (inEvent) {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue
      const key = line.slice(0, colonIndex).split(';')[0]
      const value = line.slice(colonIndex + 1)

      if (key === 'UID') uid = value
      else if (key === 'SUMMARY') summary = value
      else if (key === 'DTSTART') dtstart = value
      else if (key === 'DTEND') dtend = value
    }
  }

  return events
}

function parseIcsDateTime(value: string): Date | null {
  // Formats: 20250615T140000Z or 20250615T140000
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/)
  if (!match) return null
  const [, y, mo, d, h, mi, s] = match
  if (value.endsWith('Z')) {
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
  }
  return new Date(+y, +mo - 1, +d, +h, +mi, +s)
}
