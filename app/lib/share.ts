import { getSupabaseAdmin } from "@/app/lib/supabase";
import type { RiskLevel } from "@/app/lib/scamAnalysis";

export interface SharedVerdict {
  id: string;
  risk_level: RiskLevel;
  confidence: number;
  detected_type: string;
  summary: string;
}

export interface ShareInput {
  risk_level: RiskLevel;
  confidence: number;
  detected_type: string;
  summary: string;
}

const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function shortId(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < length; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}

/** Persist a verdict headline and return its short id (or null if unavailable). */
export async function createSharedVerdict(
  input: ShareInput,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const id = shortId();
  const { error } = await supabase.from("shared_verdicts").insert({
    id,
    risk_level: input.risk_level,
    confidence: Math.min(100, Math.max(0, Math.round(input.confidence) || 0)),
    detected_type: input.detected_type?.slice(0, 80) ?? "",
    summary: input.summary.slice(0, 400),
  });
  if (error) {
    console.error("Failed to create shared verdict:", error.message);
    return null;
  }
  return id;
}

export async function getSharedVerdict(
  id: string,
): Promise<SharedVerdict | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("shared_verdicts")
    .select("id, risk_level, confidence, detected_type, summary")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as SharedVerdict;
}
