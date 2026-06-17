# FocusPlanner Demo Talking Script

> Estimated presentation time: 8–10 minutes

---

## Opening (30 seconds)

"Hey team, I want to show you something I've been building — **FocusPlanner**. It's a productivity app designed for knowledge workers like us who deal with a constant stream of tasks from meetings, emails, and stakeholder requests. The core problem it solves: helping you decide *when* to work on *what*, and protecting focus time on your calendar."

---

## 1. Task Capture (1.5 minutes)

"Let me start by creating a task. The form captures everything you need to schedule work: title, notes, due date, stakeholders, blockers, and an anticipated time estimate."

*[Create a new task with a title, due date, and stakeholders]*

"I can also add **tags** for free-form labels and assign a **category** for organization — these become filterable later."

"Notice the **recurrence** option — I can set a task to repeat daily, weekly, monthly, or on specific days. So things like weekly reports or recurring check-ins don't need to be manually recreated."

---

## 2. AI-Powered Estimates (1 minute)

"Here's where it gets interesting. If I'm unsure how long something will take, I can click **'Ask AI'**. This calls Azure OpenAI on the server side — it looks at my task description, any blockers, and my historical completion times, then suggests a duration estimate and breaks the work into subtasks."

*[Click Ask AI, show estimate and subtasks populate]*

"I can accept, edit, or ignore the suggestion. The AI is purely advisory — it never takes action without my approval."

---

## 3. Focus Queue and Drag-to-Reorder (1 minute)

"Once I have tasks, they show up in the **focus queue** — sorted by priority. I can **drag to reorder** them manually based on what I want to tackle first."

*[Drag a task to reorder]*

"Each card shows status, due date, anticipated time, category, and tags at a glance. I can change status right from the card without opening anything."

---

## 4. Calendar Integration (2 minutes)

"This is the big one. When I sign in with my Microsoft account, FocusPlanner reads my **Outlook calendar** for the next 14 days and shows busy blocks in the calendar view."

*[Show calendar view with Outlook events]*

"For my **work calendar** — where I can't sign in through the app because of admin consent requirements — I use an **ICS subscription**. I just paste my work calendar's published ICS URL in Settings, and the app reads those events too, all server-side to avoid CORS issues."

*[Show work calendar blocks in different color]*

"Now when I want to schedule a focus block for a task, the app suggests **open time slots** that don't conflict with *any* of my calendar commitments — personal or work. One click, and it creates an Outlook event for that block."

---

## 5. Search and Filter (45 seconds)

"As my task list grows, I can **search** by text across titles, notes, and blockers. I can also filter by status, category, or date range. These combine so I can quickly find, say, all blocked tasks in a specific category."

*[Demo search, then filter by status]*

---

## 6. Blocker Visibility (30 seconds)

"Speaking of blocked — there's a dedicated **Blocked section** that shows any task where I've logged a blocker. It surfaces stuck work automatically so nothing silently falls off my radar."

*[Show the blocked section]*

---

## 7. Dark Mode (15 seconds)

"Quick one — the app supports **dark mode**. It detects your system preference on first load, but you can toggle it manually. Easier on the eyes during late-night planning sessions."

*[Toggle dark mode]*

---

## 8. Settings and Notifications (45 seconds)

"In Settings, I configure my work calendar ICS URL and my phone number for **SMS reminders**. The app can send texts via Azure Communication Services — for example, an hour before a due date or 15 minutes before a focus block."

*[Show settings panel]*

---

## 9. Actual-Time Learning (30 seconds)

"When I finish a task, I log how long it actually took. Over time, the app uses this data to make better duration suggestions — so my estimates get more realistic without any effort."

*[Show actual time field on a completed task, show the stats]*

---

## 10. Architecture Overview (1 minute)

"Under the hood: it's a **React + TypeScript** app built with Vite, deployed on **Azure Static Web Apps** with a serverless **Azure Functions** API. The API handles AI calls, ICS fetching, and SMS — keeping secrets server-side. Auth is Microsoft Entra with MSAL and PKCE. Data currently lives in localStorage, with a path to Azure Cosmos DB for production."

"The codebase is modular — split into components, hooks, and utility modules. It deploys automatically from GitHub on every push to main."

---

## Closing (30 seconds)

"So to summarize: FocusPlanner helps you capture tasks fast, get AI-powered estimates, schedule work around your real calendar availability — both personal and work — track blockers, and learn from your actual time spent. It's built on Azure services we already have access to, and it's something I use day-to-day for my own planning."

"Happy to take questions or do a deeper dive on any part."

---

## Q&A Prep: Anticipated Questions

**Q: Can multiple people use this?**
A: Currently it's single-user with browser localStorage. Adding multi-user support would mean adding a database backend and per-user authentication — the architecture supports it but it's not built yet.

**Q: Why not just use Microsoft To Do or Planner?**
A: Those tools are great for task lists, but they don't combine AI estimates, calendar-aware scheduling, actual-time learning, and ICS-based work calendar visibility in one view. FocusPlanner is opinionated about helping you *schedule* the work, not just track it.

**Q: How does the work calendar sync work without admin consent?**
A: The user publishes their work calendar as an ICS feed (read-only), and FocusPlanner reads that via a server-side proxy. For the reverse direction — seeing FocusPlanner events on your work calendar — you subscribe to your personal calendar from work Outlook.

**Q: Is the AI sending my data externally?**
A: The AI call goes to our own Azure OpenAI resource — data stays within our Azure subscription. It only sends task title, notes, blockers, and anonymized timing examples. Never sends stakeholder names or calendar data to AI.

**Q: What's the cost?**
A: Azure Static Web Apps has a free tier. Azure OpenAI charges per token (minimal for short task descriptions). Communication Services charges per SMS. For a single user, total cost is a few dollars per month at most.
