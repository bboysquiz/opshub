import { notifyWithPush } from '@opshub/shared-ui';
import { useQuasar } from 'quasar';

function toMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useTicketsNotify() {
  const $q = useQuasar();

  function notifySavedLocally(action: 'created' | 'updated') {
    notifyWithPush($q, {
      type: 'positive',
      message:
        action === 'created' ? 'Тикет добавлен в локальную очередь' : 'Тикет локально обновлён',
      pushTitle: 'Тикеты',
      pushTag: `tickets-local-${action}-${Date.now()}`,
    });
  }

  function notifyTicketRemoved(result: 'local' | 'queued' | 'deleted') {
    if (result === 'deleted') {
      notifyWithPush($q, {
        type: 'positive',
        message: 'Тикет удалён',
        pushTitle: 'Тикеты',
        pushTag: `tickets-deleted-${Date.now()}`,
      });
      return;
    }

    if (result === 'queued') {
      notifyWithPush($q, {
        type: 'warning',
        message: 'Тикет поставлен в очередь на удаление',
        pushTitle: 'Тикеты',
        pushTag: `tickets-delete-queued-${Date.now()}`,
      });
      return;
    }

    notifyWithPush($q, {
      type: 'warning',
      message: 'Локальный черновик удалён',
      pushTitle: 'Тикеты',
      pushTag: `tickets-local-removed-${Date.now()}`,
    });
  }

  function notifySaveFailed(error: unknown) {
    notifyWithPush($q, {
      type: 'negative',
      message: toMessage(error, 'Не удалось сохранить изменения'),
      pushTitle: 'Тикеты',
      pushTag: `tickets-save-failed-${Date.now()}`,
    });
  }

  function notifySyncFailed(message: string | null) {
    if (!message) {
      return;
    }

    notifyWithPush($q, {
      type: 'negative',
      message,
      pushTitle: 'Тикеты',
      pushTag: `tickets-sync-failed-${Date.now()}`,
    });
  }

  function notifyConflictDetected() {
    notifyWithPush($q, {
      type: 'warning',
      message: 'Обнаружен конфликт синхронизации. Открой диагностику, чтобы разобраться.',
      pushTitle: 'Тикеты',
      pushTag: `tickets-conflict-${Date.now()}`,
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
