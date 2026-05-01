export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const EVENT_NAME = "csat-toast";

export function toast(message: string, type: ToastType = "info") {
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { message, type } })
  );
}

export function useToastEvent(handler: (toast: Omit<Toast, "id">) => void) {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    handler(detail);
  };

  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
