# FocusPlanner Architecture

## Current MVP architecture

FocusPlanner is a client-side React and TypeScript application built with Vite.

```text
Browser
  |
  |-- React UI
  |-- Local storage persistence
  |-- MSAL browser sign-in
  |-- Microsoft Graph calendar calls
  |-- Downloadable .ics calendar blocks
  |
Azure Static Web Apps API
  |
  |-- /api/task-assistant
  |-- Azure AI task estimate and subtask split
```

## Key modules

| Area | Location | Purpose |
|---|---|---|
| App shell | `src/App.tsx` | Todo state, estimate learning, Azure AI suggestions, calendar suggestions, Microsoft sign-in |
| Styling | `src/App.css`, `src/index.css` | Responsive ADHD-friendly UI |
| Task assistant API | `api/task-assistant/index.js` | Server-side Azure AI request for duration estimate and smaller steps |
| Static Web Apps config | `public/staticwebapp.config.json` | SPA fallback and basic security headers |
| Environment template | `.env.example` | Microsoft Entra configuration |

## Data model

### Todo task

- `id`
- `title`
- `description`
- `dueDate`
- `stakeholders`
- `status`
- `blockers`
- `anticipatedMinutes`
- `actualMinutes`
- `completedAt`
- `calendarStart`
- `calendarEnd`
- `subtasks`
- `aiEstimateRationale`
- `createdAt`

## Persistence

The MVP uses browser local storage so the app works immediately without a backend. Production should move to an authenticated backend with per-user storage.

## Recommended production architecture

```text
Azure Static Web Apps
  |
  |-- React front end
  |-- Azure Functions API
  |-- Microsoft Entra authentication
  |-- Azure Cosmos DB or Azure SQL per-user storage
  |-- Microsoft Graph calendar integration
  |-- Azure AI Foundry or Azure OpenAI estimate service
```

## Security notes

- Do not store client secrets in the browser.
- Use public-client MSAL auth code with PKCE for SPA sign-in.
- Keep Graph scopes minimal and incremental.
- Require explicit user approval for calendar writes.
- Keep Azure AI keys in Static Web Apps API settings, never in Vite environment variables.
- Treat AI prompts and outputs as user-private data.
