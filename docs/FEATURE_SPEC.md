# FocusPartner Feature Spec

## 1. Today view

The Today view is the home surface. It shows only the next 1-3 active tasks sorted by due date.

### Requirements

- Hide completed tasks.
- Show no more than three focus tasks.
- Show partner, stakeholder, due date, energy level, status, and subtasks.
- Allow status changes directly from the card.
- Allow subtask completion directly from the card.

## 2. Meeting recap import

The user pastes a Microsoft Teams or Copilot meeting recap into the import panel.

### Requirements

- Extract likely follow-up lines based on common meeting recap language.
- Preserve the raw line as context.
- Detect simple `Owner:` and `Partner:` markers when present.
- Do not create tasks automatically.
- Let the user select each extracted item for guided breakdown.

## 3. Guided breakdown

The guided breakdown turns one recap item into an actionable task.

### Questions captured

- What is the follow-up?
- Which partner is it for?
- Who owns it?
- When is it due?
- What does done look like?
- What resources or people might help?
- What energy level does this require?

### Output

- Task title.
- Partner.
- Stakeholder link.
- Due date.
- Reminder.
- Context.
- Status.
- Suggested subtasks.

## 4. Suggested subtasks

The current MVP includes deterministic suggested steps. For Lighthouse resource follow-ups, the app creates:

1. Use AI to find Lighthouse resources on Microsoft Learn.
2. Reach out to Lighthouse SME.
3. Put resources in a Word doc.
4. Place resources in email to partner.

For other follow-ups, the app creates a generic PM-friendly breakdown:

1. Clarify the expected outcome and recipient.
2. Gather the minimum useful information or resources.
3. Create a short draft or artifact.
4. Send for review or share with the stakeholder.

## 5. Stakeholder tracking

Stakeholders are lightweight context records, not a full CRM.

### Requirements

- Store stakeholder name, organization, and role.
- Link tasks to stakeholders.
- Create a simple partner contact placeholder when a new partner appears.

## 6. Agent workspace

The agent workspace describes the AI modes the app will support.

### Modes

- **Think:** clarify outcomes, risks, and next visible actions.
- **Research:** prepare Microsoft Learn searches and resource candidates.
- **Draft:** prepare Word-doc outlines and partner emails.
- **Prepare:** suggest Outlook time blocks and reminders.

### Guardrail

The agent prepares drafts and plans, but asks before sending email, scheduling meetings, changing deadlines, or contacting partners.

## 7. Microsoft 365 sign-in

The app includes Microsoft Entra sign-in wiring using MSAL.

### Current behavior

- Shows a setup message until `.env.local` contains Entra app values.
- Uses popup sign-in when configured.
- Requests Graph scopes needed for user profile and future calendar sync.

### Future behavior

- Create Outlook calendar time blocks after approval.
- Read selected calendar availability.
- Import Teams/Copilot recap content through Microsoft Graph when feasible and permissioned.
