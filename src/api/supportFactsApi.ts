import { brandApi } from "@/lib/valuedesignApi";
import type { ScFacts } from "@/data/faqTopics";

/** Live SuperCoin rules (database-backed), used to fill numbers in FAQ answers. */
export const fetchScFacts = async (): Promise<ScFacts | null> => {
  try {
    const r = await brandApi.get("/v1/support/facts/supercoin");
    return r.data as ScFacts;
  } catch {
    return null;
  }
};
