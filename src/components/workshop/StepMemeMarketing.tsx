import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini, describeGeminiError, AI_PARSE_ERROR_MESSAGE } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { copyToClipboard } from "@/lib/clipboard";
import { NO_JARGON_RULE, PERSONALISATION_RULE, GEO_AWARENESS_RULE, BUSINESS_TYPE_RULE } from "@/lib/prompt-rules";
import { joinField } from "@/lib/utils";
import { audienceBadgeClass } from "@/lib/audience";
import { MEME_TEMPLATES, fillMemePrompt } from "@/lib/meme-templates";
import { parseJsonObject } from "@/lib/content-options";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { ArrowLeft, Check, Copy, Laugh } from "lucide-react";

const TONES = ["Witty", "Relatable", "Bold", "Friendly"];

interface MemeIdea {
  caption: string;
  caption2?: string;
  painPoint: string;
  linkedinPost: string;
}

interface StepMemeProps {
  data: any;
  icpData: any;
  valuePropData: any;
  profileData: any;
  onboardingData: any;
  seedCaption?: string;
  onSave: (data: any, opts?: { silent?: boolean }) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function StepMemeMarketing({ data, icpData, valuePropData, profileData, onboardingData, seedCaption, onSave, onNext, onBack }: StepMemeProps) {
  const [icpIndex, setIcpIndex] = useState<number>(data?.icpIndex ?? 0);
  const [templateId, setTemplateId] = useState<string>(data?.templateId || MEME_TEMPLATES[0].id);
  const [tone, setTone] = useState<string>(data?.tone || "Witty");
  const [angle, setAngle] = useState<string>(seedCaption || data?.angle || "");
  const [memes, setMemes] = useState<MemeIdea[] | null>(data?.memes || null);
  const [selected, setSelected] = useState<number>(data?.selected ?? 0);
  const [slotValues, setSlotValues] = useState<Record<string, string>>(data?.slotValues || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const generationIdRef = useRef(0);

  useAutosave({ icpIndex, templateId, tone, angle, memes, selected, slotValues }, onSave);

  // A caption sent over from the Content Ideas step ("Make this meme") becomes the angle.
  useEffect(() => {
    if (seedCaption) setAngle(seedCaption);
  }, [seedCaption]);

  const icps = icpData?.result || [];
  const icp = icps[icpIndex] || icps[0];
  const vps = valuePropData?.result || [];
  const offer = profileData?.coreOffer || icpData?.offer || "";
  const company = profileData?.company || "";
  const industry = joinField(onboardingData?.industry);
  const businessType = joinField(onboardingData?.businessType);
  const sellingTo = joinField(onboardingData?.sellingTo);
  const template = MEME_TEMPLATES.find(t => t.id === templateId) || MEME_TEMPLATES[0];
  const twoLines = template.captionCount === 2;

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    setMemes(null);
    setSelected(0);
    setSlotValues({});
  };

  const generate = useCallback(async () => {
    if (!icp) return;
    const currentGenId = ++generationIdRef.current;
    setError("");
    setLoading(true);
    setMemes(null);

    const topVP = vps[0] ? `${vps[0].corePromise || vps[0].desiredOutcome}` : offer;
    const prompt = `You write meme captions for founders and marketers to post on social media, so their feed gets shares and replies from the exact customers they want.

${NO_JARGON_RULE}

${PERSONALISATION_RULE}

${GEO_AWARENESS_RULE}

${BUSINESS_TYPE_RULE}

- Company: ${company || "Not specified"}
- Offer: ${offer}
- Value Proposition: ${topVP}
- Selling To: ${sellingTo || "Not specified"}
- Business Type: ${businessType || "Not specified"}
- Industry: ${industry}
- Target customer: ${icp.name}. Audience Type: ${icp.audienceType || (sellingTo === "D2C" ? "D2C" : "B2B")}. Pain Points: ${(icp.painPoints || []).slice(0, 5).join(", ")}. Psychology: ${icp.psychology || ""}. Where they spend time: ${Array.isArray(icp.whereTheyHangOut) ? icp.whereTheyHangOut.join(", ") : ""}. Geography: ${icp.geographyContext || "Not specified"}
- Tone: ${tone}
${angle.trim() ? `- Point the user wants to make: ${angle.trim()}` : ""}

MEME FORMAT: "${template.name}". The feeling it carries: ${template.feeling}. It works best for: ${template.bestFor}.

Write exactly 6 distinct meme ideas for this format, all aimed at this one target customer.

RULES:
- ${twoLines
      ? 'Each idea has two lines. "caption" is the thing being rejected (the old, annoying way). "caption2" is the better thing being approved. Each line is at most 8 words.'
      : 'Each idea has one caption of at most 10 words. Do not fill "caption2".'}
- Short captions only. Image tools misspell long text.
- Every caption must come from a real pain, frustration or habit this specific target customer would recognise. Never write a caption that could fit any company.
- No hashtags, no emojis, no quotation marks inside a caption.
- "painPoint" is the real frustration behind the joke, in under 12 words.
- "linkedinPost" is a 2 to 3 sentence social post to publish with the meme. It must end with a low-pressure question that invites a comment. Use the requested tone.
- Do NOT use em-dashes, asterisks, or hash signs in any output.

Return ONLY valid JSON (no markdown):
{ "memes": [ { "caption": string, "caption2": string (only for two-line formats), "painPoint": string, "linkedinPost": string } ] }`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = (await Promise.race([callGemini(prompt), timeoutP])) as string;
      if (currentGenId !== generationIdRef.current) return;

      const parsed = parseJsonObject(raw);
      if (!parsed || !Array.isArray(parsed.memes)) {
        setError(AI_PARSE_ERROR_MESSAGE);
        setLoading(false);
        return;
      }
      const clean = sanitizeAIOutput(parsed);
      const list: MemeIdea[] = clean.memes
        .slice(0, 6)
        .map((m: any) => ({
          caption: String(m?.caption ?? "").replace(/["“”]/g, "").trim(),
          caption2: twoLines ? String(m?.caption2 ?? "").replace(/["“”]/g, "").trim() : undefined,
          painPoint: String(m?.painPoint ?? "").trim(),
          linkedinPost: String(m?.linkedinPost ?? "").trim(),
        }))
        .filter((m: MemeIdea) => m.caption && (!twoLines || m.caption2));
      if (list.length === 0) {
        setError(AI_PARSE_ERROR_MESSAGE);
        setLoading(false);
        return;
      }
      setMemes(list);
      setSelected(0);
      onSave({ icpIndex, templateId, tone, angle, memes: list, selected: 0, slotValues });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      if (currentGenId !== generationIdRef.current) return;
      setError(describeGeminiError(e));
    } finally {
      if (currentGenId === generationIdRef.current) setLoading(false);
    }
  }, [icp, vps, offer, company, industry, businessType, sellingTo, tone, angle, template, twoLines, icpIndex, templateId, slotValues, onSave, toast]);

  const copy = async (text: string, key: string, message: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    toast({ title: message, duration: 2000 });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const chosen = memes ? memes[selected] : null;
  const finalPrompt = chosen
    ? fillMemePrompt(template, {
        ...Object.fromEntries(template.slots.map(s => [s.key, slotValues[s.key] || s.defaultValue])),
        caption: chosen.caption,
        caption2: chosen.caption2 ?? "",
      })
    : "";

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">Meme <span className="accent-text">Marketing</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">Captions built from your target customer's real frustrations, plus a ready-to-use image prompt</p>

      {icps.length === 0 && (
        <div className="glass-card p-5 mb-6 text-sm text-muted-foreground">
          Build your target customers in step 3 first. This step uses them to write captions that fit.
        </div>
      )}

      {/* Target customer */}
      {icps.length > 0 && (
        <div className="glass-card p-5 mb-4">
          <label className="text-sm text-muted-foreground flex items-center gap-1">
            Who is this meme for?
            <InfoTooltip text="Pulled from the target customers you built earlier in the workshop" />
          </label>
          <div className="mt-2 flex gap-1 flex-wrap">
            {icps.map((c: any, idx: number) => (
              <button key={idx} onClick={() => { setIcpIndex(idx); setMemes(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${icpIndex === idx ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {c.name || `ICP ${idx + 1}`}
                {c.audienceType && (
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${audienceBadgeClass(c.audienceType)}`}>{c.audienceType}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Format */}
      <div className="glass-card p-5 mb-4">
        <label className="text-sm text-muted-foreground">Meme format</label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MEME_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => chooseTemplate(t.id)}
              className={`text-left rounded-md border p-4 transition-all ${templateId === t.id ? "tag-selected border-primary" : "bg-secondary border-border hover:border-muted-foreground"}`}>
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.feeling}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5"><span className="font-semibold">Best for:</span> {t.bestFor}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tone + angle */}
      <div className="glass-card p-5 mb-6">
        <label className="text-sm text-muted-foreground">Tone</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {TONES.map(t => (
            <button key={t} onClick={() => setTone(t)}
              className={`text-sm px-4 py-2 rounded-md border transition-all ${tone === t ? "tag-selected border-primary" : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <label className="text-sm text-muted-foreground mt-4 block">Point you want to make (optional)</label>
        <Input className="mt-1.5 bg-secondary" maxLength={300} value={angle} onChange={e => setAngle(e.target.value)}
          placeholder="e.g. Most follow-ups get ignored because they just say 'checking in'" />
        <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold mt-4" disabled={loading || !icp}>
          {memes ? "Regenerate Captions" : "Generate Captions"}
        </Button>
      </div>

      {loading && <LoadingSpinner text="Writing your captions..." />}
      {error && (
        <div className="glass-card p-5 mb-4 text-center">
          <p className="text-destructive text-sm mb-3">{error}</p>
          <Button onClick={generate} variant="ghost" className="text-muted-foreground">Retry</Button>
        </div>
      )}

      {memes && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Choose a caption</h3>
          {memes.map((m, idx) => {
            const active = idx === selected;
            return (
              <div key={idx} className={`glass-card p-5 ${active ? "border-2 border-primary" : ""}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Laugh className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Meme {idx + 1}</span>
                  </div>
                  <button onClick={() => copy(m.caption2 ? `${m.caption}\n${m.caption2}` : m.caption, `c${idx}`, "Caption copied")}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" aria-label="Copy caption">
                    {copiedKey === `c${idx}` ? <><Check className="w-3.5 h-3.5 text-primary" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <p className="text-base font-bold">{m.caption}</p>
                {m.caption2 && <p className="text-base font-bold accent-text">{m.caption2}</p>}
                <p className="text-xs text-muted-foreground mt-1.5">The pain behind it: {m.painPoint}</p>
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Post to go with it</span>
                  <p className="text-sm mt-1 whitespace-pre-line">{m.linkedinPost}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant={active ? "default" : "ghost"} className={active ? "accent-bg" : "text-muted-foreground"} onClick={() => setSelected(idx)}>
                      {active ? "Selected" : "Use this caption"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => copy(m.linkedinPost, `p${idx}`, "Post copied")}>
                      {copiedKey === `p${idx}` ? "Copied" : "Copy post"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {chosen && (
            <div className="glass-card p-5 border-2 border-primary">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Copy the image prompt</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Upload a clear, front-facing photo of yourself to your image tool, paste this prompt, and check the spelling before you post.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {template.slots.map(slot => (
                  <div key={slot.key}>
                    <label className="text-xs text-muted-foreground">{slot.label}</label>
                    <Input className="mt-1 bg-secondary" maxLength={80} placeholder={slot.placeholder}
                      value={slotValues[slot.key] ?? ""} onChange={e => setSlotValues({ ...slotValues, [slot.key]: e.target.value })} />
                  </div>
                ))}
              </div>
              <pre className="text-xs whitespace-pre-wrap rounded-md bg-secondary p-4 mb-4 font-sans leading-relaxed">{finalPrompt}</pre>
              <Button onClick={() => copy(finalPrompt, "prompt", "Prompt copied")} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
                {copiedKey === "prompt" ? <><Check className="w-4 h-4 mr-1" /> Copied</> : <><Copy className="w-4 h-4 mr-1" /> Copy Prompt</>}
              </Button>
            </div>
          )}

          <Button onClick={generate} disabled={loading} variant="ghost" className="w-full text-muted-foreground">Regenerate Captions</Button>
        </motion.div>
      )}

      <div className="mt-8 flex items-center justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        ) : <div />}
        <Button onClick={() => { onSave({ icpIndex, templateId, tone, angle, memes, selected, slotValues }); onNext(); }} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
          {memes ? "Next Step → Content Ideas" : "Skip → Content Ideas"}
        </Button>
      </div>
    </motion.div>
  );
}
