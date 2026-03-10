import { defineStore } from 'pinia';
import { ref } from 'vue';
import { kbApi, type ArticleListItem } from '../api/kbApi';
import { kbDb, type Article } from '../infra/dexie';
import { buildIndex, searchArticles } from '../search/search';

export type KbListItem = ArticleListItem & {
  savedOffline: boolean;
};

export type KbSearchResult = {
  slug: string;
  title: string;
};

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function toListItem(article: Article): KbListItem {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    updatedAt: article.updatedAt,
    createdAt: article.createdAt,
    savedOffline: article.savedOffline,
  };
}

async function loadLocalArticles() {
  return sortByUpdatedAtDesc(await kbDb.articles.toArray());
}

async function findArticleBySlug(slug: string) {
  return kbDb.articles.where('slug').equals(slug).first();
}

export const useKbStore = defineStore('kb', () => {
  const list = ref<KbListItem[]>([]);
  const loadingList = ref(false);
  const loadingArticle = ref(false);
  const error = ref<string | null>(null);
  const current = ref<Article | null>(null);
  const query = ref('');
  const results = ref<KbSearchResult[]>([]);

  async function rebuildIndex() {
    const allLocal = await loadLocalArticles();
    buildIndex(allLocal);
  }

  function syncSearchResults(nextQuery: string) {
    query.value = nextQuery;

    results.value = searchArticles(nextQuery).map((result) => ({
      slug: String(result.slug),
      title: String(result.title),
    }));
  }

  async function loadList() {
    loadingList.value = true;
    error.value = null;

    const localArticles = await loadLocalArticles();
    const savedSet = new Set(
      localArticles.filter((article) => article.savedOffline).map((article) => article.slug),
    );

    try {
      const response = await kbApi.list();

      list.value = sortByUpdatedAtDesc(
        response.items.map((item) => ({
          ...item,
          savedOffline: savedSet.has(item.slug),
        })),
      );

      if (response.source === 'idb') {
        error.value = 'Офлайн-режим: показываю только локально доступные статьи';
      }
    } catch (loadError) {
      list.value = localArticles.map(toListItem);
      error.value =
        loadError instanceof Error ? loadError.message : 'Не удалось загрузить список статей';
    } finally {
      loadingList.value = false;
    }

    await rebuildIndex();
    syncSearchResults(query.value);
  }

  async function open(slug: string) {
    loadingArticle.value = true;
    error.value = null;

    try {
      current.value = await kbApi.get(slug);
      await rebuildIndex();
      syncSearchResults(query.value);
    } catch (loadError) {
      current.value = null;
      error.value = loadError instanceof Error ? loadError.message : 'Не удалось загрузить статью';
    } finally {
      loadingArticle.value = false;
    }
  }

  async function toggleSaveOffline(slug: string) {
    let article = await findArticleBySlug(slug);

    if (!article) {
      await open(slug);
      article = await findArticleBySlug(slug);
    }

    if (!article) {
      return;
    }

    const nextSavedOffline = !article.savedOffline;

    await kbDb.articles.put({
      ...article,
      savedOffline: nextSavedOffline,
    });

    list.value = list.value.map((item) =>
      item.slug === slug ? { ...item, savedOffline: nextSavedOffline } : item,
    );

    if (current.value?.slug === slug) {
      current.value = {
        ...current.value,
        savedOffline: nextSavedOffline,
      };
    }

    await rebuildIndex();
    syncSearchResults(query.value);
  }

  function setQuery(nextQuery: string) {
    syncSearchResults(nextQuery);
  }

  return {
    list,
    loadingList,
    loadingArticle,
    error,
    current,
    query,
    results,
    loadList,
    open,
    toggleSaveOffline,
    setQuery,
  };
});
