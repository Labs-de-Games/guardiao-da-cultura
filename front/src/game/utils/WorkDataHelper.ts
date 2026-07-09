import type {
  ContentJson,
  LabelInfoData,
  WorkData,
} from "../types/GameDataTypes";

/**
 * Find a work by its ID across all work categories (PAINTINGS, SCULPTURES, PHOTOS, etc.).
 */
export function findWorkDataById(
  id: string,
  contentData: ContentJson,
): WorkData | null {
  const groups = Object.values(contentData.works);
  for (const group of groups) {
    if (!group) continue;
    const match = group[id];
    if (match) return match;
  }
  return null;
}

/**
 * Resolve a placeholder's raw ID to a valid work ID.
 * Handles single strings, arrays, and returns the first valid match.
 */
export function resolveWorkIdFromPlaceholder(
  rawId: string | string[] | undefined,
  contentData: ContentJson,
): string | null {
  if (!rawId) return null;

  const ids = Array.isArray(rawId) ? rawId : [rawId];
  for (const id of ids) {
    if (findWorkDataById(id, contentData)) return id;
  }

  return ids[0] || null;
}

/**
 * Build label display info from a work, resolving parent references if needed.
 */
export function buildLabelInfo(
  work: WorkData,
  findWorkFn: (id: string) => WorkData | null,
): LabelInfoData {
  const workAny = work as unknown as Record<string, unknown>;
  const parentId = workAny.parent_id as string | undefined;

  if (parentId) {
    const parentWork = findWorkFn(parentId);
    if (parentWork) {
      return buildLabelInfo(parentWork, findWorkFn);
    }
  }

  const metadata = work.metadata || {};
  const educational = (work.educational || {}) as Record<string, unknown>;

  const description = (educational.description as string | undefined) || "";
  const dimensions =
    (educational.dimensions as string | undefined) || metadata.dimensions;
  const medium = (educational.medium as string | undefined) || metadata.medium;

  return {
    title: metadata.title || work.id,
    author: metadata.author || "",
    description,
    year: metadata.year,
    dimensions,
    medium,
    place: metadata.place,
  };
}
