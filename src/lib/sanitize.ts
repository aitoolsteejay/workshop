/**
 * Sanitize AI-generated text: remove em-dashes and asterisks.
 */
export function sanitizeAIText(text: string): string {
  if (!text) return text;
  return text
    .replace(/—/g, ",")
    .replace(/\*/g, "");
}

/**
 * Deep-sanitize an object: recursively clean all string values.
 */
export function sanitizeAIOutput(obj: any): any {
  if (typeof obj === "string") return sanitizeAIText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeAIOutput);
  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = sanitizeAIOutput(v);
    }
    return result;
  }
  return obj;
}
