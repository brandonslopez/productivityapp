# FocusPartner

FocusPartner is a private, responsive web app for product managers who work with partners and stakeholders. It turns meeting recap follow-ups into calm, guided next actions with ADHD-friendly defaults.

## What it does

- Opens to a **Today** view with only 1-3 focus items.
- Lets you paste Microsoft Teams or Copilot meeting recaps.
- Extracts likely follow-up items from the recap.
- Guides each follow-up through task-shaping questions.
- Creates smaller subtasks, deadlines, reminders, stakeholder links, and partner context.
- Includes an agent workspace for AI-assisted thinking, research, draft preparation, and safe approval gates.
- Includes Microsoft Entra sign-in wiring for Microsoft 365 integration.

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

Use `consumers` for personal Microsoft accounts, `common` for work/school plus personal accounts, or a tenant ID for one organization. The current prototype signs in without Microsoft Graph scopes; add least-privilege Graph permissions later when calendar or meeting recap sync is ready.

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
