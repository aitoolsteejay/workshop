import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini, describeGeminiError, AI_PARSE_ERROR_MESSAGE } from "@/lib/workshop-store";
import { sanitizeAIText, sanitizeAIOutput } from "@/lib/sanitize";
import { useAutosave } from "@/hooks/use-autosave";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Check, Sparkles, Gem, ExternalLink, Camera } from "lucide-react";

const JEWELLERY_TYPES = ["Ring", "Necklace", "Earrings", "Bracelet", "Cuff", "Brooch", "Anklet", "Pendant", "Choker", "Hair pin"];

const CATEGORIES: { key: string; label: string; max: number; options: string[] }[] = [
  { key: "type", label: "Jewellery Type", max: 1, options: JEWELLERY_TYPES },
  { key: "style", label: "Style", max: 3, options: ["Minimalist", "Art Deco", "Bohemian", "Gothic", "Vintage", "Sculptural", "Geometric", "Nature-inspired", "Brutalist", "Celestial"] },
  { key: "material", label: "Material / Metal", max: 3, options: ["Yellow gold", "White gold", "Rose gold", "Sterling silver", "Oxidised silver", "Bronze", "Titanium", "Resin", "Mixed metals", "Recycled gold"] },
  { key: "gemstone", label: "Gemstone or Detail", max: 3, options: ["Diamond", "Emerald", "Sapphire", "Pearl", "Opal", "Turquoise", "Garnet", "No stones", "Enamel", "Seed pearls"] },
  { key: "mood", label: "Mood / Theme", max: 3, options: ["Romantic", "Edgy", "Playful", "Elegant", "Mystical", "Earthy", "Bold", "Delicate", "Futuristic", "Coastal"] },
];

const MODELLING_STEPS = [
  "Have a clear photo of your actual jewellery piece ready (recommended, not required).",
  "Open Gemini and start a new chat.",
  "Gemini's built-in image generation model, nicknamed Nano Banana, works directly in the app, no separate setup needed.",
  "Paste one of the prompts below. For best results, attach your product photo in the same message so Gemini uses your actual design.",
  "Generate a few variations, then download your favourite for your product listing or ad creative.",
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
  const [modelType, setModelType] = useState<string>(data?.modelType || "");
  const [modelPrompts, setModelPrompts] = useState<string[]>(data?.modelPrompts || []);
  const [modelling, setModelling] = useState(false);
  const [modelError, setModelError] = useState("");
  const [copiedModelIdx, setCopiedModelIdx] = useState<number | null>(null);
  const { toast } = useToast();

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

  useAutosave({ selections, enhancedPrompt, basePrompt, modelType, modelPrompts }, onSave);

  const enhance = async () => {
    if (!basePrompt) return;
    setEnhancing(true);
    setError("");
    try {
      const prompt = `You are an expert AI-art prompt engineer who writes prompts for AI image generation tools (Midjourney, DALL-E, Stable Diffusion, Gemini). Take this rough jewellery design brief and rewrite it into one vivid, richly detailed, professional image-generation prompt for a jewellery product photo.

Rough brief: ${basePrompt}

Write ONE single flowing prompt of at least 120 words (not multiple options, not a list). It must read as one continuous descriptive passage and cover all of the following in detail: the subject and its materials and craftsmanship, the camera and composition (lens type, framing, angle, depth of field), the lighting setup (key light, fill, rim, how it interacts with the metal and stones), the background and setting, the overall mood and styling, and technical quality descriptors (resolution, sharpness, realism). Use precise, vivid, sensory language the way a professional product photographer or prompt engineer would, technical photography terms are welcome and encouraged here since this is for an image generator, not for a general reader. Do NOT use em-dashes, asterisks, or hash signs. Return ONLY the prompt text, no quotes, no markdown, no explanation.`;
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

  const generateModelPrompts = async () => {
    if (!modelType) return;
    setModelling(true);
    setModelError("");
    try {
      const typeName = modelType === "Earrings" ? "earrings" : modelType.toLowerCase();
      const prompt = `You are an expert at writing prompts for Gemini's native image generation model (nicknamed "Nano Banana") to create photorealistic images of jewellery being worn by a real person.

Write 5 distinct, richly detailed image-generation prompts for showing a ${typeName} being modelled by a person. Each prompt must be a single flowing paragraph of at least 60 words. Together, the 5 prompts should cover a good mix of shot types: for example a clean studio close-up on the body part, a natural everyday lifestyle shot, an outdoor or editorial styled shot, a close macro detail shot, and a shot with styled hair, makeup, and outfit context.

For each prompt, describe: which exact body part or area the ${typeName} is worn on, a natural and inclusive description of the model (skin tone, styling) without naming any real celebrity or public figure, the camera angle and framing, the lighting setup, the background or setting, and the overall mood. Do NOT use em-dashes, asterisks, or hash signs.

Return ONLY a raw JSON array of exactly 5 strings, nothing else, no markdown code fences. Example format: ["prompt one text", "prompt two text", "prompt three text", "prompt four text", "prompt five text"]`;
      const raw = await callGemini(prompt);
      let parsed;
      try {
        const match = raw.match(/\[[\s\S]*\]/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch {
        setModelError(AI_PARSE_ERROR_MESSAGE);
        setModelling(false);
        return;
      }
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setModelError(AI_PARSE_ERROR_MESSAGE);
        setModelling(false);
        return;
      }
      setModelPrompts(sanitizeAIOutput(parsed.map((p: any) => String(p).trim())));
    } catch (e: any) {
      setModelError(describeGeminiError(e));
    } finally {
      setModelling(false);
    }
  };

  const copyModelPrompt = (text: string, idx: number) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedModelIdx(idx);
    toast({ title: "✓ Copied", duration: 2000 });
    setTimeout(() => setCopiedModelIdx(null), 2000);
  };

  const handleNext = () => {
    onSave({ selections, enhancedPrompt, basePrompt, modelType, modelPrompts });
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">Bonus <span className="accent-text">Add-Ons</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">Extra tools to help bring your business to life</p>

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
          <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3">
            Open Gemini <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      <div className="glass-card p-6 mt-10 mb-6 border-primary/30">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Camera className="w-4 h-4" />
          AI Jewellery Modelling
          <InfoTooltip text="Pick a jewellery type and we'll write detailed prompts for Gemini's image model (Nano Banana) so you can generate photos of that piece being worn by a person" />
        </h3>
        <p className="text-sm text-muted-foreground">
          Pick a jewellery type below to get 5 detailed prompts for showing it modelled by a person, ready to paste into Gemini.
        </p>
      </div>

      <div className="glass-card p-6">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Jewellery Type</h4>
        <div className="flex flex-wrap gap-2">
          {JEWELLERY_TYPES.map(opt => (
            <button key={opt} type="button" onClick={() => { setModelType(opt); setModelPrompts([]); }}
              className={`text-sm px-4 py-2 rounded-md border transition-all ${
                modelType === opt ? "tag-selected border-primary" : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground"
              }`}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {modelType && (
        <div className="glass-card p-6 mt-6">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">How to Use This</h4>
          <ol className="space-y-2 mb-4">
            {MODELLING_STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            Open Gemini <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="mt-5">
            <Button onClick={generateModelPrompts} disabled={modelling} className="accent-bg hover:opacity-90 gap-1.5">
              <Sparkles className="w-4 h-4" />
              {modelling ? "Generating…" : modelPrompts.length > 0 ? "Regenerate Prompts" : "Generate Modelling Prompts"}
            </Button>
            {modelError && <p className="text-destructive text-xs mt-2">{modelError}</p>}
            {modelling && <div className="mt-3"><LoadingSpinner text="Writing detailed modelling prompts..." /></div>}
          </div>

          {modelPrompts.length > 0 && (
            <div className="space-y-3 mt-5">
              {modelPrompts.map((p, i) => (
                <div key={i} className="bg-secondary p-4 rounded-md">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{p}</p>
                  <div className="mt-3">
                    <Button onClick={() => copyModelPrompt(p, i)} variant="outline" size="sm" className="gap-1.5">
                      {copiedModelIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedModelIdx === i ? "Copied!" : "Copy Prompt"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
