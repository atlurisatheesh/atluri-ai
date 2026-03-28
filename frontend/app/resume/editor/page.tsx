"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus, ArrowUpDown, LayoutTemplate, Palette, Sparkles,
  CheckCircle, Download, Share2, History, Undo2, Redo2,
  X, GripVertical, Trash2, Type, Briefcase,
  GraduationCap, Award, Code, User, Mail, Phone, MapPin,
  Linkedin, Globe, Save, FileText, Eye, EyeOff, Loader2,
  ArrowLeft, AlertTriangle, Check, MoveUp, MoveDown,
  Wand2, Upload, Columns, Minus, Circle, ChevronRight,
  Square, ArrowRight, Hash, AlignLeft, AlignCenter,
  Maximize2, Minimize2,
} from "lucide-react";
import { TemplatePreview, TEMPLATE_REGISTRY, TEMPLATE_CATEGORIES } from "@/components/resume/TemplatePreview";

/* ═══════════════════════════════════════════════════════
   SUSPENSE WRAPPER
   ═══════════════════════════════════════════════════════ */
export default function ResumeEditorWrapper() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-brand-cyan animate-spin" />
      </div>
    }>
      <ResumeEditorPage />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */
interface ResumeSection {
  id: string;
  type: "contact" | "summary" | "experience" | "education" | "skills" | "certifications" | "projects"
    | "awards" | "volunteer" | "publications" | "languages" | "board_affiliations" | "patents" | "speaking" | "open_source";
  title: string;
  visible: boolean;
}
interface ExperienceEntry { company: string; role: string; dateRange: string; location: string; bullets: string[]; }
interface EducationEntry { school: string; degree: string; year: string; }
interface AwardEntry { title: string; issuer: string; year: string; description: string; }
interface VolunteerEntry { organization: string; role: string; dateRange: string; description: string; }
interface PublicationEntry { title: string; venue: string; year: string; url: string; }
interface LanguageEntry { language: string; proficiency: "native" | "fluent" | "professional" | "conversational" | "basic"; }
interface BoardEntry { organization: string; role: string; dateRange: string; }
interface PatentEntry { title: string; number: string; year: string; status: "granted" | "pending"; }
interface SpeakingEntry { title: string; event: string; year: string; audience: string; }
interface OpenSourceEntry { name: string; role: string; url: string; description: string; }
interface ResumeData {
  name: string; title: string; email: string; phone: string;
  location: string; linkedin: string; website: string; summary: string;
  experience: ExperienceEntry[]; education: EducationEntry[];
  skills: string[]; certifications: string[];
  projects: { name: string; description: string; tech: string }[];
  awards: AwardEntry[]; volunteer: VolunteerEntry[];
  publications: PublicationEntry[]; languages: LanguageEntry[];
  board_affiliations: BoardEntry[]; patents: PatentEntry[];
  speaking: SpeakingEntry[]; open_source: OpenSourceEntry[];
}

/* ═══════════════════════════════════════════════════════
   LAYOUT SYSTEM — 6 distinct visual layouts
   ═══════════════════════════════════════════════════════ */
type LayoutType = "classic" | "modern" | "sidebar" | "minimal" | "creative" | "executive";

interface LayoutConfig {
  type: LayoutType;
  font: string;
  accent: string;
  headerBg: string;
  headerText: string;
  headerAlign: "left" | "center";
  sidebarEnabled: boolean;
  sidebarBg: string;
  sidebarText: string;
  headingUpper: boolean;
  headingBorder: "accent" | "full" | "double" | "none" | "dots";
  sectionCardBg: string;
  bulletChar: string;
  skillStyle: "tag" | "pill" | "plain" | "bar";
  bodyBg: string;
  fontSize: string;
  lineHeight: string;
  margins: string;
}

const LAYOUT_PRESETS: Record<LayoutType, Omit<LayoutConfig, "font" | "accent" | "fontSize" | "lineHeight" | "margins">> = {
  classic: {
    type: "classic", headerBg: "transparent", headerText: "#111827",
    headerAlign: "left", sidebarEnabled: false, sidebarBg: "", sidebarText: "",
    headingUpper: true, headingBorder: "accent", sectionCardBg: "transparent",
    bulletChar: "●", skillStyle: "tag", bodyBg: "#ffffff",
  },
  modern: {
    type: "modern", headerBg: "accent", headerText: "#ffffff",
    headerAlign: "left", sidebarEnabled: false, sidebarBg: "", sidebarText: "",
    headingUpper: false, headingBorder: "full", sectionCardBg: "transparent",
    bulletChar: "▸", skillStyle: "pill", bodyBg: "#ffffff",
  },
  sidebar: {
    type: "sidebar", headerBg: "transparent", headerText: "#ffffff",
    headerAlign: "left", sidebarEnabled: true, sidebarBg: "accent", sidebarText: "#ffffff",
    headingUpper: true, headingBorder: "none", sectionCardBg: "transparent",
    bulletChar: "●", skillStyle: "bar", bodyBg: "#ffffff",
  },
  minimal: {
    type: "minimal", headerBg: "transparent", headerText: "#374151",
    headerAlign: "center", sidebarEnabled: false, sidebarBg: "", sidebarText: "",
    headingUpper: false, headingBorder: "dots", sectionCardBg: "transparent",
    bulletChar: "–", skillStyle: "plain", bodyBg: "#ffffff",
  },
  creative: {
    type: "creative", headerBg: "gradient", headerText: "#ffffff",
    headerAlign: "center", sidebarEnabled: false, sidebarBg: "", sidebarText: "",
    headingUpper: false, headingBorder: "none", sectionCardBg: "#f9fafb",
    bulletChar: "→", skillStyle: "pill", bodyBg: "#ffffff",
  },
  executive: {
    type: "executive", headerBg: "dark", headerText: "#ffffff",
    headerAlign: "left", sidebarEnabled: false, sidebarBg: "", sidebarText: "",
    headingUpper: true, headingBorder: "double", sectionCardBg: "transparent",
    bulletChar: "■", skillStyle: "tag", bodyBg: "#ffffff",
  },
};

/* Per-template layout map — matches TemplatePreview.tsx renderers */
const TEMPLATE_LAYOUT_MAP: Record<number, LayoutType> = {
  // Modern (1-8): various layouts
  1: "sidebar",    // LeftSidebar
  2: "creative",   // CenteredSingle
  3: "creative",   // CenteredSingle
  4: "sidebar",    // LeftSidebar dark
  5: "creative",   // CenteredSingle
  6: "sidebar",    // SplitLayout
  7: "modern",     // CardView
  8: "modern",     // NeonPulse
  // Classic (9-15): classic single-column
  9: "classic",    // ClassicSingle
  10: "classic",   // ClassicSingle
  11: "classic",   // ClassicSingle
  12: "classic",   // ClassicSingle
  13: "classic",   // ClassicSingle
  14: "classic",   // ClassicSingle
  15: "classic",   // ClassicSingle
  // Creative (16-22): mixed layouts
  16: "sidebar",   // LeftSidebarColored
  17: "sidebar",   // InfographicLayout
  18: "sidebar",   // MagazineLayout
  19: "creative",  // RetroPixel (centered dark)
  20: "minimal",   // MinimalLayout
  21: "modern",    // BoldStatement
  22: "sidebar",   // LeftSidebar light
  // Technical (23-30): mixed layouts
  23: "creative",  // CenteredSingle monospace
  24: "modern",    // TimelineLayout
  25: "sidebar",   // LeftSidebar
  26: "creative",  // CenteredSingle
  27: "executive", // TopBanner
  28: "sidebar",   // LeftSidebar
  29: "creative",  // CenteredSingle
  30: "modern",    // BlockchainDev
  // Executive (31-36): mixed layouts
  31: "executive", // TopBanner
  32: "executive", // TopBanner
  33: "creative",  // CenteredSingle
  34: "modern",    // StartupFounder
  35: "classic",   // ClassicSingle
  36: "creative",  // CenteredSingle
  // Minimalist (37-43): minimal & split
  37: "minimal",   // MinimalLayout
  38: "minimal",   // MinimalLayout
  39: "sidebar",   // SplitLayout
  40: "minimal",   // MinimalLayout monospace
  41: "minimal",   // MinimalLayout warm
  42: "minimal",   // LaTeXStyle
  43: "sidebar",   // Scandinavian (split sidebar)
  // ATS-Optimized (44-50): classic text-only
  44: "classic",   // ATSLayout
  45: "classic",   // ATSLayout
  46: "classic",   // ATSLayout
  47: "classic",   // ATSLayout
  48: "classic",   // ATSLayout
  49: "classic",   // ATSLayout
  50: "classic",   // ATSLayout
};

/* Fallback for any ID not explicitly listed */
const CATEGORY_LAYOUT_FALLBACK: Record<string, LayoutType> = {
  Modern: "modern",
  Classic: "classic",
  Creative: "creative",
  Technical: "sidebar",
  Executive: "executive",
  Minimalist: "minimal",
  "ATS-Optimized": "classic",
};

/* Per-template visual style overrides — matches TemplatePreview.tsx colors */
const TEMPLATE_STYLE_OVERRIDES: Record<number, Partial<LayoutConfig> & { skillMode?: string; showInitials?: boolean }> = {
  // Modern sidebar templates
  1: { sidebarBg: "#0f1729", sidebarText: "#ffffff", skillMode: "bars", showInitials: true },
  4: { sidebarBg: "#0a0e1a", sidebarText: "#ffffff", bodyBg: "#0f172a", skillMode: "bars", showInitials: true },
  6: { sidebarBg: "transparent", sidebarText: "#111827", skillMode: "dots" },
  // Creative sidebar templates
  16: { sidebarBg: "accent", sidebarText: "#ffffff", skillMode: "bars", showInitials: true },
  17: { sidebarBg: "#0f172a", sidebarText: "#ffffff", skillMode: "bars", showInitials: true },
  18: { sidebarBg: "transparent", sidebarText: "#111827", skillMode: "pills" },
  22: { sidebarBg: "#edf2f7", sidebarText: "#2d3748", skillMode: "bars" },
  // Technical sidebar templates  
  25: { sidebarBg: "#1e1b4b", sidebarText: "#ffffff", skillMode: "bars", showInitials: true },
  28: { sidebarBg: "#0c4a6e", sidebarText: "#ffffff", skillMode: "bars", showInitials: true },
  // Executive templates
  27: { headerBg: "#1a0a0e" },
  31: { headerBg: "#1a202c" },
  32: { headerBg: "#0c4a6e" },
  // Minimalist split sidebar templates
  39: { sidebarBg: "transparent", sidebarText: "#111827", skillMode: "dots" },
  43: { sidebarBg: "#edf2f7", sidebarText: "#4a5568", skillMode: "bars" },
  // Creative special
  19: { bodyBg: "#1a1a2e", skillMode: "pills" },
  // Various body tints & skill modes
  41: { bodyBg: "#fdf6ec" },
  24: { bodyBg: "#f0fdf4", skillMode: "bars" },
  26: { bodyBg: "#fffbeb" },
  29: { bodyBg: "#faf5ff", skillMode: "pills" },
  36: { bodyBg: "#f0fdf4" },
  30: { bodyBg: "#fffdf5" },
  // Single-column templates with pill skills
  2: { skillMode: "pills" }, 3: { skillMode: "pills" }, 5: { skillMode: "pills" },
  7: { skillMode: "pills" }, 8: { skillMode: "pills" },
  // Classic/ATS templates - text skills
  9: { skillMode: "text" }, 10: { skillMode: "text" }, 11: { skillMode: "text" },
  12: { skillMode: "text" }, 13: { skillMode: "text" }, 14: { skillMode: "text" }, 15: { skillMode: "text" },
  44: { skillMode: "text" }, 45: { skillMode: "text" }, 46: { skillMode: "text" },
  47: { skillMode: "text" }, 48: { skillMode: "text" }, 49: { skillMode: "text" }, 50: { skillMode: "text" },
};

/* Quick-lookup maps */
const TEMPLATE_SKILL_MODE: Record<number, string> = {};
const TEMPLATE_SHOW_INITIALS: Record<number, boolean> = {};
Object.entries(TEMPLATE_STYLE_OVERRIDES).forEach(([id, cfg]) => {
  if ((cfg as any).skillMode) TEMPLATE_SKILL_MODE[parseInt(id)] = (cfg as any).skillMode;
  if ((cfg as any).showInitials) TEMPLATE_SHOW_INITIALS[parseInt(id)] = true;
});

/* Build per-template config — each template gets unique visual properties */
function buildTemplateConfig(t: { id: number; category: string; accent: string }): LayoutConfig {
  const layoutType = TEMPLATE_LAYOUT_MAP[t.id] || CATEGORY_LAYOUT_FALLBACK[t.category] || "classic";
  const preset = LAYOUT_PRESETS[layoutType];
  const overrides = TEMPLATE_STYLE_OVERRIDES[t.id] || {};
  const FONTS: string[] = [
    "Inter, sans-serif", "Georgia, serif", "'Merriweather', serif",
    "'Roboto', sans-serif", "'Playfair Display', serif", "'Lato', sans-serif",
    "'Source Sans 3', sans-serif", "'EB Garamond', serif", "'Open Sans', sans-serif", "'Poppins', sans-serif",
  ];
  const BULLETS = ["●", "▸", "–", "■", "→", "◆"];
  const DIVIDERS: Array<LayoutConfig["headingBorder"]> = ["accent", "full", "double", "dots", "none"];
  const SIZES = ["12px", "13px", "14px", "15px", "16px", "13px", "15px", "14px"];
  const HEIGHTS = ["1.3", "1.4", "1.5", "1.6", "1.55", "1.45", "1.5", "1.35"];
  const MARGS = ["28px", "36px", "44px", "52px", "60px", "40px", "48px", "32px"];
  return {
    ...preset,
    font: FONTS[t.id % FONTS.length],
    accent: t.accent,
    bulletChar: BULLETS[t.id % BULLETS.length],
    headingBorder: DIVIDERS[t.id % DIVIDERS.length],
    headingUpper: t.id % 3 === 0,
    fontSize: SIZES[t.id % SIZES.length],
    lineHeight: HEIGHTS[t.id % HEIGHTS.length],
    margins: MARGS[t.id % MARGS.length],
    ...overrides,
  };
}

const TEMPLATE_CONFIGS: Record<number, LayoutConfig> = {};
TEMPLATE_REGISTRY.forEach((t) => { TEMPLATE_CONFIGS[t.id] = buildTemplateConfig(t); });

/* ═══════════════════════════════════════════════════════
   DEFAULTS
   ═══════════════════════════════════════════════════════ */
const DEFAULT_RESUME: ResumeData = {
  name: "Your Full Name", title: "Professional Title",
  email: "email@example.com", phone: "(555) 123-4567",
  location: "City, State", linkedin: "linkedin.com/in/yourprofile", website: "",
  summary: "Results-driven professional with X+ years of experience in your industry. Proven track record of delivering impactful results. Expertise in key skills relevant to your target role.",
  experience: [
    {
      company: "Company Name", role: "Job Title", dateRange: "MM/YYYY – Present", location: "City, State",
      bullets: ["Led cross-functional team of 8 to deliver product launch 2 weeks ahead of schedule",
        "Increased revenue by 32% through implementation of data-driven strategy",
        "Managed $2.4M annual budget while reducing costs by 18%"]
    },
    {
      company: "Previous Company", role: "Previous Role", dateRange: "MM/YYYY – MM/YYYY", location: "City, State",
      bullets: ["Developed solutions serving 50K+ users across 12 regions",
        "Reduced customer churn by 24% through onboarding redesign"]
    },
  ],
  education: [{ school: "University Name", degree: "Bachelor of Science in Computer Science", year: "2020" }],
  skills: ["JavaScript", "React", "Node.js", "Python", "SQL", "AWS", "Docker", "Agile"],
  certifications: ["AWS Solutions Architect", "PMP Certified"],
  projects: [{ name: "Project Name", description: "Built a full-stack platform serving 10K users", tech: "React, Node.js, AWS" }],
  awards: [],
  volunteer: [],
  publications: [],
  languages: [],
  board_affiliations: [],
  patents: [],
  speaking: [],
  open_source: [],
};

const DEFAULT_SECTIONS: ResumeSection[] = [
  { id: "contact", type: "contact", title: "Contact", visible: true },
  { id: "summary", type: "summary", title: "Summary", visible: true },
  { id: "experience", type: "experience", title: "Experience", visible: true },
  { id: "education", type: "education", title: "Education", visible: true },
  { id: "skills", type: "skills", title: "Skills", visible: true },
  { id: "certifications", type: "certifications", title: "Certifications", visible: true },
  { id: "projects", type: "projects", title: "Projects", visible: true },
  { id: "awards", type: "awards", title: "Awards & Honors", visible: false },
  { id: "volunteer", type: "volunteer", title: "Volunteer", visible: false },
  { id: "publications", type: "publications", title: "Publications", visible: false },
  { id: "languages", type: "languages", title: "Languages", visible: false },
  { id: "board_affiliations", type: "board_affiliations", title: "Board Affiliations", visible: false },
  { id: "patents", type: "patents", title: "Patents", visible: false },
  { id: "speaking", type: "speaking", title: "Speaking", visible: false },
  { id: "open_source", type: "open_source", title: "Open Source", visible: false },
];

const SECTION_ICONS: Record<string, React.ReactNode> = {
  contact: <User className="w-3.5 h-3.5" />,
  summary: <FileText className="w-3.5 h-3.5" />,
  experience: <Briefcase className="w-3.5 h-3.5" />,
  education: <GraduationCap className="w-3.5 h-3.5" />,
  skills: <Code className="w-3.5 h-3.5" />,
  certifications: <Award className="w-3.5 h-3.5" />,
  projects: <Globe className="w-3.5 h-3.5" />,
  awards: <Award className="w-3.5 h-3.5" />,
  volunteer: <CheckCircle className="w-3.5 h-3.5" />,
  publications: <FileText className="w-3.5 h-3.5" />,
  languages: <Globe className="w-3.5 h-3.5" />,
  board_affiliations: <Briefcase className="w-3.5 h-3.5" />,
  patents: <Hash className="w-3.5 h-3.5" />,
  speaking: <User className="w-3.5 h-3.5" />,
  open_source: <Code className="w-3.5 h-3.5" />,
};

/* ═══════════════════════════════════════════════════════
   DESIGN OPTIONS — expanded
   ═══════════════════════════════════════════════════════ */
const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Merriweather", value: "'Merriweather', serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Playfair", value: "'Playfair Display', serif" },
  { label: "Lato", value: "'Lato', sans-serif" },
  { label: "Monospace", value: "'Courier New', monospace" },
  { label: "Garamond", value: "'EB Garamond', serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
];
const FONT_SIZES = [
  { label: "Compact", value: "12px" },
  { label: "Small", value: "13px" },
  { label: "Medium", value: "15px" },
  { label: "Large", value: "17px" },
  { label: "XL", value: "19px" },
];
const ACCENT_COLORS = [
  { label: "Cyan", value: "#00D4FF" },
  { label: "Purple", value: "#7B61FF" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Teal", value: "#14B8A6" },
  { label: "Green", value: "#10B981" },
  { label: "Orange", value: "#F59E0B" },
  { label: "Red", value: "#EF4444" },
  { label: "Pink", value: "#EC4899" },
  { label: "Navy", value: "#1E3A5F" },
  { label: "Charcoal", value: "#374151" },
  { label: "Gold", value: "#D4A574" },
  { label: "Black", value: "#111827" },
];
const LINE_SPACING_OPTIONS = [
  { label: "Tight", value: "1.3" },
  { label: "Normal", value: "1.5" },
  { label: "Relaxed", value: "1.75" },
  { label: "Loose", value: "2.0" },
];
const MARGIN_OPTIONS = [
  { label: "Narrow", value: "24px" },
  { label: "Normal", value: "48px" },
  { label: "Wide", value: "64px" },
  { label: "Extra Wide", value: "80px" },
];
const HEADING_STYLES = [
  { label: "UPPERCASE", value: "uppercase" },
  { label: "Title Case", value: "capitalize" },
  { label: "lowercase", value: "lowercase" },
  { label: "Normal", value: "none" },
];
const BULLET_STYLES = [
  { label: "● Dot", value: "●" },
  { label: "▸ Arrow", value: "▸" },
  { label: "– Dash", value: "–" },
  { label: "■ Square", value: "■" },
  { label: "→ Right", value: "→" },
  { label: "◆ Diamond", value: "◆" },
];
const DIVIDER_STYLES = [
  { label: "Accent Line", value: "accent" },
  { label: "Full Line", value: "full" },
  { label: "Double Line", value: "double" },
  { label: "Dotted", value: "dots" },
  { label: "None", value: "none" },
];

/* ═══════════════════════════════════════════════════════
   SIDEBAR TOOL BUTTON
   ═══════════════════════════════════════════════════════ */
function ToolButton({ icon, label, active, badge, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; badge?: number; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-brand-cyan/10 text-brand-cyan" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      }`}>
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto bg-brand-green/15 text-brand-green text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   INLINE EDITABLE TEXT
   ═══════════════════════════════════════════════════════ */
const PreviewContext = React.createContext(false);

function InlineEdit({ value, onChange, className = "", multiline = false, placeholder = "", dark = false }: {
  value: string; onChange: (v: string) => void; className?: string; multiline?: boolean;
  placeholder?: string; dark?: boolean;
}) {
  const isPreview = React.useContext(PreviewContext);
  if (isPreview) {
    return multiline
      ? <p className={className}>{value || <span className="text-gray-400 italic">{placeholder}</span>}</p>
      : <span className={`inline-block ${className}`}>{value || <span className="text-gray-400 italic">{placeholder}</span>}</span>;
  }
  const base = dark ? [
    "outline-none w-full rounded px-1 -mx-1 transition-all duration-150",
    "border-b border-transparent",
    "hover:bg-white/[0.08]",
    "focus:border-white/30 focus:bg-white/[0.12] focus:shadow-sm",
    "placeholder:text-white/30 placeholder:italic",
    "print:border-transparent print:bg-transparent print:px-0 print:mx-0 print:shadow-none",
  ].join(" ") : [
    "outline-none w-full rounded px-1 -mx-1 transition-all duration-150",
    "border-b border-transparent",
    "hover:bg-black/[0.03]",
    "focus:border-brand-cyan/40 focus:bg-white/80 focus:shadow-sm",
    "placeholder:text-gray-300 placeholder:italic",
    "print:border-transparent print:bg-transparent print:px-0 print:mx-0 print:shadow-none",
  ].join(" ");
  if (multiline) {
    return (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className={`bg-transparent resize-none py-0.5 ${base} ${className}`} />
    );
  }
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`bg-transparent ${base} ${className}`} />
  );
}

/* ═══════════════════════════════════════════════════════
   RESUME QUALITY CHECK LOGIC
   ═══════════════════════════════════════════════════════ */
function runResumeChecks(resume: ResumeData) {
  const checks: { label: string; pass: boolean; tip: string }[] = [];
  checks.push({ label: "Full name provided", pass: resume.name.length > 0 && resume.name !== "Your Full Name", tip: "Add your real name." });
  checks.push({ label: "Professional title", pass: resume.title.length > 0 && resume.title !== "Professional Title", tip: "Set a professional title." });
  checks.push({ label: "Email address", pass: resume.email.includes("@") && resume.email !== "email@example.com", tip: "Add a valid email." });
  checks.push({ label: "Phone number", pass: resume.phone.length >= 7 && resume.phone !== "(555) 123-4567", tip: "Add your real phone number." });
  checks.push({ label: "Summary (50+ chars)", pass: resume.summary.length >= 50 && !resume.summary.includes("[industry"), tip: "Write a compelling summary." });
  checks.push({ label: "At least 1 experience", pass: resume.experience.length >= 1 && resume.experience[0].company !== "Company Name", tip: "Add work experience." });
  checks.push({ label: "Bullets with metrics", pass: resume.experience.some((e) => e.bullets.some((b) => /\d+/.test(b) && b.length > 20)), tip: "Add quantified bullet points." });
  checks.push({ label: "5+ skills listed", pass: resume.skills.filter((s) => s.length > 0).length >= 5, tip: "List at least 5 skills." });
  checks.push({ label: "Education included", pass: resume.education.length >= 1 && resume.education[0].school !== "University Name", tip: "Add education." });
  checks.push({ label: "LinkedIn profile", pass: resume.linkedin.includes("linkedin.com/in/") && resume.linkedin !== "linkedin.com/in/yourprofile", tip: "Add LinkedIn URL." });
  const score = Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);
  return { checks, score };
}

/* ═══════════════════════════════════════════════════════
   PDF / DOCX TEXT EXTRACTION
   ═══════════════════════════════════════════════════════ */
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(" "));
  }
  return pages.join("\n");
}

async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

function parseResumeText(text: string): Partial<ResumeData> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return {};
  const nameGuess = lines[0] || "";
  const emailLine = lines.find((l) => /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(l)) || "";
  const emailMatch = emailLine.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/)?.[0] || "";
  const phoneLine = lines.find((l) => /[\d\-()+ ]{7,}/.test(l) && !/@/.test(l)) || "";
  const phoneMatch = phoneLine.match(/[\d\-()+ ]{7,}/)?.[0]?.trim() || "";
  const linkedinLine = lines.find((l) => /linkedin\.com/i.test(l)) || "";
  const locationLine = lines.find((l) => /,\s*[A-Z]{2}\b/.test(l) && l.length < 50) || "";
  const remaining = lines.filter((l) => l !== nameGuess && l !== emailLine && l !== phoneLine && l !== linkedinLine);
  const summaryLines = remaining.filter((l) => l.length > 60).slice(0, 3);
  const shortLines = remaining.filter((l) => l.length < 40 && l.length > 2 && !/^\d/.test(l));
  const skills = shortLines.slice(0, 12);
  const bulletLines = remaining.filter((l) => /^[\-•▸●■→]/.test(l) || (l.length > 30 && l.length < 200));
  const experience: ExperienceEntry[] = [];
  if (bulletLines.length > 0) {
    experience.push({
      company: "", role: "", dateRange: "", location: "",
      bullets: bulletLines.slice(0, 5).map((b) => b.replace(/^[\-•▸●■→]\s*/, "")),
    });
  }
  return {
    name: nameGuess.length < 60 ? nameGuess : "",
    email: emailMatch,
    phone: phoneMatch,
    linkedin: linkedinLine,
    location: locationLine,
    summary: summaryLines.join(" ") || "",
    skills: skills.length > 0 ? skills : undefined,
    experience: experience.length > 0 ? experience : undefined,
  };
}

/* ═══════════════════════════════════════════════════════
   SECTION HEADING COMPONENT
   ═══════════════════════════════════════════════════════ */
function SectionHeading({ title, headingTransform, dividerStyle }: {
  title: string; headingTransform: string; dividerStyle: string;
}) {
  const transformClass = headingTransform === 'uppercase' ? 'uppercase' : headingTransform === 'capitalize' ? 'capitalize' : headingTransform === 'lowercase' ? 'lowercase' : 'normal-case';
  const borderEl = () => {
    switch (dividerStyle) {
      case "accent": return <div className="h-[2px] mt-1 bg-[var(--ra-60)]" />;
      case "full": return <div className="h-[1px] mt-1 bg-gray-300" />;
      case "double": return <><div className="h-[1px] mt-1 bg-gray-300" /><div className="h-[1px] mt-0.5 bg-gray-300" /></>;
      case "dots": return <div className="mt-1 border-b-2 border-dotted border-gray-300" />;
      default: return null;
    }
  };
  return (
    <div className="mb-3">
      <h2 className={`text-sm font-bold tracking-[0.12em] pb-0.5 text-[var(--ra)] ${transformClass}`}>
        {title}
      </h2>
      {borderEl()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN EDITOR PAGE
   ═══════════════════════════════════════════════════════ */
function ResumeEditorPage() {
  const searchParams = useSearchParams();
  const templateParam = searchParams.get("template");
  const templateId = templateParam ? parseInt(templateParam, 10) : 1;
  const paperRef = useRef<HTMLDivElement>(null);

  /* ── State ─────────────────────────────────────────── */
  const [activeTemplateId, setActiveTemplateId] = useState(templateId);
  const [resume, setResume] = useState<ResumeData>({ ...DEFAULT_RESUME });
  const [sections, setSections] = useState<ResumeSection[]>([...DEFAULT_SECTIONS]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [templateCategory, setTemplateCategory] = useState("All");
  const [undoStack, setUndoStack] = useState<ResumeData[]>([]);
  const [redoStack, setRedoStack] = useState<ResumeData[]>([]);
  const [undoTimestamps, setUndoTimestamps] = useState<number[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  /* ── Design state ──────────────────────────────────── */
  const initCfg = TEMPLATE_CONFIGS[templateId] || TEMPLATE_CONFIGS[1];
  const [designFont, setDesignFont] = useState(initCfg.font);
  const [designFontSize, setDesignFontSize] = useState(initCfg.fontSize);
  const [designAccent, setDesignAccent] = useState(initCfg.accent);
  const [lineSpacing, setLineSpacing] = useState(initCfg.lineHeight);
  const [margins, setMargins] = useState(initCfg.margins);
  const [headingTransform, setHeadingTransform] = useState(initCfg.headingUpper ? "uppercase" : "capitalize");
  const [bulletChar, setBulletChar] = useState(initCfg.bulletChar);
  const [dividerStyle, setDividerStyle] = useState<string>(initCfg.headingBorder);
  const [layoutType, setLayoutType] = useState<LayoutType>(initCfg.type);
  const [sidebarBg, setSidebarBg] = useState(initCfg.sidebarBg || "accent");
  const [sidebarTextColor, setSidebarTextColor] = useState(initCfg.sidebarText || "#ffffff");
  const [bodyBg, setBodyBg] = useState(initCfg.bodyBg || "#ffffff");
  const [headerBg, setHeaderBg] = useState(initCfg.headerBg || "transparent");
  const [skillStyle, setSkillStyle] = useState(TEMPLATE_SKILL_MODE[templateId] || "pills");
  const [showInitials, setShowInitials] = useState(TEMPLATE_SHOW_INITIALS[templateId] || false);

  const templateInfo = TEMPLATE_REGISTRY.find((t) => t.id === activeTemplateId) || TEMPLATE_REGISTRY[0];

  /* ── Update w/ undo ────────────────────────────────── */
  const updateResume = useCallback((updater: (prev: ResumeData) => ResumeData) => {
    setResume((prev) => {
      setUndoStack((s) => [...s.slice(-30), prev]);
      setRedoStack([]);
      setUndoTimestamps((ts) => [...ts.slice(-30), Date.now()]);
      return updater(prev);
    });
  }, []);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setResume((cur) => { setRedoStack((rs) => [...rs, cur]); return prev; });
      return stack.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      setResume((cur) => { setUndoStack((us) => [...us, cur]); return next; });
      return stack.slice(0, -1);
    });
  }, []);

  /* ── Keyboard shortcuts ────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  /* ── Save / Load ───────────────────────────────────── */
  const handleSave = useCallback(() => {
    setSaving(true);
    localStorage.setItem(`resume-draft-${activeTemplateId}`, JSON.stringify(resume));
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 400);
  }, [resume, activeTemplateId]);

  useEffect(() => {
    const d = localStorage.getItem(`resume-draft-${activeTemplateId}`);
    if (d) { try { setResume(JSON.parse(d)); } catch { /* ignore */ } }
  }, [activeTemplateId]);

  /* ── Section management ────────────────────────────── */
  const moveSection = (idx: number, dir: "up" | "down") => {
    setSections((prev) => {
      const arr = [...prev]; const sw = dir === "up" ? idx - 1 : idx + 1;
      if (sw < 0 || sw >= arr.length) return prev;
      [arr[idx], arr[sw]] = [arr[sw], arr[idx]]; return arr;
    });
  };
  const toggleSection = (id: string) => setSections((p) => p.map((s) => s.id === id ? { ...s, visible: !s.visible } : s));

  const handleExportPDF = useCallback(() => { window.print(); }, []);
  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000);
    });
  }, []);

  /* ── Upload Resume (PDF / DOCX / TXT / JSON) ──────── */
  const handleUploadResume = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (ext === "json") {
        const text = await file.text();
        const data = JSON.parse(text) as Partial<ResumeData>;
        updateResume((prev) => ({ ...prev, ...data }));
      } else if (ext === "pdf") {
        const buffer = await file.arrayBuffer();
        const text = await extractTextFromPDF(buffer);
        const parsed = parseResumeText(text);
        updateResume((prev) => ({ ...prev, ...parsed }));
      } else if (ext === "docx" || ext === "doc") {
        const buffer = await file.arrayBuffer();
        const text = await extractTextFromDOCX(buffer);
        const parsed = parseResumeText(text);
        updateResume((prev) => ({ ...prev, ...parsed }));
      } else {
        const text = await file.text();
        const parsed = parseResumeText(text);
        updateResume((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      alert("Could not parse file. Try a different format (PDF, DOCX, TXT, or JSON).");
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, [updateResume]);

  /* ── Template select ───────────────────────────────── */
  const selectTemplate = useCallback((id: number) => {
    setActiveTemplateId(id);
    const cfg = TEMPLATE_CONFIGS[id];
    if (cfg) {
      setDesignFont(cfg.font);
      setDesignAccent(cfg.accent);
      setLayoutType(cfg.type);
      setHeadingTransform(cfg.headingUpper ? "uppercase" : "capitalize");
      setBulletChar(cfg.bulletChar);
      setDividerStyle(cfg.headingBorder);
      setDesignFontSize(cfg.fontSize);
      setLineSpacing(cfg.lineHeight);
      setMargins(cfg.margins);
      setSidebarBg(cfg.sidebarBg || "accent");
      setSidebarTextColor(cfg.sidebarText || "#ffffff");
      setBodyBg(cfg.bodyBg || "#ffffff");
      setHeaderBg(cfg.headerBg || "transparent");
      setSkillStyle(TEMPLATE_SKILL_MODE[id] || "pills");
      setShowInitials(TEMPLATE_SHOW_INITIALS[id] || false);
    }
  }, []);

  const filteredTemplates = TEMPLATE_REGISTRY.filter(
    (t) => templateCategory === "All" || t.category === templateCategory
  );

  const { checks, score } = runResumeChecks(resume);

  const toggleTool = (t: string) => { setActiveTool((p) => p === t ? null : t); setShowTemplates(false); };
  const closeTool = () => setActiveTool(null);

  /* ═══════════════════════════════════════════════════
     RENDER HELPERS FOR RESUME SECTIONS
     ═══════════════════════════════════════════════════ */
  const renderSummary = () => (
    <div className="border-l-[3px] border-l-[var(--ra)] pl-3">
      <InlineEdit value={resume.summary} onChange={(v) => updateResume((r) => ({ ...r, summary: v }))}
        multiline placeholder="Write your professional summary…" className="text-gray-700 leading-relaxed" />
    </div>
  );

  const renderExperience = () => (
    <div className="space-y-5">
      {resume.experience.map((exp, idx) => (
        <div key={idx} className="group/exp relative">
          <button aria-label="Remove experience" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, experience: r.experience.filter((_, i) => i !== idx) })); }}
            className="absolute -right-1 top-0 opacity-0 group-hover/exp:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition print:hidden"><Trash2 className="w-4 h-4" /></button>
          <div className="flex items-baseline justify-between gap-4">
            <InlineEdit value={exp.role} onChange={(v) => updateResume((r) => ({ ...r, experience: r.experience.map((x, i) => i === idx ? { ...x, role: v } : x) }))} className="font-semibold text-gray-900" placeholder="Job Title" />
            <InlineEdit value={exp.dateRange} onChange={(v) => updateResume((r) => ({ ...r, experience: r.experience.map((x, i) => i === idx ? { ...x, dateRange: v } : x) }))} className="text-gray-500 text-right whitespace-nowrap flex-shrink-0 w-[180px]" placeholder="Date range" />
          </div>
          <div className="flex items-baseline gap-3">
            <InlineEdit value={exp.company} onChange={(v) => updateResume((r) => ({ ...r, experience: r.experience.map((x, i) => i === idx ? { ...x, company: v } : x) }))} className="text-gray-600 italic" placeholder="Company" />
            <span className="text-gray-300">|</span>
            <InlineEdit value={exp.location} onChange={(v) => updateResume((r) => ({ ...r, experience: r.experience.map((x, i) => i === idx ? { ...x, location: v } : x) }))} className="text-gray-500" placeholder="Location" />
          </div>
          <ul className="mt-1.5 space-y-0.5 list-none">
            {exp.bullets.map((b, bIdx) => (
              <li key={bIdx} className="flex items-start gap-2 group/b">
                <span className="mt-[5px] text-[10px] flex-shrink-0 text-[var(--ra)]">{bulletChar}</span>
                <InlineEdit value={b}
                  onChange={(v) => updateResume((r) => ({
                    ...r,
                    experience: r.experience.map((x, i) => i === idx ? { ...x, bullets: x.bullets.map((bb, bi) => bi === bIdx ? v : bb) } : x)
                  }))}
                  className="text-gray-700 flex-1" placeholder="Describe achievement…" />
                <button aria-label="Remove bullet" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, experience: r.experience.map((x, i) => i === idx ? { ...x, bullets: x.bullets.filter((_, bi) => bi !== bIdx) } : x) })); }}
                  className="opacity-0 group-hover/b:opacity-100 p-0.5 text-gray-400 hover:text-red-500 print:hidden"><X className="w-3 h-3" /></button>
              </li>
            ))}
          </ul>
          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, experience: r.experience.map((x, i) => i === idx ? { ...x, bullets: [...x.bullets, ""] } : x) })); }}
            className="flex items-center gap-1 text-xs mt-1 ml-3.5 text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3 h-3" /> bullet</button>
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, experience: [...r.experience, { company: "", role: "", dateRange: "", location: "", bullets: [""] }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add position</button>
    </div>
  );

  const renderEducation = () => (
    <div className="space-y-3">
      {resume.education.map((edu, idx) => (
        <div key={idx} className="group/edu relative">
          <div className="flex justify-between gap-4">
            <div className="flex-1 min-w-0">
              <InlineEdit value={edu.degree} onChange={(v) => updateResume((r) => ({ ...r, education: r.education.map((x, i) => i === idx ? { ...x, degree: v } : x) }))} className="font-semibold text-gray-900" placeholder="Degree" />
              <InlineEdit value={edu.school} onChange={(v) => updateResume((r) => ({ ...r, education: r.education.map((x, i) => i === idx ? { ...x, school: v } : x) }))} className="text-gray-600 italic" placeholder="School" />
            </div>
            <InlineEdit value={edu.year} onChange={(v) => updateResume((r) => ({ ...r, education: r.education.map((x, i) => i === idx ? { ...x, year: v } : x) }))} className="text-gray-500 text-right w-[80px] flex-shrink-0" placeholder="Year" />
          </div>
          <button aria-label="Remove education" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, education: r.education.filter((_, i) => i !== idx) })); }}
            className="absolute -right-1 top-0 opacity-0 group-hover/edu:opacity-100 p-1 text-gray-400 hover:text-red-500 print:hidden"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, education: [...r.education, { school: "", degree: "", year: "" }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add education</button>
    </div>
  );

  const renderSkills = () => (
    <div>
      {skillStyle === "pills" ? (
        <div className="flex flex-wrap gap-2">
          {resume.skills.map((sk, idx) => (
            <div key={idx} className="group/sk flex items-center gap-1 rounded-full px-3 py-1 transition bg-[var(--ra-12)] border border-[var(--ra-30)] text-[var(--ra)]">
              <InlineEdit value={sk} onChange={(v) => updateResume((r) => ({ ...r, skills: r.skills.map((s, i) => i === idx ? v : s) }))} className="w-24 focus:w-36 transition-all text-[var(--ra)]" placeholder="Skill" />
              <button aria-label="Remove skill" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, skills: r.skills.filter((_, i) => i !== idx) })); }}
                className="opacity-0 group-hover/sk:opacity-100 hover:text-red-500 print:hidden text-[var(--ra-80)]"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, skills: [...r.skills, ""] })); }}
            className="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed text-xs transition print:hidden border-[var(--ra-50)] text-[var(--ra-80)]"><Plus className="w-3 h-3" /> Add</button>
        </div>
      ) : skillStyle === "bars" ? (
        <div className="space-y-2">
          {resume.skills.map((sk, idx) => (
            <div key={idx} className="group/sk">
              <div className="flex items-center justify-between">
                <InlineEdit value={sk} onChange={(v) => updateResume((r) => ({ ...r, skills: r.skills.map((s, i) => i === idx ? v : s) }))} className="text-gray-700 text-sm flex-1" placeholder="Skill" />
                <button aria-label="Remove skill" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, skills: r.skills.filter((_, i) => i !== idx) })); }}
                  className="opacity-0 group-hover/sk:opacity-100 text-gray-400 hover:text-red-500 print:hidden ml-1"><X className="w-3 h-3" /></button>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 mt-0.5">
                <div className="h-full rounded-full transition-all bg-[var(--ra)]" ref={(el) => { if (el) el.style.width = `${65 + (idx * 5)}%`; }} />
              </div>
            </div>
          ))}
          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, skills: [...r.skills, ""] })); }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3 h-3" /> Add</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {resume.skills.map((sk, idx) => (
            <div key={idx} className="group/sk flex items-center gap-1 rounded-md px-2.5 py-1 border border-gray-200 bg-gray-50/50 hover:border-gray-300 transition">
              <InlineEdit value={sk} onChange={(v) => updateResume((r) => ({ ...r, skills: r.skills.map((s, i) => i === idx ? v : s) }))} className="text-gray-700 w-24 focus:w-36 transition-all" placeholder="Skill" />
              <button aria-label="Remove skill" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, skills: r.skills.filter((_, i) => i !== idx) })); }}
                className="opacity-0 group-hover/sk:opacity-100 text-gray-400 hover:text-red-500 print:hidden"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, skills: [...r.skills, ""] })); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-gray-300 text-xs text-gray-400 hover:text-brand-cyan hover:border-brand-cyan transition print:hidden"><Plus className="w-3 h-3" /> Add</button>
        </div>
      )}
    </div>
  );

  const renderCertifications = () => (
    <div className="space-y-1.5">
      {resume.certifications.map((cert, idx) => (
        <div key={idx} className="group/cert flex items-center gap-2">
          <span className="text-[10px] flex-shrink-0 text-[var(--ra)]">{bulletChar}</span>
          <InlineEdit value={cert} onChange={(v) => updateResume((r) => ({ ...r, certifications: r.certifications.map((c, i) => i === idx ? v : c) }))} className="text-gray-700 flex-1" placeholder="Certification" />
          <button aria-label="Remove certification" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, certifications: r.certifications.filter((_, i) => i !== idx) })); }}
            className="opacity-0 group-hover/cert:opacity-100 text-gray-400 hover:text-red-500 print:hidden"><X className="w-3 h-3" /></button>
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, certifications: [...r.certifications, ""] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add</button>
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-4">
      {resume.projects.map((proj, idx) => (
        <div key={idx} className="group/proj relative">
          <button aria-label="Remove project" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, projects: r.projects.filter((_, i) => i !== idx) })); }}
            className="absolute -right-1 top-0 opacity-0 group-hover/proj:opacity-100 p-1 text-gray-400 hover:text-red-500 print:hidden"><Trash2 className="w-3.5 h-3.5" /></button>
          <div className="flex items-baseline gap-3">
            <InlineEdit value={proj.name} onChange={(v) => updateResume((r) => ({ ...r, projects: r.projects.map((p, i) => i === idx ? { ...p, name: v } : p) }))} className="font-semibold text-gray-900" placeholder="Project Name" />
            <span className="text-gray-300">|</span>
            <InlineEdit value={proj.tech} onChange={(v) => updateResume((r) => ({ ...r, projects: r.projects.map((p, i) => i === idx ? { ...p, tech: v } : p) }))} className="text-gray-500 italic" placeholder="Technologies" />
          </div>
          <InlineEdit value={proj.description} onChange={(v) => updateResume((r) => ({ ...r, projects: r.projects.map((p, i) => i === idx ? { ...p, description: v } : p) }))} className="text-gray-700" placeholder="Description…" />
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, projects: [...r.projects, { name: "", description: "", tech: "" }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add project</button>
    </div>
  );

  /* ── Extended section renderers (8 new types) ──────── */
  const renderAwards = () => (
    <div className="space-y-3">
      {resume.awards.map((a, idx) => (
        <div key={idx} className="group/award relative">
          <button aria-label="Remove award" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, awards: r.awards.filter((_, i) => i !== idx) })); }}
            className="absolute -right-1 top-0 opacity-0 group-hover/award:opacity-100 p-1 text-gray-400 hover:text-red-500 print:hidden"><Trash2 className="w-3.5 h-3.5" /></button>
          <div className="flex items-baseline gap-3">
            <InlineEdit value={a.title} onChange={(v) => updateResume((r) => ({ ...r, awards: r.awards.map((x, i) => i === idx ? { ...x, title: v } : x) }))} className="font-semibold text-gray-900" placeholder="Award Title" />
            <span className="text-gray-300">|</span>
            <InlineEdit value={a.issuer} onChange={(v) => updateResume((r) => ({ ...r, awards: r.awards.map((x, i) => i === idx ? { ...x, issuer: v } : x) }))} className="text-gray-500" placeholder="Issuer" />
            <InlineEdit value={a.year} onChange={(v) => updateResume((r) => ({ ...r, awards: r.awards.map((x, i) => i === idx ? { ...x, year: v } : x) }))} className="text-gray-400 text-sm" placeholder="Year" />
          </div>
          <InlineEdit value={a.description} onChange={(v) => updateResume((r) => ({ ...r, awards: r.awards.map((x, i) => i === idx ? { ...x, description: v } : x) }))} className="text-gray-700" placeholder="Description…" />
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, awards: [...r.awards, { title: "", issuer: "", year: "", description: "" }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add award</button>
    </div>
  );

  const renderVolunteer = () => (
    <div className="space-y-3">
      {resume.volunteer.map((v, idx) => (
        <div key={idx} className="group/vol relative">
          <button aria-label="Remove volunteer" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, volunteer: r.volunteer.filter((_, i) => i !== idx) })); }}
            className="absolute -right-1 top-0 opacity-0 group-hover/vol:opacity-100 p-1 text-gray-400 hover:text-red-500 print:hidden"><Trash2 className="w-3.5 h-3.5" /></button>
          <div className="flex items-baseline gap-3">
            <InlineEdit value={v.organization} onChange={(val) => updateResume((r) => ({ ...r, volunteer: r.volunteer.map((x, i) => i === idx ? { ...x, organization: val } : x) }))} className="font-semibold text-gray-900" placeholder="Organization" />
            <span className="text-gray-300">|</span>
            <InlineEdit value={v.role} onChange={(val) => updateResume((r) => ({ ...r, volunteer: r.volunteer.map((x, i) => i === idx ? { ...x, role: val } : x) }))} className="text-gray-500" placeholder="Role" />
            <InlineEdit value={v.dateRange} onChange={(val) => updateResume((r) => ({ ...r, volunteer: r.volunteer.map((x, i) => i === idx ? { ...x, dateRange: val } : x) }))} className="text-gray-400 text-sm" placeholder="Date range" />
          </div>
          <InlineEdit value={v.description} onChange={(val) => updateResume((r) => ({ ...r, volunteer: r.volunteer.map((x, i) => i === idx ? { ...x, description: val } : x) }))} className="text-gray-700" placeholder="Description…" />
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, volunteer: [...r.volunteer, { organization: "", role: "", dateRange: "", description: "" }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add volunteer</button>
    </div>
  );

  const renderPublications = () => (
    <div className="space-y-3">
      {resume.publications.map((p, idx) => (
        <div key={idx} className="group/pub relative">
          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, publications: r.publications.filter((_, i) => i !== idx) })); }}
            className="absolute -right-1 top-0 opacity-0 group-hover/pub:opacity-100 p-1 text-gray-400 hover:text-red-500 print:hidden" aria-label="Delete publication"><Trash2 className="w-3.5 h-3.5" /></button>
          <div className="flex items-baseline gap-3">
            <InlineEdit value={p.title} onChange={(v) => updateResume((r) => ({ ...r, publications: r.publications.map((x, i) => i === idx ? { ...x, title: v } : x) }))} className="font-semibold text-gray-900" placeholder="Publication Title" />
            <span className="text-gray-300">|</span>
            <InlineEdit value={p.venue} onChange={(v) => updateResume((r) => ({ ...r, publications: r.publications.map((x, i) => i === idx ? { ...x, venue: v } : x) }))} className="text-gray-500 italic" placeholder="Journal / Conference" />
            <InlineEdit value={p.year} onChange={(v) => updateResume((r) => ({ ...r, publications: r.publications.map((x, i) => i === idx ? { ...x, year: v } : x) }))} className="text-gray-400 text-sm" placeholder="Year" />
          </div>
          {p.url && <span className="text-xs text-brand-cyan break-all">{p.url}</span>}
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, publications: [...r.publications, { title: "", venue: "", year: "", url: "" }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add publication</button>
    </div>
  );

  const PROFICIENCY_LABELS: Record<string, string> = { native: "Native", fluent: "Fluent", professional: "Professional", conversational: "Conversational", basic: "Basic" };
  const renderLanguages = () => (
    <div className="space-y-2">
      {resume.languages.map((lang, idx) => (
        <div key={idx} className="group/lang flex items-center gap-3">
          <InlineEdit value={lang.language} onChange={(v) => updateResume((r) => ({ ...r, languages: r.languages.map((x, i) => i === idx ? { ...x, language: v } : x) }))} className="font-medium text-gray-900" placeholder="Language" />
          <select
            value={lang.proficiency}
            onChange={(e) => updateResume((r) => ({ ...r, languages: r.languages.map((x, i) => i === idx ? { ...x, proficiency: e.target.value as LanguageEntry["proficiency"] } : x) }))}
            className="text-xs text-gray-500 bg-transparent border border-gray-200 rounded px-2 py-0.5 print:border-none"
            title="Proficiency level"
          >
            {Object.entries(PROFICIENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, languages: r.languages.filter((_, i) => i !== idx) })); }}
            className="opacity-0 group-hover/lang:opacity-100 text-gray-400 hover:text-red-500 print:hidden" aria-label="Delete language"><X className="w-3 h-3" /></button>
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, languages: [...r.languages, { language: "", proficiency: "professional" }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add language</button>
    </div>
  );

  const renderBoardAffiliations = () => (
    <div className="space-y-3">
      {resume.board_affiliations.map((b, idx) => (
        <div key={idx} className="group/board relative">
          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, board_affiliations: r.board_affiliations.filter((_, i) => i !== idx) })); }}
            className="absolute -right-1 top-0 opacity-0 group-hover/board:opacity-100 p-1 text-gray-400 hover:text-red-500 print:hidden" aria-label="Delete affiliation"><Trash2 className="w-3.5 h-3.5" /></button>
          <div className="flex items-baseline gap-3">
            <InlineEdit value={b.organization} onChange={(v) => updateResume((r) => ({ ...r, board_affiliations: r.board_affiliations.map((x, i) => i === idx ? { ...x, organization: v } : x) }))} className="font-semibold text-gray-900" placeholder="Organization" />
            <span className="text-gray-300">|</span>
            <InlineEdit value={b.role} onChange={(v) => updateResume((r) => ({ ...r, board_affiliations: r.board_affiliations.map((x, i) => i === idx ? { ...x, role: v } : x) }))} className="text-gray-500" placeholder="Role" />
            <InlineEdit value={b.dateRange} onChange={(v) => updateResume((r) => ({ ...r, board_affiliations: r.board_affiliations.map((x, i) => i === idx ? { ...x, dateRange: v } : x) }))} className="text-gray-400 text-sm" placeholder="Date range" />
          </div>
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, board_affiliations: [...r.board_affiliations, { organization: "", role: "", dateRange: "" }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add affiliation</button>
    </div>
  );

  const renderPatents = () => (
    <div className="space-y-3">
      {resume.patents.map((p, idx) => (
        <div key={idx} className="group/patent relative">
          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, patents: r.patents.filter((_, i) => i !== idx) })); }}
            className="absolute -right-1 top-0 opacity-0 group-hover/patent:opacity-100 p-1 text-gray-400 hover:text-red-500 print:hidden" aria-label="Delete patent"><Trash2 className="w-3.5 h-3.5" /></button>
          <div className="flex items-baseline gap-3">
            <InlineEdit value={p.title} onChange={(v) => updateResume((r) => ({ ...r, patents: r.patents.map((x, i) => i === idx ? { ...x, title: v } : x) }))} className="font-semibold text-gray-900" placeholder="Patent Title" />
            <span className="text-gray-300">|</span>
            <InlineEdit value={p.number} onChange={(v) => updateResume((r) => ({ ...r, patents: r.patents.map((x, i) => i === idx ? { ...x, number: v } : x) }))} className="text-gray-500 font-mono" placeholder="Patent #" />
            <InlineEdit value={p.year} onChange={(v) => updateResume((r) => ({ ...r, patents: r.patents.map((x, i) => i === idx ? { ...x, year: v } : x) }))} className="text-gray-400 text-sm" placeholder="Year" />
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.status === "granted" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"}`}>
              {p.status === "granted" ? "Granted" : "Pending"}
            </span>
          </div>
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, patents: [...r.patents, { title: "", number: "", year: "", status: "pending" }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add patent</button>
    </div>
  );

  const renderSpeaking = () => (
    <div className="space-y-3">
      {resume.speaking.map((s, idx) => (
        <div key={idx} className="group/speak relative">
          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, speaking: r.speaking.filter((_, i) => i !== idx) })); }}
            className="absolute -right-1 top-0 opacity-0 group-hover/speak:opacity-100 p-1 text-gray-400 hover:text-red-500 print:hidden" aria-label="Delete talk"><Trash2 className="w-3.5 h-3.5" /></button>
          <div className="flex items-baseline gap-3">
            <InlineEdit value={s.title} onChange={(v) => updateResume((r) => ({ ...r, speaking: r.speaking.map((x, i) => i === idx ? { ...x, title: v } : x) }))} className="font-semibold text-gray-900" placeholder="Talk Title" />
            <span className="text-gray-300">|</span>
            <InlineEdit value={s.event} onChange={(v) => updateResume((r) => ({ ...r, speaking: r.speaking.map((x, i) => i === idx ? { ...x, event: v } : x) }))} className="text-gray-500" placeholder="Event / Conference" />
            <InlineEdit value={s.year} onChange={(v) => updateResume((r) => ({ ...r, speaking: r.speaking.map((x, i) => i === idx ? { ...x, year: v } : x) }))} className="text-gray-400 text-sm" placeholder="Year" />
          </div>
          <InlineEdit value={s.audience} onChange={(v) => updateResume((r) => ({ ...r, speaking: r.speaking.map((x, i) => i === idx ? { ...x, audience: v } : x) }))} className="text-gray-600 text-sm" placeholder="Audience: e.g. 500+ attendees" />
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, speaking: [...r.speaking, { title: "", event: "", year: "", audience: "" }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add talk</button>
    </div>
  );

  const renderOpenSource = () => (
    <div className="space-y-3">
      {resume.open_source.map((os, idx) => (
        <div key={idx} className="group/oss relative">
          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, open_source: r.open_source.filter((_, i) => i !== idx) })); }}
            className="absolute -right-1 top-0 opacity-0 group-hover/oss:opacity-100 p-1 text-gray-400 hover:text-red-500 print:hidden" aria-label="Delete open source project"><Trash2 className="w-3.5 h-3.5" /></button>
          <div className="flex items-baseline gap-3">
            <InlineEdit value={os.name} onChange={(v) => updateResume((r) => ({ ...r, open_source: r.open_source.map((x, i) => i === idx ? { ...x, name: v } : x) }))} className="font-semibold text-gray-900" placeholder="Project Name" />
            <span className="text-gray-300">|</span>
            <InlineEdit value={os.role} onChange={(v) => updateResume((r) => ({ ...r, open_source: r.open_source.map((x, i) => i === idx ? { ...x, role: v } : x) }))} className="text-gray-500" placeholder="Role (Maintainer, Contributor)" />
          </div>
          <InlineEdit value={os.description} onChange={(v) => updateResume((r) => ({ ...r, open_source: r.open_source.map((x, i) => i === idx ? { ...x, description: v } : x) }))} className="text-gray-700" placeholder="Description…" />
          {os.url && <span className="text-xs text-brand-cyan break-all">{os.url}</span>}
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, open_source: [...r.open_source, { name: "", role: "", url: "", description: "" }] })); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-cyan transition print:hidden"><Plus className="w-3.5 h-3.5" /> Add project</button>
    </div>
  );

  /* ── Section renderer lookup ───────────────────────── */
  const renderSection = (type: string) => {
    switch (type) {
      case "summary": return renderSummary();
      case "experience": return renderExperience();
      case "education": return renderEducation();
      case "skills": return renderSkills();
      case "certifications": return renderCertifications();
      case "projects": return renderProjects();
      case "awards": return renderAwards();
      case "volunteer": return renderVolunteer();
      case "publications": return renderPublications();
      case "languages": return renderLanguages();
      case "board_affiliations": return renderBoardAffiliations();
      case "patents": return renderPatents();
      case "speaking": return renderSpeaking();
      case "open_source": return renderOpenSource();
      default: return null;
    }
  };

  /* ═══════════════════════════════════════════════════
     HEADER RENDERERS by layout type
     ═══════════════════════════════════════════════════ */
  const contactVisible = sections.find((s) => s.id === "contact")?.visible;

  const renderHeaderClassic = () => (
    <div id="sec-contact" onClick={() => setActiveSection("contact")}
      className={`pt-10 pb-6 border-b-2 transition cursor-text border-[var(--ra)] pl-[var(--rm)] pr-[var(--rm)] ${activeSection === "contact" ? "bg-gray-50/50" : ""}`}>
      <InlineEdit value={resume.name} onChange={(v) => updateResume((r) => ({ ...r, name: v }))} placeholder="Your Full Name"
        className="text-3xl font-bold tracking-tight text-gray-900 w-full" />
      <InlineEdit value={resume.title} onChange={(v) => updateResume((r) => ({ ...r, title: v }))} placeholder="Professional Title"
        className="text-lg mt-1 text-[var(--ra)]" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-gray-600 text-[0.85em]">
        <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-[var(--ra)]" />
          <InlineEdit value={resume.email} onChange={(v) => updateResume((r) => ({ ...r, email: v }))} placeholder="email" className="text-gray-700" /></div>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[var(--ra)]" />
          <InlineEdit value={resume.phone} onChange={(v) => updateResume((r) => ({ ...r, phone: v }))} placeholder="phone" className="text-gray-700" /></div>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[var(--ra)]" />
          <InlineEdit value={resume.location} onChange={(v) => updateResume((r) => ({ ...r, location: v }))} placeholder="City, State" className="text-gray-700" /></div>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1"><Linkedin className="w-3.5 h-3.5 text-[var(--ra)]" />
          <InlineEdit value={resume.linkedin} onChange={(v) => updateResume((r) => ({ ...r, linkedin: v }))} placeholder="LinkedIn" className="text-gray-700" /></div>
      </div>
    </div>
  );

  const renderHeaderModern = () => (
    <div id="sec-contact" onClick={() => setActiveSection("contact")}
      className={`pt-8 pb-6 transition cursor-text rounded-t-sm bg-[var(--ra)] pl-[var(--rm)] pr-[var(--rm)] ${activeSection === "contact" ? "ring-2 ring-inset ring-white/30" : ""}`}>
      <InlineEdit value={resume.name} onChange={(v) => updateResume((r) => ({ ...r, name: v }))} placeholder="Your Full Name"
        className="text-3xl font-bold tracking-tight text-white w-full" dark />
      <InlineEdit value={resume.title} onChange={(v) => updateResume((r) => ({ ...r, title: v }))} placeholder="Professional Title"
        className="text-lg mt-1 text-white/80" dark />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-white/70 text-[0.85em]">
        <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-white/60" />
          <InlineEdit value={resume.email} onChange={(v) => updateResume((r) => ({ ...r, email: v }))} placeholder="email" className="text-white/90" dark /></div>
        <span className="text-white/30">|</span>
        <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-white/60" />
          <InlineEdit value={resume.phone} onChange={(v) => updateResume((r) => ({ ...r, phone: v }))} placeholder="phone" className="text-white/90" dark /></div>
        <span className="text-white/30">|</span>
        <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-white/60" />
          <InlineEdit value={resume.location} onChange={(v) => updateResume((r) => ({ ...r, location: v }))} placeholder="City, State" className="text-white/90" dark /></div>
        <span className="text-white/30">|</span>
        <div className="flex items-center gap-1"><Linkedin className="w-3.5 h-3.5 text-white/60" />
          <InlineEdit value={resume.linkedin} onChange={(v) => updateResume((r) => ({ ...r, linkedin: v }))} placeholder="LinkedIn" className="text-white/90" dark /></div>
      </div>
    </div>
  );

  const renderHeaderCreative = () => (
    <div id="sec-contact" onClick={() => setActiveSection("contact")}
      className={`pt-10 pb-8 text-center transition cursor-text rounded-t-sm [background:linear-gradient(135deg,var(--ra),var(--ra-99))] pl-[var(--rm)] pr-[var(--rm)] ${activeSection === "contact" ? "ring-2 ring-inset ring-white/30" : ""}`}>
      <InlineEdit value={resume.name} onChange={(v) => updateResume((r) => ({ ...r, name: v }))} placeholder="Your Full Name"
        className="text-4xl font-bold tracking-tight text-white w-full text-center" dark />
      <InlineEdit value={resume.title} onChange={(v) => updateResume((r) => ({ ...r, title: v }))} placeholder="Professional Title"
        className="text-xl mt-2 text-white/80 text-center" dark />
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-4 text-white/70 text-[0.85em]">
        <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /><InlineEdit value={resume.email} onChange={(v) => updateResume((r) => ({ ...r, email: v }))} placeholder="email" className="text-white/90" dark /></div>
        <span className="text-white/30">|</span>
        <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /><InlineEdit value={resume.phone} onChange={(v) => updateResume((r) => ({ ...r, phone: v }))} placeholder="phone" className="text-white/90" dark /></div>
        <span className="text-white/30">|</span>
        <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /><InlineEdit value={resume.location} onChange={(v) => updateResume((r) => ({ ...r, location: v }))} placeholder="City, State" className="text-white/90" dark /></div>
      </div>
    </div>
  );

  const renderHeaderExecutive = () => (
    <div id="sec-contact" onClick={() => setActiveSection("contact")}
      className={`pt-10 pb-6 transition cursor-text rounded-t-sm bg-[#1a1a2e] pl-[var(--rm)] pr-[var(--rm)] ${activeSection === "contact" ? "ring-2 ring-inset ring-white/30" : ""}`}>
      <InlineEdit value={resume.name} onChange={(v) => updateResume((r) => ({ ...r, name: v }))} placeholder="Your Full Name"
        className="text-3xl font-bold tracking-[0.1em] text-white w-full uppercase" dark />
      <InlineEdit value={resume.title} onChange={(v) => updateResume((r) => ({ ...r, title: v }))} placeholder="Professional Title"
        className="text-lg mt-1 text-[var(--ra)]" dark />
      <div className="h-[1px] mt-3 mb-3 bg-[var(--ra)]" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-300 text-[0.85em]">
        <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-[var(--ra)]" />
          <InlineEdit value={resume.email} onChange={(v) => updateResume((r) => ({ ...r, email: v }))} placeholder="email" className="text-gray-200" dark /></div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[var(--ra)]" />
          <InlineEdit value={resume.phone} onChange={(v) => updateResume((r) => ({ ...r, phone: v }))} placeholder="phone" className="text-gray-200" dark /></div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[var(--ra)]" />
          <InlineEdit value={resume.location} onChange={(v) => updateResume((r) => ({ ...r, location: v }))} placeholder="City, State" className="text-gray-200" dark /></div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-1"><Linkedin className="w-3.5 h-3.5 text-[var(--ra)]" />
          <InlineEdit value={resume.linkedin} onChange={(v) => updateResume((r) => ({ ...r, linkedin: v }))} placeholder="LinkedIn" className="text-gray-200" dark /></div>
      </div>
    </div>
  );

  const renderHeaderMinimal = () => (
    <div id="sec-contact" onClick={() => setActiveSection("contact")}
      className={`pt-12 pb-6 text-center transition cursor-text pl-[var(--rm)] pr-[var(--rm)] ${activeSection === "contact" ? "bg-gray-50/50" : ""}`}>
      <InlineEdit value={resume.name} onChange={(v) => updateResume((r) => ({ ...r, name: v }))} placeholder="Your Full Name"
        className="text-2xl font-light tracking-[0.2em] text-gray-800 w-full text-center uppercase" />
      <div className="w-12 h-[1px] mx-auto mt-3 mb-2 bg-[var(--ra)]" />
      <InlineEdit value={resume.title} onChange={(v) => updateResume((r) => ({ ...r, title: v }))} placeholder="Professional Title"
        className="text-sm text-gray-500 text-center" />
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 text-gray-500 text-[0.8em]">
        <InlineEdit value={resume.email} onChange={(v) => updateResume((r) => ({ ...r, email: v }))} placeholder="email" className="text-gray-600" />
        <span className="text-gray-300">·</span>
        <InlineEdit value={resume.phone} onChange={(v) => updateResume((r) => ({ ...r, phone: v }))} placeholder="phone" className="text-gray-600" />
        <span className="text-gray-300">·</span>
        <InlineEdit value={resume.location} onChange={(v) => updateResume((r) => ({ ...r, location: v }))} placeholder="City" className="text-gray-600" />
        <span className="text-gray-300">·</span>
        <InlineEdit value={resume.linkedin} onChange={(v) => updateResume((r) => ({ ...r, linkedin: v }))} placeholder="LinkedIn" className="text-gray-600" />
      </div>
    </div>
  );

  const headerRenderers: Record<LayoutType, () => React.ReactNode> = {
    classic: renderHeaderClassic,
    modern: renderHeaderModern,
    sidebar: renderHeaderClassic,
    minimal: renderHeaderMinimal,
    creative: renderHeaderCreative,
    executive: renderHeaderExecutive,
  };

  /* ═══════════════════════════════════════════════════
     RENDER — FULL PAGE
     ═══════════════════════════════════════════════════ */
  return (
    <div className="h-screen flex flex-col bg-gray-100 text-gray-900 overflow-hidden print:bg-white">

      {/* ── Top Bar ──────────────────────────────────── */}
      <header className="flex items-center justify-between h-13 px-5 bg-white border-b border-gray-200 flex-shrink-0 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => window.close()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-0.5">
            <button onClick={undo} disabled={undoStack.length === 0} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30" title="Undo"><Undo2 className="w-4 h-4" /></button>
            <button onClick={redo} disabled={redoStack.length === 0} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30" title="Redo"><Redo2 className="w-4 h-4" /></button>
          </div>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center">
              <FileText className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">{templateInfo.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{layoutType}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              {saved ? "Saved" : saving ? "Saving…" : "Draft"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${previewMode ? "bg-brand-cyan/10 text-brand-cyan" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            <Eye className="w-4 h-4" /> {previewMode ? "Edit" : "Preview"}
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-cyan text-white hover:bg-brand-cyan/90 shadow-lg shadow-brand-cyan/20">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden print:block">

        {/* ── Left Sidebar ───────────────────────────── */}
        <aside className="w-[190px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto print:hidden">
          <div className="p-2.5 space-y-0.5 flex-1">
            <ToolButton icon={<LayoutTemplate className="w-4 h-4" />} label="Templates" active={showTemplates} onClick={() => { setShowTemplates(!showTemplates); setActiveTool(null); }} />
            <ToolButton icon={<Palette className="w-4 h-4" />} label="Design & Font" active={activeTool === "design"} onClick={() => toggleTool("design")} />
            <ToolButton icon={<ArrowUpDown className="w-4 h-4" />} label="Rearrange" active={activeTool === "rearrange"} onClick={() => toggleTool("rearrange")} />
            <div className="border-t border-gray-100 my-1.5" />
            <ToolButton icon={<Upload className="w-4 h-4" />} label={uploading ? "Uploading…" : "Upload Resume"} onClick={() => uploadRef.current?.click()} />
            <input ref={uploadRef} type="file" accept=".pdf,.doc,.docx,.txt,.json,.rtf" className="hidden" onChange={handleUploadResume} title="Upload resume file" />
            <div className="border-t border-gray-100 my-1.5" />
            <ToolButton icon={<Sparkles className="w-4 h-4" />} label="AI Improve" badge={resume.experience.reduce((a, e) => a + e.bullets.length, 0)} active={activeTool === "ai"} onClick={() => toggleTool("ai")} />
            <ToolButton icon={<CheckCircle className="w-4 h-4" />} label="Check" active={activeTool === "check"} onClick={() => toggleTool("check")} />
            <div className="border-t border-gray-100 my-1.5" />
            <ToolButton icon={<Download className="w-4 h-4" />} label="Download" onClick={handleExportPDF} />
            <ToolButton icon={<Share2 className="w-4 h-4" />} label={copiedLink ? "Copied!" : "Share"} onClick={handleShare} />
            <ToolButton icon={<History className="w-4 h-4" />} label="History" active={activeTool === "history"} onClick={() => toggleTool("history")} />
          </div>

          {/* Section nav */}
          <div className="border-t border-gray-200 p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-2.5 mb-1.5">Sections</p>
            {sections.map((s) => (
              <div key={s.id}
                onClick={() => { setActiveSection(s.id); document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition ${activeSection === s.id ? "bg-brand-cyan/10 text-brand-cyan font-medium" : s.visible ? "text-gray-600 hover:bg-gray-50" : "text-gray-400 line-through hover:bg-gray-50"
                  }`}>
                {SECTION_ICONS[s.type]}
                <span className="truncate">{s.title}</span>
                <span role="button" onClick={(e) => { e.stopPropagation(); toggleSection(s.id); }} className="ml-auto opacity-0 group-hover:opacity-100" aria-label={s.visible ? "Hide section" : "Show section"}>
                  {s.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Template Picker ────────────────────────── */}
        {showTemplates && (
          <div className="w-[280px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto p-3 space-y-3 print:hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Templates</h3>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close templates"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setTemplateCategory(cat)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition ${templateCategory === cat ? "bg-brand-cyan/10 text-brand-cyan" : "text-gray-500 hover:bg-gray-100"}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredTemplates.map((t) => {
                const cfg = TEMPLATE_CONFIGS[t.id];
                return (
                  <button key={t.id} onClick={() => selectTemplate(t.id)}
                    className={`group relative rounded-lg overflow-hidden border transition-all ${t.id === activeTemplateId ? "border-brand-cyan ring-2 ring-brand-cyan/30" : "border-gray-200 hover:border-gray-400"}`}>
                    <TemplatePreview id={t.id} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 gap-1">
                      <span className="text-xs font-semibold text-white bg-black/60 px-2 py-0.5 rounded">Use</span>
                      <span className="text-[9px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded">{cfg?.type}</span>
                    </div>
                    {t.id === activeTemplateId && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand-cyan flex items-center justify-center"><CheckCircle className="w-3 h-3 text-white" /></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tool Panels ────────────────────────────── */}
        {activeTool && !showTemplates && (
          <div className="w-[300px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto print:hidden">

            {/* Rearrange */}
            {activeTool === "rearrange" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-700">Rearrange</h3><button onClick={closeTool} className="text-gray-400 hover:text-gray-600" aria-label="Close rearrange"><X className="w-4 h-4" /></button></div>
                <p className="text-xs text-gray-500">Move sections up / down or toggle visibility.</p>
                {sections.map((s, idx) => (
                  <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-gray-50">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 flex-1 font-medium">{s.title}</span>
                    <button onClick={() => moveSection(idx, "up")} disabled={idx === 0} className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30" aria-label="Move section up"><MoveUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveSection(idx, "down")} disabled={idx === sections.length - 1} className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30" aria-label="Move section down"><MoveDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleSection(s.id)} className="p-1 rounded hover:bg-gray-200 text-gray-500">
                      {s.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* DESIGN & FONT — EXPANDED */}
            {activeTool === "design" && (
              <div className="p-4 space-y-5 pb-12">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-700">Design & Font</h3><button onClick={closeTool} className="text-gray-400 hover:text-gray-600" aria-label="Close design panel"><X className="w-4 h-4" /></button></div>

                {/* Layout Type */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Layout</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-1">
                    {(["classic", "modern", "sidebar", "minimal", "creative", "executive"] as LayoutType[]).map((lt) => (
                      <button key={lt} onClick={() => setLayoutType(lt)}
                        className={`px-2 py-2 rounded-lg text-xs text-center transition capitalize ${layoutType === lt ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 font-medium" : "text-gray-700 hover:bg-gray-100 border border-gray-200"}`}>
                        {lt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Font</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1">
                    {FONT_OPTIONS.map((f) => (
                      <button key={f.value} onClick={() => setDesignFont(f.value)}
                        className={`text-left px-2 py-1.5 rounded-lg text-xs transition ${designFont === f.value ? "bg-brand-cyan/10 text-brand-cyan font-medium border border-brand-cyan/30" : "text-gray-700 hover:bg-gray-100 border border-transparent"}`}
                        ref={(el) => { if (el) el.style.fontFamily = f.value; }}>{f.label}</button>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Font Size</label>
                  <div className="mt-1.5 grid grid-cols-5 gap-1">
                    {FONT_SIZES.map((s) => (
                      <button key={s.value} onClick={() => setDesignFontSize(s.value)}
                        className={`px-1 py-1.5 rounded-lg text-[11px] text-center transition ${designFontSize === s.value ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30" : "text-gray-700 hover:bg-gray-100 border border-gray-200"}`}>{s.label}</button>
                    ))}
                  </div>
                </div>

                {/* Accent */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Accent Color</label>
                  <div className="mt-1.5 grid grid-cols-6 gap-1.5">
                    {ACCENT_COLORS.map((c) => (
                      <button key={c.value} onClick={() => setDesignAccent(c.value)}
                        className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition ${designAccent === c.value ? "bg-gray-100 ring-2 ring-brand-cyan/40" : "hover:bg-gray-50"}`}>
                        <div className="w-6 h-6 rounded-full border-2 border-white shadow" ref={(el) => { if (el) el.style.backgroundColor = c.value; }} />
                        <span className="text-[8px] text-gray-500">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Spacing */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Line Spacing</label>
                  <div className="mt-1.5 grid grid-cols-4 gap-1">
                    {LINE_SPACING_OPTIONS.map((o) => (
                      <button key={o.value} onClick={() => setLineSpacing(o.value)}
                        className={`px-1 py-1.5 rounded-lg text-[11px] text-center transition ${lineSpacing === o.value ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30" : "text-gray-700 hover:bg-gray-100 border border-gray-200"}`}>{o.label}</button>
                    ))}
                  </div>
                </div>

                {/* Margins */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Margins</label>
                  <div className="mt-1.5 grid grid-cols-4 gap-1">
                    {MARGIN_OPTIONS.map((o) => (
                      <button key={o.value} onClick={() => setMargins(o.value)}
                        className={`px-1 py-1.5 rounded-lg text-[11px] text-center transition ${margins === o.value ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30" : "text-gray-700 hover:bg-gray-100 border border-gray-200"}`}>{o.label}</button>
                    ))}
                  </div>
                </div>

                {/* Heading Style */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Heading Style</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1">
                    {HEADING_STYLES.map((o) => (
                      <button key={o.value} onClick={() => setHeadingTransform(o.value)}
                        className={`px-2 py-1.5 rounded-lg text-xs text-center transition ${headingTransform === o.value ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30" : "text-gray-700 hover:bg-gray-100 border border-gray-200"}`}>{o.label}</button>
                    ))}
                  </div>
                </div>

                {/* Bullet Style */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Bullet Style</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-1">
                    {BULLET_STYLES.map((o) => (
                      <button key={o.value} onClick={() => setBulletChar(o.value)}
                        className={`px-2 py-1.5 rounded-lg text-xs text-center transition ${bulletChar === o.value ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30" : "text-gray-700 hover:bg-gray-100 border border-gray-200"}`}>{o.label}</button>
                    ))}
                  </div>
                </div>

                {/* Section Divider */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Section Divider</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1">
                    {DIVIDER_STYLES.map((o) => (
                      <button key={o.value} onClick={() => setDividerStyle(o.value)}
                        className={`px-2 py-1.5 rounded-lg text-xs text-center transition ${dividerStyle === o.value ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30" : "text-gray-700 hover:bg-gray-100 border border-gray-200"}`}>{o.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AI Improve */}
            {activeTool === "ai" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-700">AI Improve</h3><button onClick={closeTool} className="text-gray-400 hover:text-gray-600" aria-label="Close AI panel"><X className="w-4 h-4" /></button></div>
                <div className="bg-gradient-to-br from-purple-50 to-cyan-50 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center gap-2 mb-1"><Wand2 className="w-4 h-4 text-brand-purple" /><span className="text-xs font-semibold text-gray-800">AI Enhancement</span></div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">Strengthen bullets with metrics, action verbs & impact.</p>
                </div>
                {resume.experience.map((exp, eIdx) => (
                  <div key={eIdx} className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-700">{exp.role} – {exp.company}</p>
                    {exp.bullets.map((bullet, bIdx) => {
                      const hasMetrics = /\d+/.test(bullet);
                      const hasVerb = /^(Led|Managed|Developed|Implemented|Created|Built|Reduced|Increased|Improved|Launched|Drove|Delivered|Optimized|Designed|Grew)/i.test(bullet);
                      const weak = bullet.length < 25 || (!hasMetrics && !hasVerb);
                      return (
                        <div key={bIdx} className={`p-2.5 rounded-lg border text-xs ${weak ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
                          <div className="flex items-start gap-2">
                            {weak ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> : <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />}
                            <div className="flex-1">
                              <p className="text-gray-700">{bullet || "(empty)"}</p>
                              {weak && <div className="mt-1 space-y-0.5 text-amber-600">
                                {!hasVerb && <p>→ Start with action verb</p>}
                                {!hasMetrics && <p>→ Add numbers / metrics</p>}
                              </div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Check */}
            {activeTool === "check" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-700">Resume Check</h3><button onClick={closeTool} className="text-gray-400 hover:text-gray-600" aria-label="Close check panel"><X className="w-4 h-4" /></button></div>
                <div className="text-center py-3">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-4 ${score >= 80 ? "border-green-400" : score >= 50 ? "border-amber-400" : "border-red-400"}`}>
                    <span className={`text-xl font-bold ${score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`}>{score}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{score >= 80 ? "Great!" : score >= 50 ? "Needs work" : "Needs attention"}</p>
                </div>
                {checks.map((c, i) => (
                  <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${c.pass ? "bg-green-50" : "bg-red-50"}`}>
                    {c.pass ? <Check className="w-4 h-4 text-green-500 mt-0.5" /> : <X className="w-4 h-4 text-red-500 mt-0.5" />}
                    <div><p className={`text-sm font-medium ${c.pass ? "text-green-700" : "text-red-700"}`}>{c.label}</p>{!c.pass && <p className="text-xs text-gray-500 mt-0.5">{c.tip}</p>}</div>
                  </div>
                ))}
              </div>
            )}

            {/* History */}
            {activeTool === "history" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-700">Edit History</h3><button onClick={closeTool} className="text-gray-400 hover:text-gray-600" aria-label="Close history panel"><X className="w-4 h-4" /></button></div>
                {undoStack.length === 0 ? (
                  <div className="text-center py-6"><History className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-500">No history yet</p></div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-brand-cyan/5 border border-brand-cyan/20">
                      <div className="w-2 h-2 rounded-full bg-brand-cyan" /><p className="text-xs font-medium text-brand-cyan flex-1">Current</p>
                    </div>
                    {[...undoStack].reverse().map((_, idx) => {
                      const ts = undoTimestamps[undoStack.length - 1 - idx];
                      return (
                        <button key={idx} onClick={() => { for (let i = 0; i <= idx; i++) undo(); }}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-100 text-left">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          <div className="flex-1"><p className="text-xs font-medium text-gray-700">Edit #{undoStack.length - idx}</p>
                            <p className="text-[10px] text-gray-400">{ts ? new Date(ts).toLocaleTimeString() : ""}</p></div>
                          <Undo2 className="w-3 h-3 text-gray-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
           CENTER — PAPER DOCUMENT
           ═══════════════════════════════════════════════ */}
        <div ref={paperRef} className="flex-1 overflow-y-auto scroll-smooth flex justify-center py-8 px-4 print:p-0 print:block">
          {previewMode && <style>{`#resume-paper .print\\:hidden { display: none !important; }`}</style>}
          <PreviewContext.Provider value={previewMode}>
            <div
              id="resume-paper"
              className="w-[800px] min-h-[1050px] bg-white shadow-2xl rounded-sm print:shadow-none print:rounded-none print:w-full relative"
              ref={(el) => {
                if (!el) return;
                el.style.fontFamily = designFont;
                el.style.fontSize = designFontSize;
                el.style.lineHeight = lineSpacing;
                el.style.backgroundColor = bodyBg || '#ffffff';
                el.style.setProperty('--ra', designAccent);
                el.style.setProperty('--ra-12', designAccent + '12');
                el.style.setProperty('--ra-30', designAccent + '30');
                el.style.setProperty('--ra-50', designAccent + '50');
                el.style.setProperty('--ra-60', designAccent + '60');
                el.style.setProperty('--ra-80', designAccent + '80');
                el.style.setProperty('--ra-99', designAccent + '99');
                el.style.setProperty('--rsb', sidebarBg === 'accent' ? designAccent : (sidebarBg || designAccent));
                el.style.setProperty('--rsb-init', sidebarBg === 'accent' ? '#ffffff' : (sidebarBg || '#ffffff'));
                el.style.setProperty('--rst', sidebarTextColor);
                el.style.setProperty('--rst-20', sidebarTextColor + '20');
                el.style.setProperty('--rst-66', sidebarTextColor + '66');
                el.style.setProperty('--rst-99', sidebarTextColor + '99');
                el.style.setProperty('--rst-dd', sidebarTextColor + 'dd');
                el.style.setProperty('--rm', margins);
              }}
            >
              {previewMode && (
                <div className="absolute top-3 right-3 bg-brand-cyan text-white text-[10px] font-bold px-2 py-0.5 rounded z-10 print:hidden">PREVIEW</div>
              )}

              {/* ══ SIDEBAR LAYOUT ═══════════════════════ */}
              {layoutType === "sidebar" && contactVisible ? (
                <div className="flex min-h-[1050px]">
                  {/* Left sidebar column */}
                  <div className="w-[260px] flex-shrink-0 p-6 space-y-5 bg-[var(--rsb)] text-[var(--rst)]">
                    {/* Initials circle */}
                    {showInitials && (
                      <div className="flex justify-center mb-2">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-[var(--ra)] text-[var(--rsb-init)]">
                          {resume.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                        </div>
                      </div>
                    )}
                    {/* Name/title in sidebar */}
                    <div>
                      <InlineEdit value={resume.name} onChange={(v) => updateResume((r) => ({ ...r, name: v }))} placeholder="Your Full Name"
                        className="text-xl font-bold text-white w-full" dark />
                      <InlineEdit value={resume.title} onChange={(v) => updateResume((r) => ({ ...r, title: v }))} placeholder="Title"
                        className="text-sm mt-1 text-white/80" dark />
                    </div>
                    {/* Contact info */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">Contact</h3>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-white/60" />
                          <InlineEdit value={resume.email} onChange={(v) => updateResume((r) => ({ ...r, email: v }))} placeholder="email" className="text-white/90 text-xs" dark /></div>
                        <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-white/60" />
                          <InlineEdit value={resume.phone} onChange={(v) => updateResume((r) => ({ ...r, phone: v }))} placeholder="phone" className="text-white/90 text-xs" dark /></div>
                        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-white/60" />
                          <InlineEdit value={resume.location} onChange={(v) => updateResume((r) => ({ ...r, location: v }))} placeholder="Location" className="text-white/90 text-xs" dark /></div>
                        <div className="flex items-center gap-2"><Linkedin className="w-3.5 h-3.5 text-white/60" />
                          <InlineEdit value={resume.linkedin} onChange={(v) => updateResume((r) => ({ ...r, linkedin: v }))} placeholder="LinkedIn" className="text-white/90 text-xs" dark /></div>
                      </div>
                    </div>
                    {/* Skills in sidebar */}
                    {sections.find((s) => s.id === "skills")?.visible && (
                      <div className="space-y-2">
                        <h3 className="text-[10px] uppercase tracking-widest font-semibold text-[var(--rst-99)]">Skills</h3>
                        <div className="space-y-1.5">
                          {resume.skills.map((sk, idx) => (
                            <div key={idx} className="group/sk">
                              <div className="flex items-center gap-2">
                                <InlineEdit value={sk} onChange={(v) => updateResume((r) => ({ ...r, skills: r.skills.map((s, i) => i === idx ? v : s) }))} className="text-xs flex-1 text-[var(--rst-dd)]" placeholder="Skill" dark />
                                <button aria-label="Remove skill" onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, skills: r.skills.filter((_, i) => i !== idx) })); }}
                                  className="opacity-0 group-hover/sk:opacity-100 hover:text-white print:hidden text-[var(--rst-66)]"><X className="w-3 h-3" /></button>
                              </div>
                              {(skillStyle === "bars" || TEMPLATE_SKILL_MODE[activeTemplateId] === "bars") && (
                                <div className="h-1 rounded-full mt-0.5 bg-[var(--rst-20)]">
                                  <div className="h-full rounded-full bg-[var(--ra)]" ref={(el) => { if (el) el.style.width = `${65 + idx * 5}%`; }} />
                                </div>
                              )}
                            </div>
                          ))}
                          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, skills: [...r.skills, ""] })); }}
                            className="flex items-center gap-1 text-[10px] transition print:hidden text-[var(--rst-66)]"><Plus className="w-3 h-3" /> Add</button>
                        </div>
                      </div>
                    )}
                    {/* Certifications in sidebar */}
                    {sections.find((s) => s.id === "certifications")?.visible && (
                      <div className="space-y-2">
                        <h3 className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">Certifications</h3>
                        <div className="space-y-1">
                          {resume.certifications.map((cert, idx) => (
                            <div key={idx} className="flex items-center gap-2 group/cert">
                              <span className="text-[8px] text-white/40">{bulletChar}</span>
                              <InlineEdit value={cert} onChange={(v) => updateResume((r) => ({ ...r, certifications: r.certifications.map((c, i) => i === idx ? v : c) }))} className="text-white/90 text-xs flex-1" placeholder="Cert" dark />
                              <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, certifications: r.certifications.filter((_, i) => i !== idx) })); }}
                                className="opacity-0 group-hover/cert:opacity-100 text-white/40 hover:text-white print:hidden" aria-label="Delete certification"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                          <button onClick={(e) => { e.stopPropagation(); updateResume((r) => ({ ...r, certifications: [...r.certifications, ""] })); }}
                            className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition print:hidden"><Plus className="w-3 h-3" /> Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Right main column */}
                  <div className="flex-1 py-6 space-y-5 pl-6 pr-[var(--rm)]">
                    {sections.filter((s) => s.id !== "contact" && s.id !== "skills" && s.id !== "certifications" && s.visible).map((sec) => (
                      <div key={sec.id} id={`sec-${sec.id}`} onClick={() => setActiveSection(sec.id)}
                        className={`group transition rounded-md ${activeSection === sec.id ? "bg-gray-50/50 -mx-2 px-2 py-1" : ""}`}>
                        <SectionHeading title={sec.title} headingTransform={headingTransform} dividerStyle={dividerStyle} />
                        {renderSection(sec.type)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ══ SINGLE-COLUMN LAYOUTS (classic, modern, minimal, creative, executive) ═══ */
                <>
                  {contactVisible && headerRenderers[layoutType]()}

                  <div className="py-6 space-y-6 pl-[var(--rm)] pr-[var(--rm)]">
                    {sections.filter((s) => s.id !== "contact" && s.visible).map((sec) => (
                      <div key={sec.id} id={`sec-${sec.id}`} onClick={() => setActiveSection(sec.id)}
                        className={`group transition rounded-md ${activeSection === sec.id ? "bg-gray-50/50 -mx-3 px-3 py-2" : ""} ${layoutType === "creative" && sec.type !== "summary" ? "bg-[#f9fafb] p-3 rounded-lg" : ""}`}>
                        <SectionHeading title={sec.title} headingTransform={headingTransform} dividerStyle={dividerStyle} />
                        {renderSection(sec.type)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </PreviewContext.Provider>
        </div>
      </div>
    </div>
  );
}
