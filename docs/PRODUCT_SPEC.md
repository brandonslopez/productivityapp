# FocusPlanner Product Spec

## Summary

FocusPlanner is a personal productivity app that helps knowledge workers manage tasks, protect focus time, and schedule work around existing calendar commitments. It combines fast task capture, AI-powered time estimates, calendar-aware scheduling, and real-time busy-block visibility in a single lightweight interface.

## Target user

Product managers and knowledge workers who receive tasks from meetings, email, chats, customer asks, and stakeholder follow-ups, and who need help deciding when to work on each item without creating another overwhelming project-management system.

## Goals

1. Help the user know what to work on next.
2. Capture enough task context to schedule the work.
3. Track due dates, stakeholders, blockers, status, and expected effort.
4. Learn from actual time spent so future estimates become more realistic.
5. Turn tasks into calendar focus blocks before they are due.
6. Provide visibility into work calendar commitments alongside planned tasks.
7. Support recurring workflows, categorization, and search/filter for growing task lists.

## Core experience

The app opens to a focus queue showing active tasks sorted by priority. The user creates a todo with a due date, stakeholders, status, blockers, tags, category, and anticipated time. Azure AI suggests duration estimates and subtask breakdowns. The app reads calendar busy blocks (from Outlook and/or ICS subscription) and suggests available focus slots. Events are created directly on Outlook. Completed tasks feed a local estimate engine that improves future suggestions.

## Productivity principles

- Show a focused queue instead of every possible task.
- Prefer concrete time blocks over vague intentions.
- Keep task capture fast and forgiving.
- Make blockers visible so stuck work does not silently disappear.
- Separate planning, scheduling, and doing.
- Use estimates as support, not judgment.
- Support dark mode to reduce visual fatigue during long sessions.

## Current scope

- Responsive React + TypeScript web app deployed to Azure Static Web Apps.
- Component-based architecture with custom hooks and utility modules.
- Local task persistence in browser storage.
- Todo capture with due date, stakeholders, status, blockers, tags, categories, anticipated time, actual time, and recurrence.
- Azure AI-powered duration estimates and subtask suggestions via server-side API.
- Microsoft Entra sign-in with Outlook calendar read/write via Microsoft Graph.
- ICS subscription for work calendar busy-block visibility (server-side proxy to avoid CORS).
- Calendar slot suggestions that avoid existing busy blocks.
- Direct Outlook event creation for due-date reminders and focus blocks.
- Downloadable `.ics` calendar blocks as offline fallback.
- Dark mode with system preference detection and manual toggle.
- Drag-to-reorder tasks in the focus queue.
- Inline task editing and modal-based full edit.
- Search and filter by text, status, category, and date range.
- Recurring tasks (daily, weekly, monthly, custom with specific days).
- Task categories and tags.
- SMS notification support via Azure Communication Services.
- Toast notification system for user feedback.
- Token refresh and silent authentication renewal.

## Out of scope (future)

- Production database (currently uses browser localStorage).
- Multi-user collaboration.
- Email notifications.
- Mobile native app.

## Success measures

- User can create a todo in under one minute.
- User can schedule a todo into a calendar block in one click.
- Completed tasks can record actual minutes spent.
- Future todo estimates improve after actual time is logged.
- Work calendar conflicts are visible before scheduling a focus block.
- Recurring tasks auto-generate without manual re-entry.
