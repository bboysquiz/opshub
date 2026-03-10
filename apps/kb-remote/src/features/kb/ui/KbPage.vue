<script setup lang="ts">
import {
  QBadge,
  QBanner,
  QBtn,
  QCard,
  QCardSection,
  QIcon,
  QInput,
  QItem,
  QItemLabel,
  QItemSection,
  QList,
  QSeparator,
  QSpace,
  QSpinner,
} from 'quasar';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useKbStore } from '../stores/kb';

const kb = useKbStore();
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);

const search = computed({
  get: () => kb.query,
  set: (value: string | number | null) => {
    kb.setQuery(typeof value === 'string' ? value : '');
  },
});

const isSearching = computed(() => kb.query.trim().length > 0);

function updateOnlineStatus() {
  online.value = navigator.onLine;
}

async function openArticle(slug: string) {
  await kb.open(slug);
}

async function toggleCurrentOffline() {
  if (!kb.current) {
    return;
  }

  await kb.toggleSaveOffline(kb.current.slug);
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
  <div class="kb-page q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h6">База знаний</div>
      <q-space />
      <q-badge outline :color="online ? 'positive' : 'negative'">
        {{ online ? 'онлайн' : 'офлайн' }}
      </q-badge>
    </div>

    <q-banner v-if="kb.error" rounded class="bg-orange-1 text-orange-9 q-mb-md">
      {{ kb.error }}
    </q-banner>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-4">
        <q-input v-model="search" label="Поиск по локальным статьям" clearable class="q-mb-sm">
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>

        <q-card flat bordered>
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-7">
              {{ kb.loadingList ? 'Загружаю список...' : `Статей: ${kb.list.length}` }}
            </div>
            <div class="text-caption text-grey-6">
              Поиск работает только по локально закэшированным статьям.
            </div>
          </q-card-section>

          <q-separator />

          <q-list v-if="!isSearching">
            <q-item
              v-for="article in kb.list"
              :key="article.slug"
              clickable
              :active="kb.current?.slug === article.slug"
              active-class="bg-grey-2"
              @click="openArticle(article.slug)"
            >
              <q-item-section>
                <q-item-label>{{ article.title }}</q-item-label>
                <q-item-label caption>
                  {{ article.slug }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-icon v-if="article.savedOffline" name="offline_pin" />
              </q-item-section>
            </q-item>
          </q-list>

          <q-list v-else>
            <q-item
              v-for="result in kb.results"
              :key="result.slug"
              clickable
              :active="kb.current?.slug === result.slug"
              active-class="bg-grey-2"
              @click="openArticle(result.slug)"
            >
              <q-item-section>
                <q-item-label>{{ result.title }}</q-item-label>
                <q-item-label caption>
                  {{ result.slug }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="kb.results.length === 0">
              <q-item-section class="text-grey-7">
                Нет совпадений в локальном кэше статей.
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-8">
        <q-card flat bordered>
          <q-card-section v-if="!kb.current && !kb.loadingArticle" class="text-grey-7">
            Выберите статью.
          </q-card-section>

          <q-card-section v-else-if="kb.loadingArticle" class="row items-center q-gutter-sm">
            <q-spinner color="primary" />
            <div>Загружаю статью...</div>
          </q-card-section>

          <template v-else-if="kb.current">
            <q-card-section class="row items-start q-col-gutter-md">
              <div class="col">
                <div class="text-h6">
                  {{ kb.current.title }}
                </div>
                <div class="text-caption text-grey-7">Обновлено: {{ kb.current.updatedAt }}</div>
              </div>

              <div class="col-auto">
                <q-btn
                  outline
                  icon="offline_pin"
                  :label="kb.current.savedOffline ? 'Сохранена' : 'Сохранить офлайн'"
                  @click="toggleCurrentOffline"
                />
              </div>
            </q-card-section>

            <q-separator />

            <q-card-section>
              <pre class="kb-page__content">{{ kb.current.content }}</pre>
            </q-card-section>
          </template>
        </q-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kb-page__content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
