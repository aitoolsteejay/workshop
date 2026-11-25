import { useState, useRef, useCallback } from "react";
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
import { CONTENT_CHANNELS, CONTENT_GOALS, CONTENT_FORMATS, parseJsonObject } from "@/lib/content-options";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { ArrowLeft, Check, Copy, Download, Lightbulb } from "lucide-react";

interface Pillar { name: string; description: string }
interface Idea {
  week: number;
  pillar: string;
  format: string;
  stage: string;
  hook: string;
  angle: string;
  cta: string;
  memeCaption: string;
}
interface Plan { pillars: Pillar[]; ideas: Idea[] }

interface StepContentProps {
  data: any;
  icpData: any;
  valuePropData: any;
  profileData: any;
  onboardingData: any;
  onSave: (data: any, opts?: { silent?: boolean }) => void;
  onMakeMeme: (caption: string) => void;
  onNext: () => void;
  onBack?: () => void;
}

function toCsv(ideas: Idea[]): string {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [["Week", "Pillar", "Format", "Stage", "Hook", "Angle", "CTA", "Meme caption"]];
  ideas.forEach(i => rows.push([i.week, i.pillar, i.format, i.stage, i.hook, i.angle, i.cta, i.memeCaption]));
  return rows.map(r => r.map(cell).join(",")).join("\n");
}

export function StepContentIdeas({ data, icpData, valuePropData, profileData, onboardingData, onSave, onMakeMeme, onNext, onBack }: StepContentProps) {
  const [icpIndex, setIcpIndex] = useState<number>(data?.icpIndex ?? 0);
  const [channels, setChannels] = useState<string[]>(data?.channels || ["LinkedIn"]);
  const [goal, setGoal] = useState<string>(data?.goal || CONTENT_GOALS[0]);
  const [proof, setProof] = useState<string>(data?.proof || "");
  const [plans, setPlans] = useState<Record<string, Plan>>(data?.plans || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const generationIdRef = useRef(0);

  useAutosave({ icpIndex, channels, goal, proof, plans }, onSave);

  const icps = icpData?.result || [];
  const icp = icps[icpIndex] || icps[0];
  const vps = valuePropData?.result || [];
  const offer = profileData?.coreOffer || icpData?.offer || "";
  const company = profileData?.company || "";
  const industry = joinField(onboardingData?.industry);
  const businessType = joinField(onboardingData?.businessType);
  const sellingTo = joinField(onboardingData?.sellingTo);
  const plan: Plan | undefined = plans[String(icpIndex)];

  const toggleChannel = (c: string) =>
    setChannels(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));

  const generate = useCallback(async () => {
    if (!icp || channels.length === 0) return;
    const currentGenId = ++generationIdRef.current;
    setError("");
    setLoading(true);

    const topVP = vps[0] ? `${vps[0].corePromise || vps[0].desiredOutcome}` : offer;
    const prompt = `You are a content strategist for both B2B and D2C brands. You plan content that earns replies, sales or meetings from one specific target customer, not generic thought leadership.

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
- Main goal: ${goal}
- Channels: ${channels.join(", ")}
${proof.trim() ? `- Proof point they can use: ${proof.trim()}` : ""}

Produce:
1. Exactly 4 content pillars. Each pillar maps to a real pain, trigger or objection of this target customer. Give a "name" (max 4 words) and a one-sentence "description".
2. Exactly 12 content ideas spread over 4 weeks (3 per week, "week" is 1 to 4). Rotate the pillars.

RULES FOR EACH IDEA:
- "pillar" must match one of the pillar names exactly.
- "format" must be one of: ${CONTENT_FORMATS.join(", ")}, and must suit one of the chosen channels.
- "stage" is one of: Awareness, Consideration, Decision.
- "hook" is the exact first line, under 18 words, specific to this target customer. Never a template like "Here are 5 tips".
- "angle" is one or two sentences on what the piece says and the point of view it takes.
- "cta" is one low-pressure next step that supports the main goal. Do not repeat the same CTA.
- "memeCaption" is a short, funny caption (max 10 words) that makes the same point as a meme.
- Use the proof point in at least 3 ideas if one was given.
- If the target customer is D2C, ideas must fit consumer platforms and buying behaviour, not B2B outreach.
- Do NOT use em-dashes, asterisks, or hash signs in any output.

Return ONLY valid JSON (no markdown):
{
  "pillars": [ { "name": string, "description": string } ],
  "ideas": [ { "week": number, "pillar": string, "format": string, "stage": string, "hook": string, "angle": string, "cta": string, "memeCaption": string } ]
}`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 90000));
      const raw = (await Promise.race([callGemini(prompt), timeoutP])) as string;
      if (currentGenId !== generationIdRef.current) return;

      const parsed = parseJsonObject(raw);
      if (!parsed || !Array.isArray(parsed.ideas) || !Array.isArray(parsed.pillars)) {
        setError(AI_PARSE_ERROR_MESSAGE);
        setLoading(false);
        return;
      }
      const clean = sanitizeAIOutput(parsed);
      const ideas: Idea[] = clean.ideas.slice(0, 12).map((i: any) => ({
        week: Math.min(4, Math.max(1, Number(i?.week) || 1)),
        pillar: String(i?.pillar ?? ""),
        format: String(i?.format ?? ""),
        stage: String(i?.stage ?? ""),
        hook: String(i?.hook ?? ""),
        angle: String(i?.angle ?? ""),
        cta: String(i?.cta ?? ""),
        memeCaption: String(i?.memeCaption ?? "").replace(/["“”]/g, "").trim(),
      })).filter((i: Idea) => i.hook);
      if (ideas.length === 0) {
        setError(AI_PARSE_ERROR_MESSAGE);
        setLoading(false);
        return;
      }
      const next = { ...plans, [String(icpIndex)]: { pillars: clean.pillars.slice(0, 4), ideas } };
      setPlans(next);
      onSave({ icpIndex, channels, goal, proof, plans: next });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      if (currentGenId !== generationIdRef.current) return;
      setError(describeGeminiError(e));
    } finally {
      if (currentGenId === generationIdRef.current) setLoading(false);
    }
  }, [icp, channels, goal, proof, vps, offer, company, industry, businessType, sellingTo, plans, icpIndex, onSave, toast]);

  const copyIdea = async (idea: Idea, index: number) => {
    await copyToClipboard(`${idea.hook}\n\n${idea.angle}\n\nFormat: ${idea.format}\nCTA: ${idea.cta}`);
    setCopiedIndex(index);
    toast({ title: "Idea copied", duration: 2000 });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadCsv = () => {
    if (!plan) return;
    const url = URL.createObjectURL(new Blob([toCsv(plan.ideas)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "content-plan.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">Content <span className="accent-text">Ideas</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">Content pillars and a 4-week plan built around your target customer</p>

      {icps.length === 0 && (
        <div className="glass-card p-5 mb-6 text-sm text-muted-foreground">
          Build your target customers in step 3 first. This step uses them to plan content that fits.
        </div>
      )}

      {icps.length > 0 && (
        <div className="glass-card p-5 mb-4">
          <label className="text-sm text-muted-foreground flex items-center gap-1">
            Who is this content for?
            <InfoTooltip text="Pulled from the target customers you built earlier. Each one gets its own plan." />
          </label>
          <div className="mt-2 flex gap-1 flex-wrap">
            {icps.map((c: any, idx: number) => (
              <button key={idx} onClick={() => setIcpIndex(idx)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${icpIndex === idx ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {c.name || `ICP ${idx + 1}`}
                {c.audienceType && (
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${audienceBadgeClass(c.audienceType)}`}>{c.audienceType}</span>
                )}
                {plans[String(idx)] && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-5 mb-6">
        <label className="text-sm text-muted-foreground">Where will you publish?</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONTENT_CHANNELS.map(c => (
            <button key={c} onClick={() => toggleChannel(c)}
              className={`text-sm px-4 py-2 rounded-md border transition-all ${channels.includes(c) ? "tag-selected border-primary" : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
        {channels.length === 0 && <p className="text-xs text-destructive mt-1">Select at least one channel</p>}

        <label className="text-sm text-muted-foreground mt-4 block">Main goal</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONTENT_GOALS.map(g => (
            <button key={g} onClick={() => setGoal(g)}
              className={`text-sm px-4 py-2 rounded-md border transition-all ${goal === g ? "tag-selected border-primary" : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground"}`}>
              {g}
            </button>
          ))}
        </div>

        <label className="text-sm text-muted-foreground mt-4 block">A result or case study to feature (optional)</label>
        <Input className="mt-1.5 bg-secondary" maxLength={400} value={proof} onChange={e => setProof(e.target.value)}
          placeholder="e.g. Booked 40 meetings in 90 days for a SaaS client" />

        <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold mt-4" disabled={loading || !icp || channels.length === 0}>
          {plan ? "Regenerate Plan" : "Generate Content Plan"}
        </Button>
      </div>

      {loading && <LoadingSpinner text="Planning your month of content..." />}
      {error && (
        <div className="glass-card p-5 mb-4 text-center">
          <p className="text-destructive text-sm mb-3">{error}</p>
          <Button onClick={generate} variant="ghost" className="text-muted-foreground">Retry</Button>
        </div>
      )}

      {plan && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Content pillars</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plan.pillars.map(p => (
                <div key={p.name} className="glass-card p-4">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">4-week plan</h3>
            <button onClick={downloadCsv} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>

          {[1, 2, 3, 4].map(week => {
            const weekIdeas = plan.ideas.map((idea, index) => ({ idea, index })).filter(x => x.idea.week === week);
            if (weekIdeas.length === 0) return null;
            return (
              <div key={week} className="space-y-3">
                <h4 className="text-[16px] font-bold">Week {week}</h4>
                {weekIdeas.map(({ idea, index }) => (
                  <div key={index} className="glass-card p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">{idea.pillar}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border">{idea.format}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border">{idea.stage}</span>
                      </div>
                      <button onClick={() => copyIdea(idea, index)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="Copy idea">
                        {copiedIndex === index ? <><Check className="w-3.5 h-3.5 text-primary" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                      </button>
                    </div>
                    <p className="text-base font-bold mb-1.5">{idea.hook}</p>
                    <p className="text-sm text-muted-foreground">{idea.angle}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-border">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Call to action</span>
                        <p className="text-sm mt-0.5">{idea.cta}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">As a meme</span>
                        <p className="text-sm mt-0.5">{idea.memeCaption}</p>
                        <button onClick={() => onMakeMeme(idea.memeCaption)} className="text-xs font-semibold accent-text mt-1">Make this meme →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          <Button onClick={generate} disabled={loading} variant="ghost" className="w-full text-muted-foreground">Regenerate Plan</Button>
        </motion.div>
      )}

      <div className="mt-8 flex items-center justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        ) : <div />}
        <Button onClick={() => { onSave({ icpIndex, channels, goal, proof, plans }); onNext(); }} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
          {Object.keys(plans).length > 0 ? "Next Step → Finish & Download PDF" : "Skip → Finish & Download PDF"}
        </Button>
      </div>
    </motion.div>
  );
}
