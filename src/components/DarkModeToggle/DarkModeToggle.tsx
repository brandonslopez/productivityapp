import './DarkModeToggle.css'

type Props = {
  darkMode: boolean
  onToggle: () => void
}

export function DarkModeToggle({ darkMode, onToggle }: Props) {
  return (
    <button
      className="dark-mode-toggle"
      onClick={onToggle}
      type="button"
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={darkMode ? 'Light mode' : 'Dark mode'}
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  )
}
