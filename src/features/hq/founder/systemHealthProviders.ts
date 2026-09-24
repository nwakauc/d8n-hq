import type { HqSystemHealthService } from "../../../lib/hq/types.ts";

/** Production consoles from d8n `config/deploy.production.yml`. */
const PROVIDER_HREF: Record<string, string> = {
  resend: "https://resend.com/emails",
  twilio: "https://console.twilio.com/",
  expo: "https://expo.dev/",
  r2: "https://dash.cloudflare.com/",
  cloudflare: "https://dash.cloudflare.com/",
  cloudflarer2: "https://dash.cloudflare.com/",
  openai: "https://platform.openai.com/",
};

export function providerHref(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.toLowerCase().replace(/[\s_-]+/g, "");
  return PROVIDER_HREF[key] ?? null;
}

export function providersFromEvidence(evidence: Record<string, unknown> | undefined): string[] {
  if (!evidence) return [];
  const names = new Set<string>();
  if (typeof evidence.provider === "string") names.add(evidence.provider);
  if (Array.isArray(evidence.provider)) {
    for (const entry of evidence.provider) {
      if (typeof entry === "string") names.add(entry);
    }
  }
  for (const value of Object.values(evidence)) {
    if (!value || typeof value !== "object") continue;
    const provider = (value as { provider?: unknown }).provider;
    if (typeof provider === "string") names.add(provider);
    if (Array.isArray(provider)) {
      for (const entry of provider) {
        if (typeof entry === "string") names.add(entry);
      }
    }
  }
  return [...names];
}

export function serviceProviderHref(
  key: "api" | "database" | "jobs" | "media_storage" | "notifications",
  service: HqSystemHealthService | null,
): string | null {
  if (key === "media_storage") return providerHref("r2");
  const named = providersFromEvidence(service?.evidence);
  if (named.length === 1) return providerHref(named[0]);
  return null;
}

export function thirdPartyProviderName(service: HqSystemHealthService, index: number): string {
  const named = providersFromEvidence(service.evidence);
  return named[0] ?? `Provider ${index + 1}`;
}
