# AI Agency and Safety Spec

## Purpose

The AI layer should do the thinking work around partner follow-ups while keeping the user in control of external actions.

## Agent responsibilities

The agent can:

- Analyze meeting recap follow-up items.
- Ask clarifying questions when the task is ambiguous.
- Propose subtasks.
- Prepare research queries.
- Summarize Microsoft Learn resources.
- Suggest SMEs or stakeholder contacts.
- Draft Word-document outlines.
- Draft partner emails.
- Suggest reminders and Outlook time blocks.

## Approval boundaries

The agent must ask before it:

- Sends an email.
- Schedules or changes a meeting.
- Creates or changes an Outlook calendar event.
- Contacts a partner, SME, or stakeholder.
- Changes a deadline.
- Marks a task complete.

## Agent modes

| Mode | Output |
|---|---|
| Think | Outcome, assumptions, risks, next visible action |
| Plan | Subtasks, order, deadline suggestions |
| Research | Search terms, candidate sources, resource summary |
| Draft | Word doc outline, email draft, update blurb |
| Prepare | Calendar block suggestion, reminder, approval checklist |

## Human-in-the-loop rule

The agent may prepare work products automatically, but all communication and calendar actions require explicit approval.

## First implementation

The MVP implements a non-networked agent workspace and deterministic task breakdowns. The next implementation should add a backend AI service that receives a single recap item plus user-approved context and returns structured JSON:

```json
{
  "summary": "string",
  "questions": ["string"],
  "subtasks": ["string"],
  "researchQueries": ["string"],
  "emailDraft": "string",
  "approvalRequired": ["string"]
}
```
