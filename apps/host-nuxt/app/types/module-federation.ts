import type { Component } from 'vue';

export type RemoteFactoryResult = Component | { default: Component };

export type RemoteContainer = {
  get: (module: string) => Promise<() => RemoteFactoryResult>;
  init?: (scope: unknown) => void | Promise<void>;
};
