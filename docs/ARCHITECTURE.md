# FocusPlanner Architecture

## System architecture

FocusPlanner is a React + TypeScript single-page application built with Vite, deployed to Azure Static Web Apps with a serverless Azure Functions API backend.

```text
Browser (React SPA)
  ├── Components (modular UI)
  ├── Custom hooks (business logic)
  ├── Utility modules (pure functions)
  ├── Local storage persistence
  ├── MSAL browser sign-in (Entra ID)
  └── Microsoft Graph API calls
        │
        ▼
Azure Static Web Apps
  ├── /api/task-assistant     → Azure OpenAI (duration estimates + subtasks)
  ├── /api/fetch-ics          → Server-side ICS proxy (CORS avoidance)
  └── /api/send-sms           → Azure Communication Services (SMS reminders)
```

## Frontend module structure

```text
src/
├── App.tsx                    # Main orchestrator, connects hooks and components
├── App.css                    # Global styles with CSS custom properties
├── index.css                  # Theme variables (light/dark)
├── types/
│   └── index.ts               # All TypeScript types
├── hooks/
│   ├── useAuth.ts             # MSAL sign-in, token refresh, Graph requests
│   ├── useCalendar.ts         # Calendar sync, ICS fetch, event creation
│   ├── useAiSuggestion.ts     # Azure AI task estimates
│   ├── useDarkMode.ts         # Theme detection and persistence
│   ├── useLocalStorage.ts     # Generic localStorage hook
│   └── useToast.ts            # Toast notification state
├── utils/
│   ├── calendar.ts            # Slot suggestions, calendar view items, Graph helpers
│   ├── formatting.ts          # Duration/date formatting, ID generation
│   ├── ics.ts                 # ICS file generation and parsing
│   └── tasks.ts               # Sorting, recurrence, categories, defaults
├── components/
│   ├── CalendarView/          # 7-day calendar grid
│   ├── TaskForm/              # New task creation form
│   ├── TaskCard/              # Individual task display with inline editing
│   ├── EditTaskModal/         # Full task edit modal
│   ├── SearchFilter/          # Search and filter bar
│   ├── SettingsPanel/         # User settings modal
│   ├── DarkModeToggle/        # Theme toggle button
│   └── Toast/                 # Toast notification display
└── main.tsx                   # App entry point
```

## API endpoints

| Endpoint | Method | Purpose | Dependencies |
|---|---|---|---|
| `/api/task-assistant` | POST | AI-powered duration estimate and subtask breakdown | Azure OpenAI |
| `/api/fetch-ics` | POST | Proxy ICS calendar feed to avoid CORS restrictions | None (HTTP proxy) |
| `/api/send-sms` | POST | Send SMS reminders to user's phone | Azure Communication Services |

## Data model

### TodoTask

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `title` | string | Task title |
| `description` | string | Notes and context |
| `dueDate` | string | ISO date string |
| `stakeholders` | string | People involved |
| `status` | TaskStatus | Not started, In progress, Blocked, Scheduled, Done |
| `blockers` | string | What's preventing progress |
| `anticipatedMinutes` | number | Expected duration |
| `actualMinutes` | number \| null | Time actually spent |
| `completedAt` | string \| null | Completion timestamp |
| `calendarStart` | string \| null | Scheduled focus block start |
| `calendarEnd` | string \| null | Scheduled focus block end |
| `dueEventId` | string \| null | Outlook event ID for due reminder |
| `workEventId` | string \| null | Outlook event ID for focus block |
| `subtasks` | TaskStep[] | AI-suggested or manual subtasks |
| `aiEstimateRationale` | string \| null | AI explanation for estimate |
| `createdAt` | string | Creation timestamp |
| `tags` | string[] | Free-form tags |
| `category` | string | Task category |
| `recurrence` | Recurrence \| null | Repeat configuration |
| `sortOrder` | number | Manual drag-to-reorder position |
| `notifications` | NotificationPreference \| null | Per-task notification settings |

### AppSettings

| Field | Type | Description |
|---|---|---|
| `darkMode` | boolean | Dark theme enabled |
| `phoneNumber` | string | SMS notification number |
| `defaultNotifications` | NotificationPreference | Default reminder preferences |
| `workCalendarIcsUrl` | string | ICS subscription URL for work calendar |
| `workCalendarRefreshMinutes` | number | How often to refresh ICS feed |

## Persistence

The app uses browser localStorage for all data (tasks, settings, theme preference). This enables immediate use without backend setup. Production could add per-user backend storage with Azure Cosmos DB or Azure SQL.

## Authentication flow

1. User clicks "Sign in with Microsoft"
2. MSAL redirects to Microsoft Entra login (tenant: `common`)
3. User grants `Calendars.ReadWrite` consent
4. MSAL stores tokens in browser session storage
5. `useAuth` hook provides `graphRequest` function for Graph API calls
6. Silent token refresh runs automatically before expiration
7. 401 responses trigger automatic sign-out and re-auth prompt

## Calendar data flow

```text
Work calendar (ICS URL) ─── /api/fetch-ics ───┐
                                                ├──→ Calendar view + slot suggestions
Personal Outlook (Graph API) ─────────────────┘
                                                 │
Task scheduled ──→ Create Outlook event ─────────┘
```

## Deployment

- **Hosting:** Azure Static Web Apps (auto-deploys from GitHub `main` branch)
- **CI/CD:** GitHub Actions workflow (`.github/workflows/azure-static-web-apps-white-sand-0c2224c1e.yml`)
- **API:** Azure Functions (Node.js) managed by Static Web Apps
- **Environment variables:** Set in Static Web Apps Application Settings (never in client-side code)

## Security notes

- Do not store client secrets in the browser.
- Use public-client MSAL auth code with PKCE for SPA sign-in.
- Keep Graph scopes minimal and incremental.
- Require explicit user approval for calendar writes.
- Keep Azure AI keys in Static Web Apps API settings, never in Vite environment variables.
- Treat AI prompts and outputs as user-private data.
- ICS proxy validates host allowlist (outlook.office365.com, outlook.live.com, calendar.google.com).

## Third-party dependencies

### Frontend
- `@azure/msal-browser` — Microsoft Entra authentication
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — Drag-to-reorder
- React 19, TypeScript 6, Vite 8

### API
- `@azure/communication-sms` — SMS notifications
- Azure Functions Node.js runtime
