# Microsoft 365 Integration Spec

## Overview

FocusPlanner integrates with Microsoft 365 through two channels:

1. **Microsoft Graph API** — Direct Outlook calendar read/write for personal accounts (or work accounts with admin consent).
2. **ICS subscription** — Read-only visibility into work calendar busy blocks without requiring admin consent.

## Configuration

The app reads authentication configuration from Vite environment variables:

- `VITE_ENTRA_CLIENT_ID` — Microsoft Entra app registration client ID
- `VITE_ENTRA_TENANT_ID` — Set to `common` for both work/school and personal Microsoft accounts
- `VITE_REDIRECT_URI` — SPA redirect URI

## App registration

Create a Microsoft Entra app registration for a single-page application:

- **Supported account types:** Accounts in any organizational directory and personal Microsoft accounts
- **Platform:** Single-page application (SPA)

### Redirect URIs

```text
http://localhost:5173                                    (local development)
https://white-sand-0c2224c1e.7.azurestaticapps.net     (production)
```

## Sign-in and Graph scopes

The sign-in flow requests delegated Microsoft Graph calendar access:

- `Calendars.ReadWrite`

This scope allows the app to:
- Read upcoming calendar events to identify busy time
- Create Outlook events for due-date reminders and focus blocks

### Work tenant limitations

Some work tenants block user consent for `Calendars.ReadWrite`. If the tenant requires admin consent, users can still access their work calendar via ICS subscription (see below).

## Authentication flow

1. User clicks "Sign in with Microsoft"
2. MSAL Browser redirects to Microsoft Entra login
3. Auth code flow with PKCE exchanges code for tokens
4. Tokens stored in browser session storage
5. `useAuth` hook provides automatic silent token refresh
6. 401 responses trigger token clear and re-authentication prompt
7. Sign-out clears tokens; local tasks remain in browser storage

## Calendar workflows

### Reading calendar (Outlook — Graph API)

When signed in, the app reads the next 14 days of Outlook calendar events via:

```
GET /me/calendarView?startDateTime=...&endDateTime=...
```

Events with `showAs !== 'free'` are treated as busy blocks and displayed in the calendar view.

### Reading calendar (Work — ICS subscription)

For work calendars where Graph API access isn't available:

1. User publishes their work calendar as an ICS URL (Outlook → Settings → Shared calendars → Publish)
2. User pastes the ICS URL into FocusPlanner Settings
3. The app's `/api/fetch-ics` server-side endpoint fetches the ICS feed (avoiding browser CORS restrictions)
4. The ICS parser extracts events with support for:
   - TZID parameters (e.g., `DTSTART;TZID=Eastern Standard Time:20250615T140000`)
   - All-day events (`VALUE=DATE:20250615`)
   - Standard `DTSTART`/`DTEND` with UTC timestamps

### Creating events (Outlook — Graph API)

When the user schedules a focus block or creates a task with a due date:

```
POST /me/events
{
  "subject": "Due: Task Title" or "Focus: Task Title",
  "start": { "dateTime": "...", "timeZone": "UTC" },
  "end": { "dateTime": "...", "timeZone": "UTC" },
  "body": { "contentType": "HTML", "content": "..." },
  "isReminderOn": true,
  "reminderMinutesBeforeStart": 15 or 60,
  "categories": ["FocusPlanner"]
}
```

The returned event ID is stored on the task for future reference.

### Viewing events on work calendar

To see FocusPlanner events on your work calendar without admin consent:

1. Publish your personal Outlook calendar (outlook.live.com → Calendar → Settings → Shared calendars → Publish)
2. Subscribe to that ICS URL from your work Outlook (Add calendar → Subscribe from web)

This provides bidirectional visibility:
- Work → FocusPlanner: via ICS subscription in Settings
- FocusPlanner → Work: via personal calendar subscription in work Outlook

### Downloadable .ics fallback

If Outlook is not connected, the app generates a downloadable `.ics` file for any scheduled focus block, including task title, time, notes, stakeholders, and blockers.

## Calendar view

The 7-day calendar view displays four event types:

| Type | Source | Color coding |
|---|---|---|
| Outlook busy blocks | Graph API `/me/calendarView` | Blue |
| Work calendar blocks | ICS subscription | Purple |
| Due-date reminders | Created by FocusPlanner | Orange |
| Focus blocks | Created by FocusPlanner | Green |

## Slot suggestion logic

When suggesting focus time for a task:

1. Collect all busy blocks (Outlook + ICS + existing FocusPlanner events)
2. Scan weekday hours (9 AM – 5 PM) for the next 14 days
3. Find gaps that fit the task's anticipated duration
4. Skip slots that overlap any busy block
5. Skip slots after the task's due date
6. Present top available slots to the user

## Data handling

- Todos may contain sensitive stakeholder information.
- Todo content is only sent to AI services when the user explicitly requests an estimate.
- Calendar data is fetched on-demand and not persisted to any backend.
- ICS proxy validates the host allowlist before fetching (outlook.office365.com, outlook.live.com, calendar.google.com).
- Use least-privilege Graph scopes.
- Tenant data is isolated per signed-in user.
