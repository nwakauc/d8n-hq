export type IdentifierKind = "email" | "phone";

export type PasswordAuthRequest = {
  identifier: string;
  password: string;
  device_name: string;
  /** Always "token" in this app — see tokenStore.ts for why. */
  session_mode: "token";
};

export type PasswordAuthSessionResponse = {
  token: string;
  token_type: "Bearer";
  expires_at: string;
  user_id: number;
  brand: { slug: string; name: string };
  identifier: { kind: IdentifierKind; verified: boolean; masked_destination: string };
};
