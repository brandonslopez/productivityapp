import type { CalendarViewItem } from '../../types'
import { startOfDay, addDays, isSameDay } from '../../utils/calendar'
import { formatDayHeading } from '../../utils/formatting'
import { useMemo } from 'react'

type Props = {
  calendarViewItems: CalendarViewItem[]
  includeWeekends?: boolean
}

const HOUR_START = 7
const HOUR_END = 20
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

function formatHour(hour: number): string {
  const h = hour % 12 || 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${h} ${ampm}`
}

function getEventPosition(item: CalendarViewItem, dayStart: Date) {
  const startMinutes = (item.start.getTime() - dayStart.getTime()) / 60000
  const endMinutes = (item.end.getTime() - dayStart.getTime()) / 60000
  const top = Math.max(0, (startMinutes - HOUR_START * 60) / 30) * 24 // 24px per half-hour
  const height = Math.max(24, ((endMinutes - Math.max(startMinutes, HOUR_START * 60)) / 30) * 24)
  return { top, height }
}

export function CalendarView({ calendarViewItems, includeWeekends = false }: Props) {
  const calendarDays = useMemo(() => {
    const today = startOfDay(new Date())
    const days: Date[] = []
    let offset = 0
    const numDays = includeWeekends ? 7 : 5
    while (days.length < numDays && offset < 14) {
      const day = addDays(today, offset)
      const dayOfWeek = day.getDay()
      if (includeWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        days.push(day)
      }
      offset++
    }
    return days
  }, [includeWeekends])

  const timezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')
  }, [])

  return (
    <section className="panel calendar-panel" aria-label="Connected calendar view">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Calendar view</p>
          <h2>Your next {calendarDays.length} days</h2>
        </div>
        <span className="count-badge">
          {calendarViewItems.length} {calendarViewItems.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      <div className="calendar-legend" aria-label="Calendar legend">
        <span className="legend-item legend-outlook">Outlook busy</span>
        <span className="legend-item legend-work-calendar">Work calendar</span>
        <span className="legend-item legend-focus">Focus block</span>
        <span className="legend-item legend-due">Due reminder</span>
      </div>

      <div className="calendar-grid-container">
        <div className="calendar-grid" style={{ gridTemplateColumns: `60px repeat(${calendarDays.length}, 1fr)` }}>
          {/* Header row */}
          <div className="calendar-grid-tz">{timezone}</div>
          {calendarDays.map((day) => (
            <div className="calendar-grid-header" key={day.toISOString()}>
              <strong>{formatDayHeading(day)}</strong>
            </div>
          ))}

          {/* Time grid */}
          <div className="calendar-time-column">
            {HOURS.map((hour) => (
              <div className="calendar-time-label" key={hour}>
                <span>{formatHour(hour)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {calendarDays.map((day) => {
            const dayStart = startOfDay(day)
            const dayItems = calendarViewItems.filter((item) => isSameDay(item.start, day))
            const timedItems = dayItems.filter((item) => item.type !== 'due')
            const dueItems = dayItems.filter((item) => item.type === 'due')

            return (
              <div className="calendar-day-column" key={day.toISOString()}>
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div className="calendar-hour-row" key={hour}>
                    <div className="calendar-half-hour-line" />
                  </div>
                ))}

                {/* Due date banners (all-day) */}
                {dueItems.map((item) => (
                  <div className="calendar-allday-event calendar-event-due" key={item.id}>
                    <strong>{item.title}</strong>
                  </div>
                ))}

                {/* Timed events */}
                {timedItems.map((item) => {
                  const { top, height } = getEventPosition(item, dayStart)
                  return (
                    <div
                      className={`calendar-timed-event calendar-event-${item.type}`}
                      key={item.id}
                      style={{ top: `${top + 24}px`, height: `${height}px` }}
                      title={`${item.title}`}
                    >
                      <strong>{item.title}</strong>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <p className="guardrail">
        Outlook events appear after you connect or refresh calendar. Work calendar events appear from your ICS subscription.
      </p>
    </section>
  )
}
