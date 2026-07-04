import { useEffect, useRef } from "react";

/**
 * Periodically persists the latest `data` even if the user never hits
 * Save or Next. Reads through refs so the interval isn't reset on every
 * keystroke/selection change.
 */
export function useAutosave<T>(
  data: T,
  onSave: (data: T, opts?: { silent?: boolean }) => void,
  intervalMs = 10000,
) {
  const dataRef = useRef(data);
  dataRef.current = data;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    const id = setInterval(() => {
      onSaveRef.current(dataRef.current, { silent: true });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
