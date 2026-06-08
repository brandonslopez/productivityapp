# Microsoft 365 Integration Spec

## Current implementation

The app includes Microsoft Entra sign-in wiring with MSAL Browser. It reads configuration from Vite environment variables:

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

The MVP sign-in flow does not request Microsoft Graph scopes. It only signs the user in with Entra ID so it can avoid tenant consent blockers while the app is still a personal prototype.

Future Graph integrations should add least-privilege delegated scopes only when the feature is ready. A basic profile read would require:

- `User.Read`

Calendar sync would require delegated Graph scopes:

- `Calendars.Read`
- `Calendars.ReadWrite`

Calendar write should only be used after explicit user approval.

## Current calendar workflow

1. User creates a todo.
2. App suggests a local focus block before the due date.
3. User selects a suggested time.
4. App downloads an `.ics` calendar file.
5. User imports or opens the file in Outlook or another calendar.

## Future calendar workflow

1. User creates a task.
2. App suggests a time block.
3. User reviews the title, duration, and date.
4. User approves.
5. Backend calls Microsoft Graph to create an Outlook event.
6. App links the calendar block back to the task.

## Data handling

- Todos can contain sensitive stakeholder information.
- Do not send todo content to AI services without clear user approval.
- Keep tenant data isolated per signed-in user.
- Use least-privilege Graph scopes.
