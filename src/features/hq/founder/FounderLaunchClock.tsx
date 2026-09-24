import { useHqBrand } from "../useHqBrand.ts";
import { launchAgeForBrand } from "./launchClock.ts";

function formatLaunchDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00+02:00`));
}

export function FounderLaunchClock() {
  const { brandSlug } = useHqBrand();
  const brand = launchAgeForBrand(brandSlug);
  if (!brand) return null;

  return (
    <span
      className="founder-launch-clock"
      title={`${brand.brand} launched ${formatLaunchDate(brand.launchedOn)} · ${brand.label}`}
    >
      <span className="founder-launch-clock__item">
        <span className="founder-launch-clock__brand">{brand.brand}</span>
        <strong>{brand.label}</strong>
      </span>
    </span>
  );
}
