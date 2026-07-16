import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "./InfoTooltip";
import { useAutosave } from "@/hooks/use-autosave";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";
import { ArrowLeft, Copy, Check, Gem, ExternalLink } from "lucide-react";

const JEWELLERY_TYPES = ["Anklet", "Bracelet", "Brooch", "Choker", "Cuff", "Earrings", "Hair pin", "Necklace", "Pendant", "Ring"];

const CATEGORIES: { key: string; label: string; max: number; options: string[] }[] = [
  { key: "type", label: "Jewellery Type", max: 1, options: JEWELLERY_TYPES },
  { key: "style", label: "Style", max: 3, options: ["Art Deco", "Bohemian", "Brutalist", "Celestial", "Geometric", "Gothic", "Minimalist", "Nature-inspired", "Sculptural", "Vintage"] },
  { key: "material", label: "Material / Metal", max: 3, options: ["Bronze", "Mixed metals", "Oxidised silver", "Recycled gold", "Resin", "Rose gold", "Sterling silver", "Titanium", "White gold", "Yellow gold"] },
  { key: "gemstone", label: "Gemstone or Detail", max: 3, options: ["Diamond", "Emerald", "Enamel", "Garnet", "No stones", "Opal", "Pearl", "Sapphire", "Seed pearls", "Turquoise"] },
  { key: "mood", label: "Mood / Theme", max: 3, options: ["Bold", "Coastal", "Delicate", "Earthy", "Edgy", "Elegant", "Futuristic", "Mystical", "Playful", "Romantic"] },
];

const DESIGN_STEPS = [
  "Pick a jewellery type plus any style, material, gemstone, and mood details below.",
  "Open Gemini and start a new chat.",
  "Gemini's built-in image generation model, nicknamed Nano Banana, works directly in the app, no separate setup needed.",
  "Paste the generated prompt below into the chat.",
  "Generate a few variations, then download your favourite to visualise the design or share it with your jeweller.",
];

interface StepJewelleryDesignProps {
  data: any;
  onboardingData?: any;
  onSave: (data: any, opts?: { silent?: boolean }) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function StepJewelleryDesign({ data, onboardingData, onSave, onNext, onBack }: StepJewelleryDesignProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>(
    data?.selections || { type: [], style: [], material: [], gemstone: [], mood: [] }
  );
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const toggleTag = (catKey: string, value: string, max: number) => {
    setSelections(p => {
      const cur = p[catKey] || [];
      if (cur.includes(value)) return { ...p, [catKey]: cur.filter(x => x !== value) };
      if (max === 1) return { ...p, [catKey]: [value] };
      if (cur.length >= max) return p;
      return { ...p, [catKey]: [...cur, value] };
    });
  };

  const basePrompt = useMemo(() => {
    const type = selections.type?.[0];
    if (!type) return "";
    const style = (selections.style || []).join(" and ");
    const material = (selections.material || []).join(", ");
    const gemstones = (selections.gemstone || []).filter(g => g !== "No stones");
    const noStones = (selections.gemstone || []).includes("No stones");
    const mood = (selections.mood || []).join(", ");

    const typeName = type === "Earrings" ? "pair of earrings" : type.toLowerCase();
    const leadPhrase = style ? `${style.toLowerCase()} ${typeName}` : typeName;
    const article = /^[aeiou]/i.test(leadPhrase) ? "an" : "a";

    const parts: string[] = [];
    parts.push(`A highly detailed, photorealistic macro product photograph of ${article} ${leadPhrase}`);
    if (material) parts.push(`crafted in ${material.toLowerCase()}, with visible fine metalwork and a polished, true-to-life surface finish`);
    if (gemstones.length > 0) parts.push(`set with ${gemstones.join(", ").toLowerCase()}, each stone catching and refracting light with realistic sparkle and depth`);
    else if (noStones) parts.push("with no gemstones, a clean unadorned finish that lets the form and texture of the metal speak for itself");
    if (mood) parts.push(`styled to evoke ${/^[aeiou]/i.test(mood) ? "an" : "a"} ${mood.toLowerCase()} feeling through its silhouette, texture, and finish`);
    parts.push("shot on a professional camera with a macro lens, shallow depth of field with the piece in tack-sharp focus and a gently blurred foreground and background");
    parts.push("three-point studio lighting setup with a soft key light, a subtle fill light to open up shadows, and a rim light to trace the edges and highlight the material's shine");
    parts.push("set on a soft neutral seamless background with a gentle gradient and a faint natural shadow beneath the piece for grounding");
    parts.push("centered, elegant product composition, ultra sharp focus, 8k resolution, commercial jewellery catalogue quality");
    return parts.join(", ") + ".";
  }, [selections]);

  useAutosave({ selections, basePrompt }, onSave);

  const copyPrompt = async () => {
    if (!basePrompt) return;
    await copyToClipboard(basePrompt);
    setCopied(true);
    toast({ title: "✓ Copied", duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNext = () => {
    onSave({ selections, basePrompt });
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">Jewellery Design <span className="accent-text">Prompt Generator</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">Build an AI image-generation prompt to visualise a new jewellery design</p>

      <section className="rounded-xl border-2 border-primary/30 p-6">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Gem className="w-4 h-4" />
            Jewellery Design Prompt Generator
            <InfoTooltip text="Pick a jewellery type plus any style, material, gemstone, and mood details, and we'll build an AI image-generation prompt you can use in Gemini to visualise the design" />
          </h3>
          <p className="text-sm text-muted-foreground">
            Select a piece type and up to 3 options in each other category to build a design prompt for AI image generators.
          </p>
        </div>

        <div className="space-y-6">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className="glass-card p-6">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat.label}</h4>
              <div className="flex flex-wrap gap-2">
                {cat.options.map(opt => {
                  const selected = (selections[cat.key] || []).includes(opt);
                  return (
                    <button key={opt} type="button" onClick={() => toggleTag(cat.key, opt, cat.max)}
                      className={`text-sm px-4 py-2 rounded-md border transition-all ${
                        selected ? "tag-selected border-primary" : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground"
                      }`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {basePrompt && (
          <div className="glass-card p-6 mt-6">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">How to Use This</h4>
            <ol className="space-y-2 mb-4">
              {DESIGN_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-5">
              Open Gemini <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Generated Prompt</h4>
            <div className="bg-secondary p-4 rounded-md">
              <p className="text-sm text-foreground whitespace-pre-wrap">{basePrompt}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button onClick={copyPrompt} variant="outline" size="sm" className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy Prompt"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="mt-8 flex items-center justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        ) : <div />}
        <Button onClick={handleNext} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
          Next Step →
        </Button>
      </div>
    </motion.div>
  );
}
