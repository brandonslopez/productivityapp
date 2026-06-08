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

## First implementation

The MVP implements local deterministic time estimates and calendar suggestions. The next implementation should add a backend AI service that receives a todo plus user-approved actual-time history and returns structured JSON:

```json
{
  "summary": "string",
  "questions": ["string"],
  "smallerSteps": ["string"],
  "estimatedMinutes": 45,
  "calendarSuggestions": ["ISO datetime string"],
  "researchQueries": ["string"],
  "emailDraft": "string",
  "approvalRequired": ["string"]
}
```
