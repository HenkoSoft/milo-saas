export type CatalogState = { status: "idle" | "saved" | "invalid" | "forbidden" | "conflict" | "error"; message?: string; id?: string; version?: string };
export type BrandView = CategoryView;
export type ManagedPresentation = PresentationView & { version: string; priceVersion: string; hasHistory: boolean };
export type PresentationManagement = {
  productId: string; productVersion: string; baseUnitCode: string; currency: string | null;
  units: { code: string; name: string }[]; presentations: ManagedPresentation[];
};
export type CategoryView = { id: string; name: string; version: string };
export type CatalogOptions = {
  currency: string | null;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  units: { code: string; name: string; dimensionCode: string }[];
};
export type ProductView = {
  id: string; sku: string; name: string; description: string; categoryId: string | null; brandId: string | null;
  categoryName: string | null; brandName: string | null; baseUnitCode: string; baseUnitName: string;
  baseUnitDimensionCode: string; allowsFractionalQuantity: boolean; isPublished: boolean; version: string;
};
export type PresentationView = { id: string; name: string; unitCode: string; isEnabled: boolean; factor: string; price: string | null };
export type PageData<T> = { items: T[]; total: number; page: number; pages: number; q: string };
export type ReadResult<T> = { status: "ok"; data: T } | { status: "forbidden" | "invalid" | "missing" | "error" };
