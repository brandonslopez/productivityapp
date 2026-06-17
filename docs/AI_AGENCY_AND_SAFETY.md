# AI Agency and Safety Spec

## Purpose

The AI layer helps estimate task duration and break down work into smaller steps, keeping the user in full control of all external actions.

## Agent responsibilities

The agent can:

- Analyze todo descriptions, blockers, and due dates.
- Propose smaller actionable steps.
- Estimate task duration based on context and historical data.
- Provide rationale for its estimates.

## Approval boundaries

The agent must ask before it:

- Sends an email or SMS.
- Schedules or changes a meeting.
- Creates or changes an Outlook calendar event.
- Contacts a stakeholder.
- Changes a deadline.
- Marks a task complete.

## Human-in-the-loop rule

The agent may prepare work products automatically (estimates, subtasks, rationale), but all communication and calendar actions require explicit user approval. AI suggestions populate draft fields that the user reviews before saving.

## Current implementation

The app calls a server-side Azure Functions API endpoint (`/api/task-assistant`). The endpoint sends the draft todo plus recent completed-task timing examples to Azure OpenAI (GPT-4o) and returns structured JSON:

```json
{
  "estimatedMinutes": 45,
  "subtasks": ["Research existing solutions", "Draft proposal", "Review with stakeholder"],
  "rationale": "Based on similar research tasks that averaged 40-50 minutes..."
}
```

The frontend applies the estimate to the anticipated time field and writes the suggested smaller steps into an editable draft field. The user can edit or delete those suggestions before saving the todo.

## Server-side AI boundary

Azure AI credentials are stored exclusively in Static Web Apps API application settings:

```text
AZURE_AI_ENDPOINT       → Azure OpenAI resource endpoint
AZURE_AI_API_KEY        → Azure OpenAI API key
AZURE_AI_DEPLOYMENT     → Model deployment name (e.g., gpt-4o)
AZURE_AI_API_VERSION    → API version (e.g., 2024-10-21)
```

These values are never exposed to the browser. The Vite build does not have access to them.

## Error handling

- If Azure AI is not configured, the app shows an informational message and falls back to local duration estimates from completed tasks.
- Network failures display a toast notification and do not block task creation.
- AI suggestions are always optional — the user can save tasks without waiting for AI.

## Future extensions

Future modes can extend the API response:

```json
{
  "summary": "string",
  "questions": ["string"],
  "calendarSuggestions": ["ISO datetime string"],
  "researchQueries": ["string"],
  "approvalRequired": ["string"]
}
```

All extensions that take external action will require explicit user approval before execution.
