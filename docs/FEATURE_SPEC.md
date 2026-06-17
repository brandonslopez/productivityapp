# FocusPlanner Feature Spec

## 1. Todo capture

The add-todo form captures the information needed to schedule and finish work.

### Requirements

- Capture title, notes, due date, stakeholders, status, blockers, tags, category, and anticipated minutes.
- Support recurring task configuration (daily, weekly, monthly, custom with specific days of week).
- Suggest an anticipated duration from prior completed tasks and Azure AI estimates.
- Save todos locally in browser storage.
- Keep local planning usable even when Microsoft sign-in is not configured.

## 2. Focus queue

The focus queue shows the next active tasks to work or schedule.

### Requirements

- Hide completed tasks from the active queue.
- Sort by status priority and due date.
- Support drag-to-reorder for manual prioritization.
- Show due date, stakeholders, anticipated time, actual time, blockers, tags, category, recurrence badge, and status.
- Allow status changes directly from each task card.
- Allow inline editing of blockers and actual time on task cards.
- Support click-to-edit via a full edit modal for all task fields.
- Keep the visible queue focused to reduce overwhelm.

## 3. Search and filter

Users can find tasks quickly as the list grows.

### Requirements

- Free-text search across title, notes, stakeholders, and blockers.
- Filter by status (All, Not started, In progress, Blocked, Scheduled, Done).
- Filter by category.
- Filter by date range (from/to).
- Filters combine (AND logic).

## 4. Actual-time learning

Completed todos ask how much time the work actually took.

### Requirements

- Let the user record actual minutes on each task.
- Show completed task count with actual time logged.
- Show average actual duration.
- Use completed tasks to suggest future durations.
- Prefer stakeholder-matched history when possible.

## 5. Calendar suggestions

The app suggests focus blocks before each task's due date.

### Requirements

- Suggest weekday work-hour slots.
- Avoid overlapping locally scheduled tasks.
- Avoid overlapping Outlook calendar busy blocks.
- Avoid overlapping work calendar ICS busy blocks.
- Respect each task's anticipated or learned duration.
- Avoid suggesting slots after the due date.
- Let the user assign a suggested slot to a task.

## 6. Calendar integration

The app reads and writes calendar events through Microsoft Graph and ICS subscriptions.

### Requirements

- Microsoft Entra sign-in using MSAL with redirect flow and PKCE.
- Request `Calendars.ReadWrite` scope for Outlook access.
- Read next 14 days of Outlook busy blocks to inform scheduling.
- Support ICS URL subscription for work calendar visibility (server-side proxy to avoid CORS).
- Create Outlook events for due-date reminders and focus blocks.
- Generate downloadable `.ics` files as offline fallback.
- Show a 7-day calendar view combining Outlook events, work calendar blocks, due reminders, and focus blocks.
- Silent token refresh with automatic retry on 401 errors.
- Support `common` tenant for both personal and work/school accounts.

## 7. Task editing

Users can modify any task after creation.

### Requirements

- Click any task card to open a full edit modal.
- Edit all fields: title, notes, due date, stakeholders, status, blockers, tags, category, anticipated time, recurrence.
- Save changes back to local storage immediately.
- Close modal with escape key or close button.

## 8. Recurring tasks

Users can set tasks to repeat automatically.

### Requirements

- Support recurrence types: daily, weekly, monthly, and custom.
- Custom recurrence allows selecting specific days of the week.
- Configurable interval (every N days/weeks/months).
- When a recurring task is marked done, automatically generate the next occurrence.
- Show a recurrence badge on task cards.

## 9. Categories and tags

Users can organize tasks by category and free-form tags.

### Requirements

- Single category per task (dropdown selection or free entry).
- Multiple comma-separated tags per task.
- Show category and tags on task cards as colored badges.
- Filter by category in the search/filter bar.

## 10. Dark mode

The app supports light and dark themes.

### Requirements

- Detect system color scheme preference on first load.
- Manual toggle in the header.
- Persist preference in local storage.
- All UI components respect CSS custom properties for theming.

## 11. Drag-to-reorder

Users can manually prioritize tasks by dragging.

### Requirements

- Drag handle on each task card.
- Smooth drag animation with visual feedback.
- Persist sort order in local storage.
- Only active (non-completed) tasks are draggable.

## 12. AI-powered estimates

Azure AI provides duration estimates and subtask breakdowns.

### Requirements

- Server-side API endpoint (`/api/task-assistant`) calls Azure OpenAI.
- Sends task title, notes, blockers, and recent completed-task timing examples.
- Returns estimated minutes, suggested subtasks, and rationale.
- User can accept, edit, or discard AI suggestions before saving.
- Graceful fallback when Azure AI is not configured.

## 13. Blocker visibility

Blocked tasks are surfaced in a dedicated section.

### Requirements

- Show all tasks with `status === 'Blocked'` OR non-empty blocker text.
- Display blocker details and current status badge.
- Click to open edit modal for resolution.

## 14. SMS notifications

Users can receive SMS reminders via Azure Communication Services.

### Requirements

- Enter phone number in Settings panel.
- Server-side `/api/send-sms` endpoint using Azure Communication Services.
- Configurable notification timing: hours before due date, minutes before focus block.
- Opt-in per task via notification preferences.

## 15. Settings panel

Centralized configuration for user preferences.

### Requirements

- Work calendar ICS URL with refresh interval.
- SMS phone number.
- Default notification preferences.
- Accessible from header gear icon.

## 16. Error handling and feedback

The app provides clear feedback for all operations.

### Requirements

- Toast notification system with success, error, info, and warning types.
- Auto-dismiss after configurable duration.
- Graceful error messages for calendar sync failures.
- Graceful error messages for AI suggestion failures.
- Non-blocking errors for optional features (ICS fetch, SMS).
