/**
 * ProfileCraft™ — 50 Premium ATS-Optimized Resume Templates
 * Every template scores 85%+ ATS. Organized into 10 categories.
 */

export interface ResumeTemplate {
    id: number
    name: string
    category: TemplateCategory
    accent: string     // primary accent color
    accent2?: string   // secondary accent
    bg: string         // preview background
    layout: 'single' | 'split' | 'sidebar-left' | 'sidebar-right'
    headerStyle: string
    popular: boolean
    premium: boolean
    atsScore: number   // 85–99
    tags: string[]
    description: string
    font: string
}

export type TemplateCategory =
    | 'ATS Optimized'
    | 'Modern'
    | 'Professional'
    | 'Creative'
    | 'Minimalist'
    | 'Executive'
    | 'Tech'
    | 'Two-Column'
    | 'Entry-Level'
    | 'Industry'

export const CATEGORIES: { name: TemplateCategory; icon: string; count: number }[] = [
    { name: 'ATS Optimized', icon: '🎯', count: 6 },
    { name: 'Modern', icon: '✨', count: 6 },
    { name: 'Professional', icon: '💼', count: 6 },
    { name: 'Creative', icon: '🎨', count: 5 },
    { name: 'Minimalist', icon: '◻️', count: 5 },
    { name: 'Executive', icon: '👔', count: 5 },
    { name: 'Tech', icon: '💻', count: 5 },
    { name: 'Two-Column', icon: '📊', count: 5 },
    { name: 'Entry-Level', icon: '🎓', count: 4 },
    { name: 'Industry', icon: '🏥', count: 3 },
]

export const TEMPLATES: ResumeTemplate[] = [
    // ═══════════════════════════════════════
    // ATS OPTIMIZED (6 templates)
    // ═══════════════════════════════════════
    { id: 1, name: 'ATS Classic', category: 'ATS Optimized', accent: '#2563EB', bg: '#ffffff', layout: 'single', headerStyle: 'simple', popular: true, premium: false, atsScore: 99, tags: ['ATS', 'Classic'], description: 'Maximum ATS compatibility. Clean single-column, standard headings.', font: 'Inter' },
    { id: 2, name: 'ATS Professional', category: 'ATS Optimized', accent: '#1D4ED8', bg: '#ffffff', layout: 'single', headerStyle: 'line', popular: true, premium: false, atsScore: 98, tags: ['ATS', 'Corporate'], description: 'Corporate-ready with blue accents and perfect ATS parsing.', font: 'Roboto' },
    { id: 3, name: 'ATS Modern', category: 'ATS Optimized', accent: '#0EA5E9', bg: '#fafbfc', layout: 'single', headerStyle: 'simple', popular: false, premium: false, atsScore: 97, tags: ['ATS', 'Modern'], description: 'Modern look without sacrificing any ATS readability.', font: 'Inter' },
    { id: 4, name: 'ATS Bold', category: 'ATS Optimized', accent: '#0F172A', bg: '#ffffff', layout: 'single', headerStyle: 'bold-name', popular: false, premium: false, atsScore: 96, tags: ['ATS', 'Bold'], description: 'Bold name header with strong visual hierarchy.', font: 'Outfit' },
    { id: 5, name: 'ATS Federal', category: 'ATS Optimized', accent: '#374151', bg: '#ffffff', layout: 'single', headerStyle: 'simple', popular: false, premium: false, atsScore: 99, tags: ['ATS', 'Government'], description: 'Federal resume format for government applications.', font: 'Times New Roman' },
    { id: 6, name: 'ATS Scannable', category: 'ATS Optimized', accent: '#059669', bg: '#ffffff', layout: 'single', headerStyle: 'simple', popular: false, premium: false, atsScore: 98, tags: ['ATS', 'Scannable'], description: 'Highly scannable with clear section breaks.', font: 'Roboto' },

    // ═══════════════════════════════════════
    // MODERN (6 templates)
    // ═══════════════════════════════════════
    { id: 7, name: 'Nova', category: 'Modern', accent: '#6366F1', bg: '#fafafa', layout: 'single', headerStyle: 'gradient', popular: true, premium: false, atsScore: 93, tags: ['Modern', 'Gradient'], description: 'Vibrant gradient header with contemporary styling.', font: 'Inter' },
    { id: 8, name: 'Pulse', category: 'Modern', accent: '#EC4899', bg: '#fdf6ff', layout: 'single', headerStyle: 'gradient', popular: false, premium: false, atsScore: 91, tags: ['Modern', 'Pink'], description: 'Energetic design with pink accents for impact.', font: 'Outfit' },
    { id: 9, name: 'Catalyst', category: 'Modern', accent: '#14B8A6', bg: '#f0fdf9', layout: 'single', headerStyle: 'line', popular: true, premium: false, atsScore: 94, tags: ['Modern', 'Teal'], description: 'Teal accent lines with clean modern spacing.', font: 'Inter' },
    { id: 10, name: 'Vertex', category: 'Modern', accent: '#F59E0B', bg: '#fffbf0', layout: 'single', headerStyle: 'bold-name', popular: false, premium: false, atsScore: 92, tags: ['Modern', 'Amber'], description: 'Warm amber tones with bold typography.', font: 'Outfit' },
    { id: 11, name: 'Prism', category: 'Modern', accent: '#8B5CF6', bg: '#faf5ff', layout: 'split', headerStyle: 'gradient', popular: false, premium: true, atsScore: 90, tags: ['Modern', 'Purple'], description: 'Purple gradient with two-panel layout.', font: 'Inter' },
    { id: 12, name: 'Aether', category: 'Modern', accent: '#06B6D4', bg: '#ecfeff', layout: 'single', headerStyle: 'line', popular: false, premium: false, atsScore: 93, tags: ['Modern', 'Cyan'], description: 'Light and airy with cyan section dividers.', font: 'Roboto' },

    // ═══════════════════════════════════════
    // PROFESSIONAL (6 templates)
    // ═══════════════════════════════════════
    { id: 13, name: 'Sterling', category: 'Professional', accent: '#1E293B', bg: '#ffffff', layout: 'single', headerStyle: 'elegant', popular: true, premium: false, atsScore: 96, tags: ['Professional', 'Corporate'], description: 'Timeless corporate style with navy accents.', font: 'Georgia' },
    { id: 14, name: 'Pinnacle', category: 'Professional', accent: '#0F766E', bg: '#ffffff', layout: 'single', headerStyle: 'line', popular: false, premium: false, atsScore: 95, tags: ['Professional', 'Teal'], description: 'Refined teal lines separating clean sections.', font: 'Inter' },
    { id: 15, name: 'Cambridge', category: 'Professional', accent: '#7C2D12', bg: '#fffbf5', layout: 'single', headerStyle: 'simple', popular: false, premium: false, atsScore: 97, tags: ['Professional', 'Academic'], description: 'Academic-inspired with warm brown tones.', font: 'Garamond' },
    { id: 16, name: 'Prestige', category: 'Professional', accent: '#312E81', bg: '#ffffff', layout: 'sidebar-left', headerStyle: 'sidebar', popular: true, premium: true, atsScore: 91, tags: ['Professional', 'Sidebar'], description: 'Distinguished sidebar design for senior roles.', font: 'Inter' },
    { id: 17, name: 'Benchmark', category: 'Professional', accent: '#1E3A5F', bg: '#f8fafc', layout: 'single', headerStyle: 'line', popular: false, premium: false, atsScore: 95, tags: ['Professional', 'Navy'], description: 'Deep navy lines with ample whitespace.', font: 'Roboto' },
    { id: 18, name: 'Windsor', category: 'Professional', accent: '#4A1942', bg: '#ffffff', layout: 'single', headerStyle: 'elegant', popular: false, premium: false, atsScore: 94, tags: ['Professional', 'Plum'], description: 'Plum-accented elegance for top professionals.', font: 'Georgia' },

    // ═══════════════════════════════════════
    // CREATIVE (5 templates)
    // ═══════════════════════════════════════
    { id: 19, name: 'Spectrum', category: 'Creative', accent: '#E11D48', bg: '#fff5f7', layout: 'split', headerStyle: 'bold', popular: true, premium: true, atsScore: 87, tags: ['Creative', 'Bold'], description: 'Bold red split-panel for designers and creatives.', font: 'Outfit' },
    { id: 20, name: 'Canvas', category: 'Creative', accent: '#D946EF', bg: '#fdf4ff', layout: 'single', headerStyle: 'gradient', popular: false, premium: true, atsScore: 86, tags: ['Creative', 'Fuchsia'], description: 'Fuchsia gradient header for marketing pros.', font: 'Inter' },
    { id: 21, name: 'Mosaic', category: 'Creative', accent: '#F97316', bg: '#fff7ed', layout: 'sidebar-left', headerStyle: 'sidebar', popular: false, premium: true, atsScore: 85, tags: ['Creative', 'Orange'], description: 'Orange sidebar with skill bars and infographics.', font: 'Outfit' },
    { id: 22, name: 'Luminary', category: 'Creative', accent: '#0891B2', bg: '#ecfeff', layout: 'split', headerStyle: 'bold', popular: false, premium: false, atsScore: 88, tags: ['Creative', 'Teal'], description: 'Creative two-panel with teal photo area.', font: 'Inter' },
    { id: 23, name: 'Vivid', category: 'Creative', accent: '#7C3AED', bg: '#f5f3ff', layout: 'single', headerStyle: 'gradient', popular: true, premium: false, atsScore: 89, tags: ['Creative', 'Violet'], description: 'Violet gradient with portfolio section.', font: 'Outfit' },

    // ═══════════════════════════════════════
    // MINIMALIST (5 templates)
    // ═══════════════════════════════════════
    { id: 24, name: 'Blanc', category: 'Minimalist', accent: '#94A3B8', bg: '#ffffff', layout: 'single', headerStyle: 'minimal', popular: true, premium: false, atsScore: 96, tags: ['Minimalist', 'Clean'], description: 'Pure white with subtle gray dividers. Maximum elegance.', font: 'Inter' },
    { id: 25, name: 'Zen', category: 'Minimalist', accent: '#71717A', bg: '#fafafa', layout: 'single', headerStyle: 'minimal', popular: false, premium: false, atsScore: 97, tags: ['Minimalist', 'Zen'], description: 'Peaceful spacing with zero clutter.', font: 'Roboto' },
    { id: 26, name: 'Clarity', category: 'Minimalist', accent: '#A3A3A3', bg: '#ffffff', layout: 'single', headerStyle: 'line', popular: false, premium: false, atsScore: 98, tags: ['Minimalist', 'Simple'], description: 'Thin gray lines, generous margins.', font: 'Inter' },
    { id: 27, name: 'Essence', category: 'Minimalist', accent: '#78716C', bg: '#fafaf9', layout: 'single', headerStyle: 'minimal', popular: false, premium: false, atsScore: 95, tags: ['Minimalist', 'Warm'], description: 'Warm neutrals with restrained elegance.', font: 'Georgia' },
    { id: 28, name: 'Whisper', category: 'Minimalist', accent: '#CBD5E1', bg: '#ffffff', layout: 'single', headerStyle: 'minimal', popular: false, premium: false, atsScore: 97, tags: ['Minimalist', 'Soft'], description: 'So subtle it whispers. Perfect for formal contexts.', font: 'Roboto' },

    // ═══════════════════════════════════════
    // EXECUTIVE (5 templates)
    // ═══════════════════════════════════════
    { id: 29, name: 'Sovereign', category: 'Executive', accent: '#B8860B', bg: '#1a1a1a', layout: 'single', headerStyle: 'elegant', popular: true, premium: true, atsScore: 92, tags: ['Executive', 'Gold'], description: 'Gold on dark. For C-suite and VP roles.', font: 'Georgia' },
    { id: 30, name: 'Monarch', category: 'Executive', accent: '#8B0000', bg: '#fdf5f5', layout: 'single', headerStyle: 'elegant', popular: false, premium: true, atsScore: 93, tags: ['Executive', 'Burgundy'], description: 'Burgundy accents with executive gravitas.', font: 'Garamond' },
    { id: 31, name: 'Titan', category: 'Executive', accent: '#1F2937', bg: '#ffffff', layout: 'sidebar-left', headerStyle: 'sidebar', popular: false, premium: true, atsScore: 90, tags: ['Executive', 'Dark'], description: 'Charcoal sidebar for senior leaders.', font: 'Inter' },
    { id: 32, name: 'Legacy', category: 'Executive', accent: '#0D4B6E', bg: '#f0f9ff', layout: 'single', headerStyle: 'elegant', popular: false, premium: true, atsScore: 94, tags: ['Executive', 'Navy'], description: 'Navy elegance for directors and principals.', font: 'Georgia' },
    { id: 33, name: 'Apex', category: 'Executive', accent: '#4C1D95', bg: '#ffffff', layout: 'single', headerStyle: 'line', popular: false, premium: true, atsScore: 93, tags: ['Executive', 'Purple'], description: 'Deep purple sophistication for board-level.', font: 'Inter' },

    // ═══════════════════════════════════════
    // TECH (5 templates)
    // ═══════════════════════════════════════
    { id: 34, name: 'DevStack', category: 'Tech', accent: '#00E676', bg: '#0d1117', layout: 'single', headerStyle: 'terminal', popular: true, premium: false, atsScore: 91, tags: ['Tech', 'Terminal'], description: 'Terminal-inspired for developers. Green on dark.', font: 'JetBrains Mono' },
    { id: 35, name: 'GitReady', category: 'Tech', accent: '#58A6FF', bg: '#0d1117', layout: 'single', headerStyle: 'terminal', popular: true, premium: false, atsScore: 93, tags: ['Tech', 'GitHub'], description: 'GitHub-themed for open source contributors.', font: 'JetBrains Mono' },
    { id: 36, name: 'Kernel', category: 'Tech', accent: '#A78BFA', bg: '#1E1B2E', layout: 'sidebar-left', headerStyle: 'sidebar', popular: false, premium: true, atsScore: 89, tags: ['Tech', 'Dark'], description: 'Dark IDE theme with skill bars and tech stack.', font: 'Fira Code' },
    { id: 37, name: 'Cloud Nine', category: 'Tech', accent: '#38BDF8', bg: '#f0f9ff', layout: 'single', headerStyle: 'gradient', popular: false, premium: false, atsScore: 94, tags: ['Tech', 'Cloud'], description: 'Cloud/DevOps focused with light blue gradients.', font: 'Inter' },
    { id: 38, name: 'Neural', category: 'Tech', accent: '#818CF8', bg: '#EEF2FF', layout: 'single', headerStyle: 'line', popular: false, premium: false, atsScore: 92, tags: ['Tech', 'AI/ML'], description: 'AI/ML engineer focused with neural network vibes.', font: 'Roboto' },

    // ═══════════════════════════════════════
    // TWO-COLUMN (5 templates)
    // ═══════════════════════════════════════
    { id: 39, name: 'Balance', category: 'Two-Column', accent: '#0284C7', bg: '#f8fafc', layout: 'split', headerStyle: 'split', popular: true, premium: false, atsScore: 89, tags: ['Split', 'Blue'], description: 'Balanced 40/60 split with blue sidebar.', font: 'Inter' },
    { id: 40, name: 'Divide', category: 'Two-Column', accent: '#16A34A', bg: '#f0fdf4', layout: 'split', headerStyle: 'split', popular: false, premium: false, atsScore: 88, tags: ['Split', 'Green'], description: 'Green-accented split layout.', font: 'Roboto' },
    { id: 41, name: 'Harmony', category: 'Two-Column', accent: '#9333EA', bg: '#faf5ff', layout: 'sidebar-left', headerStyle: 'sidebar', popular: false, premium: true, atsScore: 87, tags: ['Split', 'Purple'], description: 'Purple sidebar with skill progress bars.', font: 'Outfit' },
    { id: 42, name: 'Duality', category: 'Two-Column', accent: '#EA580C', bg: '#fff7ed', layout: 'sidebar-right', headerStyle: 'sidebar', popular: false, premium: false, atsScore: 88, tags: ['Split', 'Orange'], description: 'Right-side info bar with contact & skills.', font: 'Inter' },
    { id: 43, name: 'Parallel', category: 'Two-Column', accent: '#0D9488', bg: '#f0fdfa', layout: 'split', headerStyle: 'split', popular: false, premium: false, atsScore: 89, tags: ['Split', 'Teal'], description: 'Parallel columns with teal dividers.', font: 'Roboto' },

    // ═══════════════════════════════════════
    // ENTRY-LEVEL (4 templates)
    // ═══════════════════════════════════════
    { id: 44, name: 'Launchpad', category: 'Entry-Level', accent: '#3B82F6', bg: '#eff6ff', layout: 'single', headerStyle: 'simple', popular: true, premium: false, atsScore: 95, tags: ['Entry', 'Student'], description: 'Skills-first layout for students and new grads.', font: 'Inter' },
    { id: 45, name: 'Springboard', category: 'Entry-Level', accent: '#10B981', bg: '#f0fdf4', layout: 'single', headerStyle: 'line', popular: false, premium: false, atsScore: 94, tags: ['Entry', 'Intern'], description: 'Internship-optimized with projects section.', font: 'Roboto' },
    { id: 46, name: 'Fresher', category: 'Entry-Level', accent: '#8B5CF6', bg: '#faf5ff', layout: 'single', headerStyle: 'gradient', popular: false, premium: false, atsScore: 93, tags: ['Entry', 'College'], description: 'College student template with coursework & clubs.', font: 'Inter' },
    { id: 47, name: 'Debut', category: 'Entry-Level', accent: '#F59E0B', bg: '#fffbeb', layout: 'single', headerStyle: 'bold-name', popular: false, premium: false, atsScore: 92, tags: ['Entry', 'Career Change'], description: 'Career changer template emphasizing transferable skills.', font: 'Outfit' },

    // ═══════════════════════════════════════
    // INDUSTRY-SPECIFIC (3 templates)
    // ═══════════════════════════════════════
    { id: 48, name: 'Vitals', category: 'Industry', accent: '#DC2626', bg: '#fef2f2', layout: 'single', headerStyle: 'line', popular: false, premium: true, atsScore: 95, tags: ['Healthcare', 'Nursing'], description: 'Healthcare/Nursing with certifications & clinical hours.', font: 'Inter' },
    { id: 49, name: 'Ledger', category: 'Industry', accent: '#0E7490', bg: '#ecfeff', layout: 'single', headerStyle: 'simple', popular: false, premium: true, atsScore: 96, tags: ['Finance', 'Accounting'], description: 'Finance/Accounting with structured metrics sections.', font: 'Roboto' },
    { id: 50, name: 'Educator', category: 'Industry', accent: '#7C3AED', bg: '#f5f3ff', layout: 'single', headerStyle: 'line', popular: false, premium: true, atsScore: 94, tags: ['Education', 'Teaching'], description: 'Teaching template with pedagogy & certifications.', font: 'Georgia' },
]
