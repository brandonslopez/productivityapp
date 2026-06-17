import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

export function useDarkMode() {
  const [darkMode, setDarkMode] = useLocalStorage('focusplanner.darkMode', false)

  const toggle = useCallback(() => {
    setDarkMode((prev) => !prev)
  }, [setDarkMode])

  // Apply to document
  if (darkMode) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }

  return { darkMode, toggle }
}
