export type KbArticleRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_at: Date | string;
  created_at: Date | string;
};

export type KbArticleListItemDto = {
  id: string;
  slug: string;
  title: string;
  updatedAt: Date | string;
  createdAt: Date | string;
};

export type KbArticleDto = KbArticleListItemDto & {
  content: string;
};

export type CreateKbArticleInput = {
  slug: string;
  title: string;
  content: string;
};

export type UpdateKbArticleInput = Partial<CreateKbArticleInput>;
