import { supabase } from "./supabase";


const STORAGE_KEY = "workshop_session_id";
const BACKUP_KEY = "workshop_backup";

export function getSessionId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function createSessionId(): string {
  const id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(BACKUP_KEY);
}

export function saveBackup(data: any) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
  } catch {}
}

export function loadBackup(): any | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function createSession(name: string, email: string, phone?: string): Promise<string> {
  const sessionId = createSessionId();
  const row: Record<string, any> = {
    session_id: sessionId,
    user_name: name,
    user_email: email,
    current_step: 0,
  };
  if (phone) row.user_phone = phone;
  const { error } = await supabase.from("workshop_sessions").insert(row);
  if (error) {
    console.error("Failed to create session:", error);
  }
  saveBackup({ ...row });
  return sessionId;
}

export async function loadSession(sessionId: string) {
  const { data, error } = await supabase
    .from("workshop_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    console.error("Failed to load from Supabase:", error);
    return loadBackup();
  }
  saveBackup(data);
  return data;
}

export async function saveProgress(sessionId: string, updates: Record<string, any>) {
  const withTimestamp = { ...updates, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from("workshop_sessions")
    .update(withTimestamp)
    .eq("session_id", sessionId);
  
  if (error) {
    console.error("Save to Supabase failed:", error);
  }
  
  // Always update local backup
  const backup = loadBackup() || {};
  saveBackup({ ...backup, ...withTimestamp });
}

const RETRY_DELAYS = [1000, 2000, 4000];
const activeRequests = new Map<string, Promise<string>>();

function truncatePrompt(prompt: string, maxLen = 2000): string {
  if (prompt.length <= maxLen) return prompt;
  return prompt.slice(0, maxLen) + "\n\n[Truncated for reliability]";
}

export interface GeminiImage {
  mimeType: string;
  data: string; // base64, no data: prefix
}

async function fetchGemini(prompt: string, systemPrompt?: string, image?: GeminiImage): Promise<string> {
  const resp = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemPrompt, image }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI call failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export async function callGemini(prompt: string, systemPrompt?: string, image?: GeminiImage): Promise<string> {
  // Deduplicate: if the exact same prompt is already in-flight, return that promise.
  // Keyed on the full prompt (not a prefix) since every step's prompt shares a long
  // identical instructional preamble before any user-specific data appears.
  const key = `${prompt} ${systemPrompt || ""} ${image?.data ? image.data.slice(0, 100) : ""}`;
  const existing = activeRequests.get(key);
  if (existing) return existing;

  const execute = async (): Promise<string> => {
    let lastError: Error | null = null;

    // Attempt with full prompt (up to 3 retries)
    for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
      try {
        return await fetchGemini(prompt, systemPrompt, image);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Gemini attempt ${attempt + 1} failed:`, lastError.message);
        if (attempt < RETRY_DELAYS.length - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        }
      }
    }

    // Fallback: retry once with a simplified/truncated prompt (image dropped to save payload size)
    try {
      console.warn("Retrying with simplified prompt...");
      return await fetchGemini(truncatePrompt(prompt), systemPrompt);
    } catch (err) {
      console.error("Simplified prompt also failed:", err);
    }

    throw lastError || new Error("Generation failed after all retries");
  };

  const promise = execute().finally(() => activeRequests.delete(key));
  activeRequests.set(key, promise);
  return promise;
}

/**
 * Turns a callGemini() rejection into a specific, user-facing message so
 * "the AI service is misconfigured" (e.g. missing GEMINI_API_KEY on Vercel)
 * reads differently from "the request timed out" or a generic failure,
 * instead of every failure mode collapsing into the same unhelpful text.
 */
export function describeGeminiError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "timeout") return "This is taking too long. Please try again.";
  if (msg.includes("GEMINI_API_KEY")) return "The AI service isn't configured. Please check the GEMINI_API_KEY setup in Vercel.";
  const statusMatch = msg.match(/^AI call failed: (\d+)/);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    if (status === 429) return "Rate limited. Please try again in a moment.";
    return "Could not reach the AI service. Please try again in a moment.";
  }
  return "Something went wrong. Please try again.";
}

export const AI_PARSE_ERROR_MESSAGE = "The AI response could not be read. Please try again.";
