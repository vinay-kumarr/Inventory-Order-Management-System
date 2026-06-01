import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext({ notify: () => {} });

const MAX_VISIBLE = 5;
const EXIT_MS = 240;

function ToastItem({ toast, onClose }) {
  const { id, message, variant, duration, index } = toast;
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef(null);

  const startExit = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => onClose(id), EXIT_MS);
  }, [id, leaving, onClose]);

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = window.setTimeout(startExit, duration);
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [duration, startExit]);

  const icon =
    variant === 'success' ? '✓' :
    variant === 'error' ? '!' :
    variant === 'info' ? 'i' : '•';

  return (
    <div
      className={`toast toast--${variant} ${leaving ? 'toast--leaving' : ''}`}
      role="status"
      style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }}
    >
      <span className="toast__icon">{icon}</span>
      <span className="toast__body">{message}</span>
      <button
        type="button"
        className="toast__close"
        aria-label="Dismiss notification"
        onClick={startExit}
      >
        ×
      </button>
      {duration > 0 && (
        <span
          className="toast__progress"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((message, variant = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((list) => {
      const next = [...list, { id, message, variant, duration }];
      // Cap visible toasts: drop oldest if exceeding
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });
    return id;
  }, []);

  const value = {
    notify,
    success: (m, d) => notify(m, 'success', d),
    error: (m, d) => notify(m, 'error', d ?? 4500),
    info: (m, d) => notify(m, 'info', d),
    dismiss: remove,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications">
        {toasts.map((t, idx) => (
          <ToastItem
            key={t.id}
            toast={{ ...t, index: idx }}
            onClose={remove}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export default ToastProvider;
