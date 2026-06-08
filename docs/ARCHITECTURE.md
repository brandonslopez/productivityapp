# FocusPartner Architecture

## Current MVP architecture

FocusPartner is a client-side React and TypeScript application built with Vite.

```text
Browser
  |
  |-- React UI
  |-- Local storage persistence
  |-- MSAL browser sign-in
  |-- Future Microsoft Graph calls
```

## Key modules

| Area | Location | Purpose |
|---|---|---|
| App shell | `src/App.tsx` | Task state, recap parsing, guided breakdown, Microsoft sign-in |
| Styling | `src/App.css`, `src/index.css` | Responsive ADHD-friendly UI |
| Static Web Apps config | `public/staticwebapp.config.json` | SPA fallback and basic security headers |
| Environment template | `.env.example` | Microsoft Entra configuration |

## Data model

### Task

- `id`
- `title`
- `partner`
- `stakeholderId`
- `owner`
- `dueDate`
- `reminder`
- `context`
- `source`
- `status`
- `energy`
- `steps`

### Subtask

- `id`
- `title`
- `done`

### Stakeholder

- `id`
- `name`
- `organization`
- `role`

### Recap item

- `id`
- `title`
- `owner`
- `partner`
- `context`

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
  |-- Azure AI Foundry or Azure OpenAI agent service
```

## Security notes

- Do not store client secrets in the browser.
- Use public-client MSAL auth code with PKCE for SPA sign-in.
- Keep Graph scopes minimal and incremental.
- Require explicit user approval for external actions.
- Store future AI prompts and tool outputs as user-private data.
