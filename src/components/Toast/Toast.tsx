import type { ToastMessage } from '../../types'
import './Toast.css'

type Props = {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.type}`} key={toast.id} role="alert">
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => onDismiss(toast.id)} type="button" aria-label="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
