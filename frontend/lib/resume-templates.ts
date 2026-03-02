/**
 * Resume template gallery data — 50 templates organized by category.
 */
export type ResumeTemplate = {
  id: number;
  name: string;
  category: "modern" | "classic" | "creative" | "technical" | "executive" | "minimalist" | "ats";
  style: string;
  accentColor: string;
  premium: boolean;
  columns: 1 | 2;
  features: string[];
};

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  // Modern (8)
  { id: 1, name: "Executive Edge", category: "modern", style: "Bold sidebar, accent headers", accentColor: "#00D4FF", premium: false, columns: 2, features: ["Sidebar layout", "Skills bar chart", "Icon contact info"] },
  { id: 2, name: "Silicon Valley", category: "modern", style: "Tech-focused, clean grid", accentColor: "#7B61FF", premium: false, columns: 1, features: ["Monospace headings", "GitHub stats", "Tech stack badges"] },
  { id: 3, name: "Gradient Flow", category: "modern", style: "Gradient accent line", accentColor: "#00FF88", premium: true, columns: 1, features: ["Gradient top bar", "Timeline layout", "Skill pills"] },
  { id: 4, name: "Dark Mode", category: "modern", style: "Dark background variant", accentColor: "#00D4FF", premium: true, columns: 2, features: ["Dark theme", "Neon accents", "Photo placeholder"] },
  { id: 5, name: "Metro Clean", category: "modern", style: "Windows Metro inspired", accentColor: "#FFB800", premium: false, columns: 1, features: ["Tile layout", "Color-coded sections", "Icon headers"] },
  { id: 6, name: "Split Screen", category: "modern", style: "50/50 split layout", accentColor: "#FF6B35", premium: true, columns: 2, features: ["Split layout", "Left sidebar", "Right content"] },
  { id: 7, name: "Card View", category: "modern", style: "Card-based sections", accentColor: "#7B61FF", premium: false, columns: 1, features: ["Card sections", "Shadow borders", "Rounded corners"] },
  { id: 8, name: "Neon Pulse", category: "modern", style: "Vibrant accent colors", accentColor: "#FF4466", premium: true, columns: 1, features: ["Neon highlights", "Bold typography", "Animated PDF links"] },

  // Classic (7)
  { id: 9, name: "Harvard Standard", category: "classic", style: "Traditional academic format", accentColor: "#333333", premium: false, columns: 1, features: ["Serif fonts", "Date alignment", "GPA section"] },
  { id: 10, name: "Wall Street", category: "classic", style: "Finance industry standard", accentColor: "#1a365d", premium: false, columns: 1, features: ["Clean lines", "Conservative palette", "Certifications"] },
  { id: 11, name: "Legal Brief", category: "classic", style: "Law firm friendly", accentColor: "#2d3748", premium: true, columns: 1, features: ["Bar admission", "Publications", "Pro bono section"] },
  { id: 12, name: "Academic CV", category: "classic", style: "Multi-page curriculum vitae", accentColor: "#4a5568", premium: false, columns: 1, features: ["Publications list", "Research grants", "Teaching experience"] },
  { id: 13, name: "Federal Resume", category: "classic", style: "USA Jobs compatible", accentColor: "#2b6cb0", premium: true, columns: 1, features: ["KSA sections", "Hours/week", "Supervisor refs"] },
  { id: 14, name: "Banking Pro", category: "classic", style: "Investment banking optimized", accentColor: "#1a202c", premium: false, columns: 1, features: ["Deal experience", "Model skills", "CFA/MBA focus"] },
  { id: 15, name: "Diplomatic", category: "classic", style: "International organizations", accentColor: "#2d3748", premium: true, columns: 1, features: ["Language table", "Country experience", "Security clearance"] },

  // Creative (7)
  { id: 16, name: "Creative Canvas", category: "creative", style: "Design portfolio adjacent", accentColor: "#FF6B35", premium: true, columns: 2, features: ["Portfolio links", "Color splash", "Custom typography"] },
  { id: 17, name: "Infographic", category: "creative", style: "Data visualization heavy", accentColor: "#00D4FF", premium: true, columns: 2, features: ["Donut charts", "Timeline visual", "Icon stats"] },
  { id: 18, name: "Magazine Layout", category: "creative", style: "Editorial design", accentColor: "#7B61FF", premium: true, columns: 2, features: ["Pull quotes", "Callout boxes", "Grid photos"] },
  { id: 19, name: "Retro Pixel", category: "creative", style: "8-bit inspired theme", accentColor: "#00FF88", premium: false, columns: 1, features: ["Pixel borders", "Monospace font", "Skill XP bars"] },
  { id: 20, name: "Minimalist Art", category: "creative", style: "Negative space focused", accentColor: "#000000", premium: false, columns: 1, features: ["Lots of whitespace", "Thin lines", "Elegant spacing"] },
  { id: 21, name: "Bold Statement", category: "creative", style: "Large name, impact font", accentColor: "#FF4466", premium: true, columns: 1, features: ["96pt name", "Impact heading", "Color blocks"] },
  { id: 22, name: "Architect", category: "creative", style: "Blueprint inspired", accentColor: "#2b6cb0", premium: false, columns: 2, features: ["Grid overlay", "Technical feel", "Blue accent"] },

  // Technical (8)
  { id: 23, name: "Developer Pro", category: "technical", style: "GitHub-flavored layout", accentColor: "#00D4FF", premium: false, columns: 1, features: ["Code font sections", "Contribution graph", "Stack badges"] },
  { id: 24, name: "DevOps Pipeline", category: "technical", style: "CI/CD themed", accentColor: "#00FF88", premium: true, columns: 1, features: ["Pipeline visual", "Tool icons", "Cert badges"] },
  { id: 25, name: "Data Scientist", category: "technical", style: "Analytics & ML focused", accentColor: "#7B61FF", premium: false, columns: 2, features: ["Model metrics", "Publication DOIs", "Kaggle rank"] },
  { id: 26, name: "Cloud Engineer", category: "technical", style: "Cloud cert showcase", accentColor: "#FFB800", premium: false, columns: 1, features: ["AWS/GCP/Azure badges", "Architecture diagrams", "Cert expiry"] },
  { id: 27, name: "Security Analyst", category: "technical", style: "Cybersec oriented", accentColor: "#FF4466", premium: true, columns: 1, features: ["CTF scores", "CVE contributions", "Clearance level"] },
  { id: 28, name: "Mobile Dev", category: "technical", style: "iOS/Android showcase", accentColor: "#00D4FF", premium: false, columns: 2, features: ["App screenshots", "Store ratings", "SDK versions"] },
  { id: 29, name: "AI Engineer", category: "technical", style: "ML/AI career focus", accentColor: "#7B61FF", premium: true, columns: 1, features: ["Model benchmarks", "Paper citations", "GPU compute stats"] },
  { id: 30, name: "Blockchain Dev", category: "technical", style: "Web3 & DeFi", accentColor: "#FFB800", premium: true, columns: 1, features: ["Smart contracts", "TVL managed", "Protocol contributions"] },

  // Executive (6)
  { id: 31, name: "C-Suite", category: "executive", style: "Board-level presence", accentColor: "#1a202c", premium: true, columns: 1, features: ["Revenue metrics", "Board memberships", "Executive summary"] },
  { id: 32, name: "VP Engineering", category: "executive", style: "Engineering leadership", accentColor: "#00D4FF", premium: true, columns: 1, features: ["Team sizes", "Budget managed", "Tech transformation"] },
  { id: 33, name: "Product Leader", category: "executive", style: "PM/CPO focused", accentColor: "#7B61FF", premium: false, columns: 1, features: ["Revenue impact", "User growth", "Product launches"] },
  { id: 34, name: "Startup Founder", category: "executive", style: "Founder/CEO narrative", accentColor: "#FF6B35", premium: false, columns: 1, features: ["Funding raised", "Team built", "Exit metrics"] },
  { id: 35, name: "Consultant", category: "executive", style: "McKinsey/BCG style", accentColor: "#2d3748", premium: true, columns: 1, features: ["Engagement list", "Industry verticals", "Impact quantified"] },
  { id: 36, name: "Non-Profit Leader", category: "executive", style: "Mission-driven", accentColor: "#00FF88", premium: false, columns: 1, features: ["Impact metrics", "Grant amounts", "Volunteer programs"] },

  // Minimalist (7)
  { id: 37, name: "Clean Slate", category: "minimalist", style: "Maximum whitespace", accentColor: "#FFFFFF", premium: false, columns: 1, features: ["No colors", "System font", "Ultra clean"] },
  { id: 38, name: "One Column", category: "minimalist", style: "Single narrow column", accentColor: "#718096", premium: false, columns: 1, features: ["Centered text", "Thin rules", "Light gray"] },
  { id: 39, name: "Swiss Design", category: "minimalist", style: "Helvetica grid system", accentColor: "#000000", premium: true, columns: 2, features: ["Grid-based", "Helvetica font", "Red accent"] },
  { id: 40, name: "Typewriter", category: "minimalist", style: "Courier mono theme", accentColor: "#4a5568", premium: false, columns: 1, features: ["Monospace", "Underline headers", "Indent bullets"] },
  { id: 41, name: "Paper White", category: "minimalist", style: "Warm paper background", accentColor: "#d4a574", premium: false, columns: 1, features: ["Warm tone", "Serif body", "Elegant spacing"] },
  { id: 42, name: "LaTeX Style", category: "minimalist", style: "Academic LaTeX template", accentColor: "#333333", premium: false, columns: 1, features: ["Computer Modern font", "Centered name", "Dense layout"] },
  { id: 43, name: "Scandinavian", category: "minimalist", style: "Nordic design influence", accentColor: "#a0aec0", premium: true, columns: 2, features: ["Muted palette", "Geometric icons", "Generous margins"] },

  // ATS-Optimized (7)
  { id: 44, name: "ATS Magnet", category: "ats", style: "Maximum ATS compatibility", accentColor: "#00D4FF", premium: false, columns: 1, features: ["Standard sections", "No tables", "Keyword-rich"] },
  { id: 45, name: "Keyword Hunter", category: "ats", style: "Keyword density optimized", accentColor: "#00FF88", premium: false, columns: 1, features: ["Skills cloud", "Keyword matching", "ATS-safe fonts"] },
  { id: 46, name: "Taleo Friendly", category: "ats", style: "Taleo ATS tested", accentColor: "#333333", premium: false, columns: 1, features: ["No graphics", "Standard fonts", "Simple bullets"] },
  { id: 47, name: "Workday Ready", category: "ats", style: "Workday parser tested", accentColor: "#2b6cb0", premium: true, columns: 1, features: ["Date formats", "Location format", "Title hierarchy"] },
  { id: 48, name: "iCIMS Parsed", category: "ats", style: "iCIMS optimized parsing", accentColor: "#4a5568", premium: false, columns: 1, features: ["Section headers", "Uniform bullets", "Contact block"] },
  { id: 49, name: "Greenhouse Pro", category: "ats", style: "Greenhouse ATS tested", accentColor: "#00D4FF", premium: true, columns: 1, features: ["Clean structure", "Score optimized", "Field mapping"] },
  { id: 50, name: "Universal ATS", category: "ats", style: "Works with any ATS system", accentColor: "#333333", premium: false, columns: 1, features: ["Plain text safe", "No columns", "Maximum parse rate"] },
];

export const TEMPLATE_CATEGORIES = [
  { id: "all", label: "All Templates", count: RESUME_TEMPLATES.length },
  { id: "modern", label: "Modern", count: RESUME_TEMPLATES.filter((t) => t.category === "modern").length },
  { id: "classic", label: "Classic", count: RESUME_TEMPLATES.filter((t) => t.category === "classic").length },
  { id: "creative", label: "Creative", count: RESUME_TEMPLATES.filter((t) => t.category === "creative").length },
  { id: "technical", label: "Technical", count: RESUME_TEMPLATES.filter((t) => t.category === "technical").length },
  { id: "executive", label: "Executive", count: RESUME_TEMPLATES.filter((t) => t.category === "executive").length },
  { id: "minimalist", label: "Minimalist", count: RESUME_TEMPLATES.filter((t) => t.category === "minimalist").length },
  { id: "ats", label: "ATS-Optimized", count: RESUME_TEMPLATES.filter((t) => t.category === "ats").length },
];
