import {
  logKbArticleCreatedActivity,
  logKbArticleDeletedActivity,
  logKbArticleUpdatedActivity,
} from '../activity/service';
import type { AccessPayload } from '../auth/types';
import {
  createKbArticle,
  deleteKbArticleById,
  findKbArticleById,
  findKbArticleBySlug,
  listKbArticles,
  searchKbArticles,
  updateKbArticleById,
} from './repository';
import { KbError } from './errors';
import { sanitizeCreateKbArticleInput, sanitizeUpdateKbArticleInput } from './sanitization';
import type {
  CreateKbArticleInput,
  KbArticleDto,
  KbArticleListItemDto,
  KbArticleRow,
  UpdateKbArticleInput,
} from './types';

function mapListItem(row: KbArticleRow): KbArticleListItemDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function mapArticle(row: KbArticleRow): KbArticleDto {
  return {
    ...mapListItem(row),
    content: row.content,
  };
}

export function buildKbArticleEtag(article: Pick<KbArticleRow, 'id' | 'updated_at'>): string {
  const updatedAtMs = new Date(article.updated_at).getTime();
  return `"${article.id}:${updatedAtMs}"`;
}

function normalizeEtag(tag: string): string {
  return tag.trim().replace(/^W\//, '');
}

export function ifNoneMatchMatches(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false;

  const target = normalizeEtag(etag);

  return ifNoneMatch
    .split(',')
    .map((part) => part.trim())
    .some((candidate) => candidate === '*' || normalizeEtag(candidate) === target);
}

export async function getKbArticlesList(): Promise<KbArticleListItemDto[]> {
  const rows = await listKbArticles();
  return rows.map(mapListItem);
}

export async function searchKbArticlesList(query: string): Promise<KbArticleListItemDto[]> {
  const rows = await searchKbArticles(query);
  return rows.map(mapListItem);
}

export async function getKbArticleBySlug(
  slug: string,
): Promise<{ article: KbArticleDto; etag: string } | null> {
  const row = await findKbArticleBySlug(slug);
  if (!row) return null;

  return {
    article: mapArticle(row),
    etag: buildKbArticleEtag(row),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

export async function createKbArticleRecord(
  payload: CreateKbArticleInput,
  actor: AccessPayload,
): Promise<KbArticleDto> {
  try {
    const sanitizedPayload = sanitizeCreateKbArticleInput(payload);
    const row = await createKbArticle(sanitizedPayload);
    await logKbArticleCreatedActivity({
      actorId: actor.sub,
      actorEmail: actor.email,
      articleId: row.id,
      articleTitle: row.title,
    }).catch((error) => {
      console.error('Failed to write kb_article_created activity event', error);
    });

    return mapArticle(row);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new KbError(409, 'Статья с таким slug уже существует');
    }

    throw err;
  }
}

export async function updateKbArticleRecord(
  id: string,
  payload: UpdateKbArticleInput,
  actor: AccessPayload,
): Promise<KbArticleDto> {
  try {
    const sanitizedPayload = sanitizeUpdateKbArticleInput(payload);
    const existing = await findKbArticleById(id);
    if (!existing) {
      throw new KbError(404, 'Article not found');
    }

    const row = await updateKbArticleById(id, sanitizedPayload);
    if (!row) {
      throw new KbError(404, 'Article not found');
    }

    await logKbArticleUpdatedActivity({
      actorId: actor.sub,
      actorEmail: actor.email,
      articleId: row.id,
      articleTitle: row.title,
    }).catch((error) => {
      console.error('Failed to write kb_article_updated activity event', error);
    });

    return mapArticle(row);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new KbError(409, 'Статья с таким slug уже существует');
    }

    throw err;
  }
}

export async function deleteKbArticleRecord(id: string, actor: AccessPayload): Promise<void> {
  const existing = await findKbArticleById(id);
  if (!existing) {
    throw new KbError(404, 'Article not found');
  }

  const deleted = await deleteKbArticleById(id);
  if (!deleted) {
    throw new KbError(404, 'Article not found');
  }

  await logKbArticleDeletedActivity({
    actorId: actor.sub,
    actorEmail: actor.email,
    articleId: existing.id,
    articleTitle: existing.title,
  }).catch((error) => {
    console.error('Failed to write kb_article_deleted activity event', error);
  });
}
