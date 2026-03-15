import { notifyWithPush } from './notify';

describe('notifyWithPush', () => {
  it('shows both quasar toast and browser notification when subscription exists', async () => {
    const notify = vi.fn();
    const getSubscription = vi.fn().mockResolvedValue({ endpoint: 'https://push.example/test' });
    const showNotification = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'granted',
      },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription,
          },
          showNotification,
        }),
      },
    });

    notifyWithPush(
      {
        notify,
      } as never,
      {
        type: 'positive',
        message: 'Локальное уведомление',
        pushTitle: 'Системное уведомление',
        pushTag: 'notify-test',
      },
    );

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Локальное уведомление',
      }),
    );
    expect(getSubscription).toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith(
      'Системное уведомление',
      expect.objectContaining({
        body: 'Локальное уведомление',
        tag: 'notify-test',
      }),
    );
  });

  it('does not try to show a system notification without permission', async () => {
    const notify = vi.fn();
    const getRegistration = vi.fn();

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'denied',
      },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration,
      },
    });

    notifyWithPush(
      {
        notify,
      } as never,
      {
        type: 'warning',
        message: 'Без системного пуша',
      },
    );

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(notify).toHaveBeenCalled();
    expect(getRegistration).not.toHaveBeenCalled();
  });
});
