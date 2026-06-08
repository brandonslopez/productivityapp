# FocusPlanner Feature Spec

## 1. Todo capture

The add-todo form captures the minimum information needed to schedule and finish work.

### Requirements

- Capture title, notes, due date, stakeholders, status, blockers, and anticipated minutes.
- Suggest an anticipated duration from prior completed tasks.
- Save todos locally in browser storage.
- Keep local planning usable even when Microsoft sign-in is not configured.

## 2. Focus queue

The focus queue shows the next active tasks to work or schedule.

### Requirements

- Hide completed tasks from the active queue.
- Sort by status and due date.
- Show due date, stakeholders, anticipated time, actual time, blockers, and status.
- Allow status changes directly from each task card.
- Keep the visible queue small to reduce overwhelm.

## 3. Actual-time learning

Completed todos ask how much time the work actually took.

### Requirements

- Let the user record actual minutes on each task.
- Show completed task count with actual time logged.
- Show average actual duration.
- Use completed tasks to suggest future durations.
- Prefer stakeholder-matched history when possible.

## 4. Calendar suggestions

The app suggests focus blocks before each task's due date.

### Requirements

- Suggest weekday work-hour slots.
- Avoid overlapping locally scheduled tasks.
- Respect each task's anticipated or learned duration.
- Avoid suggesting slots after the due date.
- Let the user assign a suggested slot to a task.

## 5. Calendar block export

The MVP creates downloadable calendar events instead of writing directly to Outlook.

### Requirements

- Generate an `.ics` file for a scheduled task.
- Include title, start, end, notes, stakeholders, and blockers.
- Allow re-downloading the calendar block.
- Keep direct Outlook writeback as a future Graph integration.

## 6. Microsoft sign-in

The app includes Microsoft Entra sign-in wiring using MSAL.

### Current behavior

- Reads Vite environment variables for client ID, tenant, and redirect URI.
- Uses redirect sign-in for browser compatibility.
- Requests no Microsoft Graph scopes in the MVP.
- Leaves local todo planning available without Microsoft sign-in.

### Future behavior

- Read Outlook availability after explicit permission.
- Create Outlook calendar focus blocks after user approval.
- Store todos per signed-in user in a backend.
