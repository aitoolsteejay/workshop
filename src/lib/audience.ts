// Shared colour coding for audience-type tags across the workshop: blue for B2B, green for D2C.
export function audienceBadgeClass(type?: string): string {
  if (type === "B2B") return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
  if (type === "D2C") return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
  return "bg-secondary text-muted-foreground";
}
