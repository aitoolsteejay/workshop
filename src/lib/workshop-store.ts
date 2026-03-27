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

async function fetchGemini(prompt: string, systemPrompt?: string): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ prompt, systemPrompt }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI call failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export async function callGemini(prompt: string, systemPrompt?: string): Promise<string> {
  // Deduplicate: if the same prompt is already in-flight, return that promise
  const key = prompt.slice(0, 100);
  const existing = activeRequests.get(key);
  if (existing) return existing;

  const execute = async (): Promise<string> => {
    let lastError: Error | null = null;

    // Attempt with full prompt (up to 3 retries)
    for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
      try {
        return await fetchGemini(prompt, systemPrompt);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Gemini attempt ${attempt + 1} failed:`, lastError.message);
        if (attempt < RETRY_DELAYS.length - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        }
      }
    }

    // Fallback: retry once with a simplified/truncated prompt
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
