export type ToastType = "success" | "error";

interface ToastEvent {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (event: ToastEvent) => void;

let nextId = 0;
const listeners: Set<Listener> = new Set();

export function showToast(message: string, type: ToastType = "success") {
  const event: ToastEvent = { id: nextId++, message, type };
  listeners.forEach((fn) => fn(event));
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
