import type { CalendarViewItem } from '../../types'
import { startOfDay, addDays, isSameDay } from '../../utils/calendar'
import { formatDayHeading, formatTimeRange } from '../../utils/formatting'
import { useMemo } from 'react'

type Props = {
  calendarViewItems: CalendarViewItem[]
}

export function CalendarView({ calendarViewItems }: Props) {
  const calendarDays = useMemo(() => {
    const today = startOfDay(new Date())
    return Array.from({ length: 7 }, (_, i) => addDays(today, i))
  }, [])

  return (
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
        <span className="legend-item legend-work-calendar">Work calendar</span>
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
        Outlook events appear after you connect or refresh calendar. Work calendar events appear from your ICS subscription. FocusPlanner todo due dates and selected focus blocks stay visible here even before syncing.
      </p>
    </section>
  )
}
