# FocusPartner Product Spec

## Summary

FocusPartner helps product managers manage partner and stakeholder commitments without creating another overwhelming task list. It is designed for ADHD-friendly execution: fewer visible choices, fast capture, guided breakdown, and clear next actions.

## Target user

Product managers who work across partners, stakeholders, SMEs, and internal teams, and who receive work from meetings, Teams/Copilot recaps, email, chats, and random thoughts.

## Goals

1. Help the user know what to work on next.
2. Convert vague partner asks into smaller actionable steps.
3. Avoid missed partner or stakeholder follow-ups.
4. Prepare stakeholder updates with less cognitive load.
5. Reduce overwhelm by hiding nonessential work until needed.

## Core experience

The app opens to a calm Today view with only 1-3 focus items. The user can paste a Teams/Copilot meeting recap, extract follow-up items, answer guided questions for each follow-up, and create a task with suggested subtasks, partner context, owner, deadline, reminder, and stakeholder link.

## ADHD-friendly principles

- Show fewer choices by default.
- Prefer next visible actions over large abstract tasks.
- Keep capture fast and forgiving.
- Avoid auto-creating clutter from meeting recaps.
- Use reminders and time blocks as gentle supports, not rigid schedules.
- Separate planning from doing.

## MVP scope

- Responsive React web app.
- Local task persistence in browser storage.
- Today view limited to 1-3 focus items.
- Meeting recap paste/import workflow.
- Follow-up extraction.
- Guided breakdown form.
- Suggested subtasks for Lighthouse-style resource follow-ups.
- Stakeholder and partner links.
- Microsoft sign-in wiring.
- Agent workspace concept with approval guardrails.

## Out of scope for MVP

- Production database.
- Real Microsoft Graph calendar writeback.
- Real Copilot/Teams recap API ingestion.
- Real AI model calls.
- Email sending.
- Multi-user collaboration.

## Success measures

- User can paste a recap and create a task in under two minutes.
- Today view never shows more than three focus tasks.
- A vague follow-up becomes a task with at least three concrete subtasks.
- External actions require approval.
