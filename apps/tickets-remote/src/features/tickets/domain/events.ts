export type SyncEventName = 'sync-started' | 'sync-finished' | 'sync-failed' | 'queue-changed';

export type SyncEventDetail = {
  message?: string;
  flushed?: number;
  size?: number;
};

const target = new EventTarget();

export function emitSyncEvent(name: SyncEventName, detail: SyncEventDetail = {}) {
  target.dispatchEvent(new CustomEvent<SyncEventDetail>(name, { detail }));
}

export function onSyncEvent(
  name: SyncEventName,
  handler: (detail: SyncEventDetail) => void,
): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<SyncEventDetail>).detail);
  };

  target.addEventListener(name, listener);

  return () => {
    target.removeEventListener(name, listener);
  };
}
