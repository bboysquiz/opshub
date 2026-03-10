import { useAuthStore } from '~/stores/auth';

type AccessRule = {
  test: (path: string) => boolean;
  requiresAuth: boolean;
  permission?: 'viewAnalytics';
};

const accessRules: AccessRule[] = [
  {
    test: (path) => path.startsWith('/tickets'),
    requiresAuth: true,
  },
  {
    test: (path) => path.startsWith('/analytics'),
    requiresAuth: true,
    permission: 'viewAnalytics',
  },
];

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return;
  }

  const rule = accessRules.find((candidate) => candidate.test(to.path));
  if (!rule) {
    return;
  }

  const auth = useAuthStore();
  await auth.bootstrapAuth();

  if (rule.requiresAuth && !auth.isAuthenticated) {
    return navigateTo({
      path: '/profile',
      query: {
        redirect: to.fullPath,
      },
    });
  }

  if (rule.permission && !auth.can(rule.permission)) {
    return navigateTo({
      path: '/profile',
      query: {
        denied: '1',
      },
    });
  }
});
