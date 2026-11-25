export const CONTENT_CHANNELS = ["LinkedIn", "Cold email", "Instagram", "YouTube / video", "Blog / SEO", "Newsletter"];
export const CONTENT_GOALS = ["Book more meetings", "Build authority", "Grow audience", "Launch an offer"];
export const CONTENT_FORMATS = ["Text post", "Carousel", "Short video", "Long video", "Newsletter", "Blog post", "Email", "Poll", "Story"];

// Parses a JSON object out of a model reply that may be wrapped in text or code fences.
export function parseJsonObject(raw: string): any | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw);
  } catch {
    return null;
  }
}
