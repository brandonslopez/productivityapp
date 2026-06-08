# FocusPlanner Product Spec

## Summary

FocusPlanner helps one person manage todo work without creating another overwhelming project-management system. It is designed for ADHD-friendly execution: fast capture, visible next steps, realistic time estimates, blockers, and calendar focus blocks.

## Target user

Product managers and knowledge workers who receive tasks from meetings, email, chats, customer asks, random thoughts, and stakeholder follow-ups, and who need help deciding when to work on each item.

## Goals

1. Help the user know what to work on next.
2. Capture enough task context to schedule the work.
3. Track due dates, stakeholders, blockers, status, and expected effort.
4. Learn from actual time spent so future estimates become more realistic.
5. Turn tasks into calendar focus blocks before they are due.

## Core experience

The app opens to a calm focus queue. The user creates a todo with a due date, stakeholders, status, blockers, and anticipated time. The app suggests calendar slots, creates a downloadable `.ics` event, and asks for actual time when the work is completed. Completed tasks feed a local estimate engine.

## ADHD-friendly principles

- Show a small focus queue instead of every possible task.
- Prefer concrete time blocks over vague intentions.
- Keep task capture fast and forgiving.
- Make blockers visible so stuck work does not silently disappear.
- Separate planning, scheduling, and doing.
- Use estimates as support, not judgment.

## MVP scope

- Responsive React web app.
- Local task persistence in browser storage.
- Todo capture with due date, stakeholders, status, blockers, anticipated time, and actual time.
- Local duration suggestions from completed tasks.
- Calendar slot suggestions using simple work-hour heuristics.
- Downloadable `.ics` calendar blocks.
- Microsoft sign-in wiring without Graph scopes.

## Out of scope for MVP

- Production database.
- Real Microsoft Graph calendar writeback.
- Reading Outlook calendar availability.
- Real AI model calls.
- Email sending.
- Multi-user collaboration.

## Success measures

- User can create a todo in under one minute.
- User can schedule a todo into a calendar block in one click.
- Completed tasks can record actual minutes spent.
- Future todo estimates improve after actual time is logged.
