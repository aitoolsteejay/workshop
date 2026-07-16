import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { MultiSelect } from "./MultiSelect";
import { callGemini, describeGeminiError, AI_PARSE_ERROR_MESSAGE } from "@/lib/workshop-store";
import { sanitizeAIOutput, sanitizeAIText } from "@/lib/sanitize";
import { NO_JARGON_RULE, PERSONALISATION_RULE, GEO_AWARENESS_RULE, BUSINESS_TYPE_RULE } from "@/lib/prompt-rules";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { ChevronDown, ArrowLeft, Brain, AlertTriangle, Target, Zap, Radio, User, TrendingUp, Trophy, ShieldAlert, ChevronRight, Plus, X, Briefcase, ShoppingBag } from "lucide-react";
import { INDUSTRIES, COUNTRIES, DEFAULT_ICP_COUNT, MAX_ICP_COUNT } from "@/lib/constants";
import { joinField } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ROLES = [
  "Founder / Co-Founder", "CEO / CXO", "Head of Growth", "Head of Sales",
  "Head of Marketing", "SDR / BDR Manager", "Enterprise Sales Leader",
  "Partnerships Manager", "Operations Head", "Strategy Lead", "Other",
];

const SIZES = ["1–10", "10–50", "50–200", "200–500", "500–1000", "1000+"];

interface IcpInput {
  roles: string[];
  sizes: string[];
  industries: string[];
  industryOther: string;
  roleOther: string;
  geography: string[];
  geographyOther: string;
  d2cDescription: string;
  d2cOptions: string[];
  d2cOptionsKey: string;
  d2cSelectedIdx: number | null;
  icpType: "B2B" | "D2C" | null;
}

interface Step3Props {
  data: any;
  profileData: any;
  onboardingData?: any;
  onSave: (data: any, opts?: { silent?: boolean }) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function Step3ICP({ data, profileData, onboardingData, onSave, onNext, onBack }: Step3Props) {
  const businessType = joinField(onboardingData?.businessType);
  const sellingTo = joinField(onboardingData?.sellingTo);

  const emptyIcp = (): IcpInput => ({ roles: [], sizes: [], industries: [], industryOther: "", roleOther: "", geography: [], geographyOther: "", d2cDescription: "", d2cOptions: [], d2cOptionsKey: "", d2cSelectedIdx: null, icpType: null });
  const [icps, setIcps] = useState<IcpInput[]>(() => {
    const inputs = data?.inputs || [];
    while (inputs.length < DEFAULT_ICP_COUNT) inputs.push(emptyIcp());
    return inputs.map((icp: any) => ({ ...emptyIcp(), ...icp }));
  });
  const [openIcp, setOpenIcp] = useState(0);
  const [result, setResult] = useState<any[]>(data?.result || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const offer = profileData?.coreOffer || data?.offer || "";
  const isBothMode = sellingTo === "Both";
  // For non-Both selling modes the type is forced globally; for Both, each ICP must explicitly pick B2B or D2C.
  const getIcpType = (idx: number): "B2B" | "D2C" | null => {
    if (sellingTo === "D2C") return "D2C";
    if (!isBothMode) return "B2B";
    return icps[idx]?.icpType || null;
  };

  useAutosave({ inputs: icps, offer, result }, onSave);

  const updateIcp = (idx: number, field: keyof IcpInput, value: any) => {
    setIcps(p => p.map((icp, i) => i === idx ? { ...icp, [field]: value } : icp));
  };

  const addIcp = () => {
    if (icps.length >= MAX_ICP_COUNT) return;
    setIcps(p => [...p, emptyIcp()]);
    setResult([]);
  };

  const removeIcp = (idx: number) => {
    if (icps.length <= DEFAULT_ICP_COUNT) return;
    setIcps(p => p.filter((_, i) => i !== idx));
    setResult([]);
    setOpenIcp(o => (o === idx ? Math.max(0, idx - 1) : o > idx ? o - 1 : o));
  };

  const getIndustries = (icp: IcpInput) => {
    const selected = icp.industries.filter(x => x !== "Other");
    if (icp.industries.includes("Other") && icp.industryOther) {
      const custom = icp.industryOther.split(",").map(s => s.trim()).filter(Boolean);
      return [...selected, ...custom];
    }
    return selected;
  };

  const getGeographies = (icp: IcpInput) => {
    const selected = icp.geography.filter(x => x !== "Other");
    if (icp.geography.includes("Other") && icp.geographyOther) {
      const custom = icp.geographyOther.split(",").map(s => s.trim()).filter(Boolean);
      return [...selected, ...custom];
    }
    return selected;
  };

  const getRoles = (icp: IcpInput) => {
    const selected = icp.roles.filter(x => x !== "Other");
    if (icp.roles.includes("Other") && icp.roleOther) {
      const custom = icp.roleOther.split(",").map(s => s.trim()).filter(Boolean);
      return [...selected, ...custom];
    }
    return selected;
  };

  const generate = async () => {
    if (!offer.trim()) { setError("Core offer is missing. Please complete Step 2 first."); return; }
    for (let i = 0; i < icps.length; i++) {
      const type = getIcpType(i);
      if (isBothMode && !type) { setError(`ICP ${i + 1}: choose whether this is a B2B or D2C customer`); return; }
      if (type === "D2C") {
        if (icps[i].d2cSelectedIdx === null || !icps[i].d2cOptions[icps[i].d2cSelectedIdx]) {
          setError(`ICP ${i + 1}: describe this customer and select one of the generated versions`);
          return;
        }
      } else {
        if (icps[i].roles.length === 0) { setError(`ICP ${i + 1}: select at least one role`); return; }
        if (icps[i].sizes.length === 0) { setError(`ICP ${i + 1}: select at least one company size`); return; }
        if (icps[i].industries.length === 0) { setError(`ICP ${i + 1}: select at least one industry`); return; }
      }
    }
    setError("");
    setLoading(true);
    setResult([]);

    const icpTypeLines = Array.from({ length: icps.length }, (_, i) => {
      const type = getIcpType(i);
      if (type === "D2C") {
        const description = icps[i].d2cSelectedIdx !== null ? icps[i].d2cOptions[icps[i].d2cSelectedIdx] : icps[i].d2cDescription;
        return `ICP ${i + 1} Audience Type: D2C (individual consumer). Customer Description (from the business owner, AI-cleaned): ${description}. Target Geography: ${getGeographies(icps[i]).join(", ") || "Not specified"}`;
      }
      return `ICP ${i + 1} Audience Type: B2B (business buyer). Inputs: Roles: ${getRoles(icps[i]).join(", ")}, Company Sizes: ${icps[i].sizes.filter(x => x !== "Other").join(", ")}, Industries: ${getIndustries(icps[i]).join(", ")}, Target Geography: ${getGeographies(icps[i]).join(", ") || "Not specified"}`;
    }).join("\n");

    const prompt = `You are an expert Growth Strategist skilled at building both B2B and D2C customer profiles. Generate ${icps.length} deep, strategic Ideal Customer Profiles.

${NO_JARGON_RULE}

${PERSONALISATION_RULE}

${GEO_AWARENESS_RULE}

${BUSINESS_TYPE_RULE}

Selling To: ${sellingTo || "Not specified"}
Business Type: ${businessType || "Not specified"}
Core Offer: ${offer}
${icpTypeLines}

AUDIENCE TYPE ADAPTATION PER ICP (MANDATORY): Each ICP above is explicitly marked B2B or D2C, they must NOT be treated the same way.
For any ICP marked B2B: this is a business buyer. "whoTheyAre" and "coreResponsibilities" must describe their professional role, seniority, and organisational context, their job responsibilities and the KPIs they own. "channelPartners" must be agencies, consultants, complementary B2B tool vendors, associations, or communities that already have this exact professional audience's trust and attention.
For any ICP marked D2C: this is an individual consumer making a personal purchase decision, NOT an employee at work. "whoTheyAre" must describe their lifestyle, life stage, identity, and daily context, never a job title or company. "coreResponsibilities" must be repurposed to describe their daily routines, habits, and what occupies their attention day to day that is relevant to this purchase (NOT work responsibilities). "channelPartners" must be influencers, complementary consumer brands, retail or marketplace partners, and online communities this audience already follows and trusts, NOT B2B referral partners.
Every ICP's "audienceType" field in the JSON output must exactly match ("B2B" or "D2C") what is specified for that ICP above.

For EACH ICP generate:
1. ICP Name: Must be simple, immediately understandable, and professional. Use plain language. For B2B ICPs, good examples: "The Growth-Focused Founder", "The Busy Sales Director", "The Scaling Agency Owner". For D2C ICPs, good examples: "The Budget-Conscious New Parent", "The Fitness-Driven Young Professional". Bad examples: "The GTM Orchestrator", "Revenue-Driven Enterprise Executive". The name should describe who the person is in everyday language.
2. Who They Are (3-4 bullet points)
3. Core Responsibilities (as a list) — for D2C ICPs, this is their daily life context, not a job
4. Pain Points (at least 5 to 7 specific bullet points)
5. Goals and Desires (as a list)
6. Buying Triggers (as a list)
7. Objections (as a list)
8. Psychology (brief)
9. Where They Hang Out (as a list of platforms)
10. How to Position (messaging angle)
11. Geography Context: How the target geography influences buying behavior, communication style, and platform preferences for this ICP
12. Channel Partners: 3 to 4 real types of businesses, individuals, or (for D2C) influencers and complementary consumer brands who already have this ICP's trust and attention, and could refer or co-sell to them. For each: the partner type, why they already have this ICP's attention, and a specific angle for approaching that partner about a referral or co-selling relationship.
13. Audience Type: exactly "B2B" or "D2C", matching the input given for this ICP.

Rules:
- Make each ICP DISTINCT.
- Use specific, believable insights. No generic text.
- Pain Points for all ${icps.length} ICPs MUST be filled.
- Channel Partners must be specific and realistic to this ICP's industry and geography, not generic ("consultants" is too vague, "boutique HR consultancies serving Series A SaaS startups" is specific).
- Adapt all outputs to reflect the target geography's market context, tone, and behavior.
- Do NOT use em-dashes, asterisks, or hash signs in any output.

Return ONLY a valid JSON array of exactly ${icps.length} objects (no markdown, no code blocks). Each object must have: name, audienceType ("B2B" or "D2C"), whoTheyAre (array), coreResponsibilities (array), painPoints (array), goalsDesires (array), buyingTriggers (array), objections (array), psychology (string), whereTheyHangOut (array), howToPosition (string), geographyContext (string), channelPartners (array of objects, each with partnerType, whyTheyFit, approachAngle).`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      let parsed;
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        setError(AI_PARSE_ERROR_MESSAGE);
        setLoading(false);
        return;
      }
      parsed = sanitizeAIOutput(parsed);
      parsed = Array.isArray(parsed) ? parsed.map((icp: any, i: number) => ({ ...icp, audienceType: icp?.audienceType === "D2C" || icp?.audienceType === "B2B" ? icp.audienceType : (getIcpType(i) || "B2B") })) : parsed;
      setResult(parsed);
      onSave({ inputs: icps, offer, result: parsed });
      toast({ title: "✓ Saved", description: "ICPs generated and saved", duration: 3000 });
    } catch (e: any) {
      setError(describeGeminiError(e));
    } finally {
      setLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState<number | "partners">(0);

  const TOOLTIPS: Record<string, string> = {
    whoTheyAre: "A detailed description of this ideal customer's role, company type, and context",
    coreResponsibilities: "The daily tasks and KPIs this person owns, useful for tailoring your messaging",
    painPoints: "The real problems they face. Use these directly in your outreach messaging",
    goalsDesires: "The specific outcomes and results this ICP is actively trying to achieve",
    buyingTriggers: "Specific events or situations that make them actively look for a solution like yours",
    objections: "Why they might hesitate to buy. Address these proactively in your outreach",
    psychology: "How they think and make decisions, use this to choose the right tone and angle",
    whereTheyHangOut: "Platforms and content they consume, use this to choose your outreach channel",
    howToPosition: "The messaging angle and emphasis that works best for this specific ICP",
  };

  const SECTION_LABELS: Record<string, string> = {
    whoTheyAre: "Who They Are",
    coreResponsibilities: "Core Responsibilities",
    painPoints: "Pain Points",
    goalsDesires: "Goals & Desires",
    buyingTriggers: "Buying Triggers",
    objections: "Objections",
    psychology: "Psychology",
    whereTheyHangOut: "Where To Reach Them",
    howToPosition: "How To Position",
    geographyContext: "Geography Context",
  };

  const SECTION_GROUPS = [
    { title: "Who They Are", icon: User, keys: ["whoTheyAre", "coreResponsibilities", "psychology"] },
    { title: "What Drives Them", icon: TrendingUp, keys: ["painPoints", "goalsDesires", "buyingTriggers"] },
    { title: "How To Win Them", icon: Trophy, keys: ["objections", "howToPosition", "whereTheyHangOut", "geographyContext"] },
  ];

  const CARD_STYLES: Record<string, { icon: any; border: string; iconColor: string }> = {
    painPoints: { icon: AlertTriangle, border: "border-primary", iconColor: "text-primary" },
    goalsDesires: { icon: Target, border: "border-emerald-400", iconColor: "text-emerald-400" },
    buyingTriggers: { icon: Zap, border: "border-primary", iconColor: "text-primary" },
    objections: { icon: ShieldAlert, border: "border-destructive", iconColor: "text-destructive" },
  };

  const getSnapshotNodes = (icp: any) => {
    if (!icp) return [];
    const nodes = [
      { key: "psychology", icon: Brain, label: "Psychology", text: icp.psychology },
      { key: "painPoints", icon: AlertTriangle, label: "Top Pain Point", text: Array.isArray(icp.painPoints) ? icp.painPoints[0] : icp.painPoints },
      { key: "goalsDesires", icon: Target, label: "Top Goal", text: Array.isArray(icp.goalsDesires) ? icp.goalsDesires[0] : icp.goalsDesires },
      { key: "buyingTriggers", icon: Zap, label: "Top Trigger", text: Array.isArray(icp.buyingTriggers) ? icp.buyingTriggers[0] : icp.buyingTriggers },
      { key: "whereTheyHangOut", icon: Radio, label: "Best Channel", text: Array.isArray(icp.whereTheyHangOut) ? icp.whereTheyHangOut[0] : icp.whereTheyHangOut },
    ];
    return nodes.filter(n => n.text);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">Define Your <span className="accent-text">Ideal Customers</span></h2>
      <p className="text-muted-foreground mb-6 text-sm">Build {icps.length} detailed customer profiles for your business</p>

      <div className="glass-card p-4 mb-6 border-primary/30">
        <p className="text-sm text-muted-foreground mb-2">
          Think of these as the types of people who'd buy from you. For each one, tell us:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          {sellingTo === "D2C" ? (
            <>
              <li>What kind of consumer they are and what they care about</li>
              <li>How much they typically spend and where they're based</li>
            </>
          ) : isBothMode ? (
            <>
              <li>Whether they're a business buyer or an individual consumer</li>
              <li>What matters most to them and where they're based</li>
            </>
          ) : (
            <>
              <li>What industry they work in and where they're based</li>
              <li>Their job title and how big their company is</li>
            </>
          )}
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          We'll use this to figure out what to say to them and where to find them.
          {isBothMode && ` You can add up to ${MAX_ICP_COUNT} ICPs in total, mix and match B2B and D2C as needed.`}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {icps.map((_, idx) => {
          const type = getIcpType(idx);
          const showB2B = isBothMode ? type === "B2B" : sellingTo !== "D2C";
          const showD2C = isBothMode ? type === "D2C" : (sellingTo === "D2C" || sellingTo === "Both");
          return (
          <Collapsible key={idx} open={openIcp === idx} onOpenChange={(open) => open && setOpenIcp(idx)}>
            <div className={`glass-card p-4 flex items-center justify-between transition-colors ${openIcp === idx ? "border-primary" : ""}`}>
              <CollapsibleTrigger className="flex-1 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${openIcp === idx ? "accent-bg" : "bg-secondary text-muted-foreground"}`}>
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-sm">ICP {idx + 1}</span>
                  {isBothMode && type && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{type}</span>
                  )}
                  {type === "D2C" ? (
                    icps[idx].d2cSelectedIdx !== null && (
                      <span className="text-xs text-muted-foreground">(customer description selected)</span>
                    )
                  ) : type === "B2B" ? (
                    icps[idx].roles.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({icps[idx].roles.length} roles, {icps[idx].sizes.length} sizes, {icps[idx].industries.length} industries, {icps[idx].geography.length} geographies)
                      </span>
                    )
                  ) : null}
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openIcp === idx ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              {icps.length > DEFAULT_ICP_COUNT && (
                <button type="button" onClick={() => removeIcp(idx)}
                  className="ml-2 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0" aria-label={`Remove ICP ${idx + 1}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <CollapsibleContent>
              <div className="glass-card p-5 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-4 border-primary">
                {isBothMode && (
                  <div className="sm:col-span-2">
                    <Label className="text-sm text-muted-foreground mb-2 block">Is this ICP a business buyer or an individual consumer? *</Label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => updateIcp(idx, "icpType", "B2B")}
                        className={`flex-1 flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-md border transition-all ${
                          type === "B2B" ? "tag-selected border-primary" : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground"
                        }`}>
                        <Briefcase className="w-4 h-4" /> Business (B2B)
                      </button>
                      <button type="button" onClick={() => updateIcp(idx, "icpType", "D2C")}
                        className={`flex-1 flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-md border transition-all ${
                          type === "D2C" ? "tag-selected border-primary" : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground"
                        }`}>
                        <ShoppingBag className="w-4 h-4" /> Individual Consumer (D2C)
                      </button>
                    </div>
                    {!type && <p className="text-xs text-muted-foreground mt-2">Choose an option above to continue.</p>}
                  </div>
                )}
                {showB2B && (
                  <>
                    <MultiSelect
                      label="Industries"
                      options={INDUSTRIES}
                      selected={icps[idx].industries}
                      onChange={v => updateIcp(idx, "industries", v)}
                      hasOther
                      otherValue={icps[idx].industryOther}
                      onOtherChange={v => updateIcp(idx, "industryOther", v)}
                      maxItems={3}
                    />
                    <MultiSelect
                      label="Target Geography"
                      options={COUNTRIES}
                      selected={icps[idx].geography}
                      onChange={v => updateIcp(idx, "geography", v)}
                      hasOther
                      otherValue={icps[idx].geographyOther}
                      onOtherChange={v => updateIcp(idx, "geographyOther", v)}
                    />
                    <MultiSelect
                      label="Roles"
                      options={ROLES}
                      selected={icps[idx].roles}
                      onChange={v => updateIcp(idx, "roles", v)}
                      hasOther
                      otherValue={icps[idx].roleOther}
                      onOtherChange={v => updateIcp(idx, "roleOther", v)}
                    />
                    <MultiSelect label="Company Size" options={SIZES} selected={icps[idx].sizes} onChange={v => updateIcp(idx, "sizes", v)} hasOther searchable={false} />
                  </>
                )}
                {showD2C && (
                  <>
                    <D2CDescriptionBox
                      idx={idx}
                      description={icps[idx].d2cDescription}
                      options={icps[idx].d2cOptions}
                      optionsKey={icps[idx].d2cOptionsKey}
                      selectedIdx={icps[idx].d2cSelectedIdx}
                      updateIcp={updateIcp}
                    />
                    <MultiSelect
                      label="Target Geography"
                      options={COUNTRIES}
                      selected={icps[idx].geography}
                      onChange={v => updateIcp(idx, "geography", v)}
                      hasOther
                      otherValue={icps[idx].geographyOther}
                      onOtherChange={v => updateIcp(idx, "geographyOther", v)}
                    />
                  </>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          );
        })}
      </div>

      {isBothMode && (
        <div className="mb-6 -mt-3">
          <Button
            type="button"
            variant="outline"
            onClick={addIcp}
            disabled={icps.length >= MAX_ICP_COUNT}
            className="w-full border-dashed gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4" />
            {icps.length >= MAX_ICP_COUNT ? `Maximum ${MAX_ICP_COUNT} ICPs reached` : "Add Another ICP"}
          </Button>
        </div>
      )}

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {!loading && result.length === 0 && (
        <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate ICP Profiles
        </Button>
      )}

      {loading && <LoadingSpinner text="Generating your ICPs... this takes ~20 seconds" />}

      {result.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
          <div className="flex gap-1 mb-4">
            {result.map((icp: any, idx: number) => (
              <button key={idx} onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${activeTab === idx ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                ICP {idx + 1}
                {icp?.audienceType && (
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${activeTab === idx ? "bg-black/20 text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                    {icp.audienceType}
                  </span>
                )}
              </button>
            ))}
            {result.some((icp: any) => Array.isArray(icp.channelPartners) && icp.channelPartners.length > 0) && (
              <button onClick={() => setActiveTab("partners")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "partners" ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                Channel Partners
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "partners" ? (
              <motion.div key="partners" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
                {result.map((icp: any, idx: number) => {
                  const partners = icp.channelPartners;
                  if (!Array.isArray(partners) || partners.length === 0) return null;
                  return (
                    <div key={idx} className="glass-card p-6">
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        For ICP {idx + 1}: {icp.name}
                        {icp?.audienceType && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-background text-muted-foreground normal-case tracking-normal">{icp.audienceType}</span>
                        )}
                        <InfoTooltip text="Other businesses or individuals who already have this ICP's trust, and could refer or co-sell to them" />
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {partners.map((p: any, i: number) => (
                          <div key={i} className="bg-secondary p-4 rounded-md">
                            <p className="text-sm font-semibold text-foreground">{p.partnerType}</p>
                            {p.whyTheyFit && (
                              <p className="text-xs text-muted-foreground mt-2"><span className="text-muted-foreground/70 uppercase text-[10px] tracking-wider">Why they fit</span><br />{p.whyTheyFit}</p>
                            )}
                            {p.approachAngle && (
                              <p className="text-xs text-primary mt-2"><span className="text-muted-foreground/70 uppercase text-[10px] tracking-wider">How to approach</span><br />{p.approachAngle}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
              <div className="glass-card p-6 text-center">
                <h3 className="text-base font-semibold accent-text">{result[activeTab as number]?.name}</h3>
                {result[activeTab as number]?.audienceType && (
                  <span className="mt-2 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {result[activeTab as number].audienceType === "D2C" ? "Individual Consumer" : "Business Buyer"}
                  </span>
                )}
              </div>

              {(() => {
                const nodes = getSnapshotNodes(result[activeTab as number]);
                if (nodes.length < 3) return null;
                const angleStep = 360 / nodes.length;
                const radius = 32;
                return (
                  <div className="glass-card p-6">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 flex items-center gap-1">
                      ICP Snapshot
                      <InfoTooltip text="A quick visual summary of this ICP's core psychology, pain point, goal, buying trigger, and best channel" />
                    </h3>
                    <div className="relative mx-auto h-80 sm:h-96" style={{ maxWidth: 560 }}>
                      <svg className="absolute inset-0 w-full h-full text-border" style={{ overflow: "visible" }}>
                        {nodes.map((n, i) => {
                          const angle = (-90 + i * angleStep) * (Math.PI / 180);
                          const x = 50 + radius * Math.cos(angle);
                          const y = 50 + radius * Math.sin(angle);
                          return <line key={n.key} x1="50%" y1="50%" x2={`${x}%`} y2={`${y}%`} stroke="currentColor" strokeWidth="1.5" />;
                        })}
                      </svg>
                      <div className="absolute rounded-2xl accent-bg flex items-center justify-center text-center p-2 shadow-lg w-28 h-28 sm:w-32 sm:h-32"
                        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                        <span className="text-[10px] sm:text-[11px] font-bold text-primary-foreground leading-tight line-clamp-5">{result[activeTab as number]?.name}</span>
                      </div>
                      {nodes.map((n, i) => {
                        const angle = (-90 + i * angleStep) * (Math.PI / 180);
                        const x = 50 + radius * Math.cos(angle);
                        const y = 50 + radius * Math.sin(angle);
                        const Icon = n.icon;
                        return (
                          <div key={n.key} className="absolute glass-card p-2.5 text-left w-[38%] sm:w-[30%]"
                            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
                            <div className="flex items-center gap-1 mb-1">
                              <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{n.label}</span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-foreground line-clamp-3">{n.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {SECTION_GROUPS.map(group => {
                const visibleKeys = group.keys.filter(key => result[activeTab as number]?.[key]);
                if (visibleKeys.length === 0) return null;

                const GroupIcon = group.icon;
                return (
                  <div key={group.title} className="glass-card p-6">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <GroupIcon className="w-4 h-4" />
                      {group.title}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visibleKeys.map(key => {
                        const val = result[activeTab as number]?.[key];
                        const isD2CIcp = result[activeTab as number]?.audienceType === "D2C";
                        const label = key === "coreResponsibilities" && isD2CIcp ? "Daily Life & Habits" : SECTION_LABELS[key];
                        const tooltip = key === "coreResponsibilities" && isD2CIcp
                          ? "Their daily routines and lifestyle context relevant to this purchase decision, useful for tailoring your messaging"
                          : TOOLTIPS[key];
                        const header = (
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                            {label}
                            {tooltip && <InfoTooltip text={tooltip} />}
                          </h4>
                        );

                        const cardStyle = CARD_STYLES[key];
                        if (cardStyle && Array.isArray(val)) {
                          const CardIcon = cardStyle.icon;
                          return (
                            <div key={key} className="md:col-span-2">
                              {header}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {val.map((item: string, i: number) => (
                                  <div key={i} className={`bg-secondary p-3 rounded-md text-sm text-foreground border-l-2 ${cardStyle.border} flex items-start gap-2`}>
                                    <CardIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cardStyle.iconColor}`} />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        if (key === "whereTheyHangOut" && Array.isArray(val)) {
                          return (
                            <div key={key}>
                              {header}
                              <div className="flex flex-wrap gap-1.5">
                                {val.map((item: string, i: number) => (
                                  <span key={i} className="text-xs px-2 py-1 rounded tag-selected border border-primary">{item}</span>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        if (key === "howToPosition") {
                          return (
                            <div key={key} className="md:col-span-2">
                              {header}
                              <div className="bg-primary/10 border border-primary/30 p-4 rounded-md text-sm text-foreground">{val}</div>
                            </div>
                          );
                        }

                        return (
                          <div key={key} className={key === "objections" ? "md:col-span-2" : ""}>
                            {header}
                            {Array.isArray(val) ? (
                              <div className="space-y-1.5">
                                {val.map((item: string, i: number) => (
                                  <div key={i} className="bg-secondary p-2.5 rounded-md flex items-start gap-1.5">
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                    <span className="text-sm text-foreground">{item}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">{val}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {(!result[activeTab as number]?.painPoints || result[activeTab as number].painPoints.length === 0) && (
                <p className="text-destructive text-sm">Warning: Pain points missing for this ICP</p>
              )}
            </motion.div>
            )}
          </AnimatePresence>

          <Button onClick={generate} variant="ghost" className="w-full mt-4 text-muted-foreground">Regenerate ICPs</Button>
        </motion.div>
      )}

      {result.length > 0 && (
        <div className="mt-8 flex items-center justify-between">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : <div />}
          <Button onClick={() => { onSave({ inputs: icps, offer, result }); onNext(); }} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function D2CDescriptionBox({ idx, description, options, optionsKey, selectedIdx, updateIcp }: {
  idx: number;
  description: string;
  options: string[];
  optionsKey: string;
  selectedIdx: number | null;
  updateIcp: (idx: number, field: keyof IcpInput, value: any) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const key = description.trim();

  useEffect(() => {
    if (!key) return;
    if (key === optionsKey) return;

    const timer = setTimeout(async () => {
      setGenerating(true);
      try {
        const prompt = `Read this business owner's rough description of one type of individual consumer (D2C, not a business buyer) they want to target, and turn it into 3 distinct, more detailed, cleaner rewritten versions of this customer description.
Each version must be 2 to 3 sentences describing who this person is, their lifestyle or life stage, and why they'd want this product or service. Fix grammar and capitalisation. Do not invent details that are not implied by the description; make reasonable, conservative inferences where something is implied but not explicit.
Make the 3 versions meaningfully different in phrasing and emphasis (for example, one could lead with their lifestyle, one with their motivation, one with their life stage), not just minor rewordings of each other.

${NO_JARGON_RULE}

Customer description: ${key}

Return ONLY a valid JSON array of exactly 3 strings (no markdown, no code blocks).`;
        const raw = await callGemini(prompt);
        const match = raw.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(match ? match[0] : raw);
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("bad shape");
        updateIcp(idx, "d2cOptions", parsed.slice(0, 3).map((s: string) => sanitizeAIText(String(s))));
      } catch {
        // Fall back to the user's own words, unformatted, so they're never blocked; they can edit each into shape themselves.
        updateIcp(idx, "d2cOptions", [sanitizeAIText(key), sanitizeAIText(key), sanitizeAIText(key)]);
      } finally {
        updateIcp(idx, "d2cOptionsKey", key);
        updateIcp(idx, "d2cSelectedIdx", null);
        setGenerating(false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [key]);

  return (
    <div className="sm:col-span-2">
      <Label className="text-sm text-muted-foreground">Describe This Customer, In Your Own Words *</Label>
      <Textarea
        value={description}
        onChange={e => updateIcp(idx, "d2cDescription", e.target.value)}
        placeholder="e.g. Young parents who just moved into a new home, want it to look nice, but don't have a big budget to spend on decor"
        className="mt-1.5 bg-secondary border-border focus:border-primary min-h-[70px]"
      />
      <p className="text-xs text-muted-foreground mt-1">Just describe them like you would to a person. We'll turn it into 3 versions you can edit and choose from below.</p>

      {generating && (
        <p className="text-xs text-muted-foreground mt-2">Writing 3 versions of this customer…</p>
      )}

      {options.length > 0 && (
        <div className="mt-3">
          <Label className="text-sm text-muted-foreground">Choose This Customer Description *</Label>
          <div className="mt-2 space-y-2">
            {options.map((opt, i) => (
              <div key={i} onClick={() => updateIcp(idx, "d2cSelectedIdx", i)}
                className={`p-3 rounded-md border cursor-pointer transition-colors flex items-start gap-2 ${selectedIdx === i ? "border-primary bg-primary/5" : "border-border bg-secondary"}`}>
                <input
                  type="radio"
                  checked={selectedIdx === i}
                  onChange={() => updateIcp(idx, "d2cSelectedIdx", i)}
                  className="accent-primary w-4 h-4 mt-1.5 shrink-0"
                />
                <Textarea
                  value={opt}
                  onChange={e => { const v = e.target.value; updateIcp(idx, "d2cOptions", options.map((x, ii) => ii === i ? v : x)); }}
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-0 min-h-[60px] resize-none text-sm"
                />
              </div>
            ))}
          </div>
          {selectedIdx === null && (
            <p className="text-xs text-destructive mt-1">Select one of the 3 versions above to use for this ICP</p>
          )}
        </div>
      )}
    </div>
  );
}
