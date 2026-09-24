const SPLIT_RATIO = 8;

export function seriesMax(rows: Array<Record<string, string | number | null | undefined>>, key: string): number {
  return rows.reduce((max, row) => {
    const value = row[key];
    return typeof value === "number" && value > max ? value : max;
  }, 0);
}

/**
 * When one brand's peak is 8× the next, give it the right axis so the other
 * lines stay visible — same Recharts line chart as Marketplace trends.
 */
export function splitRegistrationAxes(
  brands: readonly string[],
  rows: Array<Record<string, string | number | null | undefined>>,
): Record<string, "left" | "right"> {
  const ranked = [...brands]
    .map((id) => ({ id, max: seriesMax(rows, id) }))
    .sort((left, right) => right.max - left.max);
  const [first, second] = ranked;
  const axes = Object.fromEntries(brands.map((id) => [id, "left" as const]));
  if (!first || !second || second.max <= 0 || first.max < second.max * SPLIT_RATIO) {
    return axes;
  }
  axes[first.id] = "right";
  return axes;
}
