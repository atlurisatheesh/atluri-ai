# RESUME SYSTEM — MASTER ENGINEERING PROMPT

> **Version:** 3.0 — Complete Rewrite
> **Last Updated:** Current Session
> **Status:** ✅ All features implemented, build passes clean

---

## 1. PLATFORM OVERVIEW

This is a **LinkedIn AI Interview & Career Platform** with a full-stack architecture. The resume system is one of the core product pillars alongside interview coaching, analytics, and AI copilot features.

### Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | **Next.js 16.1.4** | App Router, Turbopack, port 3000 |
| Styling | **Tailwind CSS v4** | Custom brand colors in config |
| Backend | **FastAPI + Python 3.11** | uvicorn, port 9010 |
| Database | **PostgreSQL 16** | Docker container `postgres-local`, port 5432 |
| Cache | **Redis** | Docker container `redis-local`, port 6379 |
| Auth | **Supabase** | OAuth + session tokens |
| Animation | **Framer Motion** | Page transitions, AnimatePresence |
| PDF Extract | **pdfjs-dist** | Dynamic import, CDN worker |
| DOCX Extract | **mammoth** | Dynamic import |
| Icons | **Lucide React** | 40+ icons used across resume system |

### Design System — Brand Colors

```
brand-cyan:   #00D4FF    (primary accent)
brand-purple: #7B61FF    (secondary)
brand-green:  #00FF88    (success / free badges)
brand-amber:  #F59E0B    (warnings)
brand-orange: #FF6B35    (creative accents)
brand-red:    #EF4444    (errors / attention)
```

### Dev Server Commands

```powershell
# Frontend (MUST use cmd /c because background terminals cwd to workspace root)
cmd /c "cd /d d:\linkedin-ai-main\frontend && npx next dev --turbopack -p 3000"

# Backend
cmd /c "cd /d d:\linkedin-ai-main\backend && uvicorn app.main:app --reload --port 9010"
```

---

## 2. FILE ARCHITECTURE

### Resume System Files

```
frontend/
├── app/resume/
│   ├── page.tsx                    (511 lines) — ARIA Intelligence + Template Gallery
│   └── editor/
│       ├── page.tsx                (1271 lines) — WYSIWYG Resume Editor
│       ├── page.tsx.bak            (backup — pre-rewrite version)
│       └── page.tsx.bak2           (backup — 852 lines, working version)
├── components/resume/
│   ├── TemplatePreview.tsx         (1012 lines) — 50 template renderers + registry
│   ├── AriaActivationForm.tsx      — ARIA intake form (career situation, resume text, target job/company, tone mode)
│   ├── AriaScoreDashboard.tsx      — 16-check score card with generate/rescan actions
│   ├── AriaOutputView.tsx          — 5-block output view for generated resume
│   ├── AriaKeywordPanel.tsx        — Keyword analysis panel
│   ├── AriaGapBrief.tsx            — Gap analysis with recommendations
│   └── AriaPrecisionEdits.tsx      — Precision edit suggestions with apply action
├── lib/
│   ├── services.ts                 — ariaService API client (intake, generate, score, history, detail, keywords, gaps, edits, rewriteBullet)
│   ├── api.ts                      — Base API utilities
│   ├── auth.ts                     — Auth helpers
│   ├── AuthContext.tsx              — Auth context provider
│   └── resume-templates.ts         — Legacy template data (superseded by TemplatePreview.tsx)
└── components/
    ├── dashboard/                  — DashboardLayout component
    └── ui/                         — GlassCard, NeonButton, StatusBadge
```

---

## 3. ARIA™ — AI RESUME INTELLIGENCE (5-WAVE SYSTEM)

### Architecture

ARIA uses a **dual-brain analysis** approach:
- **ATS Parse Brain** — Evaluates machine-readability, keyword density, formatting compliance
- **Human Persuasion Brain** — Evaluates narrative impact, quantification, action verbs, emotional resonance

### 5-Wave Flow

```
Wave 1: INTAKE        → AriaActivationForm → POST /api/resume/aria/intake
Wave 2: ANALYSIS      → Auto-triggers after intake
Wave 3: SCORING       → AriaScoreDashboard → POST /api/resume/aria/score
Wave 4: GENERATION    → POST /api/resume/aria/generate
Wave 5: OUTPUT        → AriaOutputView (5 blocks: resume, score_card, keyword_matrix, gap_brief, precision_edits)
```

### API Endpoints (ariaService in services.ts)

```typescript
ariaService = {
  intake:       (data) => POST /api/resume/aria/intake
  generate:     (data) => POST /api/resume/aria/generate
  score:        (data) => POST /api/resume/aria/score
  rewriteBullet:(data) => POST /api/resume/aria/rewrite
  keywords:     (data) => POST /api/resume/aria/keywords
  gaps:         (data) => POST /api/resume/aria/gaps
  edits:        (data) => POST /api/resume/aria/edits
  history:      ()     => GET  /api/resume/aria/history
  detail:       (id)   => GET  /api/resume/aria/:id
}
```

### Resume Page Views (page.tsx — 511 lines)

The `/resume` page has **5 navigation tabs**:

| Tab | View ID | Component | Purpose |
|-----|---------|-----------|---------|
| ARIA Intake | `activate` | `AriaActivationForm` | Career situation, resume text, target job, tone mode |
| Score | `scoring` | `AriaScoreDashboard` | 16-check score card, generate/rescan buttons |
| Output | `output` | `AriaOutputView` | 5-block generated resume output |
| Templates | `templates` | Inline template gallery | 50 templates, search, category filter, detail modal |
| History | `history` | Inline history list | Past analyses with scores, clickable to reload |

### Template Gallery Features

- **Hero banner** with gradient background and search input
- **Category pills** with counts: All (50), Modern (8), Classic (7), Creative (7), Technical (8), Executive (6), Minimalist (7), ATS-Optimized (7)
- **Template grid** — responsive 1-4 columns with TemplatePreview thumbnails
- **Hover overlay** — Preview button + Edit button (opens `/resume/editor?template=N` in new tab)
- **Detail modal** — Full-screen overlay with large preview, category badge, tags, features list, "Use This Template" button
- **All 50 templates marked FREE** — no PRO badges anywhere

---

## 4. RESUME EDITOR — WYSIWYG (1271 lines)

### Route & Entry

- **URL:** `/resume/editor?template=N` (where N = template ID 1-50)
- **Opens in new tab** from template gallery
- **Suspense wrapper:** `ResumeEditorWrapper` (default export) wraps `ResumeEditorPage` in React Suspense

### Theme

- **LIGHT MODE** — white paper, gray-100 background, gray text
- **NOT dark mode** — explicitly converted from dark to light in previous iteration

### Data Types

```typescript
interface ResumeSection {
  id: string;
  type: "contact" | "summary" | "experience" | "education" | "skills" | "certifications" | "projects";
  title: string;
  visible: boolean;
}

interface ExperienceEntry {
  company: string; role: string; dateRange: string; location: string; bullets: string[];
}

interface EducationEntry {
  school: string; degree: string; year: string;
}

interface ResumeData {
  name: string; title: string; email: string; phone: string;
  location: string; linkedin: string; website: string; summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  certifications: string[];
  projects: { name: string; description: string; tech: string }[];
}
```

### Default Resume Data

Pre-populated with realistic professional content:
- Name: "Your Full Name", Title: "Professional Title"
- 2 experience entries with quantified bullets (e.g., "Increased revenue by 32%")
- 1 education entry (BS Computer Science)
- 8 skills (JavaScript, React, Node.js, Python, SQL, AWS, Docker, Agile)
- 2 certifications (AWS Solutions Architect, PMP)
- 1 project with tech stack

### Default Sections (7)

```
contact → Contact (visible: true)
summary → Summary (visible: true)
experience → Experience (visible: true)
education → Education (visible: true)
skills → Skills (visible: true)
certifications → Certifications (visible: true)
projects → Projects (visible: true)
```

Each section has an icon from lucide-react (User, FileText, Briefcase, GraduationCap, Code, Award, Globe).

---

## 5. LAYOUT SYSTEM — 6 DISTINCT VISUAL LAYOUTS

### Layout Type Definition

```typescript
type LayoutType = "classic" | "modern" | "sidebar" | "minimal" | "creative" | "executive";
```

### Layout Presets

Each layout defines:

```typescript
interface LayoutConfig {
  type: LayoutType;
  font: string;
  accent: string;
  headerBg: string;        // "transparent" | "accent" | "gradient" | "dark"
  headerText: string;       // text color for header
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
}
```

### The 6 Layouts in Detail

#### 1. CLASSIC
- Left-aligned header with name + title
- Accent-colored border bottom on header
- Uppercase section headings with accent underline
- `●` dot bullets
- Tag-style skills
- Single column

#### 2. MODERN
- **Full-width colored header banner** (background = accent color)
- White text on accent background
- Normal-case section headings with full gray line
- `▸` arrow bullets
- Pill-style skills
- Single column

#### 3. SIDEBAR (Two-Column)
- **Left sidebar** (260px) with accent-color background, white text
- Sidebar contains: Name/Title, Contact info (email, phone, location, LinkedIn), Skills list, Certifications
- Right column (flex-1) contains: Summary, Experience, Education, Projects
- Uppercase headings, no dividers
- `●` dot bullets
- Bar-style skills

#### 4. MINIMAL
- **Centered** name in uppercase with wide letter-spacing (0.2em)
- Thin 12px accent line under name
- Light font weight (font-light)
- Dotted section dividers
- `–` dash bullets
- Plain-text skills
- Contact separated by `·` dots

#### 5. CREATIVE
- **Gradient header** (linear-gradient 135deg, accent to accent/60%)
- Centered text, white on gradient
- Large name (4xl), title (xl)
- No heading dividers, card-style sections (gray-50 background, 8px border-radius)
- `→` arrow bullets
- Pill-style skills

#### 6. EXECUTIVE
- **Dark charcoal header** (#1a1a2e background)
- Uppercase name with wide letter-spacing (0.1em)
- Accent-colored title
- Accent-colored horizontal rule separator
- Double-line section dividers
- `■` square bullets
- Tag-style skills

### Category → Layout Mapping

```typescript
const CATEGORY_LAYOUT: Record<string, LayoutType> = {
  Modern:         "modern",
  Classic:        "classic",
  Creative:       "creative",
  Technical:      "sidebar",
  Executive:      "executive",
  Minimalist:     "minimal",
  "ATS-Optimized":"classic",
};
```

When user selects a template, `selectTemplate()` reads the template's category, maps it to a layout type, and applies:
- Font (cycles through 6 fonts based on template ID)
- Accent color (from template registry)
- Layout type
- Heading transform (uppercase or capitalize)
- Bullet character
- Divider style

### Per-Template Config Generation

```typescript
function buildTemplateConfig(t: { id: number; category: string; accent: string }): LayoutConfig {
  const layoutType = CATEGORY_LAYOUT[t.category] || "classic";
  const preset = LAYOUT_PRESETS[layoutType];
  const FONTS = [
    "Inter, sans-serif", "Georgia, serif", "'Merriweather', serif",
    "'Roboto', sans-serif", "'Playfair Display', serif", "'Lato', sans-serif",
  ];
  return { ...preset, font: FONTS[t.id % FONTS.length], accent: t.accent };
}
```

All 50 templates are pre-computed into `TEMPLATE_CONFIGS` map at module load time.

---

## 6. HEADER RENDERERS (5 variants)

Each layout type has a dedicated header renderer. The `sidebar` layout reuses `renderHeaderClassic` (header is shown inside the sidebar column instead).

### renderHeaderClassic
- Left-aligned, transparent background
- `text-3xl font-bold` name, accent-colored title
- Contact row: Mail | Phone | MapPin | LinkedIn icons with accent color
- Separated by `|` pipes
- Bottom border: 2px accent color

### renderHeaderModern
- Full accent-color background
- `text-3xl font-bold` white name, `text-white/80` title
- Contact row: white icons, `text-white/90` values
- Rounded top corners

### renderHeaderCreative
- Gradient background: `linear-gradient(135deg, accent, accent99)`
- Center-aligned
- `text-4xl font-bold` white name, `text-xl text-white/80` title
- Centered contact row

### renderHeaderExecutive
- `#1a1a2e` dark background
- Uppercase name with `tracking-wider` (0.1em letter-spacing)
- Accent-colored title
- Accent-colored `1px` horizontal rule
- Gray-300 contact text

### renderHeaderMinimal
- Transparent background, centered
- `text-2xl font-light tracking-[0.2em]` uppercase name
- 12px wide accent line centered under name
- `text-sm text-gray-500` title
- `text-gray-500 text-[0.8em]` contact separated by `·` dots

---

## 7. SECTION RENDERERS

### renderSummary
- Single `InlineEdit` with `multiline` prop
- `text-gray-700 leading-relaxed`

### renderExperience
- Per entry: Role (font-semibold) + DateRange (right-aligned, 180px width)
- Company (italic) | Location
- Bullet list with configurable bullet character (accent colored, 10px)
- Delete entry button (appears on hover, red-500)
- Delete bullet button (appears on hover)
- "+ bullet" and "+ Add position" buttons (print:hidden)

### renderEducation
- Per entry: Degree (font-semibold) + School (italic) on left, Year on right
- `min-w-0` wrapper to fix text overflow (education display bug fix)
- Delete button on hover
- "+ Add education" button

### renderSkills
- Flex-wrap layout with `gap-2`
- Each skill in a bordered pill (`border-gray-200 bg-gray-50/50`)
- `InlineEdit` with expanding width on focus (`w-24 focus:w-36`)
- Delete X on hover
- "+ Add" button with dashed border

### renderCertifications
- List with bullet character prefix
- Each entry: bullet char (accent colored) + InlineEdit + delete X
- "+ Add" button

### renderProjects
- Per project: Name (font-semibold) | Tech (italic, gray-500)
- Description on next line
- Delete button on hover
- "+ Add project" button

---

## 8. INLINE EDIT SYSTEM

### InlineEdit Component
- Uses `PreviewContext` to switch between edit and read-only modes
- **Edit mode:** `<input>` or `<textarea>` (when `multiline=true`)
  - `bg-transparent`, invisible border that appears on hover (gray-300) or focus (brand-cyan)
  - Full width, outline-none
- **Preview mode:** `<span>` or `<p>` (read-only)
  - Shows value or gray italic placeholder

### PreviewContext
- React context: `React.createContext(false)`
- Wraps the entire paper document
- When `previewMode` is true:
  - InlineEdit renders read-only elements
  - `print:hidden` elements are hidden via injected `<style>` tag
  - A "PREVIEW" badge appears at top-right of paper

---

## 9. DESIGN & FONT PANEL — EXPANDED

Accessed via sidebar "Design & Font" button. Contains 10 control sections:

### Layout Type Selector
- 3x2 grid of 6 layout types
- Active state: `bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30`

### Font Selector (10 options)
```
Inter, Georgia, Merriweather, Roboto, Playfair Display,
Lato, Courier New (Monospace), EB Garamond, Open Sans, Poppins
```

### Font Size (5 options)
```
Compact (12px), Small (13px), Medium (15px), Large (17px), XL (19px)
```

### Accent Color (12 options)
```
Cyan (#00D4FF), Purple (#7B61FF), Blue (#3B82F6), Teal (#14B8A6),
Green (#10B981), Orange (#F59E0B), Red (#EF4444), Pink (#EC4899),
Navy (#1E3A5F), Charcoal (#374151), Gold (#D4A574), Black (#111827)
```
Rendered as 6x2 grid of colored circles with labels.

### Line Spacing (4 options)
```
Tight (1.3), Normal (1.5), Relaxed (1.75), Loose (2.0)
```

### Margins (4 options)
```
Narrow (24px), Normal (48px), Wide (64px), Extra Wide (80px)
```

### Heading Style (4 options)
```
UPPERCASE, Title Case, lowercase, Normal
```

### Bullet Style (6 options)
```
● Dot, ▸ Arrow, – Dash, ■ Square, → Right, ◆ Diamond
```

### Section Divider (5 options)
```
Accent Line — 2px colored line
Full Line — 1px gray line
Double Line — Two 1px gray lines
Dotted — Dotted border
None — No divider
```

---

## 10. SIDEBAR TOOLS (Left Sidebar — 190px)

### Template Picker
- Opens 280px panel on left
- Category buttons (8 categories)
- 2-column grid of template thumbnails
- Each shows TemplatePreview + hover overlay with "Use" button + layout type label
- Active template has brand-cyan ring + checkmark

### Design & Font
- Opens 300px panel — see Section 9 above

### Rearrange
- Opens 300px panel
- Each section shown as a card with GripVertical icon
- Move Up / Move Down buttons
- Eye/EyeOff toggle for visibility

### Upload Resume
- Hidden `<input type="file">` triggered by button click
- Accepts: `.pdf, .doc, .docx, .txt, .json, .rtf`
- Processing:
  - **JSON:** Direct parse as `Partial<ResumeData>`, merge with current
  - **PDF:** `pdfjs-dist` dynamic import → `getDocument()` → iterate pages → `getTextContent()` → `parseResumeText()`
  - **DOCX/DOC:** `mammoth` dynamic import → `extractRawText()` → `parseResumeText()`
  - **TXT/RTF:** `file.text()` → `parseResumeText()`
- Error handling: try/catch with alert dialog
- Shows "Uploading…" state on button

### parseResumeText() — Smart Text Parser
Extracts structured data from raw text:
- **Name:** First line (if < 60 chars)
- **Email:** Regex `/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/`
- **Phone:** Regex `/[\d\-()+ ]{7,}/` (excluding lines with @)
- **LinkedIn:** Line containing `linkedin.com`
- **Location:** Line matching `, XX` state code pattern (< 50 chars)
- **Summary:** Lines > 60 chars (up to 3)
- **Skills:** Short lines < 40 chars, not starting with digit (up to 12)
- **Experience:** Lines matching bullet patterns `^[\-•▸●■→]` or length 30-200

### AI Improve
- Opens 300px panel
- Shows each experience entry with its bullets
- Each bullet analyzed for:
  - **Has metrics?** — regex `/\d+/`
  - **Has action verb?** — regex `/^(Led|Managed|Developed|Implemented|Created|Built|...)/i`
  - **Weak?** — length < 25 OR (no metrics AND no verb)
- Visual indicators: green check (strong) or amber warning (weak)
- Suggestions: "→ Start with action verb", "→ Add numbers / metrics"

### Check (Resume Quality Score)
- Opens 300px panel
- **10 quality checks:**
  1. Full name provided (not default)
  2. Professional title (not default)
  3. Email address (contains @, not default)
  4. Phone number (7+ chars, not default)
  5. Summary 50+ chars (no placeholder text)
  6. At least 1 experience (not default company)
  7. Bullets with metrics (any bullet has digit + 20+ chars)
  8. 5+ skills listed
  9. Education included (not default school)
  10. LinkedIn profile (contains linkedin.com/in/, not default)
- Score: `(passing checks / total) × 100`
- Visual: Large circular progress ring (green ≥80, amber ≥50, red <50)
- Each check shown as green/red card with label + tip

### Download
- Triggers `window.print()` — browser PDF export
- Print styles: `print:shadow-none print:rounded-none print:w-full print:p-0 print:bg-white`

### Share
- Copies `window.location.href` to clipboard
- Shows "Copied!" label for 2 seconds

### History (Edit History)
- Opens 300px panel
- Shows undo stack as timeline
- Current state at top (brand-cyan dot)
- Each edit shows: "Edit #N" + timestamp
- Click to undo to that point (calls `undo()` N times)

---

## 11. STATE MANAGEMENT

### Resume State
```typescript
const [activeTemplateId, setActiveTemplateId] = useState(templateId);
const [resume, setResume] = useState<ResumeData>({ ...DEFAULT_RESUME });
const [sections, setSections] = useState<ResumeSection[]>([...DEFAULT_SECTIONS]);
```

### UI State
```typescript
const [activeTool, setActiveTool] = useState<string | null>(null);
const [showTemplates, setShowTemplates] = useState(false);
const [saving, setSaving] = useState(false);
const [saved, setSaved] = useState(false);
const [activeSection, setActiveSection] = useState<string | null>(null);
const [templateCategory, setTemplateCategory] = useState("All");
const [copiedLink, setCopiedLink] = useState(false);
const [previewMode, setPreviewMode] = useState(false);
const [uploading, setUploading] = useState(false);
```

### Undo/Redo State (max 30 items)
```typescript
const [undoStack, setUndoStack] = useState<ResumeData[]>([]);
const [redoStack, setRedoStack] = useState<ResumeData[]>([]);
const [undoTimestamps, setUndoTimestamps] = useState<number[]>([]);
```

### Design State
```typescript
const [designFont, setDesignFont] = useState(initCfg.font);
const [designFontSize, setDesignFontSize] = useState("15px"); // Medium default
const [designAccent, setDesignAccent] = useState(initCfg.accent);
const [lineSpacing, setLineSpacing] = useState("1.5");
const [margins, setMargins] = useState("48px");
const [headingTransform, setHeadingTransform] = useState(uppercase/capitalize);
const [bulletChar, setBulletChar] = useState(initCfg.bulletChar);
const [dividerStyle, setDividerStyle] = useState(initCfg.headingBorder);
const [layoutType, setLayoutType] = useState<LayoutType>(initCfg.type);
```

### Key Callbacks
- `updateResume(updater)` — Pushes current state to undoStack, clears redoStack, applies updater
- `undo()` — Pops from undoStack, pushes current to redoStack
- `redo()` — Pops from redoStack, pushes current to undoStack
- `handleSave()` — Saves to `localStorage.setItem('resume-draft-${templateId}', JSON.stringify(resume))`
- `selectTemplate(id)` — Sets template ID, applies layout config (font, accent, layout type, heading, bullet, divider)
- `handleUploadResume(e)` — File handler for PDF/DOCX/TXT/JSON
- `handleExportPDF()` — `window.print()`
- `handleShare()` — Clipboard copy URL

### Keyboard Shortcuts
```
Ctrl+Z / Cmd+Z       → Undo
Ctrl+Shift+Z / Cmd+Shift+Z → Redo
Ctrl+S / Cmd+S       → Save
```

---

## 12. TOP BAR

Layout: `h-13 px-5 bg-white border-b shadow-sm`

**Left side:**
- Back button (closes tab)
- Undo/Redo buttons (disabled when stack empty)
- Template name + layout type badge + save status badge

**Right side:**
- Preview/Edit toggle button
- Save button
- Export PDF button (brand-cyan with shadow)

---

## 13. CENTER PAPER DOCUMENT

### Container
- `flex-1 overflow-y-auto scroll-smooth` (smooth scrolling fix)
- `flex justify-center py-8 px-4`
- Print: `print:p-0 print:block`

### Paper Element
- `w-[800px] min-h-[1050px] bg-white shadow-2xl rounded-sm`
- Dynamic: `fontFamily={designFont}`, `fontSize={designFontSize}`, `lineHeight={lineSpacing}`
- Print: `print:shadow-none print:rounded-none print:w-full`

### Rendering Logic
```
if (layoutType === "sidebar" && contactVisible) {
  → Render two-column layout (sidebar + main)
} else {
  → Render single-column layout (header + sections)
}
```

### Section Rendering
- Sections rendered in order from `sections` state array
- Each section: `SectionHeading` + `renderSection(type)`
- Active section highlight: `bg-gray-50/50` with negative margin padding
- Creative layout: sections get `bg-[#f9fafb] p-3 rounded-lg` card style
- Click sets `activeSection`, sidebar nav highlights

### SectionHeading Component
- Title: `text-sm font-bold tracking-[0.12em]`, accent colored, configurable text-transform
- Divider: Renders based on `dividerStyle` state:
  - `accent` → 2px accent-colored line
  - `full` → 1px gray-300 line
  - `double` → Two 1px gray-300 lines
  - `dots` → Dotted border-bottom
  - `none` → Nothing

---

## 14. TEMPLATE PREVIEW SYSTEM (TemplatePreview.tsx — 1012 lines)

### Architecture
- **10 configurable layout factories** × **5 style configs** = **50 templates**
- Each renders inside an `8.5:11 aspect-ratio` container at thumbnail scale (fontSize: 3.5px)
- All rendering is pure React/CSS — no external libraries

### Layout Factories

1. **LeftSidebar** — Dark sidebar with skills (bars/dots), main content right
2. **RightSidebar** — Sidebar on right side
3. **TopBanner** — Full-width colored header banner
4. **CenteredHeader** — Centered name, thin accent line
5. **SplitHeader** — 50/50 split between name and summary
6. **TimelineLayout** — Vertical timeline with nodes
7. **CardLayout** — Card-based sections with backgrounds
8. **NeonGlow** — Dark background with neon glow accents
9. **ClassicSerif** — Traditional serif with horizontal rules
10. **GradientAccent** — Gradient borders and subtle backgrounds

### Shared Helper Components
- `Page` — Wrapper with 8.5:11 aspect ratio
- `Bar` — Skill progress bar
- `Dots` — Dot rating (filled/unfilled)
- `Pill` — Colored pill tag
- `SectionTitle` — Uppercase heading with font override
- `InitialsCircle` — Circular avatar with initials

### Fake Resume Data
Pre-populated with "Sarah Mitchell — Senior Product Manager" including:
- 2 experience entries with quantified bullets
- 8 skills
- Education (UC Berkeley MBA)
- 2 certifications
- 4 metrics (8+ years, 210K MAU, 32% retention, $4.2M budget)

### Template Registry (50 entries)

```typescript
export type TemplateInfo = {
  id: number;
  name: string;
  category: string;
  premium: boolean;    // ALL set to false
  accent: string;
  tags: string[];
  description: string;
};
```

**Modern (8):** Executive Edge, Silicon Valley, Gradient Flow, Dark Mode, Metro Clean, Split Screen, Card View, Neon Pulse
**Classic (7):** Harvard Standard, Wall Street, Legal Brief, Academic CV, Federal Resume, Banking Pro, Diplomatic
**Creative (7):** Creative Canvas, Infographic, Magazine Layout, Retro Pixel, Minimalist Art, Bold Statement, Architect
**Technical (8):** Developer Pro, DevOps Pipeline, Data Scientist, Cloud Engineer, Security Analyst, Mobile Dev, AI Engineer, Blockchain Dev
**Executive (6):** C-Suite, VP Engineering, Product Leader, Startup Founder, Consultant, Non-Profit Leader
**Minimalist (7):** Clean Slate, One Column, Swiss Design, Typewriter, Paper White, LaTeX Style, Scandinavian
**ATS-Optimized (7):** ATS Magnet, Keyword Hunter, Taleo Friendly, Workday Ready, iCIMS Parsed, Greenhouse Pro, Universal ATS

### Categories Array
```typescript
export const TEMPLATE_CATEGORIES = [
  "All", "Modern", "Classic", "Creative", "Technical",
  "Executive", "Minimalist", "ATS-Optimized"
];
```

---

## 15. BUGS FIXED (Chronological)

### Bug 1: Template switching only changed font/color, not layout
**Root Cause:** Old `selectTemplate()` only set `designFont` and `designAccent`
**Fix:** Created 6 real layout types with `LAYOUT_PRESETS`, `CATEGORY_LAYOUT` mapping, and `buildTemplateConfig()`. `selectTemplate()` now sets: font, accent, layoutType, headingTransform, bulletChar, dividerStyle.

### Bug 2: Can't upload PDF/DOCX
**Root Cause:** Old upload only accepted .txt/.json using `FileReader.readAsText()`
**Fix:** Installed `pdfjs-dist` and `mammoth`. Dynamic imports for both. `extractTextFromPDF()` uses pdf.js getDocument → getPage → getTextContent. `extractTextFromDOCX()` uses mammoth.extractRawText. `parseResumeText()` extracts structured fields from raw text.

### Bug 3: Design & Font panel too limited
**Root Cause:** Only 7 fonts, 3 sizes, 8 colors
**Fix:** Expanded to 10 fonts, 5 sizes, 12 colors. Added entirely new controls: line spacing (4), margins (4), heading styles (4), bullet styles (6), section dividers (5), and layout type selector (6).

### Bug 4: Poor scrolling
**Root Cause:** No smooth scroll behavior
**Fix:** Added `scroll-smooth` class to paper container.

### Bug 5: Education display broken
**Root Cause:** `items-baseline` on flex container caused overflow
**Fix:** Removed `items-baseline`, added `min-w-0` to degree/school wrapper for proper text truncation.

### Bug 6: Build error — missing page.tsx
**Root Cause:** Previous session deleted page.tsx during incomplete rewrite, leaving only .bak files
**Fix:** Read page.tsx.bak2 (852 lines), created completely new page.tsx (1271 lines) with all improvements.

---

## 16. WHAT WAS BUILT (Complete Feature List)

### Session 1-3: Foundation
- [x] ARIA 5-wave implementation (backend API + frontend components)
- [x] 7 ARIA components (ActivationForm, ScoreDashboard, OutputView, KeywordPanel, GapBrief, PrecisionEdits, + page integration)
- [x] ariaService API client with 9 methods
- [x] 50 resume templates with 10 layout factory × 5 config architecture
- [x] Template gallery with search, category filter, detail modal
- [x] TemplatePreview thumbnail renderer (1012 lines)

### Session 4: Editor V1
- [x] Created `/resume/editor` route
- [x] Left sidebar toolbar (190px)
- [x] Center editable canvas
- [x] Right preview panel (later removed)
- [x] Template picker
- [x] Undo/redo with keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+S)
- [x] Auto-save to localStorage

### Session 5: Light Mode + Enlarge
- [x] Converted from dark mode to light mode (white paper, gray background)
- [x] Enlarged all UI elements

### Session 6: All Tools Functional
- [x] Rearrange panel (move up/down, toggle visibility)
- [x] Design & Font panel (basic version)
- [x] AI Improve panel (bullet analysis with weak/strong indicators)
- [x] Check panel (10-item quality score)
- [x] History panel (undo timeline)
- [x] Download (window.print PDF)
- [x] Share (clipboard URL copy)
- [x] Export PDF button in top bar

### Session 7: WYSIWYG Rewrite
- [x] Single centered 800px white paper document
- [x] InlineEdit component (click-to-edit with transparent borders)
- [x] PreviewContext for read-only mode
- [x] Removed separate right preview panel

### Session 8: First Fixes
- [x] Template switching applies font + accent
- [x] Upload resume (txt/json)
- [x] Preview mode toggle
- [x] Education display bug fix

### Session 9: Complete Rewrite (Current)
- [x] 6 distinct layout types (classic, modern, sidebar, minimal, creative, executive)
- [x] Category → Layout mapping (Modern→modern, Classic→classic, etc.)
- [x] Per-template config generation from registry
- [x] 5 header renderers (Classic, Modern, Creative, Executive, Minimal)
- [x] Sidebar two-column layout (skills + certs in sidebar, rest in main)
- [x] PDF upload via pdfjs-dist (dynamic import + CDN worker)
- [x] DOCX upload via mammoth (dynamic import)
- [x] Smart text parser (parseResumeText) for name/email/phone/LinkedIn/skills/experience extraction
- [x] Expanded Design Panel: 10 fonts, 5 sizes, 12 colors
- [x] New Design Controls: line spacing, margins, heading styles, bullet styles, section dividers
- [x] Layout type selector in design panel
- [x] Smooth scrolling on paper container
- [x] Build passes clean ✅

---

## 17. TSCONFIG & IMPORT PATHS

```json
// tsconfig.paths.json
{
  "compilerOptions": {
    "paths": {
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"]
    }
  }
}
```

All imports use `@/` prefix:
```typescript
import { TemplatePreview, TEMPLATE_REGISTRY, TEMPLATE_CATEGORIES } from "@/components/resume/TemplatePreview";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton, StatusBadge } from "@/components/ui";
import { ariaService } from "@/lib/services";
```

---

## 18. PRINT STYLES

Elements hidden during print (PDF export):
- Top bar header (`print:hidden`)
- Left sidebar
- Template picker
- Tool panels
- Section nav
- All `print:hidden` buttons (delete, add, toggle)
- Preview badge

Print overrides on paper:
- `print:shadow-none`
- `print:rounded-none`
- `print:w-full`
- `print:p-0`
- `print:bg-white`
- Container: `print:block`

---

## 19. NPM PACKAGES (Resume-Specific)

```json
{
  "pdfjs-dist": "^x.x.x",     // PDF text extraction (dynamic import)
  "mammoth": "^x.x.x",         // DOCX text extraction (dynamic import)
  "framer-motion": "^x.x.x",   // Page transitions
  "lucide-react": "^x.x.x"     // Icons (40+ used)
}
```

PDF.js worker loaded from CDN:
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
```

---

## 20. CONTINUATION INSTRUCTIONS

When continuing work on this system:

1. **Always verify build** after changes: `cmd /c "cd /d d:\linkedin-ai-main\frontend && npx next build"`
2. **Dev server must use** `cmd /c` with explicit cd (background terminals start from workspace root)
3. **Editor is LIGHT MODE** — do not add dark mode classes
4. **All 50 templates are FREE** — never add PRO badges
5. **Backup files exist** at `page.tsx.bak` and `page.tsx.bak2` — do not delete
6. **TemplatePreview.tsx is 1012 lines** — be careful with edits, it contains all 50 renderers
7. **Dynamic imports** for pdfjs-dist and mammoth — they cannot be top-level imports
8. **InlineEdit + PreviewContext** is the core editing pattern — all editable fields use this
9. **Layout type drives rendering** — changing layout affects header, section card style, sidebar presence, bullet char, heading style
10. **Design state is separate from layout config** — user can override any design option after template selection

---

*This document serves as the complete engineering specification for the resume system. Every component, every state variable, every design decision, and every bug fix is documented above. Use this as the authoritative reference for all future development.*
