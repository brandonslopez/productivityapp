# FocusPlanner

FocusPlanner is a private, responsive web app for calendar-aware todo planning. It helps you capture tasks, estimate how long they will take, track blockers, schedule focus blocks, and learn from actual time spent.

## What it does

- Opens to a focused queue of the next tasks to work or schedule.
- Captures todos with due date, stakeholders, status, blockers, and anticipated time.
- Asks for actual time when a task is completed.
- Learns locally from completed tasks to suggest duration for new work.
- Connects to Outlook calendar to avoid busy times when suggesting focus blocks.
- Shows a 7-day calendar view with Outlook busy blocks, todo due reminders, and scheduled focus blocks.
- Creates Outlook events for due-date reminders and scheduled focus time.
- Supports signing out of Outlook while keeping local todos available.
- Falls back to downloadable `.ics` calendar blocks when Outlook is not connected.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Microsoft sign-in setup

Create a `.env.local` file from `.env.example` and fill in your Microsoft Entra app registration values:

```bash
VITE_ENTRA_CLIENT_ID=your-client-id
VITE_ENTRA_TENANT_ID=consumers
VITE_REDIRECT_URI=http://localhost:5173
```

Use `consumers` for personal Microsoft accounts, `common` for work/school plus personal accounts, or a tenant ID for one organization. Direct Outlook sync requires delegated Microsoft Graph `Calendars.ReadWrite` consent so FocusPlanner can read busy blocks and create calendar events.

## Documentation

- [Product spec](docs/PRODUCT_SPEC.md)
- [Feature spec](docs/FEATURE_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [AI agency and safety](docs/AI_AGENCY_AND_SAFETY.md)
- [Microsoft 365 integration](docs/M365_INTEGRATION.md)

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```
