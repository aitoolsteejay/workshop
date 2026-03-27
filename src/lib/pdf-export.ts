import jsPDF from "jspdf";
import { sanitizeAIText } from "./sanitize";

const LINKS = {
  linkedin: "https://www.linkedin.com/in/tejasjhaveri",
  instagram: "https://www.instagram.com/tejas_jhaveri",
  calendly: "https://calendly.com/founder-myntmore/30min",
  notion: "https://www.notion.so/myntmorejobboard/Myntmore-Services-a78d1e0504524ff7a8b2c46ee61a42ac",
};

function clean(text: string): string {
  return sanitizeAIText(text || "");
}

function addHeader(doc: jsPDF) {
  doc.setFontSize(8);
  doc.setTextColor(120);
  const w = doc.internal.pageSize.getWidth();
  doc.text("Myntmore x B2B Growth Workshop", w - 15, 12, { align: "right" });
}

function addFooter(doc: jsPDF) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(100);
  const y = h - 10;
  doc.text(`LinkedIn: ${LINKS.linkedin}  |  Instagram: ${LINKS.instagram}`, 15, y);
  doc.text(`Book a Call: ${LINKS.calendly}  |  Myntmore: ${LINKS.notion}`, 15, y + 4);
}

function addHeaderFooter(doc: jsPDF) {
  addHeader(doc);
  addFooter(doc);
}

function newSection(doc: jsPDF, title: string) {
  doc.addPage();
  addHeaderFooter(doc);
  doc.setFontSize(18);
  doc.setTextColor(255, 201, 71);
  doc.text(clean(title), 15, 25);
  return 35;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5): number {
  if (!text) return y;
  doc.setFontSize(10);
  doc.setTextColor(60);
  const lines = doc.splitTextToSize(clean(text), maxWidth);
  const pageH = doc.internal.pageSize.getHeight() - 20;
  for (const line of lines) {
    if (y > pageH) {
      doc.addPage();
      addHeaderFooter(doc);
      y = 25;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function addBulletList(doc: jsPDF, items: string[], x: number, y: number, maxWidth: number): number {
  if (!items || !Array.isArray(items)) return y;
  for (const item of items) {
    y = addWrappedText(doc, `• ${clean(item)}`, x, y, maxWidth);
    y += 1;
  }
  return y;
}

function addSubHeader(doc: jsPDF, text: string, y: number): number {
  const pageH = doc.internal.pageSize.getHeight() - 20;
  if (y > pageH) { doc.addPage(); addHeaderFooter(doc); y = 25; }
  doc.setFontSize(12);
  doc.setTextColor(255, 201, 71);
  doc.text(clean(text), 15, y);
  return y + 7;
}

export function generatePDF(sessionData: any) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const maxW = w - 30;
  const userName = sessionData?.user_name || "Attendee";

  // Cover page
  addHeaderFooter(doc);
  doc.setFontSize(28);
  doc.setTextColor(255, 201, 71);
  doc.text("B2B Growth Strategy", w / 2, 80, { align: "center" });
  doc.setFontSize(16);
  doc.setTextColor(200);
  doc.text(userName, w / 2, 95, { align: "center" });
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString(), w / 2, 105, { align: "center" });
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("Powered by Myntmore", w / 2, 120, { align: "center" });

  // Table of Contents
  let y = newSection(doc, "Table of Contents");
  const tocItems = ["Profile Analysis", "ICP 1", "ICP 2", "ICP 3", "Value Propositions", "Website Prompt", "GTM Strategy", "Outreach Playbook"];
  doc.setFontSize(11);
  doc.setTextColor(60);
  tocItems.forEach((item, i) => {
    doc.text(`${i + 1}. ${item}`, 20, y);
    y += 8;
  });

  // Profile Analysis
  const profile = sessionData?.profile_data?.result;
  y = newSection(doc, "Profile Analysis");
  if (profile) {
    const score = Math.min(profile.finalScore || 0, 100);
    y = addSubHeader(doc, `Score: ${score}/100, ${clean(profile.scoreMeaning)}`, y);
    y += 3;
    if (profile.scoreBreakdown) {
      for (const [key, val] of Object.entries(profile.scoreBreakdown) as any) {
        y = addWrappedText(doc, `${key}: ${Math.min(val.score, 20)}/20, ${clean(val.explanation)}`, 15, y, maxW);
        y += 2;
      }
    }
    y += 5;
    y = addSubHeader(doc, "What's Working", y);
    y = addBulletList(doc, profile.whatsWorking, 15, y, maxW);
    y += 3;
    y = addSubHeader(doc, "To Improve", y);
    y = addBulletList(doc, profile.toImprove, 15, y, maxW);
    y += 3;
    y = addSubHeader(doc, "Generated Headlines", y);
    y = addBulletList(doc, profile.headlines, 15, y, maxW);
  }

  // ICPs
  const icps = sessionData?.icp_data?.result || [];
  for (let i = 0; i < icps.length; i++) {
    const icp = icps[i];
    y = newSection(doc, `ICP ${i + 1}, ${clean(icp.name || "Untitled")}`);
    const fields = [
      { key: "whoTheyAre", label: "Who They Are" },
      { key: "coreResponsibilities", label: "Core Responsibilities" },
      { key: "painPoints", label: "Pain Points" },
      { key: "goalsDesires", label: "Goals & Desires" },
      { key: "buyingTriggers", label: "Buying Triggers" },
      { key: "objections", label: "Objections" },
      { key: "psychology", label: "Psychology" },
      { key: "whereTheyHangOut", label: "Where They Hang Out" },
      { key: "howToPosition", label: "How to Position" },
    ];
    for (const f of fields) {
      const val = icp[f.key];
      if (!val) continue;
      y = addSubHeader(doc, f.label, y);
      if (Array.isArray(val)) {
        y = addBulletList(doc, val, 15, y, maxW);
      } else {
        y = addWrappedText(doc, val, 15, y, maxW);
      }
      y += 3;
    }
  }

  // Value Propositions
  const vps = sessionData?.value_prop_data?.result || [];
  y = newSection(doc, "Value Propositions");
  for (let i = 0; i < vps.length; i++) {
    const vp = vps[i];
    y = addSubHeader(doc, `ICP ${i + 1}, ${clean(vp.icpName)}`, y);
    if (vp.corePromise) { y = addWrappedText(doc, `Core Promise: ${clean(vp.corePromise)}`, 15, y, maxW); y += 2; }
    if (vp.beforeState) { y = addSubHeader(doc, "Before", y); y = addBulletList(doc, vp.beforeState, 15, y, maxW); y += 2; }
    if (vp.afterState) { y = addSubHeader(doc, "After", y); y = addBulletList(doc, vp.afterState, 15, y, maxW); y += 2; }
    if (vp.threeStepSystem) {
      y = addSubHeader(doc, "3-Step System", y);
      for (const step of vp.threeStepSystem) {
        y = addWrappedText(doc, `${clean(step.step)}: ${clean(step.description)}`, 15, y, maxW);
        y += 2;
      }
    }
    if (vp.oneLiner) { y = addWrappedText(doc, `One-liner: ${clean(vp.oneLiner)}`, 15, y, maxW); y += 2; }
    if (vp.shortPitch) { y = addWrappedText(doc, `Pitch: ${clean(vp.shortPitch)}`, 15, y, maxW); y += 2; }
    y += 5;
  }
  if (sessionData?.value_prop_data?.positioning) {
    y += 3;
    y = addSubHeader(doc, "Core Positioning Statement", y);
    y = addWrappedText(doc, clean(sessionData.value_prop_data.positioning), 15, y, maxW);
  }

  // Website Prompt
  y = newSection(doc, "Website Prompt");
  y = addWrappedText(doc, clean(sessionData?.website_data?.generatedPrompt || "Not generated"), 15, y, maxW);

  // GTM
  const gtm = sessionData?.gtm_data?.result;
  y = newSection(doc, "GTM Strategy");
  if (gtm) {
    const strategies = gtm.icpStrategies || (gtm.channels ? [gtm] : []);
    for (let si = 0; si < strategies.length; si++) {
      const strat = strategies[si];
      if (strat.icpName) {
        y = addSubHeader(doc, `ICP ${si + 1}: ${clean(strat.icpName)}`, y);
        y += 2;
      }
      if (strat.channels) {
        y = addSubHeader(doc, "Primary Channels", y);
        for (const ch of strat.channels) {
          y = addWrappedText(doc, `${clean(ch.name)} (Effort: ${ch.effort}, ROI: ${ch.roi})${ch.startHere ? " , START HERE" : ""}`, 15, y, maxW);
          y = addWrappedText(doc, clean(ch.useCase), 15, y, maxW);
          y += 3;
        }
      }
      if (strat.timeline) {
        y = addSubHeader(doc, "Execution Timeline", y);
        for (const phase of strat.timeline) {
          y = addWrappedText(doc, `${clean(phase.phase)}: ${clean(phase.title)}`, 15, y, maxW);
          y = addBulletList(doc, phase.tasks, 15, y, maxW);
          y += 3;
        }
      }
      if (strat.partners?.types) {
        y = addSubHeader(doc, "Partner Strategy", y);
        for (const p of strat.partners.types) {
          y = addWrappedText(doc, `${clean(p.type)}: ${clean(p.angle)}`, 15, y, maxW);
          y += 2;
        }
      }
      if (strat.leadMagnets) {
        y = addSubHeader(doc, "Lead Magnets", y);
        for (const lm of strat.leadMagnets) {
          y = addWrappedText(doc, `${clean(lm.name)} (${lm.type || lm.format}) for ${clean(lm.targetICP || strat.icpName || `ICP ${si + 1}`)}`, 15, y, maxW);
          y += 3;
        }
      }
      y += 5;
    }
  }

  // Outreach Playbook
  const outreach = sessionData?.outreach_data?.result;
  y = newSection(doc, "Outreach Playbook");
  if (outreach?.playbooks) {
    for (const pb of outreach.playbooks) {
      y = addSubHeader(doc, clean(pb.icpName), y);
      if (pb.strategicApproach) {
        y = addWrappedText(doc, `Best Angle: ${clean(pb.strategicApproach.bestAngle)}`, 15, y, maxW);
        y = addWrappedText(doc, `Style: ${clean(pb.strategicApproach.positioningStyle)}`, 15, y, maxW);
        y += 3;
      }
      if (pb.followUpSystem) {
        y = addWrappedText(doc, `Total Touches: ${pb.followUpSystem.totalTouches}`, 15, y, maxW);
        y = addWrappedText(doc, `Tone Evolution: ${clean(pb.followUpSystem.toneEvolution)}`, 15, y, maxW);
        y += 3;
      }
      if (pb.messageDistribution) {
        y = addSubHeader(doc, "Message Distribution", y);
        for (const m of pb.messageDistribution) {
          y = addWrappedText(doc, `Touch ${m.touch}: ${clean(m.type)}`, 15, y, maxW);
        }
        y += 3;
      }
      if (pb.whatToAvoid) {
        y = addSubHeader(doc, "What to Avoid", y);
        y = addBulletList(doc, pb.whatToAvoid, 15, y, maxW);
      }
      y += 5;
    }
  }

  doc.save(`B2B_Growth_Strategy_${userName.replace(/\s+/g, "_")}.pdf`);
}
