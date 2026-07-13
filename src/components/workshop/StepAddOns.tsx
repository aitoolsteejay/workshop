import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini, describeGeminiError } from "@/lib/workshop-store";
import { sanitizeAIText } from "@/lib/sanitize";
import { useAutosave } from "@/hooks/use-autosave";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Check, Sparkles, Gem } from "lucide-react";

const CATEGORIES: { key: string; label: string; max: number; options: string[] }[] = [
  { key: "type", label: "Jewellery Type", max: 1, options: ["Ring", "Necklace", "Earrings", "Bracelet", "Cuff", "Brooch", "Anklet", "Pendant", "Choker", "Hair pin"] },
  { key: "style", label: "Style", max: 3, options: ["Minimalist", "Art Deco", "Bohemian", "Gothic", "Vintage", "Sculptural", "Geometric", "Nature-inspired", "Brutalist", "Celestial"] },
  { key: "material", label: "Material / Metal", max: 3, options: ["Yellow gold", "White gold", "Rose gold", "Sterling silver", "Oxidised silver", "Bronze", "Titanium", "Resin", "Mixed metals", "Recycled gold"] },
  { key: "gemstone", label: "Gemstone or Detail", max: 3, options: ["Diamond", "Emerald", "Sapphire", "Pearl", "Opal", "Turquoise", "Garnet", "No stones", "Enamel", "Seed pearls"] },
  { key: "mood", label: "Mood / Theme", max: 3, options: ["Romantic", "Edgy", "Playful", "Elegant", "Mystical", "Earthy", "Bold", "Delicate", "Futuristic", "Coastal"] },
];

interface StepAddOnsProps {
  data: any;
  onboardingData?: any;
  onSave: (data: any, opts?: { silent?: boolean }) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function StepAddOns({ data, onboardingData, onSave, onNext, onBack }: StepAddOnsProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>(
    data?.selections || { type: [], style: [], material: [], gemstone: [], mood: [] }
  );
  const [enhancedPrompt, setEnhancedPrompt] = useState(data?.enhancedPrompt || "");
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const industries: string[] = Array.isArray(onboardingData?.industry) ? onboardingData.industry : [];
  const isJewellery = industries.includes("Jewellery");

  useAutosave({ selections, enhancedPrompt }, onSave);

  const toggleTag = (catKey: string, value: string, max: number) => {
    setSelections(p => {
      const cur = p[catKey] || [];
      if (cur.includes(value)) return { ...p, [catKey]: cur.filter(x => x !== value) };
      if (max === 1) return { ...p, [catKey]: [value] };
      if (cur.length >= max) return p;
      return { ...p, [catKey]: [...cur, value] };
    });
    setEnhancedPrompt("");
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
    parts.push(`A highly detailed, photorealistic product photograph of ${article} ${leadPhrase}`);
    if (material) parts.push(`crafted in ${material.toLowerCase()}`);
    if (gemstones.length > 0) parts.push(`set with ${gemstones.join(", ").toLowerCase()}`);
    else if (noStones) parts.push("with no gemstones, a clean unadorned finish");
    if (mood) parts.push(`evoking ${/^[aeiou]/i.test(mood) ? "an" : "a"} ${mood.toLowerCase()} feeling`);
    parts.push("shot on a soft neutral background with studio lighting, ultra sharp focus, high resolution, elegant composition");
    return parts.join(", ") + ".";
  }, [selections]);

  const enhance = async () => {
    if (!basePrompt) return;
    setEnhancing(true);
    setError("");
    try {
      const prompt = `You are an expert at writing prompts for AI image generation tools (Midjourney, DALL-E, Stable Diffusion). Take this rough jewellery design brief and rewrite it into one vivid, highly detailed, professional image-generation prompt for a jewellery product photo.

Rough brief: ${basePrompt}

Keep it as ONE prompt (not multiple options), rich with visual, lighting, and material detail, written the way a professional AI-art prompt engineer would write it. Do NOT use em-dashes, asterisks, or hash signs. Return ONLY the prompt text, no quotes, no markdown, no explanation.`;
      const raw = await callGemini(prompt);
      setEnhancedPrompt(sanitizeAIText(raw.trim()));
    } catch (e: any) {
      setError(describeGeminiError(e));
    } finally {
      setEnhancing(false);
    }
  };

  const copyPrompt = () => {
    const text = enhancedPrompt || basePrompt;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "✓ Copied", duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNext = () => {
    onSave({ selections, enhancedPrompt });
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">Bonus <span className="accent-text">Add-Ons</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">Extra tools tailored to your industry</p>

      {!isJewellery ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No add-ons are available for your industry yet. Check back soon!</p>
        </div>
      ) : (
        <>
          <div className="glass-card p-6 mb-6 border-primary/30">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Gem className="w-4 h-4" />
              Jewellery Design Prompt Generator
              <InfoTooltip text="Pick a jewellery type plus any style, material, gemstone, and mood details, and we'll build an AI image-generation prompt you can use in tools like Midjourney or DALL-E to visualise the design" />
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
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Generated Prompt</h4>
              <div className="bg-secondary p-4 rounded-md">
                <p className="text-sm text-foreground whitespace-pre-wrap">{enhancedPrompt || basePrompt}</p>
              </div>
              {error && <p className="text-destructive text-xs mt-2">{error}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button onClick={enhance} disabled={enhancing} variant="outline" size="sm" className="gap-1.5 border-primary text-primary hover:bg-primary/10">
                  <Sparkles className="w-3.5 h-3.5" />
                  {enhancing ? "Enhancing…" : enhancedPrompt ? "Regenerate with AI" : "Enhance with AI"}
                </Button>
                <Button onClick={copyPrompt} variant="outline" size="sm" className="gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Prompt"}
                </Button>
              </div>
              {enhancing && <div className="mt-3"><LoadingSpinner text="Polishing your prompt..." /></div>}
            </div>
          )}
        </>
      )}

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
