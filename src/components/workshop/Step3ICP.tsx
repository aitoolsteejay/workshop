import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { MultiSelect } from "./MultiSelect";
import { callGemini, describeGeminiError, AI_PARSE_ERROR_MESSAGE } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { NO_JARGON_RULE, PERSONALISATION_RULE, GEO_AWARENESS_RULE, BUSINESS_TYPE_RULE } from "@/lib/prompt-rules";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { ChevronDown, ArrowLeft } from "lucide-react";
import { INDUSTRIES, COUNTRIES, CONSUMER_PERSONAS, SPEND_TIERS, CONSUMER_CATEGORIES } from "@/lib/constants";
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
  audienceType: "B2B" | "D2C";
  roles: string[];
  sizes: string[];
  industries: string[];
  industryOther: string;
  roleOther: string;
  geography: string[];
  geographyOther: string;
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
  const defaultAudienceType: "B2B" | "D2C" = sellingTo === "D2C" ? "D2C" : "B2B";

  const emptyIcp = (): IcpInput => ({ audienceType: defaultAudienceType, roles: [], sizes: [], industries: [], industryOther: "", roleOther: "", geography: [], geographyOther: "" });
  const [icps, setIcps] = useState<IcpInput[]>(() => {
    const inputs = data?.inputs || [];
    while (inputs.length < 3) inputs.push(emptyIcp());
    return inputs.map((icp: any) => ({ ...emptyIcp(), ...icp }));
  });
  const [openIcp, setOpenIcp] = useState(0);
  const [result, setResult] = useState<any[]>(data?.result || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const offer = profileData?.coreOffer || data?.offer || "";
  const showAudienceToggle = sellingTo === "Both";
  const icpAudienceType = (idx: number): "B2B" | "D2C" => showAudienceToggle ? icps[idx].audienceType : defaultAudienceType;

  useAutosave({ inputs: icps, offer, result }, onSave);

  const updateIcp = (idx: number, field: keyof IcpInput, value: any) => {
    setIcps(p => p.map((icp, i) => i === idx ? { ...icp, [field]: value } : icp));
  };

  const setIcpAudienceType = (idx: number, type: "B2B" | "D2C") => {
    setIcps(p => p.map((icp, i) => i === idx && icp.audienceType !== type
      ? { ...icp, audienceType: type, roles: [], sizes: [], industries: [], roleOther: "", industryOther: "" }
      : icp));
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
    for (let i = 0; i < 3; i++) {
      const isD2C = icpAudienceType(i) === "D2C";
      if (icps[i].roles.length === 0) { setError(`ICP ${i + 1}: select at least one ${isD2C ? "customer persona" : "role"}`); return; }
      if (icps[i].sizes.length === 0) { setError(`ICP ${i + 1}: select at least one ${isD2C ? "spending segment" : "company size"}`); return; }
      if (icps[i].industries.length === 0) { setError(`ICP ${i + 1}: select at least one ${isD2C ? "interest category" : "industry"}`); return; }
    }
    setError("");
    setLoading(true);
    setResult([]);

    const icpTypeLines = Array.from({ length: 3 }, (_, i) => {
      const type = icpAudienceType(i);
      if (type === "D2C") {
        return `ICP ${i + 1} Audience Type: D2C (individual consumer). Inputs: Consumer Personas: ${getRoles(icps[i]).join(", ")}, Spending Segment: ${icps[i].sizes.filter(x => x !== "Other").join(", ")}, Interest Categories: ${getIndustries(icps[i]).join(", ")}, Target Geography: ${getGeographies(icps[i]).join(", ") || "Not specified"}`;
      }
      return `ICP ${i + 1} Audience Type: B2B (business buyer). Inputs: Roles: ${getRoles(icps[i]).join(", ")}, Company Sizes: ${icps[i].sizes.filter(x => x !== "Other").join(", ")}, Industries: ${getIndustries(icps[i]).join(", ")}, Target Geography: ${getGeographies(icps[i]).join(", ") || "Not specified"}`;
    }).join("\n");

    const prompt = `You are an expert Growth Strategist skilled at building both B2B and D2C customer profiles. Generate 3 deep, strategic Ideal Customer Profiles.

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
- Pain Points for all 3 ICPs MUST be filled.
- Channel Partners must be specific and realistic to this ICP's industry and geography, not generic ("consultants" is too vague, "boutique HR consultancies serving Series A SaaS startups" is specific).
- Adapt all outputs to reflect the target geography's market context, tone, and behavior.
- Do NOT use em-dashes, asterisks, or hash signs in any output.

Return ONLY a valid JSON array of exactly 3 objects (no markdown, no code blocks). Each object must have: name, audienceType ("B2B" or "D2C"), whoTheyAre (array), coreResponsibilities (array), painPoints (array), goalsDesires (array), buyingTriggers (array), objections (array), psychology (string), whereTheyHangOut (array), howToPosition (string), geographyContext (string), channelPartners (array of objects, each with partnerType, whyTheyFit, approachAngle).`;

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
      parsed = Array.isArray(parsed) ? parsed.map((icp: any, i: number) => ({ ...icp, audienceType: icp?.audienceType === "D2C" || icp?.audienceType === "B2B" ? icp.audienceType : icpAudienceType(i) })) : parsed;
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
    { title: "Who They Are", keys: ["whoTheyAre", "coreResponsibilities", "psychology"] },
    { title: "What Drives Them", keys: ["painPoints", "goalsDesires", "buyingTriggers"] },
    { title: "How To Win Them", keys: ["objections", "howToPosition", "whereTheyHangOut", "geographyContext"] },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">Define Your <span className="accent-text">Ideal Customers</span></h2>
      <p className="text-muted-foreground mb-6 text-sm">Build 3 detailed customer profiles for your business</p>

      <div className="glass-card p-4 mb-6 border-primary/30">
        <p className="text-sm text-muted-foreground mb-2">
          Think of these as the 3 types of people who'd buy from you. For each one, tell us:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          {defaultAudienceType === "D2C" && !showAudienceToggle ? (
            <>
              <li>What kind of consumer they are and what they care about</li>
              <li>How much they typically spend and where they're based</li>
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
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {Array.from({ length: 3 }, (_, idx) => {
          const isD2C = icpAudienceType(idx) === "D2C";
          return (
          <Collapsible key={idx} open={openIcp === idx} onOpenChange={(open) => open && setOpenIcp(idx)}>
            <CollapsibleTrigger className="w-full">
              <div className={`glass-card p-4 flex items-center justify-between cursor-pointer transition-colors ${openIcp === idx ? "border-primary" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${openIcp === idx ? "accent-bg" : "bg-secondary text-muted-foreground"}`}>
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-sm">ICP {idx + 1}</span>
                  {showAudienceToggle && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{icps[idx].audienceType}</span>
                  )}
                  {icps[idx].roles.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({icps[idx].roles.length} {isD2C ? "personas" : "roles"}, {icps[idx].sizes.length} {isD2C ? "spend segments" : "sizes"}, {icps[idx].industries.length} {isD2C ? "categories" : "industries"}, {icps[idx].geography.length} geographies)
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openIcp === idx ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="glass-card p-5 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-4 border-primary">
                {showAudienceToggle && (
                  <div className="sm:col-span-2 flex items-center gap-2 -mt-1 mb-1">
                    <span className="text-xs text-muted-foreground">This ICP is:</span>
                    <div className="flex gap-1 bg-secondary rounded-md p-0.5">
                      {(["B2B", "D2C"] as const).map(t => (
                        <button key={t} type="button" onClick={() => setIcpAudienceType(idx, t)}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${icps[idx].audienceType === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                          {t === "B2B" ? "A Business" : "An Individual Consumer"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <MultiSelect
                  label={isD2C ? "Interest Categories" : "Industries"}
                  options={isD2C ? CONSUMER_CATEGORIES : INDUSTRIES}
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
                  label={isD2C ? "Consumer Persona" : "Roles"}
                  options={isD2C ? CONSUMER_PERSONAS : ROLES}
                  selected={icps[idx].roles}
                  onChange={v => updateIcp(idx, "roles", v)}
                  hasOther
                  otherValue={icps[idx].roleOther}
                  onOtherChange={v => updateIcp(idx, "roleOther", v)}
                />
                <MultiSelect label={isD2C ? "Spending Segment" : "Company Size"} options={isD2C ? SPEND_TIERS : SIZES} selected={icps[idx].sizes} onChange={v => updateIcp(idx, "sizes", v)} hasOther searchable={false} />
              </div>
            </CollapsibleContent>
          </Collapsible>
          );
        })}
      </div>

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
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === idx ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                ICP {idx + 1}
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
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
                        For ICP {idx + 1}: {icp.name}
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
                {sellingTo === "Both" && result[activeTab as number]?.audienceType && (
                  <span className="mt-2 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {result[activeTab as number].audienceType === "D2C" ? "Individual Consumer" : "Business Buyer"}
                  </span>
                )}
              </div>

              {SECTION_GROUPS.map(group => {
                const visibleKeys = group.keys.filter(key => result[activeTab as number]?.[key]);
                if (visibleKeys.length === 0) return null;

                return (
                  <div key={group.title} className="glass-card p-6">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">{group.title}</h3>
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

                        if (key === "painPoints" && Array.isArray(val)) {
                          return (
                            <div key={key} className="md:col-span-2">
                              {header}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {val.map((item: string, i: number) => (
                                  <div key={i} className="bg-secondary p-3 rounded-md text-sm text-foreground border-l-2 border-primary">{item}</div>
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
                              <ul className="space-y-1">
                                {val.map((item: string, i: number) => <li key={i} className="text-sm text-muted-foreground">• {item}</li>)}
                              </ul>
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
