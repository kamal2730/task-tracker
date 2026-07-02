import { useState, useEffect, useCallback } from "react";
import { subscribe } from "../utils/toast";
import type { ToastType } from "../utils/toast";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsub = subscribe((event) => {
      const toast: Toast = { id: event.id, message: event.message, type: event.type };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => remove(event.id), 3000);
    });
    return () => unsub();
  }, [remove]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.message}</span>
          <button type="button" className="toast-close" onClick={() => remove(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
