export type BranchView = { id: string; name: string; version: string };
export type BranchState = { status: "idle" | "saved" | "invalid" | "forbidden" | "conflict" | "error"; message?: string; id?: string; version?: string };
export type BranchResult<T> = { status: "ok"; data: T } | { status: "forbidden" | "invalid" | "missing" | "error" };
export type BranchList = { items: BranchView[]; total: number; pages: number; page: number; q: string };
