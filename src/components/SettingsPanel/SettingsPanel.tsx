import type { AppSettings } from '../../types'
import './SettingsPanel.css'

type Props = {
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
  onClose: () => void
}

export function SettingsPanel({ settings, onSettingsChange, onClose }: Props) {
  const update = (partial: Partial<AppSettings>) => onSettingsChange({ ...settings, ...partial })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        <div className="settings-form">
          <fieldset className="settings-section">
            <legend>Work calendar subscription</legend>
            <p className="settings-help">
              Paste the ICS URL from your work calendar to see busy blocks without signing in. In Outlook, go to Calendar → Settings → Shared calendars → Publish a calendar → select "Can view when I'm busy" and copy the ICS link.
            </p>
            <label>
              ICS URL
              <input
                type="url"
                value={settings.workCalendarIcsUrl}
                onChange={(e) => update({ workCalendarIcsUrl: e.target.value })}
                placeholder="https://outlook.office365.com/owa/calendar/..."
              />
            </label>
            <label>
              Refresh interval (minutes)
              <input
                type="number"
                min="5"
                value={settings.workCalendarRefreshMinutes}
                onChange={(e) => update({ workCalendarRefreshMinutes: Math.max(5, parseInt(e.target.value) || 15) })}
              />
            </label>
          </fieldset>

          <fieldset className="settings-section">
            <legend>Work calendar sync via Power Automate</legend>
            <p className="settings-help">
              Create a Power Automate flow that creates Outlook events on your work calendar. Paste the flow's HTTP trigger URL here so FocusPlanner can send events directly to your work calendar without admin consent.
            </p>
            <label>
              Flow URL
              <input
                type="url"
                value={settings.powerAutomateFlowUrl}
                onChange={(e) => update({ powerAutomateFlowUrl: e.target.value })}
                placeholder="https://prod-XX.westus.logic.azure.com/workflows/..."
              />
            </label>
          </fieldset>

          <fieldset className="settings-section">
            <legend>SMS notifications</legend>
            <p className="settings-help">
              Enter your phone number to receive SMS reminders via Azure Communication Services.
            </p>
            <label>
              Phone number
              <input
                type="tel"
                value={settings.phoneNumber}
                onChange={(e) => update({ phoneNumber: e.target.value })}
                placeholder="+1 555-123-4567"
              />
            </label>
          </fieldset>

          <button className="wide-button" onClick={onClose} type="button">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
