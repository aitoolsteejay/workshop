import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini, describeGeminiError, AI_PARSE_ERROR_MESSAGE } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { useAutosave } from "@/hooks/use-autosave";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";
import { ArrowLeft, Copy, Check, Sparkles, ExternalLink, Camera } from "lucide-react";

const JEWELLERY_TYPES = ["Anklet", "Bracelet", "Brooch", "Choker", "Cuff", "Earrings", "Hair pin", "Necklace", "Pendant", "Ring"];

const MODELLING_STEPS = [
  "Have a clear photo of your actual jewellery piece ready, this is required for accurate results.",
  "Open Gemini and start a new chat.",
  "Gemini's built-in image generation model, nicknamed Nano Banana, works directly in the app, no separate setup needed.",
  "Attach your product photo to the chat message, then paste one of the prompts below in the same message. This tells Gemini to use your actual design instead of inventing a new one.",
  "Generate a few variations, then download your favourite for your product listing or ad creative.",
];

interface ModelPrompt {
  label: string;
  prompt: string;
}

interface StepJewelleryModellingProps {
  data: any;
  onboardingData?: any;
  onSave: (data: any, opts?: { silent?: boolean }) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function StepJewelleryModelling({ data, onboardingData, onSave, onNext, onBack }: StepJewelleryModellingProps) {
  const [modelType, setModelType] = useState<string>(data?.modelType || "");
  const [modelPrompts, setModelPrompts] = useState<ModelPrompt[]>(data?.modelPrompts || []);
  const [modelling, setModelling] = useState(false);
  const [modelError, setModelError] = useState("");
  const [copiedModelIdx, setCopiedModelIdx] = useState<number | null>(null);
  const { toast } = useToast();

  useAutosave({ modelType, modelPrompts }, onSave);

  const generateModelPrompts = async () => {
    if (!modelType) return;
    setModelling(true);
    setModelError("");
    try {
      const typeName = modelType === "Earrings" ? "earrings" : modelType.toLowerCase();
      const prompt = `You are an expert at writing prompts for Gemini's native image generation model (nicknamed "Nano Banana") to create photorealistic images of jewellery being worn by a real person, using a reference photo of the actual piece attached to the same chat message.

Write exactly 4 distinct, richly detailed image-generation prompts for a ${typeName}, one for each of these categories, in this exact order:
1. "On an Indian Model": the ${typeName} styled on an Indian female model, elegant and natural.
2. "Close-Up Detail": a tight macro close-up focused on the ${typeName} itself as worn, showing its craftsmanship and fine detail.
3. "Street Style Lifestyle": a candid lifestyle shot of a person wearing the ${typeName} while walking on a city street, natural movement and setting.
4. "Fun & Creative": one playful, imaginative concept, for example a foreign tourist wearing the ${typeName} together with Indian bridal wear, the ${typeName} floating in space, the ${typeName} in front of the Eiffel Tower, or the ${typeName} resting on an open treasure chest. Pick one such idea or something similarly fun and unexpected. Keep it lighthearted, tasteful, and appropriate, never vulgar, offensive, or in poor taste.

CRITICAL: every single prompt must explicitly instruct the image model to use the EXACT jewellery piece shown in the reference photo attached to the chat message, preserving its exact design, metal, gemstones, and proportions without altering or reinventing it. Make this instruction explicit within each prompt itself, for example wording like "using the exact ${typeName} shown in the attached reference photo, keeping its design, metal, and stones unchanged,".

Each prompt must be a single flowing paragraph of at least 60 words. For each prompt, also describe: which exact body part or area the ${typeName} is worn on (where relevant), a natural and inclusive description of the model (skin tone, styling) without naming any real celebrity or public figure, the camera angle and framing, the lighting setup, the background or setting, and the overall mood. Do NOT use em-dashes, asterisks, or hash signs.

Return ONLY a raw JSON array of exactly 4 objects, nothing else, no markdown code fences, in this exact order, each shaped like {"label": string, "prompt": string}. Use these exact labels in order: "On an Indian Model", "Close-Up Detail", "Street Style Lifestyle", "Fun & Creative".`;
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
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((p: any) => p?.label && p?.prompt)) {
        setModelError(AI_PARSE_ERROR_MESSAGE);
        setModelling(false);
        return;
      }
      setModelPrompts(sanitizeAIOutput(parsed.map((p: any) => ({ label: String(p.label).trim(), prompt: String(p.prompt).trim() }))));
    } catch (e: any) {
      setModelError(describeGeminiError(e));
    } finally {
      setModelling(false);
    }
  };

  const copyModelPrompt = async (text: string, idx: number) => {
    if (!text) return;
    await copyToClipboard(text);
    setCopiedModelIdx(idx);
    toast({ title: "✓ Copied", duration: 2000 });
    setTimeout(() => setCopiedModelIdx(null), 2000);
  };

  const handleNext = () => {
    onSave({ modelType, modelPrompts });
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">AI Jewellery <span className="accent-text">Modelling</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">Generate photos of your jewellery being worn by a person</p>

      <section className="rounded-xl border-2 border-primary/30 p-6">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            AI Jewellery Modelling
            <InfoTooltip text="Pick a jewellery type and we'll write detailed prompts for Gemini's image model (Nano Banana) so you can generate photos of that piece being worn by a person" />
          </h3>
          <p className="text-sm text-muted-foreground">
            Pick a jewellery type below to get 4 categorised prompts (on an Indian model, close-up, street style, and a fun creative shot) ready to paste into Gemini alongside your reference photo.
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{p.label}</span>
                    <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{p.prompt}</p>
                    <div className="mt-3">
                      <Button onClick={() => copyModelPrompt(p.prompt, i)} variant="outline" size="sm" className="gap-1.5">
                        {copiedModelIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedModelIdx === i ? "Copied!" : "Copy Prompt"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {modelPrompts.length > 0 && (
              <Button onClick={generateModelPrompts} disabled={modelling} variant="ghost" className="w-full mt-5 text-muted-foreground">Regenerate Prompts</Button>
            )}
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
