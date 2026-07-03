import type { VariantGroup } from "@/api/types";

export type VariantGroupWithOptions = {
  id: string;
  name: string;
  selectionMode: "SINGLE" | "MULTIPLE";
  maxPicks: number | null;
  sortOrder: number;
  isActive: boolean;
  variants: { id: string; name: string; priceDelta: string; isActive: boolean }[];
};

export function toVariantGroups(groups: VariantGroup[]): VariantGroupWithOptions[] {
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    selectionMode: g.selectionMode,
    maxPicks: g.maxPicks,
    sortOrder: g.sortOrder,
    isActive: g.isActive,
    variants: (g.variants ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      priceDelta: v.priceDelta,
      isActive: v.isActive
    }))
  }));
}

export function maxPicksForGroup(
  group: { selectionMode: "SINGLE" | "MULTIPLE"; maxPicks: number | null },
  productMaxVariants: number
): number {
  if (group.selectionMode === "SINGLE") return 1;
  return group.maxPicks ?? productMaxVariants;
}

export function productNeedsVariantPicker(
  productMaxVariants: number,
  groups: VariantGroupWithOptions[]
): boolean {
  const active = groups.filter((g) => g.isActive && g.variants.some((v) => v.isActive));
  return active.some((g) => {
    if (g.selectionMode === "SINGLE") return g.variants.length > 0;
    return productMaxVariants > 0 && g.variants.length > 0;
  });
}

export function formatVariantSummary(
  variantIds: string[],
  groups: VariantGroupWithOptions[]
): string {
  const variantById = new Map(
    groups.flatMap((g) =>
      g.variants.map((v) => [v.id, { ...v, groupName: g.name }] as const)
    )
  );
  const byGroup = new Map<string, string[]>();
  for (const id of variantIds) {
    const v = variantById.get(id);
    if (!v) continue;
    const list = byGroup.get(v.groupName) ?? [];
    list.push(v.name);
    byGroup.set(v.groupName, list);
  }
  return Array.from(byGroup.entries())
    .map(([group, names]) => `${group}: ${names.join(", ")}`)
    .join(" · ");
}

export function pickerCanConfirm(
  productMaxVariants: number,
  groups: VariantGroupWithOptions[],
  selection: string[]
): boolean {
  const active = groups.filter((g) => g.isActive && g.variants.some((v) => v.isActive));
  for (const group of active) {
    const picks = selection.filter((id) => group.variants.some((v) => v.id === id));
    if (group.selectionMode === "SINGLE") {
      if (picks.length !== 1) return false;
      continue;
    }
    if (productMaxVariants === 0) {
      if (picks.length > 0) return false;
      continue;
    }
    const max = maxPicksForGroup(group, productMaxVariants);
    if (picks.length < 1 || picks.length > max) return false;
  }
  return active.length > 0;
}
