export type IdentifierKind = "email" | "phone";

export type PasswordAuthRequest = {
  identifier: string;
  password: string;
  device_name: string;
  /** Always "token" in this app — see tokenStore.ts for why. */
  session_mode: "hq_cookie";
};

export type PasswordAuthSessionResponse = {
  expires_at: string;
  user_id: number;
  brand: { slug: string; name: string };
  identifier?: { kind: IdentifierKind; verified: boolean; masked_destination: string };
  csrf_token?: string;
};
