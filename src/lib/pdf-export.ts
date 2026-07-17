import jsPDF from "jspdf";
import { sanitizeAIText } from "./sanitize";
import { MYNTMORE_NOTION_LINK } from "./constants";
import myntmoreLogo from "@/assets/myntmore-full-logo.png";

let cachedLogoImg: HTMLImageElement | null = null;
let cachedLogoRatio = 1;

async function loadLogo(): Promise<boolean> {
  if (cachedLogoImg) return true;
  try {
    const img = new Image();
    img.src = myntmoreLogo;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      setTimeout(reject, 3000);
    });
    cachedLogoImg = img;
    cachedLogoRatio = img.height / img.width;
    return true;
  } catch {
    return false;
  }
}

const LINKS = {
  linkedin: "https://www.linkedin.com/in/tejasjhaveri",
  instagram: "https://www.instagram.com/tejas_jhaveri",
  calendly: "https://calendly.com/founder-myntmore/web",
  notion: MYNTMORE_NOTION_LINK,
};

function clean(text: string): string {
  if (!text) return "";
  return sanitizeAIText(text);
}

function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const MARGIN = 40;
const PX_TO_PT = 0.75;
const PAGE_MARGIN = MARGIN * PX_TO_PT; // ~30pt

function addHeader(doc: jsPDF) {
  // Add logo top-left on every page (except cover page)
  const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
  if (pageNum === 1) return; // skip header on cover page

  if (cachedLogoImg) {
    const logoW = 16;
    const logoH = cachedLogoRatio * logoW;
    doc.addImage(cachedLogoImg, "PNG", PAGE_MARGIN, 8, logoW, logoH);
  }
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.setFont("helvetica", "normal");
  const w = doc.internal.pageSize.getWidth();
  doc.text("Myntmore x B2B Growth Workshop", w - PAGE_MARGIN, 12, { align: "right" });

  // Clean thin header underline
  doc.setDrawColor(243, 244, 246);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, 16, w - PAGE_MARGIN, 16);
}

function addFooter(doc: jsPDF) {
  const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
  if (pageNum === 1) return; // skip footer on cover page

  const h = doc.internal.pageSize.getHeight();
  const w = doc.internal.pageSize.getWidth();
  const y = h - 12;

  // Footer divider line
  doc.setDrawColor(243, 244, 246);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, h - 18, w - PAGE_MARGIN, h - 18);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  const footerLinks = [
    { text: "TJ's LinkedIn", url: LINKS.linkedin, x: PAGE_MARGIN },
    { text: "Instagram", url: LINKS.instagram, x: PAGE_MARGIN + 35 },
    { text: "Book a Call", url: LINKS.calendly, x: PAGE_MARGIN + 60 },
    { text: "Myntmore Services", url: LINKS.notion, x: PAGE_MARGIN + 87 },
  ];

  for (const link of footerLinks) {
    doc.setTextColor(37, 99, 235); // Blue link color
    doc.text(link.text, link.x, y);
    const tw = doc.getTextWidth(link.text);
    doc.link(link.x, y - 3, tw, 5, { url: link.url });
  }
}

// Stamps "Page X of N" bottom-right on every page. Run once at the very end,
// since the total page count is only known after all content is laid out.
function addPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1) continue; // skip cover page numbering
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${totalPages}`, w - PAGE_MARGIN, h - 12, { align: "right" });
  }
}

function addHeaderFooter(doc: jsPDF) {
  addHeader(doc);
  addFooter(doc);
}

const sectionPages: Record<string, number> = {};

function newSection(doc: jsPDF, title: string) {
  doc.addPage();
  const pageNum = doc.getNumberOfPages();
  sectionPages[title] = pageNum;
  addHeaderFooter(doc);
  const w = doc.internal.pageSize.getWidth();

  // Section indicator accent block
  doc.setFillColor(251, 191, 36); // Brand Gold
  doc.rect(PAGE_MARGIN, 31, 4, 8, "F");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text(clean(title), PAGE_MARGIN + 7, 37);

  // Divider
  doc.setDrawColor(243, 244, 246);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, 43, w - PAGE_MARGIN, 43);

  doc.setFont("helvetica", "normal");
  return 52;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5.5): number {
  if (!text) return y;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81); // Dark Gray
  const lines = doc.splitTextToSize(capitalize(clean(text)), maxWidth);
  const pageH = doc.internal.pageSize.getHeight() - 25;
  for (const line of lines) {
    if (y > pageH) {
      doc.addPage();
      addHeaderFooter(doc);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      y = 30;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function addBulletList(doc: jsPDF, items: string[], x: number, y: number, maxWidth: number): number {
  if (!items || !Array.isArray(items)) return y;
  const bulletX = x + 12; // 16px indent in pt ~12
  for (const item of items) {
    const pageH = doc.internal.pageSize.getHeight() - 25;
    if (y > pageH) { doc.addPage(); addHeaderFooter(doc); y = 30; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    doc.text("•", x + 4, y);
    const lines = doc.splitTextToSize(capitalize(clean(item)), maxWidth - 12);
    for (const line of lines) {
      if (y > pageH) {
        doc.addPage();
        addHeaderFooter(doc);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(31, 41, 55);
        y = 30;
      }
      doc.text(line, bulletX, y);
      y += 5.5;
    }
    y += 1.5;
  }
  return y;
}

function addSubHeader(doc: jsPDF, text: string, y: number): number {
  const pageH = doc.internal.pageSize.getHeight() - 25;
  if (y > pageH) { doc.addPage(); addHeaderFooter(doc); y = 30; }
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text(clean(text), PAGE_MARGIN, y);
  doc.setFont("helvetica", "normal");
  return y + 6;
}

// Rough height (in pt) that a wrapped block of text will need, used to decide
// whether to keep a short block together on the current page or start fresh.
function estimateTextHeight(doc: jsPDF, text: string, maxWidth: number, lineHeight: number = 5.5): number {
  if (!text) return 0;
  doc.setFontSize(11);
  return doc.splitTextToSize(capitalize(clean(text)), maxWidth).length * lineHeight;
}

// Forces a page break now if the given block wouldn't fit in the remaining space,
// so short trailing blocks don't get orphaned as a couple of lines on an otherwise blank page.
function ensureSpace(doc: jsPDF, y: number, neededHeight: number): number {
  const pageH = doc.internal.pageSize.getHeight() - 25;
  if (y + neededHeight > pageH) {
    doc.addPage();
    addHeaderFooter(doc);
    return 30;
  }
  return y;
}

function addCalloutBox(doc: jsPDF, title: string, text: string, y: number, maxW: number): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const cleanTitle = clean(title);
  const cleanText = clean(text);

  // Split lines
  const titleLines = cleanTitle ? doc.splitTextToSize(capitalize(cleanTitle), maxW - 10) : [];
  const textLines = cleanText ? doc.splitTextToSize(capitalize(cleanText), maxW - 10) : [];

  // Calculate height needed
  const lineHeight = 5;
  const padding = 6;
  const titleH = titleLines.length * lineHeight;
  const textH = textLines.length * lineHeight;
  const totalH = titleH + textH + padding * 2 + (titleH > 0 && textH > 0 ? 3 : 0);

  // Page check
  y = ensureSpace(doc, y, totalH);

  // Draw background box
  doc.setFillColor(254, 243, 199); // Soft yellow
  doc.rect(PAGE_MARGIN, y, maxW, totalH, "F");

  // Draw left border accent strip
  doc.setFillColor(251, 191, 36); // Brand Gold
  doc.rect(PAGE_MARGIN, y, 2.5, totalH, "F");

  let textY = y + padding + 3;

  // Print Title (bold)
  if (titleLines.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 120, 20); // Amber text
    for (const line of titleLines) {
      doc.text(line, PAGE_MARGIN + 6, textY);
      textY += lineHeight;
    }
    textY += 1;
  }

  // Print Text
  if (textLines.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81); // Dark grey
    for (const line of textLines) {
      doc.text(line, PAGE_MARGIN + 6, textY);
      textY += lineHeight;
    }
  }

  return y + totalH + 4;
}

function addParagraph(doc: jsPDF, label: string, val: string, y: number, maxW: number): number {
  if (!val) return y;

  const cleanLabel = clean(label);
  const cleanVal = clean(val);

  if (cleanLabel) {
    y = ensureSpace(doc, y, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128); // Muted gray
    doc.text(cleanLabel.toUpperCase(), PAGE_MARGIN, y);
    y += 4;
  }

  y = addWrappedText(doc, cleanVal, PAGE_MARGIN, y, maxW);
  return y + 2;
}

function drawTable(doc: jsPDF, headers: string[], rows: any[][], x: number, y: number, colWidths: number[]): number {
  const rowHeight = 8;
  const padding = 2;
  const textLineHeight = 4.5;
  const maxW = colWidths.reduce((a, b) => a + b, 0);

  // Header height
  let headerH = rowHeight;

  // Calculate total table height to see if we need a page break first
  let estimatedHeight = headerH;
  const formattedRows: any[] = [];

  for (const row of rows) {
    let maxCellLines = 1;
    const cellLinesList: string[][] = [];
    for (let c = 0; c < row.length; c++) {
      const cellText = String(row[c]);
      const lines = doc.splitTextToSize(cellText, colWidths[c] - padding * 2);
      cellLinesList.push(lines);
      if (lines.length > maxCellLines) {
        maxCellLines = lines.length;
      }
    }
    const thisRowH = Math.max(rowHeight, maxCellLines * textLineHeight + padding * 2);
    formattedRows.push({ cellLinesList, rowHeight: thisRowH });
    estimatedHeight += thisRowH;
  }

  // Page break check for header + first row
  y = ensureSpace(doc, y, headerH + (formattedRows[0]?.rowHeight || rowHeight));

  // Draw Header Row
  doc.setFillColor(31, 41, 55); // Dark Charcoal
  doc.rect(x, y, maxW, headerH, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255); // White text

  let currentX = x;
  for (let c = 0; c < headers.length; c++) {
    doc.text(headers[c], currentX + padding, y + headerH/2 + 1, { baseline: "middle" });
    currentX += colWidths[c];
  }

  y += headerH;

  // Draw Data Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (let r = 0; r < formattedRows.length; r++) {
    const rowData = formattedRows[r];
    const originalRow = rows[r];

    // Check page break for this row
    const needed = rowData.rowHeight;
    const oldY = y;
    y = ensureSpace(doc, y, needed);

    // If page broke, redraw header
    if (y < oldY) {
      doc.setFillColor(31, 41, 55);
      doc.rect(x, y, maxW, headerH, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      let tempX = x;
      for (let c = 0; c < headers.length; c++) {
        doc.text(headers[c], tempX + padding, y + headerH/2 + 1, { baseline: "middle" });
        tempX += colWidths[c];
      }
      y += headerH;
    }

    // Alternating background colors
    if (r % 2 === 0) {
      doc.setFillColor(255, 255, 255); // White
    } else {
      doc.setFillColor(249, 250, 251); // Very light gray (gray-50)
    }
    doc.rect(x, y, maxW, rowData.rowHeight, "F");

    // Draw borders
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setLineWidth(0.2);
    doc.line(x, y + rowData.rowHeight, x + maxW, y + rowData.rowHeight); // bottom line

    // Draw cells
    let colX = x;
    doc.setTextColor(55, 65, 81);
    for (let c = 0; c < originalRow.length; c++) {
      if (c === 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 41, 55);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
      }

      const lines = rowData.cellLinesList[c];
      let lineY = y + padding + 3;
      for (const line of lines) {
        doc.text(line, colX + padding, lineY);
        lineY += textLineHeight;
      }
      colX += colWidths[c];
    }
    y += rowData.rowHeight;
  }

  return y + 4;
}

export async function generatePDF(sessionData: any) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const maxW = w - PAGE_MARGIN * 2;
  const userName = sessionData?.user_name || "Attendee";
  const addonsPrompt = sessionData?.jewellery_design_data?.basePrompt;
  const modellingData = sessionData?.jewellery_modelling_data;
  const showAddons = !!(addonsPrompt || (modellingData?.modelPrompts && modellingData.modelPrompts.length > 0));

  // Clear previous session page marks
  for (const key in sectionPages) {
    delete sectionPages[key];
  }

  // Load logo for all pages
  const logoLoaded = await loadLogo();

  // Cover page - left accent strip
  doc.setFillColor(251, 191, 36); // Brand Gold
  doc.rect(0, 0, 12, 297, "F");
  doc.setFillColor(31, 41, 55); // Dark Charcoal
  doc.rect(12, 0, 2, 297, "F");

  const centerX = 112;

  // Cover page - centered large logo
  if (cachedLogoImg) {
    const logoW = 50;
    const logoH = cachedLogoRatio * logoW;
    doc.addImage(cachedLogoImg, "PNG", centerX - logoW / 2, 45, logoW, logoH);
  }

  // Cover page text
  const titleY = logoLoaded ? 110 : 90;

  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text("B2B Growth Strategy", centerX, titleY, { align: "center" });

  // Accent underline below title
  doc.setFillColor(251, 191, 36);
  doc.rect(centerX - 30, titleY + 5, 60, 1.5, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.text(`Prepared for ${userName}`, centerX, titleY + 20, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text(new Date().toLocaleDateString(), centerX, titleY + 30, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 120, 20);
  doc.text("Powered by Myntmore", centerX, titleY + 50, { align: "center" });

  // ICPs (declared early so the Table of Contents can reflect the actual count)
  const icps = (sessionData?.icp_data?.result || []).filter(Boolean);

  // Table of Contents
  let y = newSection(doc, "Table of Contents");
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);

  const tocItems = [
    { key: "Profile Analysis", label: "1. Profile Analysis" },
    ...icps.map((icp: any, i: number) => ({ key: `ICP ${i + 1}`, label: `${i + 2}. ICP ${i + 1}: ${icp.name || "Untitled"}` })),
    { key: "Value Propositions", label: `${icps.length + 2}. Value Propositions` },
    { key: "Website Prompt", label: `${icps.length + 3}. Website Prompt` },
    { key: "Growth Strategy", label: `${icps.length + 4}. Growth Strategy` },
    { key: "Outreach Playbook", label: `${icps.length + 5}. Outreach Playbook` },
    ...(showAddons ? [{ key: "Bonus Add-Ons", label: `${icps.length + 6}. Bonus Add-Ons` }] : [])
  ];

  const tocYStart = y;
  tocItems.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.text(item.label, PAGE_MARGIN + 5, y);

    // Draw dots
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175); // light gray
    const labelW = doc.getTextWidth(item.label);
    const startDotsX = PAGE_MARGIN + 5 + labelW + 3;
    const endDotsX = w - PAGE_MARGIN - 8;

    let dots = "";
    const dotW = doc.getTextWidth(".");
    const availableW = endDotsX - startDotsX;
    const numDots = Math.floor(availableW / dotW);
    for (let j = 0; j < numDots; j++) dots += ".";

    doc.text(dots, startDotsX, y);
    doc.setTextColor(31, 41, 55);

    y += 10;
  });

  // Profile Analysis
  const profile = sessionData?.profile_data?.result;
  y = newSection(doc, "Profile Analysis");
  if (profile) {
    const score = Math.min(profile.finalScore || 0, 100);
    y = addSubHeader(doc, `Score: ${score}/100, ${clean(profile.scoreMeaning)}`, y);
    y += 4;

    if (profile.scoreBreakdown) {
      const headers = ["Evaluation Category", "Score", "Detailed Feedback"];
      const rows = Object.entries(profile.scoreBreakdown).map(([key, val]: any) => [
        capitalize(key),
        `${Math.min(val.score || 0, 20)}/20`,
        val.explanation || ""
      ]);
      y = drawTable(doc, headers, rows, PAGE_MARGIN, y, [40, 20, maxW - 60]);
    }

    y = ensureSpace(doc, y, 10);
    y = addSubHeader(doc, "What's Working", y);
    y = addBulletList(doc, profile.whatsWorking, PAGE_MARGIN, y, maxW);
    y += 3;

    y = ensureSpace(doc, y, 10);
    y = addSubHeader(doc, "To Improve", y);
    y = addBulletList(doc, profile.toImprove, PAGE_MARGIN, y, maxW);
    y += 3;

    y = ensureSpace(doc, y, 10);
    y = addSubHeader(doc, "Generated Headlines", y);
    y = addBulletList(doc, profile.headlines, PAGE_MARGIN, y, maxW);
    y += 3;

    if (profile.aboutSection) {
      y = ensureSpace(doc, y, 15);
      y = addSubHeader(doc, "Optimised About Section", y);
      const paras = profile.aboutSection.split(/\n\n+/).filter(Boolean);
      for (const para of paras) {
        y = addWrappedText(doc, para, PAGE_MARGIN, y, maxW);
        y += 2;
      }
      y += 3;
    }

    if (profile.positioningAngles) {
      y = ensureSpace(doc, y, 15);
      y = addSubHeader(doc, "Positioning Angles", y);
      const angles = Array.isArray(profile.positioningAngles)
        ? profile.positioningAngles
        : String(profile.positioningAngles).split(/\n+|(?=\d+\.\s)/).map((s: string) => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
      y = addBulletList(doc, angles, PAGE_MARGIN, y, maxW);
      y += 3;
    }
  }

  // ICPs
  for (let i = 0; i < icps.length; i++) {
    const icp = icps[i];
    const icpLabel = `ICP ${i + 1}: ${clean(icp.name || "Untitled")}${icp.audienceType ? ` (${icp.audienceType})` : ""}`;
    y = newSection(doc, icpLabel);
    const fields = [
      { key: "whoTheyAre", label: "Who They Are" },
      { key: "coreResponsibilities", label: "Core Responsibilities" },
      { key: "painPoints", label: "Pain Points" },
      { key: "goalsDesires", label: "Goals and Desires" },
      { key: "buyingTriggers", label: "Buying Triggers" },
      { key: "objections", label: "Objections" },
      { key: "psychology", label: "Psychology" },
      { key: "whereTheyHangOut", label: "Where They Hang Out" },
      { key: "howToPosition", label: "How to Position" },
      { key: "geographyContext", label: "Target Geography Context" },
    ];
    for (const f of fields) {
      const val = icp[f.key];
      if (!val) continue;

      if (Array.isArray(val)) {
        y = ensureSpace(doc, y, 12);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 114, 128);
        doc.text(f.label.toUpperCase(), PAGE_MARGIN, y);
        y += 4;
        y = addBulletList(doc, val, PAGE_MARGIN, y, maxW);
        y += 3;
      } else {
        y = addParagraph(doc, f.label, val, y, maxW);
      }
    }
    if (Array.isArray(icp.channelPartners) && icp.channelPartners.length > 0) {
      y = ensureSpace(doc, y, 15);
      y = addSubHeader(doc, "Channel Partners", y);
      const headers = ["Partner Type", "Why They Fit", "Approach Angle"];
      const rows = icp.channelPartners.map((p: any) => [
        p.partnerType || "",
        p.whyTheyFit || "",
        p.approachAngle || ""
      ]);
      y = drawTable(doc, headers, rows, PAGE_MARGIN, y, [40, maxW - 85, 45]);
    }
  }

  // Value Propositions
  const vps = (sessionData?.value_prop_data?.result || []).filter(Boolean);
  y = newSection(doc, "Value Propositions");
  for (let i = 0; i < vps.length; i++) {
    const vp = vps[i];
    const vpAudienceType = vp.icpName === "Channel Partners" ? null : icps[i]?.audienceType;
    const vpLabel = vp.icpName === "Channel Partners" ? "Channel Partners" : `ICP ${i + 1}: ${clean(vp.icpName)}${vpAudienceType ? ` (${vpAudienceType})` : ""}`;
    y = addSubHeader(doc, vpLabel, y);

    if (vp.corePromise) { y = addParagraph(doc, "Core Promise", vp.corePromise, y, maxW); }
    if (vp.coreAngle) { y = addParagraph(doc, "Core Angle", vp.coreAngle, y, maxW); }

    if (vp.beforeState && vp.beforeState.length > 0) {
      y = ensureSpace(doc, y, 10);
      y = addSubHeader(doc, "Before State", y);
      y = addBulletList(doc, vp.beforeState, PAGE_MARGIN, y, maxW);
      y += 2;
    }
    if (vp.afterState && vp.afterState.length > 0) {
      y = ensureSpace(doc, y, 10);
      y = addSubHeader(doc, "After State", y);
      y = addBulletList(doc, vp.afterState, PAGE_MARGIN, y, maxW);
      y += 2;
    }

    if (vp.threeStepSystem && vp.threeStepSystem.length > 0) {
      y = ensureSpace(doc, y, 15);
      y = addSubHeader(doc, "3-Step System", y);
      const headers = ["Step", "Action & Description"];
      const rows = vp.threeStepSystem.map((step: any) => [
        step.step || "",
        step.description || ""
      ]);
      y = drawTable(doc, headers, rows, PAGE_MARGIN, y, [40, maxW - 40]);
    }

    if (vp.whyOthersFail && vp.whyOthersFail.length > 0) {
      y = ensureSpace(doc, y, 10);
      y = addSubHeader(doc, "Why Others Fail", y);
      y = addBulletList(doc, vp.whyOthersFail, PAGE_MARGIN, y, maxW);
      y += 2;
    }
    if (vp.whyYouWin && vp.whyYouWin.length > 0) {
      y = ensureSpace(doc, y, 10);
      y = addSubHeader(doc, "Why We Win", y);
      y = addBulletList(doc, vp.whyYouWin, PAGE_MARGIN, y, maxW);
      y += 2;
    }
    if (vp.whatsInItForThem && vp.whatsInItForThem.length > 0) {
      y = ensureSpace(doc, y, 10);
      y = addSubHeader(doc, "What's In It For Them", y);
      y = addBulletList(doc, vp.whatsInItForThem, PAGE_MARGIN, y, maxW);
      y += 2;
    }
    if (vp.idealPartnerProfile) { y = addParagraph(doc, "Ideal Partner Profile", vp.idealPartnerProfile, y, maxW); }

    if (vp.partnershipSteps && vp.partnershipSteps.length > 0) {
      y = ensureSpace(doc, y, 15);
      y = addSubHeader(doc, "How the Partnership Works", y);
      const headers = ["Step", "Action & Description"];
      const rows = vp.partnershipSteps.map((step: any) => [
        step.step || "",
        step.description || ""
      ]);
      y = drawTable(doc, headers, rows, PAGE_MARGIN, y, [40, maxW - 40]);
    }

    if (vp.whyPartnerWithUs && vp.whyPartnerWithUs.length > 0) {
      y = ensureSpace(doc, y, 10);
      y = addSubHeader(doc, "Why Partner With Us", y);
      y = addBulletList(doc, vp.whyPartnerWithUs, PAGE_MARGIN, y, maxW);
      y += 2;
    }
    if (vp.howToApproachThem) { y = addParagraph(doc, "How to Approach Them", vp.howToApproachThem, y, maxW); }
    if (vp.contentStrategy || vp.oneLiner) { y = addParagraph(doc, "Content Strategy", vp.contentStrategy || vp.oneLiner, y, maxW); }
    if (vp.shortPitch) { y = addParagraph(doc, "Pitch", vp.shortPitch, y, maxW); }
    if (vp.cta) { y = addParagraph(doc, "Call to Action", vp.cta, y, maxW); }
    if (vp.positioning) {
      y = ensureSpace(doc, y, 15);
      y = addSubHeader(doc, "Positioning Statement", y);
      y = addWrappedText(doc, vp.positioning, PAGE_MARGIN, y, maxW);
      y += 3;
    }
    y += 5;
  }

  // Website Prompt
  y = newSection(doc, "Website Prompt");
  y = addWrappedText(doc, clean(sessionData?.website_data?.generatedPrompt || "Not generated"), PAGE_MARGIN, y, maxW);

  // GTM
  const gtm = sessionData?.gtm_data?.result;
  y = newSection(doc, "Growth Strategy");
  if (gtm) {
    const strategies = (gtm.icpStrategies || (gtm.channels ? [gtm] : [])).filter(Boolean);
    for (let si = 0; si < strategies.length; si++) {
      const strat = strategies[si];
      if (strat.icpName) { y = addSubHeader(doc, `ICP ${si + 1}: ${clean(strat.icpName)}`, y); y += 2; }
      if (strat.channels && strat.channels.length > 0) {
        y = addSubHeader(doc, "Primary Channels", y);
        const headers = ["Channel", "Effort / ROI", "Use Case & Tips"];
        const rows = strat.channels.map((ch: any) => [
          `${ch.name}${ch.startHere ? "\n[START HERE]" : ""}`,
          `Effort: ${ch.effort}\nROI: ${ch.roi}`,
          `${ch.useCase}\n\n${ch.tips && ch.tips.length > 0 ? "Tips:\n" + ch.tips.map((t: string) => `• ${t}`).join("\n") : ""}`
        ]);
        y = drawTable(doc, headers, rows, PAGE_MARGIN, y, [35, 30, maxW - 65]);
      }
      if (strat.timeline && strat.timeline.length > 0) {
        y = addSubHeader(doc, "Execution Timeline", y);
        const headers = ["Phase", "Focus Area", "Action Checklist"];
        const rows = strat.timeline.map((phase: any) => [
          phase.phase,
          phase.title,
          phase.tasks?.map((t: string) => `[ ] ${t}`).join("\n") || ""
        ]);
        y = drawTable(doc, headers, rows, PAGE_MARGIN, y, [30, 45, maxW - 75]);
      }
      if (strat.partners?.types && strat.partners.types.length > 0) {
        y = addSubHeader(doc, "Partner Strategy", y);
        const headers = ["Partner Type", "Strategic Angle & Offer", "Copy-Paste Outreach Snippet"];
        const rows = strat.partners.types.map((p: any) => [
          p.type,
          `Angle: ${p.angle}\nOffer: ${p.offer || ""}`,
          p.snippet ? `"${p.snippet}"` : ""
        ]);
        y = drawTable(doc, headers, rows, PAGE_MARGIN, y, [40, 50, maxW - 90]);
      }
      if (strat.leadMagnets && strat.leadMagnets.length > 0) {
        y = addSubHeader(doc, "Lead Magnets", y);
        for (const lm of strat.leadMagnets) {
          const title = `${lm.name} (${lm.type || lm.format})${lm.bestStart ? " [Best Starting Point]" : ""}`;
          let text = `Target ICP: ${lm.targetICP || strat.icpName || `ICP ${si + 1}`}\n`;
          if (lm.includes && lm.includes.length > 0) {
            text += `Includes: ${lm.includes.join(", ")}\n`;
          }
          if (lm.whyItWorks) text += `Why it works: ${lm.whyItWorks}\n`;
          if (lm.whenToUse) text += `When to use: ${lm.whenToUse}`;

          y = addCalloutBox(doc, title, text, y, maxW);
        }
      }
      if (strat.eventLedGrowth) {
        y = addSubHeader(doc, "Event-Led Growth", y);
        let text = "";
        if (strat.eventLedGrowth.onlineEvents) {
          text += `Online Events:\n` + strat.eventLedGrowth.onlineEvents.map((ev: any) => `• [${ev.format}] ${ev.topic}`).join("\n") + "\n\n";
        }
        if (strat.eventLedGrowth.offlineEvents) {
          text += `Offline Events:\n` + strat.eventLedGrowth.offlineEvents.map((ev: any) => `• [${ev.format}] ${ev.topic}`).join("\n") + "\n\n";
        }
        if (strat.eventLedGrowth.eventFunnel) {
          const funnel = strat.eventLedGrowth.eventFunnel;
          text += `Event Funnel:\n`;
          if (funnel.preEvent) text += `• Pre-Event: ${funnel.preEvent}\n`;
          if (funnel.duringEvent) text += `• During: ${funnel.duringEvent}\n`;
          if (funnel.postEvent) text += `• Post-Event: ${funnel.postEvent}\n\n`;
        }
        if (strat.eventLedGrowth.conversionStrategy) {
          text += `Conversion: ${strat.eventLedGrowth.conversionStrategy}`;
        }
        y = addCalloutBox(doc, "Event-Led Growth Funnel & Tactics", text.trim(), y, maxW);
      }
      y += 5;
    }
  }

  // Outreach Playbook
  const outreach = sessionData?.outreach_data?.result;
  y = newSection(doc, "Outreach Playbook");
  if (outreach?.playbooks) {
    for (const pb of outreach.playbooks.filter(Boolean)) {
      y = addSubHeader(doc, `${clean(pb.icpName)}${pb.audienceType ? ` (${pb.audienceType})` : ""}`, y);

      // ICP Context
      if (pb.icpContext) {
        let contextText = `Who they are: ${pb.icpContext.who}\n`;
        contextText += `Mindset: ${pb.icpContext.mindset}\n\n`;
        if (pb.icpContext.careAbout && pb.icpContext.careAbout.length > 0) {
          contextText += `What they care about:\n` + pb.icpContext.careAbout.map((c: string) => `• ${c}`).join("\n") + "\n\n";
        }
        if (pb.icpContext.ignore && pb.icpContext.ignore.length > 0) {
          contextText += `What they ignore:\n` + pb.icpContext.ignore.map((c: string) => `• ${c}`).join("\n");
        }
        y = addCalloutBox(doc, "ICP Target Context", contextText.trim(), y, maxW);
      }

      // Strategic Approach
      if (pb.strategicApproach) {
        let approachText = `Best Angle: ${pb.strategicApproach.bestAngle}\n`;
        approachText += `Positioning Style: ${pb.strategicApproach.positioningStyle}\n\n`;

        const detail = pb.strategicApproach.positioningDetail;
        if (detail) {
          if (detail.whatItMeans) approachText += `What it means: ${detail.whatItMeans}\n\n`;
          if (detail.howToShowUp && detail.howToShowUp.length > 0) {
            approachText += `How to show up:\n` + detail.howToShowUp.map((h: string) => `• ${h}`).join("\n") + "\n\n";
          }
          if (detail.whatToAvoid && detail.whatToAvoid.length > 0) {
            approachText += `What to avoid:\n` + detail.whatToAvoid.map((a: string) => `• ${a}`).join("\n") + "\n\n";
          }
          if (detail.exampleOpener) {
            approachText += `Example Opener:\n"${detail.exampleOpener}"\n\n`;
          }
        }
        if (pb.strategicApproach.whatNotToDo && pb.strategicApproach.whatNotToDo.length > 0) {
          approachText += `What NOT to do:\n` + pb.strategicApproach.whatNotToDo.map((n: string) => `• ${n}`).join("\n");
        }
        y = addCalloutBox(doc, "Positioning Style & Opener", approachText.trim(), y, maxW);
      }

      if (pb.personalisationTips) {
        y = addSubHeader(doc, "Personalisation Tips", y);
        y = addBulletList(doc, pb.personalisationTips, PAGE_MARGIN, y, maxW);
        y += 3;
      }
      if (pb.followUpSystem) {
        let text = `Total Touches: ${pb.followUpSystem.totalTouches}\n`;
        text += `Tone Evolution: ${pb.followUpSystem.toneEvolution}\n`;
        if (pb.followUpSystem.escalationLogic) {
          text += `Escalation Logic: ${pb.followUpSystem.escalationLogic}`;
        }
        y = addCalloutBox(doc, "LinkedIn Outbound Follow-Up Cadence", text, y, maxW);
      }
      if (pb.channelPlan) {
        let text = "";
        if (pb.channelPlan.platforms) {
          text += `Best Platforms: ${pb.channelPlan.platforms.join(", ")}\n\n`;
        }
        if (pb.channelPlan.contentIdeas && pb.channelPlan.contentIdeas.length > 0) {
          text += `Content Ideas:\n` + pb.channelPlan.contentIdeas.map((c: string) => `• ${c}`).join("\n") + "\n\n";
        }
        if (pb.channelPlan.outreachAngle) {
          text += `How to Engage: ${pb.channelPlan.outreachAngle}\n\n`;
        }
        if (pb.channelPlan.conversionPath) {
          text += `Conversion Path: ${pb.channelPlan.conversionPath}`;
        }
        y = addCalloutBox(doc, "D2C Channel & Content Marketing Plan", text.trim(), y, maxW);
      }
      if (pb.campaignIdeas && pb.campaignIdeas.length > 0) {
        y = addSubHeader(doc, "Campaign Ideas to Try", y);
        for (const c of pb.campaignIdeas) {
          y = addCalloutBox(doc, c.name, c.description, y, maxW);
        }
      }
      if (pb.whatToAvoid) {
        y = addSubHeader(doc, "What to Avoid", y);
        y = addBulletList(doc, pb.whatToAvoid, PAGE_MARGIN, y, maxW);
      }
      y += 5;
    }
  }

  // Jewellery Design & Modelling (Bonus Add-Ons)
  if (showAddons) {
    y = newSection(doc, "Bonus Add-Ons");

    if (addonsPrompt) {
      y = addSubHeader(doc, "Jewellery Design Prompt Generator", y);
      const sel = jewelleryDesign?.selections || {};
      const selSummary = ["type", "style", "material", "gemstone", "mood"]
        .map(k => (sel[k] || []).join(", "))
        .filter(Boolean)
        .join(" | ");
      if (selSummary) { y = addWrappedText(doc, `Selections: ${selSummary}`, PAGE_MARGIN, y, maxW); y += 3; }
      y = addSubHeader(doc, "Generated Prompt", y);
      y = addWrappedText(doc, clean(addonsPrompt), PAGE_MARGIN, y, maxW);
      y += 5;
    }

    if (modellingData?.modelPrompts && modellingData.modelPrompts.length > 0) {
      y = ensureSpace(doc, y, 15);
      y = addSubHeader(doc, "AI Jewellery Modelling", y);
      if (modellingData.modelType) {
        y = addWrappedText(doc, `Jewellery Type: ${clean(modellingData.modelType)}`, PAGE_MARGIN, y, maxW);
        y += 3;
      }
      for (const p of modellingData.modelPrompts) {
        y = ensureSpace(doc, y, 8 + estimateTextHeight(doc, p.prompt, maxW));
        y = addSubHeader(doc, p.label, y);
        y = addWrappedText(doc, p.prompt, PAGE_MARGIN, y, maxW);
        y += 3;
      }
    }
  }

  // Thank You page
  y = newSection(doc, "Thank You");
  y += 5;

  const thankYouLines = [
    `Thank you for completing the B2B Growth Workshop, ${userName}.`,
    "Your strategy is built. Now it is time to execute.",
    "Start with one sequence, test it, and iterate. Consistency beats perfection.",
  ];
  const thankYouText = thankYouLines.join("\n\n");
  y = addCalloutBox(doc, `Congratulations, ${userName}!`, thankYouText, y, maxW);

  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 120, 20);
  doc.text("Powered by Myntmore", w / 2, y, { align: "center" });

  // Fill in Table of Contents page numbers
  doc.setPage(2);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);

  let tocY = tocYStart;
  tocItems.forEach((item) => {
    // Find page number of section
    let pNum = 3; // fallback
    for (const [title, p] of Object.entries(sectionPages)) {
      if (title.startsWith(item.key)) {
        pNum = p;
        break;
      }
    }

    doc.text(String(pNum), w - PAGE_MARGIN - 5, tocY, { align: "right" });
    tocY += 10;
  });

  addPageNumbers(doc);
  doc.save(`B2B_Growth_Strategy_${userName.replace(/\s+/g, "_")}.pdf`);
}
