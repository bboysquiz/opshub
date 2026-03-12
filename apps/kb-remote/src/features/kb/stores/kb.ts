import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  kbApi,
  type ArticleListItem,
  type CreateArticleInput,
  type UpdateArticleInput,
} from '../api/kbApi';
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
  const searching = ref(false);
  const error = ref<string | null>(null);
  const current = ref<Article | null>(null);
  const query = ref('');
  const results = ref<KbSearchResult[]>([]);
  let activeSearchId = 0;

  async function rebuildIndex() {
    const allLocal = await loadLocalArticles();
    buildIndex(allLocal);
  }

  async function runSearch(nextQuery: string) {
    const normalizedQuery = nextQuery.trim();
    query.value = nextQuery;

    if (!normalizedQuery) {
      results.value = [];
      searching.value = false;
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      results.value = searchArticles(normalizedQuery).map((result) => ({
        slug: String(result.slug),
        title: String(result.title),
      }));
      searching.value = false;
      return;
    }

    const searchId = ++activeSearchId;
    searching.value = true;

    try {
      const response = await kbApi.search(normalizedQuery);
      if (searchId !== activeSearchId) {
        return;
      }

      results.value = response.items.map((item) => ({
        slug: item.slug,
        title: item.title,
      }));
    } catch {
      if (searchId !== activeSearchId) {
        return;
      }

      results.value = searchArticles(normalizedQuery).map((result) => ({
        slug: String(result.slug),
        title: String(result.title),
      }));
    } finally {
      if (searchId === activeSearchId) {
        searching.value = false;
      }
    }
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
    await runSearch(query.value);
  }

  async function open(slug: string) {
    loadingArticle.value = true;
    error.value = null;

    try {
      current.value = await kbApi.get(slug);
      await rebuildIndex();
      await runSearch(query.value);
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
    await runSearch(query.value);
  }

  async function createArticle(payload: CreateArticleInput) {
    const article = await kbApi.create(payload);

    current.value = article;
    list.value = sortByUpdatedAtDesc([
      {
        id: article.id,
        slug: article.slug,
        title: article.title,
        updatedAt: article.updatedAt,
        createdAt: article.createdAt,
        savedOffline: article.savedOffline,
      },
      ...list.value.filter((item) => item.id !== article.id),
    ]);

    error.value = null;
    await rebuildIndex();
    await runSearch(query.value);

    return article;
  }

  async function updateArticle(id: string, previousSlug: string, payload: UpdateArticleInput) {
    const article = await kbApi.update(id, payload, previousSlug);

    current.value = article;
    list.value = sortByUpdatedAtDesc(
      list.value.map((item) =>
        item.id === article.id
          ? {
              id: article.id,
              slug: article.slug,
              title: article.title,
              updatedAt: article.updatedAt,
              createdAt: article.createdAt,
              savedOffline: article.savedOffline,
            }
          : item,
      ),
    );

    error.value = null;
    await rebuildIndex();
    await runSearch(query.value);

    return article;
  }

  async function deleteArticle(id: string, slug: string) {
    await kbApi.remove(id, slug);

    list.value = list.value.filter((item) => item.id !== id);
    if (current.value?.id === id) {
      current.value = null;
    }

    error.value = null;
    await rebuildIndex();
    await runSearch(query.value);
  }

  async function setQuery(nextQuery: string) {
    await runSearch(nextQuery);
  }

  return {
    list,
    loadingList,
    loadingArticle,
    searching,
    error,
    current,
    query,
    results,
    loadList,
    open,
    toggleSaveOffline,
    createArticle,
    updateArticle,
    deleteArticle,
    setQuery,
  };
});
