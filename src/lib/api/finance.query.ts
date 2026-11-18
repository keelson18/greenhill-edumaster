import { z } from "zod";
import { termCodeSchema } from "@/lib/validation/schemas";

export const FEE_PAGE_SIZE = 100;
export const feeListInput = z.object({
  termCode: termCodeSchema,
  search: z.string().trim().max(80).default(""),
  offset: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(FEE_PAGE_SIZE).default(FEE_PAGE_SIZE),
});

export function feeSearchFilter(search: string) {
  const term = search.replace(/[%,()\\"_*]/g, " ").trim();
  return term
    ? `full_name.ilike.%${term}%,admission_no.ilike.%${term}%,grade_level.ilike.%${term}%`
    : null;
}

/** Traverse explicit ranges rather than relying on the database response cap. */
export async function readAllPages<T>(
  read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
): Promise<T[]> {
  const rows: T[] = [];
  const size = 500;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await read(offset, offset + size - 1);
    if (error) throw new Error(`Unable to load ${label}: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < size) return rows;
  }
}