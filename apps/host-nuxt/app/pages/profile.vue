<script setup lang="ts">
import { navigateTo, useRoute } from '#imports';
import { useQuasar } from 'quasar';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';
import {
  featureFlagLabels,
  roleLabels,
  type AuthUser,
  type FeatureFlags,
  type UserRole,
} from '~/utils/access';

type UserDraft = {
  role: UserRole;
  newTicketsTable: boolean;
};

const $q = useQuasar();
const route = useRoute();
const auth = useAuthStore();
const minRegisterPasswordLength = 8;

const loginForm = reactive({
  email: '',
  password: '',
});

const registerForm = reactive({
  email: '',
  password: '',
  passwordConfirm: '',
});

const authError = ref<string | null>(null);
const submitting = ref(false);
const userDrafts = ref<Record<string, UserDraft>>({});
const rowSaving = ref<Record<string, boolean>>({});
const rowErrors = ref<Record<string, string | null>>({});

const userColumns = [
  { name: 'email', label: 'Email', field: 'email', align: 'left' as const },
  { name: 'role', label: 'Роль', field: 'role', align: 'left' as const },
  {
    name: 'newTicketsTable',
    label: featureFlagLabels.newTicketsTable,
    field: 'newTicketsTable',
    align: 'left' as const,
  },
  { name: 'createdAt', label: 'Создан', field: 'createdAt', align: 'left' as const },
  { name: 'actions', label: 'Действия', field: 'actions', align: 'right' as const },
];

const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: roleLabels.admin, value: 'admin' },
  { label: roleLabels.agent, value: 'agent' },
  { label: roleLabels.employee, value: 'employee' },
];

const accessDenied = computed(() => route.query.denied === '1');
const users = computed(() => auth.users);

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function draftFor(user: AuthUser): UserDraft {
  if (!userDrafts.value[user.id]) {
    userDrafts.value[user.id] = {
      role: user.role,
      newTicketsTable: user.featureFlags.newTicketsTable,
    };
  }

  return userDrafts.value[user.id];
}

function hasChanges(user: AuthUser) {
  const draft = draftFor(user);
  return draft.role !== user.role || draft.newTicketsTable !== user.featureFlags.newTicketsTable;
}

async function handleAfterAuth() {
  authError.value = null;

  if (auth.canManageUsers) {
    await auth.loadUsers().catch(() => undefined);
  }

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '';
  if (redirect && redirect.startsWith('/')) {
    await navigateTo(redirect);
  }
}

async function submitLogin() {
  submitting.value = true;
  authError.value = null;

  try {
    await auth.login(loginForm.email, loginForm.password);
    loginForm.password = '';
    await handleAfterAuth();
  } catch (error) {
    authError.value = error instanceof Error ? error.message : 'Не удалось войти';
  } finally {
    submitting.value = false;
  }
}

async function submitRegister() {
  if (!registerForm.email.trim()) {
    authError.value = 'Введите email';
    return;
  }

  if (registerForm.password.length < minRegisterPasswordLength) {
    authError.value = `Пароль должен содержать минимум ${minRegisterPasswordLength} символов`;
    return;
  }

  if (registerForm.password !== registerForm.passwordConfirm) {
    authError.value = 'Пароли не совпадают';
    return;
  }

  submitting.value = true;
  authError.value = null;

  try {
    await auth.register(registerForm.email, registerForm.password);
    registerForm.password = '';
    registerForm.passwordConfirm = '';
    await handleAfterAuth();
  } catch (error) {
    authError.value = error instanceof Error ? error.message : 'Не удалось зарегистрироваться';
  } finally {
    submitting.value = false;
  }
}

async function saveUser(user: AuthUser) {
  const draft = draftFor(user);
  rowSaving.value[user.id] = true;
  rowErrors.value[user.id] = null;

  try {
    await auth.updateUserAccess(user.id, {
      role: draft.role,
      featureFlags: {
        newTicketsTable: draft.newTicketsTable,
      } satisfies FeatureFlags,
    });

    $q.notify({
      type: 'positive',
      message: `Права пользователя ${user.email} обновлены`,
    });
  } catch (error) {
    rowErrors.value[user.id] = error instanceof Error ? error.message : 'Не удалось сохранить';
  } finally {
    rowSaving.value[user.id] = false;
  }
}

async function handleLogout() {
  await auth.logout();
  authError.value = null;
  await navigateTo('/profile');
}

watch(
  users,
  (items) => {
    userDrafts.value = Object.fromEntries(
      items.map((user) => [
        user.id,
        {
          role: user.role,
          newTicketsTable: user.featureFlags.newTicketsTable,
        } satisfies UserDraft,
      ]),
    );
  },
  { immediate: true },
);

watch(
  () => auth.currentUser?.role,
  async (role) => {
    if (role === 'admin') {
      await auth.loadUsers().catch(() => undefined);
      return;
    }

    userDrafts.value = {};
  },
  { immediate: true },
);

onMounted(async () => {
  if (!auth.bootstrapComplete) {
    await auth.bootstrapAuth();
  }
});
</script>

<template>
  <ClientOnly>
    <div class="q-gutter-y-md">
      <div class="row items-center q-gutter-sm">
        <div class="text-h5">Профиль и настройки</div>
        <q-badge v-if="auth.currentUser" color="secondary">
          {{ roleLabels[auth.currentUser.role] }}
        </q-badge>
      </div>

      <q-banner v-if="accessDenied" rounded class="bg-orange-1 text-orange-9">
        У текущего пользователя нет прав на этот раздел. Войдите под агентом или администратором.
      </q-banner>

      <q-banner v-if="authError" rounded class="bg-red-1 text-red-9">
        {{ authError }}
      </q-banner>

      <q-card v-if="auth.bootstrapping && !auth.bootstrapComplete" flat bordered>
        <q-card-section class="row items-center q-gutter-sm">
          <q-spinner />
          <div>Поднимаю текущую сессию…</div>
        </q-card-section>
      </q-card>

      <template v-if="!auth.isAuthenticated">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-lg-6">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-h6">Вход</div>
                <div class="text-caption text-grey-7">
                  Используй существующий аккаунт, чтобы открыть внутренние модули.
                </div>
              </q-card-section>

              <q-card-section>
                <q-form class="q-gutter-md" @submit.prevent="submitLogin">
                  <q-input
                    id="profile-login-email"
                    v-model.trim="loginForm.email"
                    outlined
                    type="email"
                    label="Email"
                    autocomplete="email"
                  />
                  <q-input
                    id="profile-login-password"
                    v-model="loginForm.password"
                    outlined
                    type="password"
                    label="Пароль"
                    autocomplete="current-password"
                  />

                  <div class="row justify-end">
                    <q-btn color="primary" label="Войти" type="submit" :loading="submitting" />
                  </div>
                </q-form>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-lg-6">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-h6">Регистрация</div>
                <div class="text-caption text-grey-7">
                  Первая регистрация в пустой базе получает роль администратора. Все следующие
                  аккаунты создаются как employee и могут быть повышены администратором.
                </div>
              </q-card-section>

              <q-card-section>
                <q-form class="q-gutter-md" @submit.prevent="submitRegister">
                  <q-input
                    id="profile-register-email"
                    v-model.trim="registerForm.email"
                    outlined
                    type="email"
                    label="Email"
                    autocomplete="email"
                  />
                  <q-input
                    id="profile-register-password"
                    v-model="registerForm.password"
                    outlined
                    type="password"
                    label="Пароль"
                    autocomplete="new-password"
                    hint="Минимум 8 символов"
                  />
                  <q-input
                    id="profile-register-password-confirm"
                    v-model="registerForm.passwordConfirm"
                    outlined
                    type="password"
                    label="Подтверждение пароля"
                    autocomplete="new-password"
                  />

                  <div class="row justify-end">
                    <q-btn
                      color="secondary"
                      label="Создать аккаунт"
                      type="submit"
                      :loading="submitting"
                    />
                  </div>
                </q-form>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-xl-5">
            <q-card flat bordered>
              <q-card-section class="row items-center">
                <div>
                  <div class="text-h6">
                    {{ auth.currentUser?.email }}
                  </div>
                  <div class="text-caption text-grey-7">
                    Роль: {{ auth.currentUser ? roleLabels[auth.currentUser.role] : '' }}
                  </div>
                </div>
                <q-space />
                <q-btn flat color="negative" icon="logout" label="Выйти" @click="handleLogout" />
              </q-card-section>

              <q-separator />

              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">Профиль</div>
                <div class="text-body2 q-mb-xs">
                  Дата регистрации:
                  {{ auth.currentUser ? formatDateTime(auth.currentUser.createdAt) : 'неизвестно' }}
                </div>

                <div class="text-subtitle2 q-mt-md q-mb-sm">Feature flags</div>
                <div class="row q-gutter-sm">
                  <q-badge
                    :color="auth.featureFlags.newTicketsTable ? 'positive' : 'grey-7'"
                    class="q-px-sm q-py-xs"
                  >
                    {{ featureFlagLabels.newTicketsTable }}:
                    {{ auth.featureFlags.newTicketsTable ? 'включена' : 'выключена' }}
                  </q-badge>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-xl-7">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-h6">Права доступа</div>
                <div class="text-caption text-grey-7">
                  UI и API используют одну и ту же RBAC-модель:
                </div>
              </q-card-section>

              <q-card-section class="q-pt-none">
                <div class="text-body2 q-mb-sm">
                  Analytics: {{ auth.canViewAnalytics ? 'доступно' : 'скрыто' }}
                </div>
                <div class="text-body2 q-mb-sm">
                  Изменение тикетов: {{ auth.canUpdateTickets ? 'разрешено' : 'только чтение' }}
                </div>
                <div class="text-body2">
                  Удаление тикетов: {{ auth.canDeleteTickets ? 'разрешено' : 'запрещено' }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-card v-if="auth.canManageUsers" flat bordered>
          <q-card-section class="row items-center">
            <div>
              <div class="text-h6">Настройки доступа</div>
              <div class="text-caption text-grey-7">
                Только администратор видит этот экран и может менять роли и feature flags.
              </div>
            </div>
            <q-space />
            <q-btn
              flat
              color="primary"
              icon="refresh"
              label="Обновить"
              :loading="auth.usersLoading"
              @click="auth.loadUsers()"
            />
          </q-card-section>

          <q-banner v-if="auth.usersError" rounded class="bg-red-1 text-red-9 q-mx-md q-mb-md">
            {{ auth.usersError }}
          </q-banner>

          <q-table
            flat
            row-key="id"
            :rows="users"
            :columns="userColumns"
            :loading="auth.usersLoading"
            no-data-label="Пользователей пока нет"
          >
            <template #body-cell-role="props">
              <q-td :props="props">
                <q-select
                  v-model="draftFor(props.row).role"
                  dense
                  outlined
                  emit-value
                  map-options
                  :options="roleOptions"
                />
              </q-td>
            </template>

            <template #body-cell-newTicketsTable="props">
              <q-td :props="props">
                <q-toggle v-model="draftFor(props.row).newTicketsTable" color="primary" />
              </q-td>
            </template>

            <template #body-cell-createdAt="props">
              <q-td :props="props">
                {{ formatDateTime(props.row.createdAt) }}
              </q-td>
            </template>

            <template #body-cell-actions="props">
              <q-td :props="props" class="text-right">
                <div class="column items-end">
                  <q-btn
                    color="primary"
                    flat
                    dense
                    label="Сохранить"
                    :disable="!hasChanges(props.row)"
                    :loading="rowSaving[props.row.id]"
                    @click="saveUser(props.row)"
                  />
                  <div v-if="rowErrors[props.row.id]" class="text-caption text-negative q-mt-xs">
                    {{ rowErrors[props.row.id] }}
                  </div>
                </div>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </template>
    </div>

    <template #fallback>
      <q-card flat bordered>
        <q-card-section class="row items-center q-gutter-sm">
          <q-spinner />
          <div>Загружаю профиль…</div>
        </q-card-section>
      </q-card>
    </template>
  </ClientOnly>
</template>
