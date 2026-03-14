export function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

function readStatus(error: unknown) {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }

  const { status } = error as { status?: unknown };
  return typeof status === 'number' ? status : undefined;
}

function readMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  return String(error ?? '').toLowerCase();
}

export function isNetworkLikeError(error: unknown) {
  if (!isBrowserOnline()) {
    return true;
  }

  const status = readStatus(error);
  if (typeof status === 'number') {
    return false;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  const message = readMessage(error);

  return [
    'failed to fetch',
    'load failed',
    'networkerror',
    'internet disconnected',
    'network request failed',
    'fetch failed',
  ].some((pattern) => message.includes(pattern));
}
