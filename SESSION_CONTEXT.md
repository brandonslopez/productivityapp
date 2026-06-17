# FocusPlanner Session Context

> Last updated: 2026-06-17
> This file contains full context for continuing development of FocusPlanner.
> If starting a new conversation, point the assistant to this file.

---

## Project Location

- **Desktop path:** `C:\Users\lopezbrandon\Desktop\focuspartner`
- **GitHub repo:** `https://github.com/brandonslopez/productivityapp.git`
- **Deployed URL:** `https://white-sand-0c2224c1e.7.azurestaticapps.net`
- **Branch:** `main` (auto-deploys via GitHub Actions)

---

## Tech Stack

- **Frontend:** React 19 + TypeScript 6 + Vite 8
- **Hosting:** Azure Static Web Apps
- **API:** Azure Functions (Node.js) — managed by Static Web Apps
- **AI:** Azure OpenAI (GPT-4o) — resource `focusplanner-openai` in `focusplanner-rg`
- **SMS:** Azure Communication Services — resource `focusplanner-comms` in `focusplanner-rg`
- **Auth:** Microsoft Entra ID (MSAL Browser, SPA, PKCE)
- **CI/CD:** GitHub Actions (`.github/workflows/azure-static-web-apps-white-sand-0c2224c1e.yml`)

---

## Azure Accounts

| Account | Subscription | Resources |
|---|---|---|
| `lopezbrandon@microsoft.com` (work) | Azure Boot Camp Bravo | `focusplanner-rg`: OpenAI + Communication Services |
| `Brandon2758@outlook.com` (personal) | Visual Studio Enterprise | `focuspartner-rg`: Static Web App `productivityapp` |

---

## Entra App Registration

- **Client ID:** `50585630-d341-4ddf-bbea-84f68738e20c`
- **Tenant:** `common` (supports both personal and work/school accounts)
- **Redirect URIs:** `http://localhost:5173`, `https://white-sand-0c2224c1e.7.azurestaticapps.net`
- **Scopes:** `Calendars.ReadWrite`

---

## Static Web App Settings (production)

```
AZURE_AI_ENDPOINT=https://focusplanner-openai.openai.azure.com
AZURE_AI_API_KEY=(set in portal)
AZURE_AI_DEPLOYMENT=gpt-4o
AZURE_AI_API_VERSION=2024-10-21
AZURE_COMMUNICATION_CONNECTION_STRING=(set in portal)
POWER_AUTOMATE_FLOW_URL=(set but not used — DLP blocked)
```

---

## Local Development

1. `cd Desktop\focuspartner\api && func start` (port 7071)
2. `cd Desktop\focuspartner && npm run dev` (port 5173, proxies /api to 7071)
3. Local API credentials in `api/local.settings.json` (gitignored)

---

## Features Implemented (12 improvements from original request)

1. ✅ **Component split** — Monolithic App.tsx → components/, hooks/, utils/, types/
2. ✅ **Edit existing tasks** — Full edit modal on click
3. ✅ **Drag-to-reorder** — @dnd-kit for manual priority
4. ✅ **Dark mode** — System detection + manual toggle + CSS variables
5. ✅ **Better error handling** — Toast notification system
6. ✅ **Token refresh** — Silent MSAL renewal, auto-retry on 401
7. ✅ **Recurring tasks** — Daily/weekly/monthly/custom with specific days
8. ✅ **Categories/tags** — Per-task category + comma-separated tags
9. ✅ **Search and filter** — Text + status + category + date range
10. ✅ **SMS notifications** — Azure Communication Services via /api/send-sms
11. ✅ **Azure AI fix** — Connected to Azure OpenAI GPT-4o, working in production
12. ✅ **Work calendar sync** — ICS subscription via /api/fetch-ics server proxy

---

## Architecture (key files)

```
src/
├── App.tsx                         # Main orchestrator (~330 lines)
├── types/index.ts                  # All TypeScript types
├── hooks/
│   ├── useAuth.ts                  # MSAL sign-in + Graph requests
│   ├── useCalendar.ts              # Outlook + ICS sync + event creation
│   ├── useAiSuggestion.ts          # Azure AI estimates
│   ├── useDarkMode.ts              # Theme management
│   ├── useLocalStorage.ts          # Generic localStorage hook
│   └── useToast.ts                 # Toast state
├── utils/
│   ├── calendar.ts                 # Slot suggestions, Graph helpers
│   ├── formatting.ts               # Duration/date formatting
│   ├── ics.ts                      # ICS generation + parsing
│   └── tasks.ts                    # Sorting, recurrence, defaults
├── components/
│   ├── CalendarView/               # 7-day grid
│   ├── TaskForm/                   # New task form
│   ├── TaskCard/                   # Task display + inline edit
│   ├── EditTaskModal/              # Full task edit modal
│   ├── SearchFilter/               # Search/filter bar
│   ├── SettingsPanel/              # Settings modal
│   ├── DarkModeToggle/             # Theme toggle
│   └── Toast/                      # Notifications
api/
├── task-assistant/                 # Azure OpenAI endpoint
├── fetch-ics/                      # ICS proxy (CORS avoidance)
├── send-sms/                       # SMS via Communication Services
└── proxy-calendar-event/           # (unused — DLP blocked Power Automate)
```

---

## Calendar Sync Architecture

**Problem:** User cannot get admin consent for Graph API on work tenant.

**Solution:**
- **Work → App:** User publishes work calendar as ICS URL → app reads via `/api/fetch-ics` server proxy
- **App → Work:** App creates events on personal Outlook → user subscribes to personal calendar from work Outlook

**ICS parser handles:** TZID parameters, all-day events (VALUE=DATE), standard UTC timestamps

---

## Known Issues / Remaining Work

1. **SMS phone number not purchased** — Need to buy from Azure Communication Services (`focusplanner-comms` resource, work account). Set as `AZURE_COMMUNICATION_SENDER_NUMBER` in both local.settings.json and SWA app settings.
2. **Power Automate blocked by DLP** — Work tenant DLP policy prevents HTTP→Outlook connector. `/api/proxy-calendar-event` endpoint exists but is unused. Could be removed.
3. **Old folder at `C:\Users\lopezbrandon\focuspartner`** — Couldn't delete due to locked node_modules file. Delete after reboot.
4. **localStorage only** — No backend database yet. Tasks are per-browser.
5. **No mobile app** — Responsive web only.

---

## Documentation

All docs in `docs/` folder are up to date as of 2026-06-17:
- `PRODUCT_SPEC.md` — Product overview and scope
- `FEATURE_SPEC.md` — All 16 features documented
- `ARCHITECTURE.md` — Full technical architecture
- `AI_AGENCY_AND_SAFETY.md` — AI integration and safety rules
- `M365_INTEGRATION.md` — Calendar and auth integration details
- `DEMO_SCRIPT.md` — 8-10 minute team presentation script

---

## Git History (key commits)

- `865dc31` — docs: update all documentation, add demo script, remove ADHD references
- `581bb95` — fix: show tasks with blockers in Blocked section, remove Power Automate
- `9d4513b` — feat: add Power Automate integration for work calendar events
- `979c7d7` — fix: proxy ICS fetch through API to avoid CORS, improve ICS parser
- `e08c698` — feat: major refactor with 12 improvements (35 files, +3109/-1341)

---

## User Preferences

- App is a **general productivity app** — no ADHD references
- Track all improvements for documentation updates
- Work account: `lopezbrandon@microsoft.com`
- Personal account: `Brandon2758@outlook.com`
