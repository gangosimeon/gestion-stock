/** Catégorie de produits (GET /api/categories). Désactivée plutôt que supprimée : ses produits la gardent. */
export interface Category {
  id: string;
  name: string;
  description?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryRequest {
  name: string;
  description?: string;
}
