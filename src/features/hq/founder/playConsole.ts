/** Date9ja Android app dashboard on Play Console (founder-provided). */
export const DATE9JA_PLAY_CONSOLE_URL =
  "https://play.google.com/console/u/0/developers/6738475847122434215/app/4974818774967618310/app-dashboard";

export const EXPO_PUSH_CONSOLE_URL = "https://expo.dev/";

export function playConsoleUrlForBrand(brandSlug: string | null | undefined): string | null {
  if (brandSlug === "date9ja") return DATE9JA_PLAY_CONSOLE_URL;
  return null;
}
