# Microsoft 365 Integration Spec

## Current implementation

The app includes Microsoft Entra sign-in wiring with MSAL Browser and direct Outlook calendar sync through Microsoft Graph. It reads configuration from Vite environment variables:

- `VITE_ENTRA_CLIENT_ID`
- `VITE_ENTRA_TENANT_ID`
- `VITE_REDIRECT_URI`

Use `consumers` for personal Microsoft accounts, `common` for work/school plus personal accounts, or a tenant ID for a single organization.

## Required app registration

Create a Microsoft Entra app registration for a single-page application.

### Redirect URI

For local development:

```text
http://localhost:5173
```

For Azure Static Web Apps:

```text
https://<your-static-web-app-hostname>
```

## Sign-in and Graph scopes

The sign-in flow requests delegated Microsoft Graph calendar access:

- `Calendars.ReadWrite`

`Calendars.ReadWrite` is required because the app reads upcoming calendar events to avoid busy time and creates Outlook events for due-date reminders and selected focus blocks.

## Current calendar workflow

1. User creates a todo.
2. If Outlook is connected, the app adds a due-date reminder event.
3. The app reads the next 14 days of Outlook calendar events and treats them as busy blocks.
4. The app suggests focus blocks before the due date that do not overlap existing todos or Outlook busy blocks.
5. User selects a suggested time.
6. The app creates a protected Outlook focus event and links the event ID back to the todo.
7. The 7-day calendar view shows Outlook busy blocks, todo due reminders, and FocusPlanner work blocks together.
8. If Outlook is not connected, the app still downloads an `.ics` calendar file as a manual fallback.
9. User can sign out of Outlook; local todos remain stored in the browser.

## Data handling

- Todos can contain sensitive stakeholder information.
- Do not send todo content to AI services without clear user approval.
- Keep tenant data isolated per signed-in user.
- Use least-privilege Graph scopes.
