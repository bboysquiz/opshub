import { isBrowserOnline, isNetworkLikeError } from './network';

describe('tickets network utils', () => {
  it('recognizes browser offline state as network unavailable', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    expect(isBrowserOnline()).toBe(false);
    expect(isNetworkLikeError(new Error('Любая ошибка'))).toBe(true);
  });

  it('treats type errors and fetch-like messages as network errors', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    expect(isNetworkLikeError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkLikeError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkLikeError({ status: 500 })).toBe(false);
  });
});
