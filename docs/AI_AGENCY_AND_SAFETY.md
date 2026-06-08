# AI Agency and Safety Spec

## Purpose

The AI layer should help estimate, schedule, and break down todos while keeping the user in control of external actions.

## Agent responsibilities

The agent can:

- Analyze todo descriptions, blockers, and due dates.
- Ask clarifying questions when the task is ambiguous.
- Propose smaller steps.
- Prepare research queries.
- Summarize Microsoft Learn resources.
- Suggest SMEs or stakeholder contacts.
- Draft Word-document outlines.
- Draft stakeholder updates.
- Suggest reminders and Outlook time blocks.

## Approval boundaries

The agent must ask before it:

- Sends an email.
- Schedules or changes a meeting.
- Creates or changes an Outlook calendar event.
- Contacts an SME or stakeholder.
- Changes a deadline.
- Marks a task complete.

## Agent modes

| Mode | Output |
|---|---|
| Think | Outcome, assumptions, risks, next visible action |
| Plan | Smaller steps, order, deadline suggestions |
| Research | Search terms, candidate sources, resource summary |
| Draft | Word doc outline, email draft, update blurb |
| Prepare | Calendar block suggestion, reminder, approval checklist |

## Human-in-the-loop rule

The agent may prepare work products automatically, but all communication and calendar actions require explicit approval.

## Current implementation

The app keeps local deterministic time estimates and calendar suggestions, then optionally calls a server-side Azure Static Web Apps API endpoint. The endpoint sends the draft todo plus recent completed-task timing examples to Azure AI and returns structured JSON:

```json
{
  "estimatedMinutes": 45,
  "subtasks": ["string"],
  "rationale": "string"
}
```

The frontend applies the estimate to the anticipated time field and writes the suggested smaller steps into an editable draft field. The user can edit or delete those suggestions before saving the todo.

## Server-side AI boundary

Azure AI credentials must stay in Static Web Apps API application settings:

```text
AZURE_AI_ENDPOINT
AZURE_AI_API_KEY
AZURE_AI_DEPLOYMENT
AZURE_AI_API_VERSION
```

Do not put Azure AI keys in Vite variables because those values are bundled into browser JavaScript.

## Future structured output

Future modes can extend the API response after user approval:

```json
{
  "summary": "string",
  "questions": ["string"],
  "calendarSuggestions": ["ISO datetime string"],
  "researchQueries": ["string"],
  "emailDraft": "string",
  "approvalRequired": ["string"]
}
```
