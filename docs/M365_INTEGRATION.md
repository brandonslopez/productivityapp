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

## Future calendar workflow

1. User creates a task from a recap.
2. App suggests a time block.
3. User reviews the title, duration, and date.
4. User approves.
5. Backend calls Microsoft Graph to create an Outlook event.
6. App links the calendar block back to the task.

## Future recap workflow

The safe first version uses paste/import. A future version can explore Graph-based meeting artifact access if tenant permissions allow it.

## Data handling

- Meeting recaps can contain sensitive partner information.
- Do not send recap content to AI services without clear user approval.
- Keep tenant data isolated per signed-in user.
- Use least-privilege Graph scopes.
