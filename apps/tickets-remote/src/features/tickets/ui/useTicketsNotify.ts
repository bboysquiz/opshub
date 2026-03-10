import { useQuasar } from 'quasar';

function toMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useTicketsNotify() {
  const $q = useQuasar();

  function notifySavedLocally(action: 'created' | 'updated') {
    $q.notify({
      type: 'positive',
      message:
        action === 'created' ? 'Тикет добавлен в локальную очередь' : 'Тикет локально обновлён',
    });
  }

  function notifyRemovedLocally() {
    $q.notify({
      type: 'warning',
      message: 'Тикет локально удалён',
    });
  }

  function notifySaveFailed(error: unknown) {
    $q.notify({
      type: 'negative',
      message: toMessage(error, 'Не удалось сохранить изменения'),
    });
  }

  function notifySyncFailed(message: string | null) {
    if (!message) {
      return;
    }

    $q.notify({
      type: 'negative',
      message,
    });
  }

  function notifyConflictDetected() {
    $q.notify({
      type: 'warning',
      message: 'Обнаружен конфликт синхронизации. Открой диагностику, чтобы разобраться.',
    });
  }

  return {
    notifySavedLocally,
    notifyRemovedLocally,
    notifySaveFailed,
    notifySyncFailed,
    notifyConflictDetected,
  };
}
