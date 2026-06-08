import { useEffect, useMemo, useState } from 'react'
import { PublicClientApplication, type AccountInfo } from '@azure/msal-browser'
import './App.css'

type TaskStatus = 'Not started' | 'In progress' | 'Waiting' | 'Done'
type EnergyLevel = 'Low' | 'Medium' | 'High'

type Stakeholder = {
  id: string
  name: string
  organization: string
  role: string
}

type Subtask = {
  id: string
  title: string
  done: boolean
}

type Task = {
  id: string
  title: string
  partner: string
  stakeholderId: string
  owner: string
  dueDate: string
  reminder: string
  context: string
  source: string
  status: TaskStatus
  energy: EnergyLevel
  steps: Subtask[]
}

type RecapItem = {
  id: string
  title: string
  owner: string
  partner: string
  context: string
}

type GuideDraft = {
  title: string
  owner: string
  partner: string
  dueDate: string
  reminder: string
  outcome: string
  definitionOfDone: string
  resourcesNeeded: string
  energy: EnergyLevel
}

const authConfig = {
  clientId: import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined,
  tenantId: (import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined) || 'consumers',
  redirectUri: import.meta.env.VITE_REDIRECT_URI as string | undefined,
}

const initialStakeholders: Stakeholder[] = [
  {
    id: 'partner-lead',
    name: 'Partner lead',
    organization: 'Example Partner',
    role: 'Primary partner contact',
  },
  {
    id: 'lighthouse-sme',
    name: 'Lighthouse SME',
    organization: 'Microsoft',
    role: 'Subject matter expert',
  },
]

const initialTasks: Task[] = [
  {
    id: 'task-lighthouse-resources',
    title: 'Find Lighthouse resources for partner',
    partner: 'Example Partner',
    stakeholderId: 'partner-lead',
    owner: 'Me',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
    reminder: 'Tomorrow morning',
    context: 'Follow-up from partner call recap.',
    source: 'Teams/Copilot recap',
    status: 'In progress',
    energy: 'Medium',
    steps: [
      { id: 'step-ms-learn', title: 'Use AI to find Lighthouse resources on Microsoft Learn', done: false },
      { id: 'step-sme', title: 'Reach out to Lighthouse SME', done: false },
      { id: 'step-word', title: 'Put resources in a Word doc', done: false },
      { id: 'step-email', title: 'Place resources in email to partner', done: false },
    ],
  },
]

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const savedValue = window.localStorage.getItem(key)

    if (!savedValue) {
      return initialValue
    }

    try {
      return JSON.parse(savedValue) as T
    } catch (error) {
      console.warn(`Could not load ${key} from local storage.`, error)
      return initialValue
    }
  })

  const saveValue = (nextValue: T) => {
    setValue(nextValue)
    window.localStorage.setItem(key, JSON.stringify(nextValue))
  }

  return [value, saveValue] as const
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function extractFollowUps(recap: string): RecapItem[] {
  return recap
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /follow|action|todo|to do|task|owner|next step|resource|send|find/i.test(line))
    .map((line) => {
      const ownerMatch = line.match(/owner\s*[:=-]\s*([^;,.]+)/i)
      const partnerMatch = line.match(/partner\s*[:=-]\s*([^;,.]+)/i)
      const title = line
        .replace(/^[-*•\d.)\s]+/, '')
        .replace(/^(follow up|action item|todo|to do|task)\s*[:=-]\s*/i, '')
        .trim()

      return {
        id: createId('recap'),
        title,
        owner: ownerMatch?.[1]?.trim() || 'Me',
        partner: partnerMatch?.[1]?.trim() || 'Partner',
        context: line,
      }
    })
}

function generateBreakdown(title: string): Subtask[] {
  const lowerTitle = title.toLowerCase()
  const steps = lowerTitle.includes('lighthouse')
    ? [
        'Use AI to find Lighthouse resources on Microsoft Learn',
        'Reach out to Lighthouse SME',
        'Put resources in a Word doc',
        'Place resources in email to partner',
      ]
    : [
        'Clarify the expected outcome and recipient',
        'Gather the minimum useful information or resources',
        'Create a short draft or artifact',
        'Send for review or share with the stakeholder',
      ]

  return steps.map((step) => ({ id: createId('step'), title: step, done: false }))
}

function sortByDueDate(tasks: Task[]) {
  return [...tasks].sort((first, second) => {
    if (!first.dueDate) return 1
    if (!second.dueDate) return -1
    return first.dueDate.localeCompare(second.dueDate)
  })
}

function createAuthClient() {
  if (!authConfig.clientId) {
    return null
  }

  return new PublicClientApplication({
    auth: {
      clientId: authConfig.clientId,
      authority: `https://login.microsoftonline.com/${authConfig.tenantId}`,
      redirectUri: authConfig.redirectUri || window.location.origin,
    },
    cache: {
      cacheLocation: 'localStorage',
    },
  })
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function App() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('focuspartner.tasks', initialTasks)
  const [stakeholders, setStakeholders] = useLocalStorage<Stakeholder[]>(
    'focuspartner.stakeholders',
    initialStakeholders,
  )
  const [recapText, setRecapText] = useState('')
  const [recapItems, setRecapItems] = useState<RecapItem[]>([])
  const [activeRecapItem, setActiveRecapItem] = useState<RecapItem | null>(null)
  const [guideDraft, setGuideDraft] = useState<GuideDraft | null>(null)
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [authMessage, setAuthMessage] = useState('')

  useEffect(() => {
    const authClient = createAuthClient()

    if (!authClient) {
      return
    }

    const loadExistingAccount = async () => {
      await authClient.initialize()
      const existingAccount = authClient.getAllAccounts()[0]

      if (existingAccount) {
        setAccount(existingAccount)
        setAuthMessage('Signed in with Microsoft.')
      }
    }

    void loadExistingAccount().catch((error: unknown) => {
      setAuthMessage(`Microsoft sign-in could not be restored: ${getAuthErrorMessage(error)}`)
    })
  }, [])

  const focusTasks = useMemo(
    () => sortByDueDate(tasks.filter((task) => task.status !== 'Done')).slice(0, 3),
    [tasks],
  )

  const waitingTasks = tasks.filter((task) => task.status === 'Waiting')

  const parseRecap = () => {
    const items = extractFollowUps(recapText)
    setRecapItems(items)
    if (items[0]) {
      startGuidedBreakdown(items[0])
    }
  }

  const startGuidedBreakdown = (item: RecapItem) => {
    setActiveRecapItem(item)
    setGuideDraft({
      title: item.title,
      owner: item.owner,
      partner: item.partner,
      dueDate: '',
      reminder: 'One day before due',
      outcome: `Partner receives a useful answer for: ${item.title}`,
      definitionOfDone: 'Partner-ready response or artifact is prepared and approved.',
      resourcesNeeded: 'Microsoft Learn resources, internal SME input, and partner context.',
      energy: 'Medium',
    })
  }

  const createTaskFromGuide = () => {
    if (!guideDraft || !activeRecapItem) {
      return
    }

    const stakeholder = stakeholders.find(
      (currentStakeholder) =>
        currentStakeholder.organization.toLowerCase() === guideDraft.partner.toLowerCase(),
    )

    const stakeholderId = stakeholder?.id || createId('stakeholder')
    const nextStakeholders = stakeholder
      ? stakeholders
      : [
          ...stakeholders,
          {
            id: stakeholderId,
            name: 'Partner contact',
            organization: guideDraft.partner,
            role: 'Follow-up owner',
          },
        ]

    const task: Task = {
      id: createId('task'),
      title: guideDraft.title,
      partner: guideDraft.partner,
      stakeholderId,
      owner: guideDraft.owner,
      dueDate: guideDraft.dueDate,
      reminder: guideDraft.reminder,
      context: `${activeRecapItem.context}\n\nOutcome: ${guideDraft.outcome}\nDefinition of done: ${guideDraft.definitionOfDone}\nResources needed: ${guideDraft.resourcesNeeded}`,
      source: 'Teams/Copilot recap',
      status: 'Not started',
      energy: guideDraft.energy,
      steps: generateBreakdown(guideDraft.title),
    }

    setStakeholders(nextStakeholders)
    setTasks([task, ...tasks])
    setRecapItems(recapItems.filter((item) => item.id !== activeRecapItem.id))
    setActiveRecapItem(null)
    setGuideDraft(null)
  }

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status } : task)))
  }

  const toggleStep = (taskId: string, stepId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              steps: task.steps.map((step) =>
                step.id === stepId ? { ...step, done: !step.done } : step,
              ),
            }
          : task,
      ),
    )
  }

  const signIn = async () => {
    const authClient = createAuthClient()

    if (!authClient) {
      setAuthMessage(
        'Microsoft 365 sync needs an approved Microsoft Entra app registration. You can keep using local mode, or add VITE_ENTRA_CLIENT_ID and VITE_ENTRA_TENANT_ID to .env.local when your tenant admin approves an app.',
      )
      return
    }

    try {
      await authClient.initialize()
      const result = await authClient.loginPopup({
        prompt: 'select_account',
      })

      if (result.account) {
        setAccount(result.account)
        setAuthMessage('Signed in. Calendar sync can be connected to approved Graph actions next.')
        return
      }

      const existingAccount = authClient.getAllAccounts()[0]
      setAccount(existingAccount ?? null)
      setAuthMessage(
        existingAccount
          ? 'Signed in with Microsoft.'
          : 'Microsoft sign-in returned to the app, but no account was found.',
      )
    } catch (error: unknown) {
      setAuthMessage(`Microsoft sign-in failed: ${getAuthErrorMessage(error)}`)
    }
  }

  const activeStakeholder = (task: Task) =>
    stakeholders.find((stakeholder) => stakeholder.id === task.stakeholderId)

  return (
    <main className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">FocusPartner</p>
          <h1>Calm partner follow-ups, broken into next actions.</h1>
          <p className="hero-copy">
            Paste your Teams or Copilot recap, convert follow-ups into guided tasks, and keep the
            Today view limited to the next 1-3 focus items.
          </p>
        </div>
        <section className="sign-in-card" aria-label="Microsoft sign-in">
          <span className="status-pill">{account ? account.username : 'Private workspace'}</span>
          <button type="button" onClick={() => void signIn()}>
            {account ? 'Microsoft connected' : 'Connect Microsoft 365'}
          </button>
          <p>
            {authMessage ||
              'Local mode works now. Microsoft sign-in is only needed later for approved Outlook time blocks.'}
          </p>
        </section>
      </header>

      <section className="dashboard-grid" aria-label="FocusPartner workspace">
        <section className="panel today-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Today</p>
              <h2>Only your next focus items</h2>
            </div>
            <span className="count-badge">{focusTasks.length}/3 visible</span>
          </div>
          <div className="task-stack">
            {focusTasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div className="task-topline">
                  <span className={`energy energy-${task.energy.toLowerCase()}`}>{task.energy}</span>
                  <select
                    aria-label={`Status for ${task.title}`}
                    value={task.status}
                    onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}
                  >
                    <option>Not started</option>
                    <option>In progress</option>
                    <option>Waiting</option>
                    <option>Done</option>
                  </select>
                </div>
                <h3>{task.title}</h3>
                <p>
                  {task.partner} · {activeStakeholder(task)?.name || 'No stakeholder'} · Due{' '}
                  {task.dueDate || 'not set'}
                </p>
                <ol className="steps-list">
                  {task.steps.map((step) => (
                    <li key={step.id}>
                      <label>
                        <input
                          checked={step.done}
                          onChange={() => toggleStep(task.id, step.id)}
                          type="checkbox"
                        />
                        <span>{step.title}</span>
                      </label>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Meeting recap import</p>
              <h2>Turn messy follow-ups into tasks</h2>
            </div>
          </div>
          <textarea
            aria-label="Paste Teams or Copilot meeting recap"
            onChange={(event) => setRecapText(event.target.value)}
            placeholder="Paste Teams/Copilot recap follow-up items here. Example: Follow up: find Lighthouse resources for partner. Owner: Me. Partner: Contoso."
            value={recapText}
          />
          <button className="wide-button" onClick={parseRecap} type="button">
            Extract follow-ups
          </button>
          <div className="recap-list">
            {recapItems.map((item) => (
              <button key={item.id} onClick={() => startGuidedBreakdown(item)} type="button">
                <strong>{item.title}</strong>
                <span>
                  {item.partner} · {item.owner}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Guided breakdown</p>
              <h2>Answer enough to make it actionable</h2>
            </div>
          </div>
          {guideDraft ? (
            <form
              className="guide-form"
              onSubmit={(event) => {
                event.preventDefault()
                createTaskFromGuide()
              }}
            >
              <label>
                Follow-up
                <input
                  onChange={(event) => setGuideDraft({ ...guideDraft, title: event.target.value })}
                  value={guideDraft.title}
                />
              </label>
              <div className="form-row">
                <label>
                  Partner
                  <input
                    onChange={(event) =>
                      setGuideDraft({ ...guideDraft, partner: event.target.value })
                    }
                    value={guideDraft.partner}
                  />
                </label>
                <label>
                  Owner
                  <input
                    onChange={(event) => setGuideDraft({ ...guideDraft, owner: event.target.value })}
                    value={guideDraft.owner}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Due date
                  <input
                    onChange={(event) =>
                      setGuideDraft({ ...guideDraft, dueDate: event.target.value })
                    }
                    type="date"
                    value={guideDraft.dueDate}
                  />
                </label>
                <label>
                  Energy
                  <select
                    onChange={(event) =>
                      setGuideDraft({ ...guideDraft, energy: event.target.value as EnergyLevel })
                    }
                    value={guideDraft.energy}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
              </div>
              <label>
                What does done look like?
                <textarea
                  onChange={(event) =>
                    setGuideDraft({ ...guideDraft, definitionOfDone: event.target.value })
                  }
                  value={guideDraft.definitionOfDone}
                />
              </label>
              <label>
                What resources or people might help?
                <textarea
                  onChange={(event) =>
                    setGuideDraft({ ...guideDraft, resourcesNeeded: event.target.value })
                  }
                  value={guideDraft.resourcesNeeded}
                />
              </label>
              <button className="wide-button" type="submit">
                Create task with suggested steps
              </button>
            </form>
          ) : (
            <p className="empty-state">Extract a recap item to start the guided breakdown.</p>
          )}
        </section>

        <section className="panel agent-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Agent workspace</p>
              <h2>Let AI prepare the thinking</h2>
            </div>
          </div>
          <div className="agent-grid">
            <article>
              <span>Think</span>
              <p>Clarify the outcome, stakeholder, risk, and next visible action.</p>
            </article>
            <article>
              <span>Research</span>
              <p>Prepare Microsoft Learn search queries and resource candidates.</p>
            </article>
            <article>
              <span>Draft</span>
              <p>Create a Word-doc outline and partner email draft for your approval.</p>
            </article>
            <article>
              <span>Prepare</span>
              <p>Suggest Outlook time blocks, reminders, and stakeholder follow-up status.</p>
            </article>
          </div>
          <p className="guardrail">
            Guardrail: the agent prepares drafts and plans, but asks before sending email,
            scheduling meetings, changing deadlines, or contacting partners.
          </p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Stakeholder follow-ups</p>
              <h2>People linked to work</h2>
            </div>
          </div>
          <div className="stakeholder-list">
            {stakeholders.map((stakeholder) => (
              <article key={stakeholder.id}>
                <strong>{stakeholder.name}</strong>
                <span>{stakeholder.organization}</span>
                <p>{stakeholder.role}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Waiting room</p>
              <h2>Hidden until it matters</h2>
            </div>
            <span className="count-badge">{waitingTasks.length}</span>
          </div>
          {waitingTasks.length ? (
            waitingTasks.map((task) => (
              <p className="waiting-item" key={task.id}>
                {task.title} · {task.partner}
              </p>
            ))
          ) : (
            <p className="empty-state">No waiting items. Keep the surface area small.</p>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
