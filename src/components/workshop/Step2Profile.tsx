import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini, describeGeminiError, AI_PARSE_ERROR_MESSAGE } from "@/lib/workshop-store";
import { sanitizeAIOutput, sanitizeAIText } from "@/lib/sanitize";
import { NO_JARGON_RULE, PERSONALISATION_RULE } from "@/lib/prompt-rules";
import { motion } from "framer-motion";
import { ArrowLeft, X, Copy, Check, CheckCircle2, ArrowUpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";

const TONE_OPTIONS = ["Bold", "Professional", "Casual", "Witty", "Direct", "Empathetic", "Data-driven"];
const MAX_TONES = 3;

const TIERS = [
  { range: "0–40", name: "Needs Rebuild", desc: "Bottom 60%" },
  { range: "41–60", name: "Developing", desc: "Top 40%" },
  { range: "61–75", name: "Solid", desc: "Top 25%" },
  { range: "76–90", name: "Strong", desc: "Top 10%" },
  { range: "91–100", name: "Elite", desc: "Top 1%" },
];

function getTier(score: number) {
  if (score <= 40) return 0;
  if (score <= 60) return 1;
  if (score <= 75) return 2;
  if (score <= 90) return 3;
  return 4;
}

interface Step2Props {
  data: any;
  userName?: string;
  onSave: (data: any, opts?: { silent?: boolean }) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function Step2Profile({ data, userName, onSave, onNext, onBack }: Step2Props) {
  const [form, setForm] = useState({
    name: data?.name || userName || "",
    linkedinUrl: data?.linkedinUrl || "",
    role: data?.role || "",
    company: data?.company || "",
    headline: data?.headline || "",
    about: data?.about || "",
    offerDescription: data?.offerDescription || "",
    tones: data?.tones || (data?.tone ? [data.tone] : []) as string[],
    noLinkedin: data?.noLinkedin || false,
    noHeadline: data?.noHeadline || false,
    noAbout: data?.noAbout || false,
  });
  const [result, setResult] = useState<any>(data?.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const [offerOptions, setOfferOptions] = useState<string[]>(data?.offerOptions || []);
  const [optionsKey, setOptionsKey] = useState(data?.offerDescription || "");
  const [selectedOfferIdx, setSelectedOfferIdx] = useState<number | null>(data?.selectedOfferIdx ?? null);
  const [generatingOptions, setGeneratingOptions] = useState(false);

  const offerKey = form.offerDescription.trim();
  const coreOffer = (selectedOfferIdx !== null && offerOptions[selectedOfferIdx]) ? offerOptions[selectedOfferIdx] : "";

  useAutosave({ ...form, coreOffer, offerOptions, selectedOfferIdx, result }, onSave);

  useEffect(() => {
    if (!offerKey) return;
    if (offerKey === optionsKey) return;

    const timer = setTimeout(async () => {
      setGeneratingOptions(true);
      try {
        const prompt = `Read this business owner's description of their own business, and turn it into 3 distinct, more detailed rewritten versions of their business offering.
Each version must be 2 to 3 sentences, clearly covering: the core problem being solved, who it is for, and how they solve it (the method or mechanism). Fix grammar and capitalisation (proper nouns and acronyms like B2B, SaaS, AI, ROI, CRM, SEO should be capitalised correctly). Do not invent details that are not implied by the description; make reasonable, conservative inferences where something is implied but not explicit.
Make the 3 versions meaningfully different in phrasing and emphasis (for example, one could lead with the outcome, one with the audience, one with the method), not just minor rewordings of each other.

${NO_JARGON_RULE}

Business description: ${offerKey}

Return ONLY a valid JSON array of exactly 3 strings (no markdown, no code blocks).`;
        const raw = await callGemini(prompt);
        const match = raw.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(match ? match[0] : raw);
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("bad shape");
        setOfferOptions(parsed.slice(0, 3).map((s: string) => sanitizeAIText(String(s))));
      } catch {
        // Fall back to the user's own words, unformatted, so they're never blocked; they can edit each into shape themselves.
        setOfferOptions([sanitizeAIText(offerKey), sanitizeAIText(offerKey), sanitizeAIText(offerKey)]);
      } finally {
        setOptionsKey(offerKey);
        setSelectedOfferIdx(null);
        setGeneratingOptions(false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [offerKey]);

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyBtn = ({ text, id, label }: { text: string; id: string; label?: string }) => (
    <button onClick={() => copyText(text, id)} className="mt-2 flex items-center gap-1 text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors">
      {copiedField === id ? <><Check className="w-3 h-3 text-emerald-400" /> Copied!</> : <><Copy className="w-3 h-3" /> {label || "Copy"}</>}
    </button>
  );

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const toggleTone = (t: string) => {
    setForm(p => {
      if (p.tones.includes(t)) return { ...p, tones: p.tones.filter((x: string) => x !== t) };
      if (p.tones.length >= MAX_TONES) return p;
      return { ...p, tones: [...p.tones, t] };
    });
  };

  const generate = async () => {
    if (!form.name.trim() || !form.role || !form.company || !coreOffer || form.tones.length === 0) {
      setError("Please fill in all required fields");
      return;
    }
    if (!form.linkedinUrl.trim()) {
      setError("Please add your LinkedIn profile URL, or check \"I don't have a LinkedIn profile yet\" above.");
      return;
    }
    if (!form.noHeadline && !form.headline.trim()) {
      setError("Please fill in your current headline, or check \"I don't have a LinkedIn headline\".");
      return;
    }
    if (!form.noAbout && !form.about.trim()) {
      setError("Please fill in your About section, or check \"I don't have a LinkedIn about section\".");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    const headlineInput = form.noHeadline
      ? "Not provided. This person has no existing headline. Create an original, strong headline from scratch using their role, company, and core offer."
      : form.headline;
    const aboutInput = form.noAbout
      ? "Not provided. This person has no existing About section. Create an original About section from scratch using their role, company, and core offer, following the structure below."
      : form.about;

    const prompt = `You are an expert LinkedIn Profile Strategist specialising in lead generation.

${NO_JARGON_RULE}

${PERSONALISATION_RULE}

Analyse and optimise this LinkedIn profile:
- Name: ${form.name}
- Current Headline: ${headlineInput}
- About Section: ${aboutInput}
- Role: ${form.role}
- Company: ${form.company}
- Core Offer: ${coreOffer}
- Preferred Tones: ${form.tones.join(", ")}
${(form.noHeadline || form.noAbout) ? `\nIMPORTANT: Where a section says "Not provided", score that criterion very low since there is genuinely nothing there yet, do NOT invent or assume existing content when scoring. But the optimised headlines, aboutSection, and positioningAngles you generate must still be fully written from scratch using their Name, Role, Company, and Core Offer, exactly as if starting fresh.\n` : ""}
SCORING (0 to 100 total):
Score the profile on 5 criteria, 20 points each:
1. Clarity (0-20): How clearly does the headline communicate who they help, how, and why?
2. Specificity (0-20): Are the results and mechanisms concrete or vague?
3. Differentiation (0-20): Is the positioning unique vs competitors?
4. Proof (0-20): Are there credible markers, results, or experience mentioned?
5. Execution (0-20): Is the structure, tone, and flow professional?

Final Score = sum of all 5. Maximum possible = 100. Do NOT exceed 100.

Keyword Score (separate 0-100 score):
- Exact match B2B power keywords found: up to 40 points
- Related industry terms: up to 30 points
- Action verbs showing results: up to 20 points
- Credibility markers: up to 10 points

ABOUT SECTION RULES (CRITICAL):
The "aboutSection" field MUST be a minimum of 3 paragraphs.
Each paragraph = 2-4 lines of text.
Separate paragraphs with TWO newlines (\\n\\n).
Structure:
- Paragraph 1: Who they are + what they do + target audience
- Paragraph 2: Differentiation + strengths + outcomes delivered
- Paragraph 3: Positioning + credibility + authority tone
Rules: No fluff. No repetition. No generic statements. Must feel LinkedIn-ready and website-ready.

IMPORTANT: Do NOT use em-dashes, asterisks, or hash signs in any output.

Return ONLY a valid JSON object (no markdown, no code blocks) with:
{
  "clarityScore": number,
  "keywordScore": number,
  "finalScore": number,
  "scoreMeaning": string,
  "percentileRank": string,
  "scoreBreakdown": {
    "clarity": { "score": number, "explanation": string },
    "specificity": { "score": number, "explanation": string },
    "differentiation": { "score": number, "explanation": string },
    "proof": { "score": number, "explanation": string },
    "execution": { "score": number, "explanation": string }
  },
  "whatsWorking": [array of strings],
  "toImprove": [array of strings],
  "headlines": [3 strings],
  "aboutSection": string,
  "positioningAngles": [3-4 strings, each ONE standalone positioning power statement, do not number them yourself]
}`;

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutPromise]) as string;
      let parsed;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        setError(AI_PARSE_ERROR_MESSAGE);
        setLoading(false);
        return;
      }
      parsed = sanitizeAIOutput(parsed);
      parsed.finalScore = Math.min(parsed.finalScore || 0, 100);
      parsed.clarityScore = Math.min(parsed.clarityScore || 0, 100);
      parsed.keywordScore = Math.min(parsed.keywordScore || 0, 100);
      setResult(parsed);
      onSave({ ...form, coreOffer, offerOptions, selectedOfferIdx, result: parsed });
      toast({ title: "✓ Saved", description: "Profile analysis saved", duration: 3000 });
    } catch (e: any) {
      setError(describeGeminiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    onSave({ ...form, coreOffer, offerOptions, selectedOfferIdx, result });
    onNext();
  };

  const handleContinueWithoutLinkedin = () => {
    if (!form.name.trim() || !form.role || !form.company || !coreOffer) {
      setError("Please fill in all required fields");
      return;
    }
    setError("");
    onSave({ ...form, coreOffer, offerOptions, selectedOfferIdx, result: null });
    onNext();
  };

  const tierIdx = result?.finalScore != null ? getTier(result.finalScore) : -1;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Optimise Your <span className="accent-text">LinkedIn</span> Profile</h2>
      <p className="text-muted-foreground mb-8 text-sm">Get a detailed analysis and optimised suggestions</p>

      <div className="glass-card p-6 space-y-4">
        <label className="flex items-center gap-2 p-3 rounded-md bg-secondary border border-border cursor-pointer">
          <input
            type="checkbox"
            checked={form.noLinkedin}
            onChange={e => update("noLinkedin", e.target.checked)}
            className="accent-primary w-4 h-4"
          />
          <span className="text-sm text-foreground">I don't have a LinkedIn profile yet</span>
        </label>

        <div>
          <Label className="text-sm text-muted-foreground">Your Name *</Label>
          <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Jane Doe" className="mt-1 bg-secondary border-border focus:border-primary" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Your Role *</Label>
            <Input value={form.role} onChange={e => update("role", e.target.value)} placeholder="Founder" className="mt-1 bg-secondary border-border focus:border-primary" />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Company Name *</Label>
            <Input value={form.company} onChange={e => update("company", e.target.value)} placeholder="Acme Inc" className="mt-1 bg-secondary border-border focus:border-primary" />
          </div>
        </div>
        {!form.noLinkedin && (
          <>
            <div>
              <Label className="text-sm text-muted-foreground">LinkedIn Profile URL *</Label>
              <Input value={form.linkedinUrl} onChange={e => update("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/yourprofile" className="mt-1 bg-secondary border-border focus:border-primary" />
            </div>

            <label className="flex items-center gap-2 p-3 rounded-md bg-secondary border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={form.noHeadline}
                onChange={e => update("noHeadline", e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              <span className="text-sm text-foreground">I don't have a LinkedIn headline</span>
            </label>
            {!form.noHeadline && (
              <div>
                <Label className="text-sm text-muted-foreground">Current LinkedIn Headline *</Label>
                <Input value={form.headline} onChange={e => update("headline", e.target.value)} placeholder="Reduce hiring time → for Talent Leaders → using automation" className="mt-1 bg-secondary border-border focus:border-primary" />
              </div>
            )}

            <label className="flex items-center gap-2 p-3 rounded-md bg-secondary border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={form.noAbout}
                onChange={e => update("noAbout", e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              <span className="text-sm text-foreground">I don't have a LinkedIn about section</span>
            </label>
            {!form.noAbout && (
              <div>
                <Label className="text-sm text-muted-foreground">About Section *</Label>
                <Textarea value={form.about} onChange={e => update("about", e.target.value)} placeholder="Your LinkedIn about section..." className="mt-1 bg-secondary border-border focus:border-primary min-h-[80px]" />
              </div>
            )}
          </>
        )}
        <div>
          <Label className="text-sm text-muted-foreground">Your Offer, In Your Own Words *</Label>
          <Textarea
            value={form.offerDescription}
            onChange={e => update("offerDescription", e.target.value)}
            placeholder="e.g. We help small businesses that struggle to get consistent leads. We do this through AI-powered LinkedIn outreach and cold email systems."
            className="mt-1.5 bg-secondary border-border focus:border-primary min-h-[70px]"
          />
          <p className="text-xs text-muted-foreground mt-1">Just describe it like you would to a person. We'll turn it into 3 versions you can edit and choose from below.</p>

          {generatingOptions && (
            <p className="text-xs text-muted-foreground mt-2">Writing 3 versions of your offer…</p>
          )}

          {!generatingOptions && offerOptions.length === 0 && !offerKey && (
            <p className="text-xs text-muted-foreground mt-2">Your 3 offer options will appear here once you describe your business above.</p>
          )}

          {offerOptions.length > 0 && (
            <div className="mt-3">
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                Choose Your Business Offering *
                <InfoTooltip text="This exact wording is used throughout your workshop: ICPs, value proposition, website copy, and outreach. Edit any version below, then select the one that best represents your business." />
              </Label>
              <div className="mt-2 space-y-2">
                {offerOptions.map((opt, i) => (
                  <div key={i} onClick={() => setSelectedOfferIdx(i)}
                    className={`p-3 rounded-md border cursor-pointer transition-colors flex items-start gap-2 ${selectedOfferIdx === i ? "border-primary bg-primary/5" : "border-border bg-secondary"}`}>
                    <input
                      type="radio"
                      checked={selectedOfferIdx === i}
                      onChange={() => setSelectedOfferIdx(i)}
                      className="accent-primary w-4 h-4 mt-1.5 shrink-0"
                    />
                    <Textarea
                      value={opt}
                      onChange={e => { const v = e.target.value; setOfferOptions(p => p.map((x, idx) => idx === i ? v : x)); }}
                      className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-0 min-h-[60px] resize-none text-sm"
                    />
                  </div>
                ))}
              </div>
              {selectedOfferIdx === null && (
                <p className="text-xs text-destructive mt-1">Select one of the 3 versions above to use as your business offering</p>
              )}
            </div>
          )}
        </div>
        {!form.noLinkedin && (
          <div>
            <Label className="text-sm text-muted-foreground">Preferred Tone * (select up to 3)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TONE_OPTIONS.map(t => (
                <button key={t} type="button" onClick={() => toggleTone(t)}
                  className={`text-sm px-3 py-1.5 rounded-md border transition-all flex items-center gap-1.5 ${
                    form.tones.includes(t) ? "tag-selected border-primary" : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground"
                  }`}>
                  {t}
                  {form.tones.includes(t) && <X className="w-3 h-3" />}
                </button>
              ))}
            </div>
            {form.tones.length === 0 && <p className="text-xs text-muted-foreground mt-1">Select at least one tone</p>}
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        {!loading && !result && form.noLinkedin && (
          <Button onClick={handleContinueWithoutLinkedin} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
            Continue →
          </Button>
        )}
        {!loading && !result && !form.noLinkedin && (
          <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
            Generate Profile Analysis
          </Button>
        )}
      </div>

      {!loading && result && (
        <Button onClick={generate} variant="ghost" className="w-full text-muted-foreground mt-4">Regenerate Analysis</Button>
      )}

      {loading && <LoadingSpinner text="Analysing your LinkedIn profile... this takes ~20 seconds" />}

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          {/* Overall Clarity Score */}
          {result.scoreBreakdown && (
            <div className="glass-card p-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overall Clarity Score</p>
              <div className="text-5xl font-extrabold accent-text">
                {Math.round(
                  (Math.min(result.scoreBreakdown.proof?.score || 0, 20) +
                   Math.min(result.scoreBreakdown.clarity?.score || 0, 20) +
                   Math.min(result.scoreBreakdown.execution?.score || 0, 20) +
                   Math.min(result.scoreBreakdown.specificity?.score || 0, 20) +
                   Math.min(result.scoreBreakdown.differentiation?.score || 0, 20))
                )}/100
              </div>
              <p className="text-xs text-muted-foreground mt-1">Average of Proof, Clarity, Execution, Specificity, Differentiation</p>
            </div>
          )}

          <div className="glass-card p-6 text-center">
            <div className="text-5xl font-extrabold accent-text">{result.finalScore}/100</div>
            <p className="text-lg font-semibold mt-1">{result.scoreMeaning}</p>
            <p className="text-muted-foreground text-sm">{result.percentileRank}</p>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Profile Tiers</h3>
            <div className="space-y-1.5">
              {TIERS.map((t, i) => (
                <div key={i} className={`flex items-center justify-between p-2.5 rounded-md ${i === tierIdx ? "accent-bg" : "bg-secondary"}`}>
                  <span className={`text-sm font-medium ${i === tierIdx ? "text-primary-foreground" : "text-foreground"}`}>{t.range}: {t.name}</span>
                  <span className={`text-xs ${i === tierIdx ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{t.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-1 text-sm uppercase tracking-wider text-muted-foreground">
              Clarity Score
              <InfoTooltip text="Measures how clearly your headline tells people who you help, how, and what result they get" />
            </h3>
            {result.scoreBreakdown && Object.entries(result.scoreBreakdown).map(([key, val]: any) => (
              <div key={key} className="mb-3">
                <div className="flex justify-between text-sm">
                  <span className="capitalize font-medium">{key}</span>
                  <span className="text-primary font-semibold">{Math.min(val.score, 20)}/20</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(Math.min(val.score, 20) / 20) * 100}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{val.explanation}</p>
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Keyword Score: {Math.min(result.keywordScore, 100)}/100</span>
                <InfoTooltip text="Measures the strength of B2B keywords in your profile across 4 criteria: exact match keywords, related terms, action verbs, and credibility markers" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                What's Working
                <InfoTooltip text="These are the strongest elements of your current profile that should be kept or enhanced" />
              </h3>
              <div className="space-y-2">
                {result.whatsWorking?.map((w: string, i: number) => (
                  <div key={i} className="bg-secondary p-3 rounded-md border-l-2 border-emerald-400 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{w}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-primary flex items-center gap-1">
                To Improve
                <InfoTooltip text="Prioritised list of changes that will have the biggest impact on your profile score" />
              </h3>
              <div className="space-y-2">
                {result.toImprove?.map((w: string, i: number) => (
                  <div key={i} className="bg-secondary p-3 rounded-md border-l-2 border-primary flex items-start gap-2">
                    <ArrowUpCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              Optimised Headlines
              <InfoTooltip text="AI-crafted headline alternatives using different frameworks: outcome-driven, authority-driven, and benefit-driven" />
            </h3>
            {result.headlines?.map((h: string, i: number) => (
              <div key={i} className="bg-secondary p-3 rounded-md mb-2">
                <p className="text-sm font-medium">{i + 1}. {h}</p>
                <CopyBtn text={h} id={`headline-${i}`} />
              </div>
            ))}
          </div>

          {result.aboutSection && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Optimised About Section</h3>
              <div className="text-sm text-muted-foreground space-y-4">
                {result.aboutSection.split(/\n\n+/).map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <CopyBtn text={result.aboutSection} id="about-section" label="Copy About Section" />
            </div>
          )}

          {result.positioningAngles && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Positioning Angles
                <InfoTooltip text="One-sentence power statements that define your market position and differentiate you" />
              </h3>
              {(Array.isArray(result.positioningAngles)
                ? result.positioningAngles
                : String(result.positioningAngles).split(/\n+|(?=\d+\.\s)/).map((s: string) => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean)
              ).map((angle: string, i: number) => (
                <div key={i} className="bg-secondary p-3 rounded-md mb-2 flex gap-2">
                  <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                  <p className="text-sm text-muted-foreground">{angle}</p>
                </div>
              ))}
            </div>
          )}

          {result.scoreMeaning && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Score Explanation</h3>
              <p className="text-sm text-muted-foreground">{result.scoreMeaning}</p>
            </div>
          )}

          <Button onClick={generate} variant="ghost" className="w-full text-muted-foreground">Regenerate Analysis</Button>
        </motion.div>
      )}

      {result && (
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
      )}
    </motion.div>
  );
}
