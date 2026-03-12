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

  function notifyTicketRemoved(result: 'local' | 'queued' | 'deleted') {
    if (result === 'deleted') {
      $q.notify({
        type: 'positive',
        message: 'Тикет удалён',
      });
      return;
    }

    if (result === 'queued') {
      $q.notify({
        type: 'warning',
        message: 'Тикет поставлен в очередь на удаление',
      });
      return;
    }

    $q.notify({
      type: 'warning',
      message: 'Локальный черновик удалён',
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
    notifyTicketRemoved,
    notifySaveFailed,
    notifySyncFailed,
    notifyConflictDetected,
  };
}
