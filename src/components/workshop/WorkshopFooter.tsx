import { Linkedin, Instagram, Calendar, Globe } from "lucide-react";
import { MYNTMORE_NOTION_LINK } from "@/lib/constants";

const links = [
  { icon: Linkedin, label: "TJ's LinkedIn", href: "https://www.linkedin.com/in/tejasjhaveri" },
  { icon: Instagram, label: "TJ's Instagram", href: "https://www.instagram.com/tejas_jhaveri" },
  { icon: Calendar, label: "Book a Call with TJ", href: "https://calendly.com/founder-myntmore/web" },
  { icon: Globe, label: "Myntmore", href: "https://myntmore.com" },
];

export function WorkshopFooter() {
  return (
    <footer className="mt-16 py-6 border-t border-border">
      <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-6">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <l.icon className="w-4 h-4" />
            {l.label}
          </a>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4">
        Powered by Myntmore × B2B Growth Workshop
      </p>
    </footer>
  );
}
