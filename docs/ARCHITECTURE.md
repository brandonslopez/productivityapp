# FocusPlanner Architecture

## Current MVP architecture

FocusPlanner is a client-side React and TypeScript application built with Vite.

```text
Browser
  |
  |-- React UI
  |-- Local storage persistence
  |-- MSAL browser sign-in
  |-- Downloadable .ics calendar blocks
  |-- Future Microsoft Graph calls
```

## Key modules

| Area | Location | Purpose |
|---|---|---|
| App shell | `src/App.tsx` | Todo state, estimate learning, calendar suggestions, Microsoft sign-in |
| Styling | `src/App.css`, `src/index.css` | Responsive ADHD-friendly UI |
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
- Store future AI prompts and tool outputs as user-private data.
