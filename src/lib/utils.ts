import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Joins a string-array field (or passes through a plain string) for interpolation into an AI prompt. */
export function joinField(value: any): string {
  return Array.isArray(value) ? value.join(", ") : (value || "");
}
