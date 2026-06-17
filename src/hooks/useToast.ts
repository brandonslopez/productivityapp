import { useState, useCallback } from 'react'
import type { ToastMessage } from '../types'
import { createId } from '../utils/formatting'

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((type: ToastMessage['type'], message: string, duration = 5000) => {
    const id = createId('toast')
    setToasts((prev) => [...prev, { id, type, message, duration }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((msg: string) => addToast('success', msg), [addToast])
  const error = useCallback((msg: string) => addToast('error', msg, 8000), [addToast])
  const info = useCallback((msg: string) => addToast('info', msg), [addToast])
  const warning = useCallback((msg: string) => addToast('warning', msg, 6000), [addToast])

  return { toasts, addToast, removeToast, success, error, info, warning }
}
