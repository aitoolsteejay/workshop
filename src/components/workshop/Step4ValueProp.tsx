import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { NO_JARGON_RULE, PERSONALISATION_RULE, GEO_AWARENESS_RULE, BUSINESS_TYPE_RULE } from "@/lib/prompt-rules";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { joinField } from "@/lib/utils";

interface Step4Props {
  data: any;
  icpData: any;
  profileData: any;
  onboardingData?: any;
  onSave: (data: any) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function Step4ValueProp({ data, icpData, profileData, onboardingData, onSave, onNext, onBack }: Step4Props) {
  const [result, setResult] = useState<any[]>(data?.result || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const offer = profileData?.coreOffer || icpData?.offer || "";
  const icps = icpData?.result || [];
  const businessType = joinField(onboardingData?.businessType);
  const sellingTo = joinField(onboardingData?.sellingTo);

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generate = async () => {
    if (icps.length < 3) { setError("ICP data is missing. Please complete Step 3 first."); return; }
    setError("");
    setLoading(true);
    setResult([]);

    const icpSummary = icps.map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).join(", ")}. Geography: ${icp.geographyContext || "Not specified"}`
    ).join("\n");

    const allPartners = icps.flatMap((icp: any) => (icp.channelPartners || []).map((p: any) => ({ ...p, forIcp: icp.name })));
    const partnerSummary = allPartners.length > 0
      ? allPartners.map((p: any, i: number) => `Partner ${i + 1}: ${p.partnerType} (relevant to ${p.forIcp}). Why they fit: ${p.whyTheyFit || "Not specified"}`).join("\n")
      : "";

    const prompt = `You are a senior strategist. Generate structured Value Propositions for each of these 3 target customer types${partnerSummary ? ", plus one for the Channel Partners audience" : ""}:

${NO_JARGON_RULE}

${PERSONALISATION_RULE}

${GEO_AWARENESS_RULE}

${BUSINESS_TYPE_RULE}

Selling To: ${sellingTo || "Not specified"}
Business Type: ${businessType || "Not specified"}
Core Offer: ${offer}
${icpSummary}
${partnerSummary ? `\nChannel Partners (a 4th audience: businesses or individuals who could refer or co-sell to us, NOT end customers):\n${partnerSummary}` : ""}

For EACH target customer type${partnerSummary ? " AND the Channel Partners audience" : ""}, provide:
1. corePromise: One powerful sentence that captures the transformation (max 15 words)
2. beforeState: What life looks like BEFORE using this solution (3 bullet points)
3. afterState: What life looks like AFTER (3 bullet points)
4. threeStepSystem: Array of 3 steps, each with "step" (name) and "description"
5. whyOthersFail: Why current alternatives fail (2-3 bullet points)
6. whyYouWin: Why this specific approach wins (2-3 bullet points)
7. contentStrategy: A short, clear paragraph (2-3 sentences) explaining the content strategy angle for reaching this customer type. What kind of content to create, what platform to post it on, and what outcome to drive. Not a tagline.
8. shortPitch: A 2-3 sentence elevator pitch
9. cta: A clear call-to-action sentence
10. icpName: The customer type name
11. positioning: A unique core positioning statement for THIS specific customer type following exactly this format: "We help [specific customer descriptor] to [their specific desired outcome] by [your specific method for this customer type]". Each customer type MUST have a DIFFERENT positioning statement. Use simple, easy-to-understand language. No jargon.
12. coreAngle: The single strongest hook to lead with when talking to this customer type. Must be one of: "Authority", "ROI", "Speed", or "Trust". Include a one-line explanation of why this angle works best for them.

${partnerSummary ? `For the Channel Partners entry specifically: frame every field around what is in it for THEM as a partner (extra revenue, a better offering for their own clients, low-effort referral, credibility), not around solving an end customer's problem. Set icpName to exactly "Channel Partners".\n\n` : ""}Rules:
- Each customer type must feel fundamentally DIFFERENT.
- Ban phrases like "increase growth", "improve results", "scale faster".
- Do NOT use em-dashes, asterisks, or hash signs in any output.
- Return ONLY a valid JSON array of ${partnerSummary ? "4" : "3"} objects (no markdown, no code blocks).`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      let parsed;
      try {
        const match = raw.match(/\[[\s\S]*\]/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      parsed = sanitizeAIOutput(parsed);
      setResult(parsed);
      onSave({ result: parsed });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copyText(text, id)} className="ml-2 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
      {copiedField === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">Your <span className="accent-text">Value Proposition</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">Auto-generated from your customer profile data</p>

      {!loading && result.length === 0 && (
        <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate Value Proposition
        </Button>
      )}

      {loading && <LoadingSpinner text="Generating Value Proposition..." />}
      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {result.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex gap-1 mb-6">
            {result.map((vp: any, idx: number) => (
              <button key={idx} onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === idx ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {vp?.icpName === "Channel Partners" ? "Channel Partners" : `ICP ${idx + 1}`}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
              <div className="glass-card p-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Core Promise</p>
                <p className="text-xl font-bold accent-text">{result[activeTab]?.corePromise}</p>
                <p className="text-sm text-muted-foreground mt-1">{result[activeTab]?.icpName}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <h4 className="text-xs font-medium text-destructive uppercase tracking-wider mb-3">Before</h4>
                  <ul className="space-y-2">
                    {result[activeTab]?.beforeState?.map((b: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-destructive">✗</span>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="glass-card p-5">
                  <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-3">After</h4>
                  <ul className="space-y-2">
                    {result[activeTab]?.afterState?.map((a: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-emerald-400">✓</span>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="glass-card p-5">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1">
                  3-Step System
                  <InfoTooltip text="The three steps that make your solution work for this specific customer type" />
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {result[activeTab]?.threeStepSystem?.map((step: any, i: number) => (
                    <div key={i} className="bg-secondary p-4 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold accent-bg">{i + 1}</span>
                        <span className="text-sm font-semibold">{step.step}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                    Why Others Fail
                    <InfoTooltip text="Common reasons why other solutions don't solve this customer's problem the way yours does" />
                  </h4>
                  <ul className="space-y-2">
                    {result[activeTab]?.whyOthersFail?.map((f: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">• {f}</li>
                    ))}
                  </ul>
                </div>
                <div className="glass-card p-5">
                  <h4 className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-1">
                    Why You Win
                    <InfoTooltip text="The specific advantage your approach has over alternatives for this customer" />
                  </h4>
                  <ul className="space-y-2">
                    {result[activeTab]?.whyYouWin?.map((w: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-primary">→</span>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Core Angle */}
              {result[activeTab]?.coreAngle && (
                <div className="glass-card p-5">
                  <h4 className="text-xs font-medium text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
                    Core Angle
                    <InfoTooltip text="The single strongest hook to lead with when talking to this customer type: Authority, ROI, Speed, or Trust" />
                  </h4>
                  <p className="text-sm font-semibold accent-text">{typeof result[activeTab].coreAngle === 'string' ? result[activeTab].coreAngle.split(':')[0] || result[activeTab].coreAngle : result[activeTab].coreAngle}</p>
                  {typeof result[activeTab].coreAngle === 'string' && result[activeTab].coreAngle.includes(':') && (
                    <div className="mt-2 bg-secondary p-3 rounded-md">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Why this angle works</p>
                      <p className="text-sm text-muted-foreground">{result[activeTab].coreAngle.split(':').slice(1).join(':').trim()}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="glass-card p-5">
                <h4 className="text-xs font-medium text-primary uppercase tracking-wider mb-4">Strategy Behind Your Content Creation</h4>
                <div className="space-y-3">
                  <div className="bg-secondary p-3 rounded-md flex items-start justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        Strategy Behind Your Content Creation
                        <InfoTooltip text="How to position your content so it attracts this specific type of customer" />
                      </span>
                      <p className="text-sm mt-0.5">{result[activeTab]?.contentStrategy || result[activeTab]?.oneLiner}</p>
                    </div>
                    <CopyBtn text={result[activeTab]?.contentStrategy || result[activeTab]?.oneLiner || ""} id={`contentstrat-${activeTab}`} />
                  </div>
                  <div className="bg-secondary p-3 rounded-md flex items-start justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground">Short Pitch</span>
                      <p className="text-sm mt-0.5">{result[activeTab]?.shortPitch}</p>
                    </div>
                    <CopyBtn text={result[activeTab]?.shortPitch || ""} id={`pitch-${activeTab}`} />
                  </div>
                  <div className="bg-secondary p-3 rounded-md flex items-start justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground">CTA</span>
                      <p className="text-sm font-medium accent-text mt-0.5">{result[activeTab]?.cta}</p>
                    </div>
                    <CopyBtn text={result[activeTab]?.cta || ""} id={`cta-${activeTab}`} />
                  </div>
                </div>
              </div>

              {/* Per-ICP Positioning */}
              {result[activeTab]?.positioning && (
                <div className="glass-card p-5 border-primary">
                  <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Core Positioning Statement</h3>
                  <p className="text-sm italic text-muted-foreground">"{result[activeTab].positioning}"</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <Button onClick={generate} variant="ghost" className="w-full mt-4 text-muted-foreground">Regenerate</Button>
        </motion.div>
      )}

      {result.length > 0 && (
        <div className="mt-8 flex items-center justify-between">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : <div />}
          <Button onClick={() => { onSave({ result }); onNext(); }} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
