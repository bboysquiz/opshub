export async function navigateTo(path: string) {
  return path;
}

export function useRoute() {
  return {
    query: {},
  };
}

export function useRuntimeConfig() {
  return {
    public: {
      apiBaseUrl: 'http://localhost:3001',
      ticketsRemoteEntryUrl: 'http://localhost:3010/remoteEntry.js',
      kbRemoteEntryUrl: 'http://localhost:3020/remoteEntry.js',
      analyticsRemoteEntryUrl: 'http://localhost:3030/remoteEntry.js',
    },
  };
}
