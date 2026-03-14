<script setup lang="ts">
import {
  QBanner,
  QBtn,
  Dialog,
  QIcon,
  QInput,
  QItem,
  QItemLabel,
  QItemSection,
  QList,
  QSeparator,
  QSpinner,
  useQuasar,
} from 'quasar';
import { OpPageHeader, OpPanel, notifyWithPush } from '@opshub/shared-ui';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useKbStore } from '../stores/kb';

type KbPageProps = {
  userRole?: 'admin' | 'agent' | 'employee' | null;
};

const props = withDefaults(defineProps<KbPageProps>(), {
  userRole: null,
});

const $q = useQuasar();
const kb = useKbStore();
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
const editorMode = ref<'view' | 'create' | 'edit'>('view');
const saving = ref(false);
const deleting = ref(false);

const articleForm = reactive({
  slug: '',
  title: '',
  content: '',
});

const search = computed({
  get: () => kb.query,
  set: (value: string | number | null) => {
    void kb.setQuery(typeof value === 'string' ? value : '');
  },
});

const canManageArticles = computed(() => props.userRole === 'admin' || props.userRole === 'agent');
const isSearching = computed(() => kb.query.trim().length > 0);
const isCreating = computed(() => editorMode.value === 'create');
const isEditing = computed(() => editorMode.value === 'edit');
const isEditorVisible = computed(() => isCreating.value || isEditing.value);

const panelTitle = computed(() => {
  if (isCreating.value) {
    return 'Новая статья';
  }

  if (isEditing.value) {
    return 'Редактирование статьи';
  }

  return 'Просмотр статьи';
});

const panelCaption = computed(() => {
  if (isCreating.value) {
    return 'Заполните slug, заголовок и содержимое статьи.';
  }

  if (isEditing.value && kb.current) {
    return `Редактируется статья ${kb.current.slug}`;
  }

  if (kb.current) {
    return `Slug: ${kb.current.slug}`;
  }

  return 'Выберите материал из списка слева.';
});

function updateOnlineStatus() {
  online.value = navigator.onLine;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function resetArticleForm() {
  articleForm.slug = '';
  articleForm.title = '';
  articleForm.content = '';
}

function fillArticleForm() {
  if (!kb.current) {
    resetArticleForm();
    return;
  }

  articleForm.slug = kb.current.slug;
  articleForm.title = kb.current.title;
  articleForm.content = kb.current.content;
}

async function openArticle(slug: string) {
  editorMode.value = 'view';
  await kb.open(slug);
}

function openCreateArticle() {
  editorMode.value = 'create';
  resetArticleForm();
}

function openEditArticle() {
  if (!kb.current) {
    return;
  }

  editorMode.value = 'edit';
  fillArticleForm();
}

function cancelEditing() {
  editorMode.value = 'view';
  fillArticleForm();
}

async function saveArticle() {
  const payload = {
    slug: articleForm.slug.trim(),
    title: articleForm.title.trim(),
    content: articleForm.content.trim(),
  };

  if (!payload.slug || !payload.title || !payload.content) {
    notifyWithPush($q, {
      type: 'warning',
      message: 'Заполните slug, заголовок и содержимое статьи',
      pushTitle: 'База знаний',
      pushTag: `kb-validation-${Date.now()}`,
    });
    return;
  }

  saving.value = true;

  try {
    if (isCreating.value) {
      await kb.createArticle(payload);
      notifyWithPush($q, {
        type: 'positive',
        message: 'Статья создана',
        pushTitle: 'База знаний',
        pushTag: `kb-created-${Date.now()}`,
      });
    } else if (isEditing.value && kb.current) {
      await kb.updateArticle(kb.current.id, kb.current.slug, payload);
      notifyWithPush($q, {
        type: 'positive',
        message: 'Статья обновлена',
        pushTitle: 'База знаний',
        pushTag: `kb-updated-${Date.now()}`,
      });
    }

    editorMode.value = 'view';
  } catch (error) {
    notifyWithPush($q, {
      type: 'negative',
      message: error instanceof Error ? error.message : 'Не удалось сохранить статью',
      pushTitle: 'База знаний',
      pushTag: `kb-save-failed-${Date.now()}`,
    });
  } finally {
    saving.value = false;
  }
}

function confirmDeleteArticle() {
  if (!kb.current) {
    return;
  }

  const articleId = kb.current.id;
  const articleSlug = kb.current.slug;
  const articleTitle = kb.current.title;

  Dialog.create({
    title: 'Удалить статью',
    message: `Удалить «${articleTitle}»?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    deleting.value = true;

    try {
      await kb.deleteArticle(articleId, articleSlug);
      editorMode.value = 'view';
      resetArticleForm();

      notifyWithPush($q, {
        type: 'positive',
        message: 'Статья удалена',
        pushTitle: 'База знаний',
        pushTag: `kb-deleted-${Date.now()}`,
      });
    } catch (error) {
      notifyWithPush($q, {
        type: 'negative',
        message: error instanceof Error ? error.message : 'Не удалось удалить статью',
        pushTitle: 'База знаний',
        pushTag: `kb-delete-failed-${Date.now()}`,
      });
    } finally {
      deleting.value = false;
    }
  });
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  await kb.loadList();
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
  }
});
</script>

<template>
  <section class="kb-page op-page q-pa-md" aria-labelledby="kb-page-title">
    <OpPageHeader id="kb-page-title" title="База знаний">
      <template #actions>
        <q-btn
          v-if="canManageArticles"
          color="primary"
          label="Новая статья"
          :disable="!online || saving || deleting"
          @click="openCreateArticle"
        />
      </template>
    </OpPageHeader>

    <q-banner v-if="kb.error" rounded class="bg-orange-1 text-orange-9 q-mb-md" aria-live="polite">
      {{ kb.error }}
    </q-banner>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-4">
        <q-input
          v-model="search"
          :loading="kb.searching"
          label="Поиск по базе знаний"
          clearable
          class="q-mb-sm"
          aria-label="Поиск по базе знаний"
          autocomplete="off"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>

        <OpPanel
          title="Статьи"
          caption="В онлайне поиск работает по всей базе знаний, в офлайне — по локально сохранённым статьям."
        >
          <div class="q-pa-sm">
            <div class="text-caption text-grey-7">
              {{ kb.loadingList ? 'Загружаю список...' : `Статей: ${kb.list.length}` }}
            </div>
          </div>

          <q-separator />

          <q-list v-if="!isSearching" aria-label="Список статей">
            <q-item
              v-for="article in kb.list"
              :key="article.slug"
              clickable
              :active="kb.current?.slug === article.slug && !isEditorVisible"
              active-class="bg-grey-2"
              :aria-label="`Открыть статью ${article.title}`"
              @click="openArticle(article.slug)"
            >
              <q-item-section>
                <q-item-label>{{ article.title }}</q-item-label>
                <q-item-label caption>
                  {{ article.slug }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-list v-else aria-label="Результаты поиска">
            <q-item
              v-for="result in kb.results"
              :key="result.slug"
              clickable
              :active="kb.current?.slug === result.slug && !isEditorVisible"
              active-class="bg-grey-2"
              :aria-label="`Открыть статью ${result.title}`"
              @click="openArticle(result.slug)"
            >
              <q-item-section>
                <q-item-label>{{ result.title }}</q-item-label>
                <q-item-label caption>
                  {{ result.slug }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="kb.results.length === 0 && !kb.searching">
              <q-item-section class="text-grey-7" aria-live="polite">
                Ничего не найдено.
              </q-item-section>
            </q-item>
          </q-list>
        </OpPanel>
      </div>

      <div class="col-12 col-md-8">
        <OpPanel :title="panelTitle" :caption="panelCaption">
          <div v-if="!kb.current && !isCreating && !kb.loadingArticle" class="text-grey-7">
            Выберите статью.
          </div>

          <div
            v-else-if="kb.loadingArticle"
            class="row items-center q-gutter-sm"
            aria-live="polite"
          >
            <q-spinner color="primary" />
            <div>Загружаю статью...</div>
          </div>

          <template v-else-if="isEditorVisible">
            <div class="kb-page__editor">
              <q-input
                v-model="articleForm.slug"
                outlined
                label="Slug"
                autocomplete="off"
                :disable="saving || deleting"
              />

              <q-input
                v-model="articleForm.title"
                outlined
                label="Заголовок"
                autocomplete="off"
                :disable="saving || deleting"
              />

              <q-input
                v-model="articleForm.content"
                outlined
                autogrow
                type="textarea"
                label="Содержимое"
                :disable="saving || deleting"
              />

              <div class="kb-page__editor-actions">
                <q-btn
                  flat
                  color="grey-7"
                  label="Отмена"
                  :disable="saving || deleting"
                  @click="cancelEditing"
                />
                <q-btn
                  color="primary"
                  label="Сохранить"
                  :loading="saving"
                  :disable="!online || deleting"
                  @click="saveArticle"
                />
              </div>
            </div>
          </template>

          <template v-else-if="kb.current">
            <div class="row items-start q-col-gutter-md kb-page__article-head">
              <div class="col">
                <div class="text-h6">
                  {{ kb.current.title }}
                </div>
                <div class="text-caption text-grey-7">
                  Обновлено: {{ formatDate(kb.current.updatedAt) }}
                </div>
              </div>

              <div class="col-auto">
                <div class="kb-page__article-actions">
                  <q-btn
                    v-if="canManageArticles"
                    flat
                    color="primary"
                    label="Редактировать"
                    :disable="!online || deleting"
                    @click="openEditArticle"
                  />

                  <q-btn
                    v-if="canManageArticles"
                    flat
                    color="negative"
                    label="Удалить"
                    :loading="deleting"
                    :disable="!online || saving"
                    @click="confirmDeleteArticle"
                  />
                </div>
              </div>
            </div>

            <q-separator />

            <div class="kb-page__article-body">
              <pre class="kb-page__content">{{ kb.current.content }}</pre>
            </div>
          </template>
        </OpPanel>
      </div>
    </div>
  </section>
</template>

<style scoped>
.kb-page__article-head {
  margin-bottom: 1rem;
}

.kb-page__article-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.kb-page__article-body {
  padding-top: 1rem;
}

.kb-page__content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.65;
}

.kb-page__editor {
  display: grid;
  gap: 1rem;
}

.kb-page__editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 599px) {
  .kb-page__article-head {
    gap: 1rem;
  }

  .kb-page__article-actions,
  .kb-page__editor-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
