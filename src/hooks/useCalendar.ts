import { useState, useEffect, useCallback } from 'react'
import type { CalendarBusyBlock, GraphCalendarViewResponse, GraphCreatedEvent, TodoTask } from '../types'
import { toGraphUtcDateTime, toDueEventWindow, buildTaskEventBody } from '../utils/calendar'
import { parseIcsFeed } from '../utils/ics'
import type { AccountInfo } from '@azure/msal-browser'

type GraphRequestFn = <T>(path: string, options?: RequestInit) => Promise<T>

export function useCalendar(
  account: AccountInfo | null,
  graphRequest: GraphRequestFn,
  workCalendarIcsUrl: string,
) {
  const [calendarBusyBlocks, setCalendarBusyBlocks] = useState<CalendarBusyBlock[]>([])
  const [calendarMessage, setCalendarMessage] = useState('')
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false)

  const fetchWorkCalendarIcs = useCallback(async (): Promise<CalendarBusyBlock[]> => {
    if (!workCalendarIcsUrl) return []
    try {
      // Proxy through our API to avoid CORS issues
      const response = await fetch('/api/fetch-ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: workCalendarIcsUrl }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'ICS fetch failed' }))
        throw new Error((err as { error?: string }).error || `ICS fetch failed: ${response.status}`)
      }
      const data = await response.json() as { icsText: string }
      const events = parseIcsFeed(data.icsText)
      const now = new Date()
      const rangeEnd = new Date(now)
      rangeEnd.setDate(now.getDate() + 14)
      return events
        .filter((e) => e.end > now && e.start < rangeEnd)
        .map((e) => ({
          id: `ics-${e.uid}`,
          subject: e.summary,
          start: e.start,
          end: e.end,
          source: 'ics-subscription' as const,
        }))
    } catch (err) {
      console.warn('Could not fetch work calendar ICS:', err)
      return []
    }
  }, [workCalendarIcsUrl])

  const refreshCalendar = useCallback(async () => {
    setIsSyncingCalendar(true)
    setCalendarMessage('Reading calendars...')

    try {
      const blocks: CalendarBusyBlock[] = []

      // Fetch Outlook calendar if signed in
      if (account) {
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

        while (nextUrl) {
          const response: GraphCalendarViewResponse = await graphRequest(nextUrl)
          response.value.forEach((event) => {
            if (
              event.isCancelled ||
              event.showAs === 'free' ||
              !event.id ||
              !event.start?.dateTime ||
              !event.end?.dateTime
            ) return

            blocks.push({
              id: event.id,
              subject: event.subject || 'Busy',
              start: new Date(`${event.start.dateTime}Z`),
              end: new Date(`${event.end.dateTime}Z`),
              source: 'outlook',
            })
          })
          nextUrl = response['@odata.nextLink']
        }
      }

      // Fetch work calendar ICS subscription
      const icsBlocks = await fetchWorkCalendarIcs()
      blocks.push(...icsBlocks)

      setCalendarBusyBlocks(blocks)
      const outlookCount = blocks.filter((b) => b.source === 'outlook').length
      const icsCount = blocks.filter((b) => b.source === 'ics-subscription').length
      const parts: string[] = []
      if (account) parts.push(`${outlookCount} Outlook busy blocks`)
      if (icsCount) parts.push(`${icsCount} work calendar blocks`)
      setCalendarMessage(parts.length ? `Found ${parts.join(' and ')}.` : 'No busy blocks found.')
    } catch (err: unknown) {
      setCalendarMessage(`Could not read calendar: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsSyncingCalendar(false)
    }
  }, [account, graphRequest, fetchWorkCalendarIcs])

  // Auto-refresh when account changes
  useEffect(() => {
    if (!account && !workCalendarIcsUrl) return
    const id = window.setTimeout(() => { void refreshCalendar() }, 0)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, workCalendarIcsUrl])

  const createCalendarEvent = useCallback(async (
    task: TodoTask,
    subject: string,
    start: Date,
    end: Date,
    purpose: 'due' | 'work',
    isAllDay?: boolean,
  ) => {
    let eventId: string | null = null

    // Create on personal Outlook if signed in
    if (account) {
      const eventBody: Record<string, unknown> = {
        subject,
        body: { contentType: 'HTML', content: buildTaskEventBody(task, purpose) },
        isReminderOn: true,
        reminderMinutesBeforeStart: purpose === 'due' ? 60 : 15,
        categories: ['FocusPlanner'],
      }

      if (isAllDay) {
        // All-day event: use date-only format, show as free
        const dateStr = start.toISOString().split('T')[0]
        const nextDay = new Date(start)
        nextDay.setDate(nextDay.getDate() + 1)
        const endDateStr = nextDay.toISOString().split('T')[0]
        eventBody.start = { dateTime: dateStr, timeZone: 'UTC' }
        eventBody.end = { dateTime: endDateStr, timeZone: 'UTC' }
        eventBody.isAllDay = true
        eventBody.showAs = 'free'
      } else {
        eventBody.start = { dateTime: toGraphUtcDateTime(start), timeZone: 'UTC' }
        eventBody.end = { dateTime: toGraphUtcDateTime(end), timeZone: 'UTC' }
      }

      const event = await graphRequest<GraphCreatedEvent>('/me/events', {
        method: 'POST',
        body: JSON.stringify(eventBody),
      })
      if (!event.id) throw new Error('Outlook created an event without returning an event ID.')
      eventId = event.id
    }

    return eventId ?? `local-${task.id}-${purpose}`
  }, [account, graphRequest])

  const createDueDateEvent = useCallback(async (task: TodoTask) => {
    if (!task.dueDate || task.dueEventId) return null
    setCalendarMessage(`Adding due-date reminder for "${task.title}" to Outlook...`)
    const { start, end, isAllDay } = toDueEventWindow(task.dueDate)
    const dueEventId = await createCalendarEvent(task, `Due: ${task.title}`, start, end, 'due', isAllDay)
    setCalendarMessage(`Added due-date reminder for "${task.title}" to Outlook.`)
    await refreshCalendar()
    return dueEventId
  }, [createCalendarEvent, refreshCalendar])

  return {
    calendarBusyBlocks,
    calendarMessage,
    setCalendarMessage,
    isSyncingCalendar,
    refreshCalendar,
    createCalendarEvent,
    createDueDateEvent,
  }
}
