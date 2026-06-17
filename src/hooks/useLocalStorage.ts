import { useState, type SetStateAction } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const saved = window.localStorage.getItem(key)
    if (!saved) return initialValue
    try {
      return JSON.parse(saved) as T
    } catch {
      return initialValue
    }
  })

  const save = (next: SetStateAction<T>) => {
    setValue((current) => {
      const resolved = typeof next === 'function'
        ? (next as (prev: T) => T)(current)
        : next
      window.localStorage.setItem(key, JSON.stringify(resolved))
      return resolved
    })
  }

  return [value, save] as const
}
