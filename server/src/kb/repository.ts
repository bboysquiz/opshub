import type { PoolClient } from 'pg';
import { pool } from '../db';
import type { CreateKbArticleInput, KbArticleRow, UpdateKbArticleInput } from './types';

type Queryable = Pick<PoolClient, 'query'>;

const KB_ARTICLE_COLUMNS = `
  id,
  slug,
  title,
  content,
  updated_at,
  created_at
`;

export async function listKbArticles(db: Queryable = pool): Promise<KbArticleRow[]> {
  const result = await db.query<KbArticleRow>(
    `select ${KB_ARTICLE_COLUMNS}
     from kb_articles
     order by updated_at desc`,
  );
  return result.rows;
}

export async function searchKbArticles(
  query: string,
  db: Queryable = pool,
): Promise<KbArticleRow[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const result = await db.query<KbArticleRow>(
    `select ${KB_ARTICLE_COLUMNS}
     from kb_articles
     where lower(title) like lower('%' || $1 || '%')
        or lower(slug) like lower('%' || $1 || '%')
        or lower(content) like lower('%' || $1 || '%')
     order by case
       when lower(title) = lower($1) then 700
       when lower(title) like lower($1 || '%') then 600
       when lower(slug) = lower($1) then 500
       when lower(slug) like lower($1 || '%') then 450
       when lower(title) like lower('%' || $1 || '%') then 400
       when lower(slug) like lower('%' || $1 || '%') then 350
       when lower(content) like lower($1 || '%') then 300
       when lower(content) like lower('%' || $1 || '%') then 200
       else 0
     end desc,
     updated_at desc,
     title asc
     limit 20`,
    [normalizedQuery],
  );

  return result.rows;
}

export async function findKbArticleBySlug(
  slug: string,
  db: Queryable = pool,
): Promise<KbArticleRow | null> {
  const result = await db.query<KbArticleRow>(
    `select ${KB_ARTICLE_COLUMNS}
     from kb_articles
     where slug = $1
     limit 1`,
    [slug],
  );
  return result.rowCount ? result.rows[0] : null;
}

export async function findKbArticleById(
  id: string,
  db: Queryable = pool,
): Promise<KbArticleRow | null> {
  const result = await db.query<KbArticleRow>(
    `select ${KB_ARTICLE_COLUMNS}
     from kb_articles
     where id = $1
     limit 1`,
    [id],
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function createKbArticle(
  payload: CreateKbArticleInput,
  db: Queryable = pool,
): Promise<KbArticleRow> {
  const result = await db.query<KbArticleRow>(
    `insert into kb_articles (slug, title, content)
     values ($1, $2, $3)
     returning ${KB_ARTICLE_COLUMNS}`,
    [payload.slug, payload.title, payload.content],
  );

  return result.rows[0];
}

export async function updateKbArticleById(
  id: string,
  payload: UpdateKbArticleInput,
  db: Queryable = pool,
): Promise<KbArticleRow | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (payload.slug !== undefined) {
    values.push(payload.slug);
    fields.push(`slug = $${values.length}`);
  }

  if (payload.title !== undefined) {
    values.push(payload.title);
    fields.push(`title = $${values.length}`);
  }

  if (payload.content !== undefined) {
    values.push(payload.content);
    fields.push(`content = $${values.length}`);
  }

  values.push(id);
  const result = await db.query<KbArticleRow>(
    `update kb_articles
     set ${fields.join(', ')},
         updated_at = now()
     where id = $${values.length}
     returning ${KB_ARTICLE_COLUMNS}`,
    values,
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function deleteKbArticleById(id: string, db: Queryable = pool): Promise<boolean> {
  const result = await db.query<{ id: string }>(
    `delete from kb_articles
     where id = $1
     returning id`,
    [id],
  );

  return Boolean(result.rowCount);
}
