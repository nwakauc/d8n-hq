import type { HqCurrentOperator } from "../../lib/hq/types.ts";

export type HqOperatorContextValue =
  | {
      status: "loading";
      brandSlug: string | null;
      brandName: string | null;
      operatorLabel: string;
      operator: null;
      errorMessage: null;
      refresh: () => Promise<void>;
    }
  | {
      status: "ready";
      brandSlug: string;
      brandName: string | null;
      operatorLabel: string;
      operator: HqCurrentOperator;
      errorMessage: null;
      refresh: () => Promise<void>;
    }
  | {
      status: "unavailable";
      brandSlug: string | null;
      brandName: string | null;
      operatorLabel: string;
      operator: null;
      errorMessage: string;
      refresh: () => Promise<void>;
    };
