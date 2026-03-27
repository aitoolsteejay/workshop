import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { NO_JARGON_RULE, PERSONALISATION_RULE } from "@/lib/prompt-rules";
import { motion } from "framer-motion";
import { ArrowLeft, X, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  onSave: (data: any) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function Step2Profile({ data, onSave, onNext, onBack }: Step2Props) {
  const [form, setForm] = useState({
    role: data?.role || "",
    company: data?.company || "",
    headline: data?.headline || "",
    about: data?.about || "",
    targetAudience: data?.targetAudience || "",
    coreOffer: data?.coreOffer || "",
    tones: data?.tones || (data?.tone ? [data.tone] : []) as string[],
  });
  const [result, setResult] = useState<any>(data?.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

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
    if (!form.role || !form.company || !form.headline || !form.targetAudience || !form.coreOffer || form.tones.length === 0) {
      setError("Please fill in all required fields");
      return;
    }
    if (!form.about.trim()) {
      setError("Please fill in your About section to get an accurate score.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    const prompt = `You are an expert LinkedIn Profile Strategist specialising in lead generation.

${NO_JARGON_RULE}

${PERSONALISATION_RULE}

Analyse and optimise this LinkedIn profile:
- Current Headline: ${form.headline}
- About Section: ${form.about}
- Role: ${form.role}
- Company: ${form.company}
- Target Audience (ICP): ${form.targetAudience}
- Core Offer: ${form.coreOffer}
- Preferred Tones: ${form.tones.join(", ")}

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
  "positioningAngles": string
}`;

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutPromise]) as string;
      let parsed;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      parsed = sanitizeAIOutput(parsed);
      parsed.finalScore = Math.min(parsed.finalScore || 0, 100);
      parsed.clarityScore = Math.min(parsed.clarityScore || 0, 100);
      parsed.keywordScore = Math.min(parsed.keywordScore || 0, 100);
      setResult(parsed);
      onSave({ ...form, result: parsed });
      toast({ title: "✓ Saved", description: "Profile analysis saved", duration: 3000 });
    } catch (e: any) {
      if (e.message === "timeout") {
        setError("This is taking too long. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    onSave({ ...form, result });
    onNext();
  };

  const tierIdx = result?.finalScore != null ? getTier(result.finalScore) : -1;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Optimise Your <span className="accent-text">LinkedIn</span> Profile</h2>
      <p className="text-muted-foreground mb-8 text-sm">Get a detailed analysis and optimised suggestions</p>

      <div className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Role / Job Title *</Label>
            <Input value={form.role} onChange={e => update("role", e.target.value)} placeholder="Founder" className="mt-1 bg-secondary border-border focus:border-primary" />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Company Name *</Label>
            <Input value={form.company} onChange={e => update("company", e.target.value)} placeholder="Acme Inc" className="mt-1 bg-secondary border-border focus:border-primary" />
          </div>
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Current LinkedIn Headline *</Label>
          <Input value={form.headline} onChange={e => update("headline", e.target.value)} placeholder="Reduce hiring time → for Talent Leaders → using automation" className="mt-1 bg-secondary border-border focus:border-primary" />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">About Section *</Label>
          <Textarea value={form.about} onChange={e => update("about", e.target.value)} placeholder="Your LinkedIn about section..." className="mt-1 bg-secondary border-border focus:border-primary min-h-[80px]" />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Target Audience *</Label>
          <Input value={form.targetAudience} onChange={e => update("targetAudience", e.target.value)} placeholder="e.g. Startup founders in India" className="mt-1 bg-secondary border-border focus:border-primary" />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Core Offer *</Label>
          <Input value={form.coreOffer} onChange={e => update("coreOffer", e.target.value)} placeholder="e.g. LinkedIn outreach + cold email for B2B lead gen" className="mt-1 bg-secondary border-border focus:border-primary" />
        </div>
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

        {error && <p className="text-destructive text-sm">{error}</p>}

        {!loading && !result && (
          <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
            Generate Profile Analysis
          </Button>
        )}
      </div>

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
              <ul className="space-y-2">
                {result.whatsWorking?.map((w: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>{w}</li>
                ))}
              </ul>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-primary flex items-center gap-1">
                To Improve
                <InfoTooltip text="Prioritised list of changes that will have the biggest impact on your profile score" />
              </h3>
              <ul className="space-y-2">
                {result.toImprove?.map((w: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-primary shrink-0">→</span>{w}</li>
                ))}
              </ul>
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
                <InfoTooltip text="A one-sentence power statement that defines your market position and differentiates you" />
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.positioningAngles}</p>
              <CopyBtn text={result.positioningAngles} id="positioning" />
            </div>
          )}

          {result.scoreMeaning && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Score Explanation</h3>
              <p className="text-sm text-muted-foreground">{result.scoreMeaning}</p>
              <CopyBtn text={result.scoreMeaning} id="score-explanation" />
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
