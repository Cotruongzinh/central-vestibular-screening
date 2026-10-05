type ActivityListener = () => void;

let listener: ActivityListener | null = null;

export function setSessionActivityListener(
  nextListener: ActivityListener,
): () => void {
  listener = nextListener;

  return () => {
    if (listener === nextListener) {
      listener = null;
    }
  };
}

export function notifySessionActivity(): void {
  listener?.();
}
