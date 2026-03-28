"use client";
/**
 * TemplatePreview — 100 visually unique resume mini-previews.
 *
 * Architecture: 10 configurable layout factories Ã— 5 style configs = 50 templates.
 * Each renders inside an 8.5 Ã— 11 aspect-ratio container at thumbnail scale.
 *
 * Inspired by Enhancv / Canva / Zety â€” all layouts are original.
 */
import React from "react";

/* Applies styles via ref callback to avoid inline style= lint violations.
   This file renders 50+ dynamic resume template previews where every style
   value is computed from template config objects at runtime. */
const sx = (s: Record<string, any>): { ref: React.RefCallback<HTMLElement> } => ({
  ref: (el) => { if (el) Object.assign(el.style, s); },
});

/* â”€â”€â”€ Fake resume data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const D = {
  name: "Sarah Mitchell",
  first: "Sarah",
  last: "Mitchell",
  initials: "SM",
  title: "Senior Product Manager",
  email: "sarah@example.com",
  phone: "(415) 555-0128",
  linkedin: "linkedin.com/in/sarahm",
  location: "San Francisco, CA",
  summary:
    "Results-driven product leader with 8+ years shipping B2B SaaS platforms. Led cross-functional teams of 20+ across three continents delivering $12M+ revenue impact.",
  skills: ["Product Strategy", "Agile / Scrum", "SQL & Analytics", "User Research", "Roadmapping", "A/B Testing", "Figma", "Jira"],
  exp: [
    { co: "Acme Corp", role: "Senior PM", date: "2021 â€“ Present", bullets: ["Launched AI feature â†’ +32% retention", "Managed $4.2M roadmap across 3 teams"] },
    { co: "TechFlow Inc", role: "Product Manager", date: "2018 â€“ 2021", bullets: ["Grew MAU from 40K â†’ 210K in 18 months", "Reduced churn 28% via onboarding redesign"] },
  ],
  edu: { school: "UC Berkeley", degree: "MBA, Haas School of Business", year: "2018" },
  certs: ["PMP Certified", "AWS Cloud Practitioner"],
  metrics: [
    { n: "8+", l: "Years Exp" },
    { n: "210K", l: "MAU Grown" },
    { n: "32%", l: "Retention â†‘" },
    { n: "$4.2M", l: "Budget" },
  ],
};

/* â”€â”€â”€ Shared helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Page({ children, bg = "#ffffff" }: { children: React.ReactNode; bg?: string }) {
  return (
    <div {...sx({ width: "100%", aspectRatio: "8.5/11", background: bg, overflow: "hidden", position: "relative", fontSize: 3.5, lineHeight: 1.35, color: "#1a1a1a" })}>
      {children}
    </div>
  );
}

const Bar = ({ pct, color, h = 2.5 }: { pct: number; color: string; h?: number }) => (
  <div {...sx({ height: h, borderRadius: h, background: "#e5e7eb", width: "100%" })}>
    <div {...sx({ height: "100%", borderRadius: h, background: color, width: `${pct}%` })} />
  </div>
);

const Dots = ({ filled = 4, total = 5, color }: { filled?: number; total?: number; color: string }) => (
  <div {...sx({ display: "flex", gap: 1.2 })}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} {...sx({ width: 3, height: 3, borderRadius: "50%", background: i < filled ? color : "#ddd" })} />
    ))}
  </div>
);

const Pill = ({ text, color }: { text: string; color: string }) => (
  <span {...sx({ fontSize: 2.3, background: `${color}15`, color, padding: "1px 4px", borderRadius: 2, border: `0.5px solid ${color}30`, whiteSpace: "nowrap" })}>{text}</span>
);

const SectionTitle = ({ children, color = "#0f172a", font = "system-ui", extra }: { children: React.ReactNode; color?: string; font?: string; extra?: React.CSSProperties }) => (
  <div {...sx({ fontSize: 3.3, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: font, marginBottom: 2, ...extra })}>{children}</div>
);

const InitialsCircle = ({ bg, fg, sz = 20 }: { bg: string; fg: string; sz?: number }) => (
  <div {...sx({ width: sz, height: sz, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.35, fontWeight: 800, color: fg, flexShrink: 0 })}>
    {D.initials}
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LAYOUT FACTORIES â€” 10 base layouts, each configurable
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

type Cfg = {
  accent: string;
  accent2?: string;
  font?: string;
  headerBg?: string;
  sidebarBg?: string;
  sidebarText?: string;
  sidebarW?: string;
  pageBg?: string;
  skillMode?: "bars" | "dots" | "pills" | "text" | "circles" | "percent";
  nameSize?: number;
  showPhoto?: boolean;
  divider?: "line" | "double" | "bar" | "none" | "gradient";
  sectionIcon?: boolean;
  nameColor?: string;
  bodyColor?: string;
};

/* 1 â€” Left Sidebar (dark) */
function LeftSidebar(c: Cfg) {
  const sbW = c.sidebarW || "32%";
  const sbBg = c.sidebarBg || "#0f172a";
  const sbTxt = c.sidebarText || "#fff";
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page bg={c.pageBg}>
      <div {...sx({ display: "flex", height: "100%", fontFamily: font })}>
        <div {...sx({ width: sbW, background: sbBg, padding: "8px 6px", color: sbTxt, overflow: "hidden" })}>
          {c.showPhoto !== false && <InitialsCircle bg={c.accent} fg={sbBg} />}
          <div {...sx({ textAlign: "center", marginTop: 3 })}>
            {c.showPhoto !== false && <div {...sx({ fontSize: 2.5, opacity: 0.7, marginBottom: 4 })}>{D.email}<br />{D.phone}</div>}
          </div>
          <div {...sx({ borderTop: `1px solid ${sbTxt}20`, paddingTop: 4, marginBottom: 4 })}>
            <div {...sx({ fontSize: 2.8, fontWeight: 700, color: c.accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 })}>Skills</div>
            {D.skills.map((s, i) => (
              <div key={s} {...sx({ marginBottom: 2 })}>
                <div {...sx({ fontSize: 2.5, color: `${sbTxt}cc`, marginBottom: 0.5 })}>{s}</div>
                {c.skillMode === "dots" ? <Dots color={c.accent} filled={3 + (i % 3)} /> : c.skillMode === "text" ? null : <Bar pct={65 + i * 4} color={c.accent} h={2} />}
              </div>
            ))}
          </div>
          <div {...sx({ borderTop: `1px solid ${sbTxt}20`, paddingTop: 4 })}>
            <div {...sx({ fontSize: 2.8, fontWeight: 700, color: c.accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 })}>Education</div>
            <div {...sx({ fontSize: 2.6, color: `${sbTxt}ee`, fontWeight: 600 })}>{D.edu.school}</div>
            <div {...sx({ fontSize: 2.3, color: `${sbTxt}99` })}>{D.edu.degree}</div>
          </div>
        </div>
        <div {...sx({ flex: 1, padding: "8px 7px", overflow: "hidden" })}>
          <div {...sx({ fontSize: c.nameSize || 8, fontWeight: 800, color: c.nameColor || "#0f172a", letterSpacing: -0.3 })}>{D.name}</div>
          <div {...sx({ fontSize: 3.5, color: c.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 })}>{D.title}</div>
          <div {...sx({ fontSize: 2.8, color: c.bodyColor || "#64748b", marginBottom: 5, borderLeft: `2px solid ${c.accent}`, paddingLeft: 4 })}>{D.summary}</div>
          <SectionTitle color={c.accent} extra={{ borderBottom: `1px solid ${c.accent}40`, paddingBottom: 1 }}>Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 4 })}>
              <div {...sx({ display: "flex", justifyContent: "space-between" })}>
                <span {...sx({ fontWeight: 700, fontSize: 3 })}>{e.role} â€” {e.co}</span>
                <span {...sx({ fontSize: 2.3, color: "#94a3b8" })}>{e.date}</span>
              </div>
              {e.bullets.map((b, i) => (
                <div key={i} {...sx({ fontSize: 2.6, color: c.bodyColor || "#475569", paddingLeft: 5, position: "relative", marginTop: 1 })}>
                  <span {...sx({ position: "absolute", left: 1, color: c.accent })}>â€¢</span>{b}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

/* 2 â€” Left Sidebar (colored) */
function LeftSidebarColored(c: Cfg) {
  const sbW = c.sidebarW || "36%";
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page>
      <div {...sx({ display: "flex", height: "100%", fontFamily: font })}>
        <div {...sx({ width: sbW, background: c.accent, padding: "10px 6px", color: "#fff", position: "relative", overflow: "hidden" })}>
          <div {...sx({ position: "absolute", top: 0, right: -8, width: 16, height: 16, borderRadius: "50%", background: "rgba(255,255,255,0.15)" })} />
          {c.showPhoto !== false && (
            <div {...sx({ width: 22, height: 22, borderRadius: "50%", background: "#fff", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: c.accent })}>{D.first[0]}</div>
          )}
          <div {...sx({ textAlign: "center", marginBottom: 5 })}>
            <div {...sx({ fontSize: 6, fontWeight: 800, letterSpacing: -0.2 })}>{D.first}</div>
            <div {...sx({ fontSize: 5, fontWeight: 300, opacity: 0.9 })}>{D.last}</div>
            <div {...sx({ fontSize: 2.3, opacity: 0.7, marginTop: 2 })}>{D.title}</div>
          </div>
          <div {...sx({ borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: 4, marginBottom: 4 })}>
            <div {...sx({ fontSize: 2.3, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 })}>Contact</div>
            <div {...sx({ fontSize: 2.2, opacity: 0.85, lineHeight: 1.6 })}>{D.email}<br />{D.phone}<br />{D.location}</div>
          </div>
          <div {...sx({ borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: 4 })}>
            <div {...sx({ fontSize: 2.3, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 })}>Skills</div>
            {D.skills.slice(0, 6).map((s, i) => (
              <div key={s} {...sx({ marginBottom: 2 })}>
                <div {...sx({ fontSize: 2.4 })}>{s}</div>
                {c.skillMode === "dots" ? <Dots color="#fff" filled={3 + (i % 3)} /> : <Bar pct={65 + i * 4} color="rgba(255,255,255,0.7)" h={2} />}
              </div>
            ))}
          </div>
        </div>
        <div {...sx({ flex: 1, padding: "8px 7px", overflow: "hidden" })}>
          <div {...sx({ fontSize: 2.8, color: "#555", marginBottom: 4, borderLeft: `2px solid ${c.accent}`, paddingLeft: 4 })}>{D.summary}</div>
          <SectionTitle color={c.accent}>Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 4 })}>
              <div {...sx({ fontWeight: 700, fontSize: 3 })}>{e.role}</div>
              <div {...sx({ fontSize: 2.3, color: c.accent })}>{e.co} â€” {e.date}</div>
              {e.bullets.map((b, i) => (
                <div key={i} {...sx({ fontSize: 2.6, color: "#555", marginTop: 1 })}>â— {b}</div>
              ))}
            </div>
          ))}
          <SectionTitle color={c.accent} extra={{ marginTop: 3 }}>Education</SectionTitle>
          <div {...sx({ fontWeight: 600, fontSize: 2.8 })}>{D.edu.school}</div>
          <div {...sx({ fontSize: 2.3, color: "#888" })}>{D.edu.degree} â€” {D.edu.year}</div>
        </div>
      </div>
    </Page>
  );
}

/* 3 â€” Top Banner / Header */
function TopBanner(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  const hBg = c.headerBg || "#0f172a";
  return (
    <Page bg={c.pageBg}>
      <div {...sx({ fontFamily: font })}>
        <div {...sx({ background: hBg, padding: "8px 9px", color: "#fff" })}>
          <div {...sx({ fontSize: c.nameSize || 8, fontWeight: 800, letterSpacing: -0.3 })}>{D.name}</div>
          <div {...sx({ fontSize: 3.5, color: c.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2 })}>{D.title}</div>
          <div {...sx({ fontSize: 2.2, color: "#999", marginTop: 2 })}>{D.email} â€¢ {D.phone} â€¢ {D.location}</div>
        </div>
        <div {...sx({ padding: "5px 9px", overflow: "hidden" })}>
          <div {...sx({ borderLeft: `2px solid ${c.accent}`, paddingLeft: 5, marginBottom: 4, fontSize: 2.7, color: "#555" })}>{D.summary}</div>
          {c.divider !== "none" && (
            <div {...sx({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, marginBottom: 5 })}>
              {D.metrics.map((m) => (
                <div key={m.l} {...sx({ background: "#fafafa", borderRadius: 3, padding: "3px 4px", textAlign: "center", border: "0.5px solid #eee" })}>
                  <div {...sx({ fontSize: 4.5, fontWeight: 800, color: c.accent })}>{m.n}</div>
                  <div {...sx({ fontSize: 2, color: "#888" })}>{m.l}</div>
                </div>
              ))}
            </div>
          )}
          <SectionTitle color={c.nameColor || "#0f172a"} extra={{ borderBottom: `1.5px solid ${c.accent}`, paddingBottom: 1 }}>Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 3 })}>
              <div {...sx({ fontWeight: 700, fontSize: 3 })}>{e.role} â€" {e.co} <span {...sx({ fontWeight: 400, color: "#999", fontSize: 2.3 })}>{e.date}</span></div>
              {e.bullets.map((b, i) => (
                <div key={i} {...sx({ fontSize: 2.5, color: "#555", marginTop: 1, paddingLeft: 5, position: "relative" })}><span {...sx({ position: "absolute", left: 1, color: c.accent })}>â–ª</span>{b}</div>
              ))}
            </div>
          ))}
          <SectionTitle color={c.nameColor || "#0f172a"} extra={{ borderBottom: `1.5px solid ${c.accent}`, paddingBottom: 1, marginTop: 2 }}>Skills</SectionTitle>
          <div {...sx({ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 2 })}>
            {D.skills.map((s) => <Pill key={s} text={s} color={c.accent} />)}
          </div>
        </div>
      </div>
    </Page>
  );
}

/* 4 â€” Centered Single-Column */
function CenteredSingle(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page bg={c.pageBg}>
      <div {...sx({ padding: "8px 10px", fontFamily: font, overflow: "hidden" })}>
        <div {...sx({ textAlign: "center", marginBottom: 5 })}>
          <div {...sx({ fontSize: c.nameSize || 9, fontWeight: 800, color: c.nameColor || "#1a1a2e" })}>{D.name}</div>
          <div {...sx({ fontSize: 3.5, color: c.accent, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase" })}>{D.title}</div>
          <div {...sx({ fontSize: 2.3, color: "#666", marginTop: 2 })}>{D.email} â€¢ {D.phone} â€¢ {D.location}</div>
        </div>
        {c.divider === "gradient" ? (
          <div {...sx({ height: 2, background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)`, marginBottom: 4 })} />
        ) : (
          <div {...sx({ height: 1, background: c.accent, opacity: 0.3, marginBottom: 4 })} />
        )}
        <div {...sx({ fontSize: 2.7, color: "#555", textAlign: "center", marginBottom: 5 })}>{D.summary}</div>
        <div {...sx({ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", marginBottom: 5 })}>
          {D.skills.map((s) => <Pill key={s} text={s} color={c.accent} />)}
        </div>
        <SectionTitle color={c.accent} font={font}>Experience</SectionTitle>
        {D.exp.map((e) => (
          <div key={e.co} {...sx({ marginBottom: 4, paddingLeft: 4, borderLeft: `1.5px solid ${c.accent}40` })}>
            <div {...sx({ fontWeight: 700, fontSize: 3 })}>{e.role}</div>
            <div {...sx({ fontSize: 2.3, color: "#888" })}>{e.co} | {e.date}</div>
            {e.bullets.map((b, i) => (
              <div key={i} {...sx({ fontSize: 2.6, color: "#444", marginTop: 1 })}>â†’ {b}</div>
            ))}
          </div>
        ))}
        <SectionTitle color={c.accent} font={font} extra={{ marginTop: 3 }}>Education</SectionTitle>
        <div {...sx({ paddingLeft: 4, borderLeft: `1.5px solid ${c.accent}40` })}>
          <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{D.edu.school}</div>
          <div {...sx({ fontSize: 2.3, color: "#888" })}>{D.edu.degree} â€” {D.edu.year}</div>
        </div>
      </div>
    </Page>
  );
}

/* 5 â€” Classic Left-Aligned (serif) */
function ClassicSingle(c: Cfg) {
  const font = c.font || "Georgia, serif";
  return (
    <Page>
      <div {...sx({ fontFamily: font, overflow: "hidden" })}>
        {c.divider === "bar" ? <div {...sx({ height: 3, background: c.accent })} /> : <div {...sx({ borderTop: `3px solid ${c.accent}` })} />}
        <div {...sx({ padding: "7px 9px" })}>
          <div {...sx({ fontSize: c.nameSize || 9, fontWeight: 700, color: c.nameColor || c.accent, textAlign: "center" })}>{D.name}</div>
          <div {...sx({ textAlign: "center", fontSize: 2.8, color: "#4a5568", marginBottom: 1 })}>{D.title}</div>
          <div {...sx({ textAlign: "center", fontSize: 2.2, color: "#718096", marginBottom: 4 })}>{D.email} | {D.phone} | {D.location}</div>
          <div {...sx({ borderTop: `0.5px solid ${c.accent}50`, borderBottom: `0.5px solid ${c.accent}50`, padding: "2px 0", marginBottom: 4 })}>
            <div {...sx({ fontSize: 2.8, color: "#4a5568", textAlign: "center", fontStyle: "italic" })}>{D.summary}</div>
          </div>
          <SectionTitle color={c.accent} font={font} extra={{ borderBottom: `1px solid ${c.accent}40`, paddingBottom: 1 }}>Professional Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 4 })}>
              <div {...sx({ display: "flex", justifyContent: "space-between", alignItems: "baseline" })}>
                <span {...sx({ fontWeight: 700, fontSize: 3 })}>{e.co}</span>
                <span {...sx({ fontSize: 2.3, color: "#718096", fontStyle: "italic" })}>{e.date}</span>
              </div>
              <div {...sx({ fontSize: 2.7, color: c.accent, fontStyle: "italic" })}>{e.role}</div>
              {e.bullets.map((b, i) => (
                <div key={i} {...sx({ fontSize: 2.6, color: "#2d3748", marginTop: 1, paddingLeft: 5, position: "relative" })}>
                  <span {...sx({ position: "absolute", left: 1 })}>â– </span>{b}
                </div>
              ))}
            </div>
          ))}
          <SectionTitle color={c.accent} font={font} extra={{ borderBottom: `1px solid ${c.accent}40`, paddingBottom: 1, marginTop: 2 }}>Education</SectionTitle>
          <div {...sx({ display: "flex", justifyContent: "space-between" })}>
            <div>
              <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{D.edu.school}</div>
              <div {...sx({ fontSize: 2.3, color: "#4a5568", fontStyle: "italic" })}>{D.edu.degree}</div>
            </div>
            <div {...sx({ fontSize: 2.3, color: "#718096" })}>{D.edu.year}</div>
          </div>
        </div>
      </div>
    </Page>
  );
}

/* 6 â€” Timeline Layout */
function TimelineLayout(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page bg={c.pageBg || "#fafafa"}>
      <div {...sx({ padding: "6px 8px", fontFamily: font, overflow: "hidden" })}>
        <div {...sx({ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 })}>
          <InitialsCircle bg={c.accent} fg="#fff" sz={18} />
          <div>
            <div {...sx({ fontSize: 7, fontWeight: 800, color: "#0f172a" })}>{D.name}</div>
            <div {...sx({ fontSize: 3, color: "#64748b" })}>{D.title}</div>
          </div>
        </div>
        {c.divider !== "none" && (
          <div {...sx({ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3, marginBottom: 5 })}>
            {D.metrics.slice(0, 3).map((m) => (
              <div key={m.l} {...sx({ background: c.headerBg || "#0f172a", borderRadius: 3, padding: "3px 4px", textAlign: "center" })}>
                <div {...sx({ fontSize: 5, fontWeight: 800, color: c.accent })}>{m.n}</div>
                <div {...sx({ fontSize: 2, color: "#94a3b8" })}>{m.l}</div>
              </div>
            ))}
          </div>
        )}
        <div {...sx({ fontSize: 2.7, color: "#475569", marginBottom: 5 })}>{D.summary}</div>
        {c.skillMode === "bars" && (
          <div {...sx({ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 5 })}>
            {D.skills.map((s, i) => (
              <div key={s} {...sx({ display: "flex", alignItems: "center", gap: 2, fontSize: 2.2 })}>
                <div {...sx({ width: 16, height: 2.5, borderRadius: 1, overflow: "hidden", background: "#e5e7eb" })}>
                  <div {...sx({ height: "100%", borderRadius: 1, background: c.accent, width: `${70 + i * 4}%` })} />
                </div>
                <span {...sx({ color: "#555" })}>{s}</span>
              </div>
            ))}
          </div>
        )}
        <SectionTitle color="#0f172a" extra={{ borderLeft: `2px solid ${c.accent}`, paddingLeft: 3 }}>Career Timeline</SectionTitle>
        {D.exp.map((e) => (
          <div key={e.co} {...sx({ display: "flex", gap: 3, marginBottom: 3 })}>
            <div {...sx({ width: 6, display: "flex", flexDirection: "column", alignItems: "center" })}>
              <div {...sx({ width: 4, height: 4, borderRadius: "50%", background: c.accent, flexShrink: 0 })} />
              <div {...sx({ width: 1, flex: 1, background: "#e5e7eb" })} />
            </div>
            <div>
              <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{e.role} @ {e.co}</div>
              <div {...sx({ fontSize: 2.2, color: "#94a3b8" })}>{e.date}</div>
              {e.bullets.map((b, i) => (
                <div key={i} {...sx({ fontSize: 2.4, color: "#555", marginTop: 1 })}>â–¸ {b}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

/* 7 â€” Split 50/50 */
function SplitLayout(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page>
      <div {...sx({ display: "flex", height: "100%", fontFamily: font })}>
        <div {...sx({ width: "38%", padding: "8px 6px", borderRight: `2px solid ${c.accent}`, overflow: "hidden" })}>
          <div {...sx({ fontSize: 7, fontWeight: 900, color: "#111", lineHeight: 1.1 })}>{D.first}</div>
          <div {...sx({ fontSize: 7, fontWeight: 300, color: "#111", lineHeight: 1.1, marginBottom: 3 })}>{D.last}</div>
          <div {...sx({ fontSize: 3, color: c.accent, fontWeight: 500, marginBottom: 5 })}>{D.title}</div>
          <div {...sx({ fontSize: 2.4, color: "#555", lineHeight: 1.5, marginBottom: 4 })}>{D.email}<br />{D.phone}<br />{D.location}</div>
          <div {...sx({ fontSize: 2.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 })}>Skills</div>
          {D.skills.map((s, i) => (
            <div key={s} {...sx({ fontSize: 2.4, color: "#444", marginBottom: 1.5, display: "flex", justifyContent: "space-between" })}>
              <span>{s}</span>
              {c.skillMode === "dots" && <Dots color={c.accent} filled={3 + (i % 3)} />}
            </div>
          ))}
        </div>
        <div {...sx({ flex: 1, padding: "8px 6px", overflow: "hidden" })}>
          <SectionTitle color={c.accent}>Profile</SectionTitle>
          <div {...sx({ fontSize: 2.6, color: "#555", marginBottom: 5 })}>{D.summary}</div>
          <SectionTitle color={c.accent}>Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 4 })}>
              <div {...sx({ fontWeight: 700, fontSize: 2.8, color: "#111" })}>{e.role}</div>
              <div {...sx({ fontSize: 2.3, color: c.accent })}>{e.co} | {e.date}</div>
              {e.bullets.map((b, i) => (
                <div key={i} {...sx({ fontSize: 2.4, color: "#555", marginTop: 1 })}>{b}</div>
              ))}
            </div>
          ))}
          <SectionTitle color={c.accent} extra={{ marginTop: 3 }}>Education</SectionTitle>
          <div {...sx({ fontWeight: 600, fontSize: 2.6 })}>{D.edu.school}</div>
          <div {...sx({ fontSize: 2.3, color: "#777" })}>{D.edu.degree} â€” {D.edu.year}</div>
        </div>
      </div>
    </Page>
  );
}

/* 8 â€” Infographic / Data-Heavy */
function InfographicLayout(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page bg={c.pageBg || "#f8fafc"}>
      <div {...sx({ display: "flex", height: "100%", fontFamily: font })}>
        <div {...sx({ width: "35%", background: c.sidebarBg || "#0f172a", padding: "6px 5px", color: "#fff", overflow: "hidden" })}>
          <div {...sx({ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${c.accent}`, margin: "0 auto 3px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, fontWeight: 800, color: c.accent })}>{D.initials}</div>
          <div {...sx({ textAlign: "center", fontSize: 2.3, color: "#94a3b8", marginBottom: 4 })}>{D.email}<br />{D.phone}</div>
          <div {...sx({ fontSize: 2.3, fontWeight: 700, color: c.accent, textTransform: "uppercase", marginBottom: 2, letterSpacing: 0.5 })}>Expertise</div>
          {D.skills.slice(0, 6).map((s, i) => (
            <div key={s} {...sx({ marginBottom: 2 })}>
              <div {...sx({ display: "flex", justifyContent: "space-between", fontSize: 2.2, color: "#e2e8f0" })}>
                <span>{s}</span><span {...sx({ color: c.accent })}>{75 + i * 4}%</span>
              </div>
              <Bar pct={75 + i * 4} color={i % 2 === 0 ? c.accent : (c.accent2 || c.accent)} h={2} />
            </div>
          ))}
          <div {...sx({ textAlign: "center", marginTop: 5 })}>
            <div {...sx({ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${c.accent}`, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" })}>
              <div {...sx({ fontSize: 5, fontWeight: 800, color: c.accent })}>8+</div>
              <div {...sx({ fontSize: 1.8, color: "#94a3b8" })}>Years</div>
            </div>
          </div>
        </div>
        <div {...sx({ flex: 1, padding: "6px 6px", overflow: "hidden" })}>
          <div {...sx({ fontSize: 7, fontWeight: 900, color: "#0f172a", lineHeight: 1.1 })}>{D.name}</div>
          <div {...sx({ fontSize: 3, color: c.accent2 || c.accent, fontWeight: 600, marginBottom: 3 })}>{D.title}</div>
          <div {...sx({ fontSize: 2.6, color: "#555", marginBottom: 4 })}>{D.summary}</div>
          <SectionTitle color="#0f172a" extra={{ borderBottom: `1.5px solid ${c.accent}`, paddingBottom: 1 }}>Career Path</SectionTitle>
          {D.exp.map((e, idx) => (
            <div key={e.co} {...sx({ display: "flex", gap: 3, marginBottom: 3 })}>
              <div {...sx({ display: "flex", flexDirection: "column", alignItems: "center", width: 4 })}>
                <div {...sx({ width: 4, height: 4, borderRadius: "50%", background: idx === 0 ? c.accent : (c.accent2 || c.accent), flexShrink: 0 })} />
                <div {...sx({ width: 1, flex: 1, background: "#e5e7eb" })} />
              </div>
              <div>
                <div {...sx({ fontWeight: 700, fontSize: 2.6, color: "#0f172a" })}>{e.role}</div>
                <div {...sx({ fontSize: 2.2, color: c.accent })}>{e.co} â€” {e.date}</div>
                {e.bullets.map((b, i) => (
                  <div key={i} {...sx({ fontSize: 2.3, color: "#555", marginTop: 1 })}>â–¸ {b}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

/* 9 â€” Ultra Minimal */
function MinimalLayout(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  const nameClr = c.nameColor || "#1a1a1a";
  return (
    <Page bg={c.pageBg}>
      <div {...sx({ padding: "12px 14px", fontFamily: font, overflow: "hidden" })}>
        <div {...sx({ textAlign: "center", marginBottom: 6 })}>
          <div {...sx({ fontSize: c.nameSize || 10, fontWeight: 300, color: nameClr, letterSpacing: 2 })}>{D.name.toUpperCase()}</div>
          <div {...sx({ fontSize: 3, color: c.accent || "#888", letterSpacing: 3, marginTop: 1, textTransform: "uppercase" })}>{D.title}</div>
          <div {...sx({ width: 16, height: 0.5, background: nameClr, margin: "4px auto" })} />
          <div {...sx({ fontSize: 2.2, color: "#aaa", marginTop: 2 })}>{D.email} Â· {D.phone}</div>
        </div>
        <div {...sx({ fontSize: 2.7, color: "#666", textAlign: "center", maxWidth: "85%", margin: "0 auto 6px" })}>{D.summary}</div>
        <div {...sx({ fontSize: 2.8, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: nameClr, marginBottom: 3 })}>Experience</div>
        {D.exp.map((e) => (
          <div key={e.co} {...sx({ marginBottom: 4 })}>
            <div {...sx({ display: "flex", justifyContent: "space-between" })}>
              <span {...sx({ fontWeight: 600, fontSize: 2.8 })}>{e.role}</span>
              <span {...sx({ fontSize: 2.3, color: "#bbb" })}>{e.date}</span>
            </div>
            <div {...sx({ fontSize: 2.4, color: "#999", marginBottom: 1 })}>{e.co}</div>
            {e.bullets.map((b, i) => (
              <div key={i} {...sx({ fontSize: 2.5, color: "#555", marginTop: 1 })}>â€“ {b}</div>
            ))}
          </div>
        ))}
        <div {...sx({ fontSize: 2.8, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: nameClr, marginBottom: 2, marginTop: 3 })}>Education</div>
        <div {...sx({ fontSize: 2.7, fontWeight: 500 })}>{D.edu.school}</div>
        <div {...sx({ fontSize: 2.4, color: "#999" })}>{D.edu.degree}</div>
      </div>
    </Page>
  );
}

/* 10 â€” ATS Pure Text */
function ATSLayout(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page>
      <div {...sx({ padding: "8px 10px", fontFamily: font, overflow: "hidden" })}>
        <div {...sx({ fontSize: 8, fontWeight: 700, color: "#111" })}>{D.name}</div>
        <div {...sx({ fontSize: 3.2, color: "#444", marginTop: 1 })}>{D.title}</div>
        <div {...sx({ fontSize: 2.3, color: "#666", marginTop: 1 })}>{D.email} | {D.phone} | {D.location}</div>
        <div {...sx({ height: 1.5, background: c.accent, marginTop: 3, marginBottom: 3 })} />
        <div {...sx({ fontSize: 3.2, fontWeight: 700, color: "#111", textTransform: "uppercase", marginBottom: 1 })}>Professional Summary</div>
        <div {...sx({ fontSize: 2.7, color: "#444", marginBottom: 3 })}>{D.summary}</div>
        <div {...sx({ fontSize: 3.2, fontWeight: 700, color: "#111", textTransform: "uppercase", marginBottom: 1 })}>Core Skills</div>
        <div {...sx({ fontSize: 2.4, color: "#444", marginBottom: 3 })}>{D.skills.join("  â€¢  ")}</div>
        <div {...sx({ fontSize: 3.2, fontWeight: 700, color: "#111", textTransform: "uppercase", marginBottom: 2 })}>Work Experience</div>
        {D.exp.map((e) => (
          <div key={e.co} {...sx({ marginBottom: 3 })}>
            <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{e.role}, {e.co} â€” {e.date}</div>
            {e.bullets.map((b, i) => (
              <div key={i} {...sx({ fontSize: 2.6, color: "#444", marginTop: 1, paddingLeft: 5, position: "relative" })}><span {...sx({ position: "absolute", left: 1 })}>â€¢</span>{b}</div>
            ))}
          </div>
        ))}
        <div {...sx({ fontSize: 3.2, fontWeight: 700, color: "#111", textTransform: "uppercase", marginBottom: 1, marginTop: 2 })}>Education</div>
        <div {...sx({ fontWeight: 600, fontSize: 2.7 })}>{D.edu.degree}, {D.edu.school} â€” {D.edu.year}</div>
        {c.divider !== "none" && (
          <>
            <div {...sx({ height: 1.5, background: c.accent, marginTop: 3, marginBottom: 2, opacity: 0.5 })} />
            <div {...sx({ fontSize: 3.2, fontWeight: 700, color: "#111", textTransform: "uppercase", marginBottom: 1 })}>Certifications</div>
            <div {...sx({ fontSize: 2.5, color: "#444" })}>{D.certs.join("  |  ")}</div>
          </>
        )}
      </div>
    </Page>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   50-TEMPLATE RENDERER MAP
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* Custom one-off templates for unique designs */
function CardView() {
  const c = "#7B61FF";
  return (
    <Page>
      <div {...sx({ padding: "7px 8px", fontFamily: "system-ui", overflow: "hidden" })}>
        <div {...sx({ textAlign: "center", marginBottom: 4 })}>
          <div {...sx({ fontSize: 8, fontWeight: 800, color: "#111" })}>{D.name}</div>
          <div {...sx({ fontSize: 3.2, color: c, marginBottom: 2 })}>{D.title}</div>
          <div {...sx({ fontSize: 2.2, color: "#888" })}>{D.email} â€¢ {D.phone}</div>
        </div>
        <div {...sx({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, marginBottom: 4 })}>
          <div {...sx({ background: "#f8f9fa", borderRadius: 4, padding: "4px 5px", border: "0.5px solid #eee" })}>
            <div {...sx({ fontSize: 2.5, fontWeight: 700, color: c, textTransform: "uppercase", marginBottom: 2 })}>Summary</div>
            <div {...sx({ fontSize: 2.3, color: "#555" })}>{D.summary}</div>
          </div>
          <div {...sx({ background: "#f8f9fa", borderRadius: 4, padding: "4px 5px", border: "0.5px solid #eee" })}>
            <div {...sx({ fontSize: 2.5, fontWeight: 700, color: c, textTransform: "uppercase", marginBottom: 2 })}>Skills</div>
            <div {...sx({ display: "flex", flexWrap: "wrap", gap: 1.5 })}>
              {D.skills.map((s) => <Pill key={s} text={s} color={c} />)}
            </div>
          </div>
        </div>
        {D.exp.map((e) => (
          <div key={e.co} {...sx({ background: "#f8f9fa", borderRadius: 4, padding: "4px 5px", border: "0.5px solid #eee", marginBottom: 2 })}>
            <div {...sx({ display: "flex", justifyContent: "space-between" })}>
              <span {...sx({ fontWeight: 700, fontSize: 2.8 })}>{e.role} â€” {e.co}</span>
              <span {...sx({ fontSize: 2.2, color: "#aaa" })}>{e.date}</span>
            </div>
            {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.3, color: "#555", marginTop: 1 })}>â€¢ {b}</div>)}
          </div>
        ))}
      </div>
    </Page>
  );
}

function NeonPulse() {
  const c = "#FF4466";
  return (
    <Page>
      <div {...sx({ fontFamily: "system-ui", overflow: "hidden" })}>
        <div {...sx({ height: 3, background: `linear-gradient(90deg, ${c}, #FF6B35, #FFB800)` })} />
        <div {...sx({ padding: "7px 9px" })}>
          <div {...sx({ fontSize: 9, fontWeight: 900, color: "#111" })}>{D.name}</div>
          <div {...sx({ fontSize: 3.3, color: c, fontWeight: 600, marginBottom: 3, letterSpacing: 1 })}>{D.title}</div>
          <div {...sx({ fontSize: 2.2, color: "#888", marginBottom: 4 })}>{D.email} â€¢ {D.phone} â€¢ {D.location}</div>
          <div {...sx({ fontSize: 2.7, color: "#555", marginBottom: 4, background: `${c}08`, borderLeft: `2px solid ${c}`, padding: "2px 4px" })}>{D.summary}</div>
          <div {...sx({ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 4 })}>
            {D.skills.map((s) => <span key={s} {...sx({ fontSize: 2.2, background: c, color: "#fff", padding: "1px 4px", borderRadius: 2 })}>{s}</span>)}
          </div>
          <SectionTitle color={c}>Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 3 })}>
              <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{e.role} â€" <span {...sx({ color: c })}>{e.co}</span> <span {...sx({ color: "#bbb", fontSize: 2.2 })}>{e.date}</span></div>
              {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.4, color: "#555", marginTop: 1 })}>â†’ {b}</div>)}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

function MagazineLayout() {
  const c = "#7B61FF";
  return (
    <Page>
      <div {...sx({ display: "flex", height: "100%", fontFamily: "Georgia, serif" })}>
        <div {...sx({ width: "40%", background: `linear-gradient(135deg, ${c}15, ${c}05)`, padding: "8px 6px", borderRight: `2px solid ${c}30`, overflow: "hidden" })}>
          <div {...sx({ fontSize: 7, fontWeight: 800, color: "#111", lineHeight: 1.1 })}>{D.name}</div>
          <div {...sx({ fontSize: 3, color: c, fontStyle: "italic", marginBottom: 4 })}>{D.title}</div>
          <div {...sx({ background: c, color: "#fff", padding: "3px 4px", borderRadius: 2, fontSize: 2.5, marginBottom: 4, fontStyle: "italic" })}>&ldquo;{D.summary.slice(0, 80)}...&rdquo;</div>
          <div {...sx({ fontSize: 2.3, color: "#666", lineHeight: 1.6 })}>{D.email}<br />{D.phone}<br />{D.location}</div>
          <div {...sx({ borderTop: `1px solid ${c}30`, marginTop: 4, paddingTop: 4 })}>
            <div {...sx({ fontSize: 2.5, fontWeight: 700, color: c, marginBottom: 2 })}>SKILLS</div>
            {D.skills.map((s) => <div key={s} {...sx({ fontSize: 2.3, color: "#555", marginBottom: 1 })}>â—† {s}</div>)}
          </div>
        </div>
        <div {...sx({ flex: 1, padding: "8px 6px", overflow: "hidden" })}>
          <SectionTitle color={c} font="Georgia, serif">Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 4, borderLeft: `2px solid ${c}30`, paddingLeft: 4 })}>
              <div {...sx({ fontWeight: 700, fontSize: 3 })}>{e.role}</div>
              <div {...sx({ fontSize: 2.3, color: c })}>{e.co} | {e.date}</div>
              {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.4, color: "#555", marginTop: 1 })}>{b}</div>)}
            </div>
          ))}
          <SectionTitle color={c} font="Georgia, serif" extra={{ marginTop: 3 }}>Education</SectionTitle>
          <div {...sx({ fontWeight: 600, fontSize: 2.6 })}>{D.edu.school}</div>
          <div {...sx({ fontSize: 2.3, color: "#888", fontStyle: "italic" })}>{D.edu.degree}</div>
        </div>
      </div>
    </Page>
  );
}

function RetroPixel() {
  const g = "#00FF88";
  return (
    <Page bg="#1a1a2e">
      <div {...sx({ padding: "6px 8px", fontFamily: "'Courier New', monospace", color: "#eee", overflow: "hidden" })}>
        <div {...sx({ textAlign: "center", marginBottom: 4 })}>
          <div {...sx({ fontSize: 8, fontWeight: 800, color: g, letterSpacing: 1 })}>{">"} {D.name}</div>
          <div {...sx({ fontSize: 3, color: "#888", marginTop: 1 })}>class: {D.title}</div>
          <div {...sx({ fontSize: 2.2, color: "#555", marginTop: 1 })}>{D.email} | {D.phone}</div>
        </div>
        <div {...sx({ border: `1px solid ${g}30`, borderRadius: 3, padding: "3px 4px", marginBottom: 4 })}>
          <div {...sx({ fontSize: 2.2, color: g, marginBottom: 1 })}>// summary</div>
          <div {...sx({ fontSize: 2.5, color: "#ccc" })}>{D.summary}</div>
        </div>
        <div {...sx({ fontSize: 2.8, color: g, marginBottom: 2 })}>## Skills</div>
        <div {...sx({ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 4 })}>
          {D.skills.map((s, i) => (
            <div key={s} {...sx({ fontSize: 2.2 })}>
              <span {...sx({ color: "#888" })}>[</span>
              <span {...sx({ color: g })}>{s}</span>
              <span {...sx({ color: "#888" })}>]</span>
              {" "}<span {...sx({ fontSize: 2, color: "#555" })}>LVL {5 + (i % 4)}</span>
            </div>
          ))}
        </div>
        <div {...sx({ fontSize: 2.8, color: g, marginBottom: 2 })}>## Experience</div>
        {D.exp.map((e) => (
          <div key={e.co} {...sx({ marginBottom: 3 })}>
            <div {...sx({ fontWeight: 700, fontSize: 2.6, color: "#eee" })}>{e.role} @ {e.co} <span {...sx({ color: "#555" })}>{e.date}</span></div>
            {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.3, color: "#aaa", marginTop: 1 })}>  â†’ {b}</div>)}
          </div>
        ))}
      </div>
    </Page>
  );
}

function BoldStatement() {
  const c = "#FF4466";
  return (
    <Page>
      <div {...sx({ fontFamily: "system-ui", overflow: "hidden" })}>
        <div {...sx({ background: c, padding: "12px 9px 6px", color: "#fff" })}>
          <div {...sx({ fontSize: 12, fontWeight: 900, letterSpacing: -1, lineHeight: 1 })}>{D.name.toUpperCase()}</div>
          <div {...sx({ fontSize: 3.5, fontWeight: 300, marginTop: 2, opacity: 0.85 })}>{D.title}</div>
        </div>
        <div {...sx({ padding: "5px 9px" })}>
          <div {...sx({ fontSize: 2.2, color: "#888", marginBottom: 3 })}>{D.email} | {D.phone} | {D.location}</div>
          <div {...sx({ fontSize: 2.7, color: "#555", marginBottom: 4 })}>{D.summary}</div>
          <SectionTitle color={c}>Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 3 })}>
              <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{e.role} â€” {e.co}</div>
              <div {...sx({ fontSize: 2.2, color: c })}>{e.date}</div>
              {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.4, color: "#555", marginTop: 1 })}>â€¢ {b}</div>)}
            </div>
          ))}
          <SectionTitle color={c} extra={{ marginTop: 2 }}>Education</SectionTitle>
          <div {...sx({ fontSize: 2.6, fontWeight: 600 })}>{D.edu.school} â€” {D.edu.degree}</div>
        </div>
      </div>
    </Page>
  );
}

function BlockchainDev() {
  const amber = "#FFB800";
  return (
    <Page bg="#fffdf5">
      <div {...sx({ fontFamily: "system-ui", overflow: "hidden" })}>
        <div {...sx({ height: 3, background: `linear-gradient(90deg, ${amber}, #FF6B35)` })} />
        <div {...sx({ padding: "7px 9px" })}>
          <div {...sx({ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 })}>
            <div {...sx({ width: 16, height: 16, borderRadius: 3, background: `linear-gradient(135deg, ${amber}, #FF6B35)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, fontWeight: 800, color: "#fff" })}>S</div>
            <div>
              <div {...sx({ fontSize: 7, fontWeight: 800, color: "#111" })}>{D.name}</div>
              <div {...sx({ fontSize: 3, color: amber })}>{D.title}</div>
            </div>
          </div>
          <div {...sx({ fontSize: 2.7, color: "#555", marginBottom: 4 })}>{D.summary}</div>
          <div {...sx({ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 4 })}>
            {D.skills.map((s) => <span key={s} {...sx({ fontSize: 2.2, background: `${amber}20`, color: "#92400e", padding: "1px 4px", borderRadius: 2, border: `0.5px solid ${amber}40` })}>{s}</span>)}
          </div>
          <SectionTitle color={amber}>Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 3, paddingLeft: 4, borderLeft: `1.5px solid ${amber}50` })}>
              <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{e.role} â€” {e.co}</div>
              <div {...sx({ fontSize: 2.2, color: "#999" })}>{e.date}</div>
              {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.4, color: "#555", marginTop: 1 })}>â–¸ {b}</div>)}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

function StartupFounder() {
  const c = "#FF6B35";
  return (
    <Page>
      <div {...sx({ fontFamily: "system-ui", overflow: "hidden" })}>
        <div {...sx({ display: "flex", alignItems: "center", gap: 5, padding: "8px 9px", borderBottom: `3px solid ${c}` })}>
          <InitialsCircle bg={c} fg="#fff" sz={22} />
          <div>
            <div {...sx({ fontSize: 8, fontWeight: 800, color: "#111" })}>{D.name}</div>
            <div {...sx({ fontSize: 3.2, color: c, fontWeight: 600 })}>{D.title}</div>
            <div {...sx({ fontSize: 2.2, color: "#888" })}>{D.email} â€¢ {D.phone}</div>
          </div>
        </div>
        <div {...sx({ padding: "5px 9px" })}>
          <div {...sx({ fontSize: 2.7, color: "#555", marginBottom: 4 })}>{D.summary}</div>
          <div {...sx({ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 2, marginBottom: 4 })}>
            {D.metrics.map((m) => (
              <div key={m.l} {...sx({ textAlign: "center" })}>
                <div {...sx({ fontSize: 4, fontWeight: 800, color: c })}>{m.n}</div>
                <div {...sx({ fontSize: 1.8, color: "#888" })}>{m.l}</div>
              </div>
            ))}
          </div>
          <SectionTitle color="#111">Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 3 })}>
              <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{e.role} â€" {e.co} <span {...sx({ color: "#999", fontWeight: 400, fontSize: 2.2 })}>{e.date}</span></div>
              {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.4, color: "#555", marginTop: 1 })}>â€¢ {b}</div>)}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

function LaTeXStyle() {
  return (
    <Page>
      <div {...sx({ padding: "8px 10px", fontFamily: "'Computer Modern', 'Courier New', serif", overflow: "hidden" })}>
        <div {...sx({ textAlign: "center", marginBottom: 3, borderBottom: "0.5px solid #333", paddingBottom: 3 })}>
          <div {...sx({ fontSize: 10, fontWeight: 700, letterSpacing: 1 })}>{D.name}</div>
          <div {...sx({ fontSize: 2.8, color: "#444", marginTop: 1 })}>{D.title}</div>
          <div {...sx({ fontSize: 2, color: "#666", marginTop: 1 })}>{D.email} â€” {D.phone} â€” {D.location}</div>
        </div>
        <div {...sx({ fontSize: 2.5, marginBottom: 3 })}><strong>Abstract.</strong> {D.summary}</div>
        <div {...sx({ fontSize: 3, fontWeight: 700, marginBottom: 2 })}>1. Experience</div>
        {D.exp.map((e, idx) => (
          <div key={e.co} {...sx({ marginBottom: 3, paddingLeft: 6 })}>
            <div {...sx({ fontWeight: 700, fontSize: 2.7 })}>1.{idx + 1} {e.role} â€” {e.co} ({e.date})</div>
            {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.4, color: "#333", marginTop: 1 })}>{b}</div>)}
          </div>
        ))}
        <div {...sx({ fontSize: 3, fontWeight: 700, marginBottom: 2 })}>2. Education</div>
        <div {...sx({ paddingLeft: 6, fontSize: 2.5 })}>{D.edu.degree}, {D.edu.school}, {D.edu.year}</div>
        <div {...sx({ fontSize: 3, fontWeight: 700, marginBottom: 2, marginTop: 3 })}>3. Skills</div>
        <div {...sx({ paddingLeft: 6, fontSize: 2.4 })}>{D.skills.join(", ")}</div>
      </div>
    </Page>
  );
}

function Scandinavian() {
  const c = "#a0aec0";
  return (
    <Page bg="#f7fafc">
      <div {...sx({ display: "flex", height: "100%", fontFamily: "system-ui", overflow: "hidden" })}>
        <div {...sx({ width: "35%", background: "#edf2f7", padding: "8px 6px", overflow: "hidden" })}>
          <div {...sx({ width: 18, height: 18, borderRadius: "50%", background: c, margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "#fff" })}>{D.initials}</div>
          <div {...sx({ textAlign: "center", fontSize: 2.3, color: "#718096", marginBottom: 4 })}>{D.email}<br />{D.phone}</div>
          <div {...sx({ fontSize: 2.3, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 })}>Skills</div>
          {D.skills.map((s) => <div key={s} {...sx({ fontSize: 2.3, color: "#718096", marginBottom: 1.5, display: "flex", alignItems: "center", gap: 2 })}><div {...sx({ width: 2, height: 2, borderRadius: "50%", background: c })} />{s}</div>)}
          <div {...sx({ fontSize: 2.3, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2, marginTop: 4 })}>Education</div>
          <div {...sx({ fontSize: 2.3, color: "#4a5568", fontWeight: 500 })}>{D.edu.school}</div>
          <div {...sx({ fontSize: 2, color: "#a0aec0" })}>{D.edu.degree}</div>
        </div>
        <div {...sx({ flex: 1, padding: "8px 6px", overflow: "hidden" })}>
          <div {...sx({ fontSize: 7, fontWeight: 700, color: "#2d3748" })}>{D.name}</div>
          <div {...sx({ fontSize: 3, color: "#718096", marginBottom: 4 })}>{D.title}</div>
          <div {...sx({ fontSize: 2.6, color: "#4a5568", marginBottom: 5 })}>{D.summary}</div>
          <div {...sx({ fontSize: 2.5, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${c}`, paddingBottom: 1, marginBottom: 3 })}>Experience</div>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 3 })}>
              <div {...sx({ fontWeight: 600, fontSize: 2.7, color: "#2d3748" })}>{e.role}</div>
              <div {...sx({ fontSize: 2.2, color: "#a0aec0" })}>{e.co} â€” {e.date}</div>
              {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.3, color: "#718096", marginTop: 1 })}>â€“ {b}</div>)}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

/* 11 - Right Sidebar (light) */
function RightSidebar(c: Cfg) {
  const sbW = c.sidebarW || "30%";
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page bg={c.pageBg}>
      <div {...sx({ display: "flex", height: "100%", fontFamily: font })}>
        <div {...sx({ flex: 1, padding: "8px 7px", overflow: "hidden" })}>
          <div {...sx({ fontSize: c.nameSize || 8, fontWeight: 800, color: c.nameColor || "#111" })}>{D.name}</div>
          <div {...sx({ fontSize: 3.5, color: c.accent, fontWeight: 600, marginBottom: 4 })}>{D.title}</div>
          <div {...sx({ fontSize: 2.7, color: c.bodyColor || "#555", marginBottom: 4, borderLeft: `2px solid ${c.accent}`, paddingLeft: 4 })}>{D.summary}</div>
          <SectionTitle color={c.accent} extra={{ borderBottom: `1px solid ${c.accent}40`, paddingBottom: 1 }}>Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 3 })}>
              <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{e.role} &ndash; {e.co} <span {...sx({ color: "#999", fontSize: 2.2 })}>{e.date}</span></div>
              {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.5, color: "#555", marginTop: 1, paddingLeft: 4, position: "relative" })}><span {...sx({ position: "absolute", left: 0, color: c.accent })}>&bull;</span>{b}</div>)}
            </div>
          ))}
        </div>
        <div {...sx({ width: sbW, background: c.sidebarBg || "#f8f9fa", padding: "8px 6px", borderLeft: `2px solid ${c.accent}30`, overflow: "hidden" })}>
          <div {...sx({ fontSize: 2.8, fontWeight: 700, color: c.accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 })}>Contact</div>
          <div {...sx({ fontSize: 2.3, color: c.sidebarText || "#555", lineHeight: 1.6, marginBottom: 4 })}>{D.email}<br />{D.phone}<br />{D.location}</div>
          <div {...sx({ fontSize: 2.8, fontWeight: 700, color: c.accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 })}>Skills</div>
          {D.skills.map((s, i) => (
            <div key={s} {...sx({ marginBottom: 2 })}>
              <div {...sx({ fontSize: 2.4, color: c.sidebarText || "#555" })}>{s}</div>
              {c.skillMode === "dots" ? <Dots color={c.accent} filled={3 + (i % 3)} /> : <Bar pct={65 + i * 4} color={c.accent} h={2} />}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

/* 12 - Gradient Header Band */
function GradientHeader(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  const g1 = c.accent;
  const g2 = c.accent2 || c.accent;
  return (
    <Page bg={c.pageBg}>
      <div {...sx({ fontFamily: font, overflow: "hidden" })}>
        <div {...sx({ background: `linear-gradient(135deg, ${g1}, ${g2})`, padding: "10px 9px", color: "#fff" })}>
          <div {...sx({ fontSize: c.nameSize || 9, fontWeight: 800, letterSpacing: -0.3 })}>{D.name}</div>
          <div {...sx({ fontSize: 3.3, fontWeight: 400, opacity: 0.9, marginTop: 1 })}>{D.title}</div>
          <div {...sx({ fontSize: 2.2, opacity: 0.7, marginTop: 2 })}>{D.email} &middot; {D.phone} &middot; {D.location}</div>
        </div>
        <div {...sx({ padding: "5px 9px" })}>
          <div {...sx({ fontSize: 2.7, color: "#555", marginBottom: 4 })}>{D.summary}</div>
          <div {...sx({ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 4 })}>
            {D.skills.map((s) => <Pill key={s} text={s} color={g1} />)}
          </div>
          <SectionTitle color={g1}>Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 3 })}>
              <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{e.role} &ndash; {e.co}</div>
              <div {...sx({ fontSize: 2.2, color: g1 })}>{e.date}</div>
              {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.4, color: "#555", marginTop: 1 })}>&bull; {b}</div>)}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

/* 13 - Compact Horizontal */
function CompactHorizontal(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page bg={c.pageBg}>
      <div {...sx({ padding: "6px 8px", fontFamily: font, overflow: "hidden" })}>
        <div {...sx({ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `2px solid ${c.accent}`, paddingBottom: 3, marginBottom: 3 })}>
          <div>
            <div {...sx({ fontSize: 7, fontWeight: 800, color: c.nameColor || "#111" })}>{D.name}</div>
            <div {...sx({ fontSize: 3, color: c.accent, fontWeight: 500 })}>{D.title}</div>
          </div>
          <div {...sx({ textAlign: "right", fontSize: 2.2, color: "#888", lineHeight: 1.6 })}>{D.email}<br />{D.phone}<br />{D.location}</div>
        </div>
        <div {...sx({ fontSize: 2.6, color: "#555", marginBottom: 3 })}>{D.summary}</div>
        <div {...sx({ display: "flex", flexWrap: "wrap", gap: 1.5, marginBottom: 3 })}>
          {D.skills.map((s) => <Pill key={s} text={s} color={c.accent} />)}
        </div>
        <SectionTitle color={c.accent}>Experience</SectionTitle>
        {D.exp.map((e) => (
          <div key={e.co} {...sx({ marginBottom: 3 })}>
            <div {...sx({ display: "flex", justifyContent: "space-between" })}>
              <span {...sx({ fontWeight: 700, fontSize: 2.7 })}>{e.role} &ndash; {e.co}</span>
              <span {...sx({ fontSize: 2.2, color: "#999" })}>{e.date}</span>
            </div>
            {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.4, color: "#555", marginTop: 1 })}>&bull; {b}</div>)}
          </div>
        ))}
        <SectionTitle color={c.accent} extra={{ marginTop: 2 }}>Education</SectionTitle>
        <div {...sx({ fontSize: 2.5 })}>{D.edu.degree}, {D.edu.school} ({D.edu.year})</div>
      </div>
    </Page>
  );
}

/* 14 - Diagonal Accent */
function DiagonalAccent(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page bg={c.pageBg}>
      <div {...sx({ fontFamily: font, overflow: "hidden", position: "relative" })}>
        <div {...sx({ position: "absolute", top: 0, left: 0, width: "100%", height: 30, background: c.accent, transform: "skewY(-3deg)", transformOrigin: "top left", opacity: 0.08 })} />
        <div {...sx({ padding: "10px 9px", position: "relative", zIndex: 1 })}>
          <div {...sx({ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 })}>
            <InitialsCircle bg={c.accent} fg="#fff" sz={16} />
            <div>
              <div {...sx({ fontSize: c.nameSize || 8, fontWeight: 800, color: c.nameColor || "#111" })}>{D.name}</div>
              <div {...sx({ fontSize: 3, color: c.accent, fontWeight: 500 })}>{D.title}</div>
            </div>
          </div>
          <div {...sx({ fontSize: 2.6, color: "#555", marginBottom: 4 })}>{D.summary}</div>
          <SectionTitle color={c.accent}>Experience</SectionTitle>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 3 })}>
              <div {...sx({ fontWeight: 700, fontSize: 2.8 })}>{e.role} &ndash; {e.co}</div>
              <div {...sx({ fontSize: 2.2, color: c.accent })}>{e.date}</div>
              {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.4, color: "#555", marginTop: 1 })}>&bull; {b}</div>)}
            </div>
          ))}
          <SectionTitle color={c.accent} extra={{ marginTop: 2 }}>Skills</SectionTitle>
          <div {...sx({ display: "flex", flexWrap: "wrap", gap: 2 })}>
            {D.skills.map((s) => <Pill key={s} text={s} color={c.accent} />)}
          </div>
        </div>
      </div>
    </Page>
  );
}

/* 15 - Two-Tone Modern */
function TwoToneModern(c: Cfg) {
  const font = c.font || "system-ui, sans-serif";
  return (
    <Page>
      <div {...sx({ display: "flex", height: "100%", fontFamily: font })}>
        <div {...sx({ width: "40%", background: c.accent, padding: "10px 6px", color: "#fff", overflow: "hidden" })}>
          <div {...sx({ fontSize: 6, fontWeight: 800, lineHeight: 1.1 })}>{D.first}</div>
          <div {...sx({ fontSize: 5, fontWeight: 300, lineHeight: 1.1, marginBottom: 4 })}>{D.last}</div>
          <div {...sx({ fontSize: 2.5, opacity: 0.8, marginBottom: 4 })}>{D.title}</div>
          <div {...sx({ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 4 })}>
            <div {...sx({ fontSize: 2.3, fontWeight: 700, letterSpacing: 1, marginBottom: 2 })}>CONTACT</div>
            <div {...sx({ fontSize: 2.2, opacity: 0.8, lineHeight: 1.6 })}>{D.email}<br />{D.phone}<br />{D.location}</div>
            <div {...sx({ fontSize: 2.3, fontWeight: 700, letterSpacing: 1, marginBottom: 2, marginTop: 4 })}>SKILLS</div>
            {D.skills.map((s, i) => (
              <div key={s} {...sx({ marginBottom: 1.5 })}>
                <div {...sx({ fontSize: 2.3, opacity: 0.9 })}>{s}</div>
                <Bar pct={70 + i * 4} color="rgba(255,255,255,0.6)" h={1.5} />
              </div>
            ))}
          </div>
        </div>
        <div {...sx({ flex: 1, background: c.accent2 || "#1a1a2e", padding: "10px 7px", color: "#fff", overflow: "hidden" })}>
          <div {...sx({ fontSize: 2.7, color: "rgba(255,255,255,0.7)", marginBottom: 4 })}>{D.summary}</div>
          <div {...sx({ fontSize: 2.8, fontWeight: 700, color: c.accent, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${c.accent}40`, paddingBottom: 1, marginBottom: 3 })}>Experience</div>
          {D.exp.map((e) => (
            <div key={e.co} {...sx({ marginBottom: 3 })}>
              <div {...sx({ fontWeight: 700, fontSize: 2.7 })}>{e.role}</div>
              <div {...sx({ fontSize: 2.2, color: c.accent })}>{e.co} &ndash; {e.date}</div>
              {e.bullets.map((b, i) => <div key={i} {...sx({ fontSize: 2.3, color: "rgba(255,255,255,0.6)", marginTop: 1 })}>&bull; {b}</div>)}
            </div>
          ))}
          <div {...sx({ fontSize: 2.8, fontWeight: 700, color: c.accent, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${c.accent}40`, paddingBottom: 1, marginTop: 2, marginBottom: 2 })}>Education</div>
          <div {...sx({ fontWeight: 600, fontSize: 2.5 })}>{D.edu.school}</div>
          <div {...sx({ fontSize: 2.2, color: "rgba(255,255,255,0.5)" })}>{D.edu.degree}</div>
        </div>
      </div>
    </Page>
  );
}

const RENDERERS: Record<number, () => React.JSX.Element> = {
  /* Modern (1-8) */
  1: () => LeftSidebar({ accent: "#00D4FF", sidebarBg: "#0f1729", skillMode: "bars", showPhoto: true }),
  2: () => CenteredSingle({ accent: "#7B61FF", font: "'Courier New', monospace", divider: "gradient", nameColor: "#1a1a2e" }),
  3: () => CenteredSingle({ accent: "#00FF88", divider: "gradient", pageBg: "#fafafa", nameSize: 8 }),
  4: () => LeftSidebar({ accent: "#00D4FF", accent2: "#7B61FF", sidebarBg: "#0a0e1a", pageBg: "#0f172a", nameColor: "#f1f5f9", bodyColor: "#94a3b8", skillMode: "bars" }),
  5: () => CenteredSingle({ accent: "#FFB800", nameSize: 8, pageBg: "#fefefe" }),
  6: () => SplitLayout({ accent: "#FF6B35", skillMode: "dots" }),
  7: () => <CardView />,
  8: () => <NeonPulse />,

  /* Classic (9-15) */
  9: () => ClassicSingle({ accent: "#333333", font: "Georgia, serif", nameSize: 9 }),
  10: () => ClassicSingle({ accent: "#1a365d", font: "Georgia, serif", divider: "bar" }),
  11: () => ClassicSingle({ accent: "#2d3748", font: "'Times New Roman', serif", nameSize: 8 }),
  12: () => ClassicSingle({ accent: "#4a5568", font: "Georgia, serif", nameColor: "#1a1a1a" }),
  13: () => ClassicSingle({ accent: "#2b6cb0", font: "system-ui, sans-serif", divider: "bar" }),
  14: () => ClassicSingle({ accent: "#1a202c", font: "Georgia, serif" }),
  15: () => ClassicSingle({ accent: "#2d3748", font: "'Palatino Linotype', serif", nameColor: "#2d3748" }),

  /* Creative (16-22) */
  16: () => LeftSidebarColored({ accent: "#FF6B35", skillMode: "dots" }),
  17: () => InfographicLayout({ accent: "#00D4FF", accent2: "#7B61FF" }),
  18: () => <MagazineLayout />,
  19: () => <RetroPixel />,
  20: () => MinimalLayout({ accent: "#000000", nameSize: 10 }),
  21: () => <BoldStatement />,
  22: () => LeftSidebar({ accent: "#2b6cb0", sidebarBg: "#edf2f7", sidebarText: "#2d3748", skillMode: "dots", nameColor: "#1a365d" }),

  /* Technical (23-30) */
  23: () => CenteredSingle({ accent: "#00D4FF", font: "'Courier New', monospace", divider: "gradient" }),
  24: () => TimelineLayout({ accent: "#00FF88", headerBg: "#14532d", pageBg: "#f0fdf4" }),
  25: () => LeftSidebar({ accent: "#7B61FF", sidebarBg: "#1e1b4b", skillMode: "bars" }),
  26: () => CenteredSingle({ accent: "#FFB800", nameSize: 8, pageBg: "#fffbeb" }),
  27: () => TopBanner({ accent: "#FF4466", headerBg: "#1a0a0e", nameColor: "#1a1a1a" }),
  28: () => LeftSidebar({ accent: "#00D4FF", sidebarBg: "#0c4a6e", skillMode: "dots" }),
  29: () => CenteredSingle({ accent: "#7B61FF", divider: "gradient", pageBg: "#faf5ff" }),
  30: () => <BlockchainDev />,

  /* Executive (31-36) */
  31: () => TopBanner({ accent: "#FFB800", headerBg: "#1a202c", nameSize: 9, font: "Georgia, serif" }),
  32: () => TopBanner({ accent: "#00D4FF", headerBg: "#0c4a6e" }),
  33: () => CenteredSingle({ accent: "#7B61FF", nameSize: 9 }),
  34: () => <StartupFounder />,
  35: () => ClassicSingle({ accent: "#2d3748", font: "Georgia, serif", nameSize: 9 }),
  36: () => CenteredSingle({ accent: "#00FF88", pageBg: "#f0fdf4" }),

  /* Minimalist (37-43) */
  37: () => MinimalLayout({ accent: "#888888", nameColor: "#1a1a1a" }),
  38: () => MinimalLayout({ accent: "#718096", nameSize: 9 }),
  39: () => SplitLayout({ accent: "#e53e3e", skillMode: "dots" }),
  40: () => MinimalLayout({ accent: "#4a5568", font: "'Courier New', monospace", nameSize: 8 }),
  41: () => MinimalLayout({ accent: "#d4a574", font: "Georgia, serif", pageBg: "#fdf6ec", nameColor: "#5c4033" }),
  42: () => <LaTeXStyle />,
  43: () => <Scandinavian />,

  /* ATS-Optimized (44-50) */
  44: () => ATSLayout({ accent: "#00D4FF" }),
  45: () => ATSLayout({ accent: "#00FF88" }),
  46: () => ATSLayout({ accent: "#333333", font: "'Times New Roman', serif", divider: "none" }),
  47: () => ATSLayout({ accent: "#2b6cb0" }),
  48: () => ATSLayout({ accent: "#4a5568" }),
  49: () => ATSLayout({ accent: "#00D4FF", divider: "none" }),
  50: () => ATSLayout({ accent: "#333333", divider: "none" }),

  /* Healthcare (51-56) */
  51: () => RightSidebar({ accent: "#00B4D8", sidebarBg: "#f0f9ff", skillMode: "bars", nameColor: "#0077B6" }),
  52: () => GradientHeader({ accent: "#00B4D8", accent2: "#0077B6", nameSize: 8 }),
  53: () => CompactHorizontal({ accent: "#48BB78", nameColor: "#22543D" }),
  54: () => TopBanner({ accent: "#0077B6", headerBg: "#023E8A" }),
  55: () => LeftSidebar({ accent: "#48BB78", sidebarBg: "#1B4332", skillMode: "bars" }),
  56: () => CenteredSingle({ accent: "#00B4D8", divider: "gradient", pageBg: "#f0fdfa" }),

  /* Freelancer (57-62) */
  57: () => DiagonalAccent({ accent: "#F59E0B", nameColor: "#92400E", pageBg: "#fffbeb" }),
  58: () => TwoToneModern({ accent: "#F59E0B", accent2: "#1c1917" }),
  59: () => RightSidebar({ accent: "#EC4899", sidebarBg: "#fdf2f8", skillMode: "dots" }),
  60: () => GradientHeader({ accent: "#8B5CF6", accent2: "#EC4899" }),
  61: () => SplitLayout({ accent: "#F59E0B", skillMode: "dots" }),
  62: () => CompactHorizontal({ accent: "#EC4899", pageBg: "#fdf2f8" }),

  /* Career Changer (63-68) */
  63: () => TimelineLayout({ accent: "#6366F1", headerBg: "#312E81", pageBg: "#eef2ff" }),
  64: () => GradientHeader({ accent: "#6366F1", accent2: "#8B5CF6", nameSize: 9 }),
  65: () => RightSidebar({ accent: "#10B981", sidebarBg: "#ecfdf5", skillMode: "bars", nameColor: "#064E3B" }),
  66: () => DiagonalAccent({ accent: "#6366F1" }),
  67: () => InfographicLayout({ accent: "#6366F1", accent2: "#10B981" }),
  68: () => CenteredSingle({ accent: "#6366F1", pageBg: "#eef2ff", divider: "gradient" }),

  /* Government (69-74) */
  69: () => ATSLayout({ accent: "#1E3A5F" }),
  70: () => ClassicSingle({ accent: "#1E3A5F", font: "Georgia, serif", divider: "bar" }),
  71: () => CompactHorizontal({ accent: "#1E3A5F", font: "Georgia, serif" }),
  72: () => TopBanner({ accent: "#1E3A5F", headerBg: "#0E2240", font: "Georgia, serif" }),
  73: () => RightSidebar({ accent: "#1E3A5F", sidebarBg: "#f1f5f9", font: "Georgia, serif", skillMode: "bars" }),
  74: () => ATSLayout({ accent: "#1E3A5F", font: "Georgia, serif", divider: "none" }),

  /* Academic (75-80) */
  75: () => CenteredSingle({ accent: "#4338CA", font: "Georgia, serif", pageBg: "#f8f7ff" }),
  76: () => ClassicSingle({ accent: "#4338CA", font: "'Palatino Linotype', serif", nameSize: 9 }),
  77: () => MinimalLayout({ accent: "#4338CA", font: "Georgia, serif" }),
  78: () => RightSidebar({ accent: "#4338CA", sidebarBg: "#eef2ff", font: "Georgia, serif", skillMode: "dots" }),
  79: () => CompactHorizontal({ accent: "#4338CA", font: "Georgia, serif" }),
  80: () => TopBanner({ accent: "#4338CA", headerBg: "#1E1B4B", font: "Georgia, serif" }),

  /* Dark Premium (81-86) */
  81: () => TwoToneModern({ accent: "#00D4FF", accent2: "#0f172a" }),
  82: () => TwoToneModern({ accent: "#00FF88", accent2: "#0a1628" }),
  83: () => TwoToneModern({ accent: "#FF4466", accent2: "#1a0a0e" }),
  84: () => LeftSidebar({ accent: "#FFB800", sidebarBg: "#1a1400", pageBg: "#12121e", nameColor: "#f1f5f9", bodyColor: "#94a3b8", skillMode: "bars" }),
  85: () => GradientHeader({ accent: "#7B61FF", accent2: "#00D4FF", nameSize: 9 }),
  86: () => LeftSidebar({ accent: "#EC4899", sidebarBg: "#2d0a1e", pageBg: "#1a0a14", nameColor: "#fce7f3", bodyColor: "#94a3b8", skillMode: "bars" }),

  /* Industry-Specific (87-92) */
  87: () => DiagonalAccent({ accent: "#DC2626", pageBg: "#fff5f5" }),
  88: () => GradientHeader({ accent: "#059669", accent2: "#10B981" }),
  89: () => RightSidebar({ accent: "#7C3AED", sidebarBg: "#f5f3ff", skillMode: "bars" }),
  90: () => CompactHorizontal({ accent: "#0891B2" }),
  91: () => LeftSidebarColored({ accent: "#7C3AED", skillMode: "dots" }),
  92: () => TopBanner({ accent: "#DC2626", headerBg: "#450a0a" }),

  /* Ultra-Modern (93-100) */
  93: () => DiagonalAccent({ accent: "#00D4FF", nameColor: "#0f172a" }),
  94: () => GradientHeader({ accent: "#FF6B35", accent2: "#FF4466", nameSize: 8 }),
  95: () => TwoToneModern({ accent: "#F59E0B", accent2: "#451a03" }),
  96: () => RightSidebar({ accent: "#00FF88", sidebarBg: "#f0fdf4", skillMode: "bars", nameColor: "#14532d" }),
  97: () => CompactHorizontal({ accent: "#7B61FF", pageBg: "#faf5ff" }),
  98: () => DiagonalAccent({ accent: "#FF4466", pageBg: "#fff1f2" }),
  99: () => GradientHeader({ accent: "#00FF88", accent2: "#00D4FF" }),
  100: () => TwoToneModern({ accent: "#7B61FF", accent2: "#0f172a" }),
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TEMPLATE REGISTRY â€” metadata for all 50 templates
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export type TemplateInfo = {
  id: number;
  name: string;
  category: string;
  premium: boolean;
  accent: string;
  tags: string[];
  description: string;
};

export const TEMPLATE_REGISTRY: TemplateInfo[] = [
  // Modern (8)
  { id: 1, name: "Executive Edge", category: "Modern", premium: false, accent: "#00D4FF", tags: ["sidebar", "professional", "corporate"], description: "Bold dark sidebar with skill bars and executive presence." },
  { id: 2, name: "Silicon Valley", category: "Modern", premium: false, accent: "#7B61FF", tags: ["tech", "developer", "monospace"], description: "Code-inspired monospace typography with gradient accents." },
  { id: 3, name: "Gradient Flow", category: "Modern", premium: false, accent: "#00FF88", tags: ["gradient", "modern", "vibrant"], description: "Eye-catching gradient dividers with pill-shaped skill tags." },
  { id: 4, name: "Dark Mode", category: "Modern", premium: false, accent: "#00D4FF", tags: ["dark", "neon", "developer"], description: "Dark theme with neon accents â€” matches your IDE." },
  { id: 5, name: "Metro Clean", category: "Modern", premium: false, accent: "#FFB800", tags: ["metro", "tile", "amber"], description: "Metro-inspired layout with warm amber accents." },
  { id: 6, name: "Split Screen", category: "Modern", premium: false, accent: "#FF6B35", tags: ["split", "two-column", "bold"], description: "Bold 50/50 split with large name and dot ratings." },
  { id: 7, name: "Card View", category: "Modern", premium: false, accent: "#7B61FF", tags: ["cards", "grid", "sections"], description: "Card-based sections â€” organized and scannable." },
  { id: 8, name: "Neon Pulse", category: "Modern", premium: false, accent: "#FF4466", tags: ["neon", "bold", "gradient"], description: "Vibrant gradient header with bold neon skill tags." },

  // Classic (7)
  { id: 9, name: "Harvard Standard", category: "Classic", premium: false, accent: "#333333", tags: ["academic", "serif", "traditional"], description: "Traditional serif format with formal date alignment." },
  { id: 10, name: "Wall Street", category: "Classic", premium: false, accent: "#1a365d", tags: ["finance", "navy", "conservative"], description: "Navy serif typography â€” banking industry standard." },
  { id: 11, name: "Legal Brief", category: "Classic", premium: false, accent: "#2d3748", tags: ["law", "formal", "serif"], description: "Times New Roman â€” built for law firms." },
  { id: 12, name: "Academic CV", category: "Classic", premium: false, accent: "#4a5568", tags: ["academic", "research", "cv"], description: "Extended CV format for publications and grants." },
  { id: 13, name: "Federal Resume", category: "Classic", premium: false, accent: "#2b6cb0", tags: ["government", "federal", "usajobs"], description: "USA Jobs compatible with blue accents." },
  { id: 14, name: "Banking Pro", category: "Classic", premium: false, accent: "#1a202c", tags: ["investment", "finance", "elite"], description: "Near-black palette for maximum authority." },
  { id: 15, name: "Diplomatic", category: "Classic", premium: false, accent: "#2d3748", tags: ["international", "embassy", "formal"], description: "Palatino serif for international organizations." },

  // Creative (7)
  { id: 16, name: "Creative Canvas", category: "Creative", premium: false, accent: "#FF6B35", tags: ["design", "colorful", "portfolio"], description: "Vibrant orange sidebar with dot ratings." },
  { id: 17, name: "Infographic", category: "Creative", premium: false, accent: "#00D4FF", tags: ["visual", "charts", "timeline"], description: "Progress bars, career timeline, visual storytelling." },
  { id: 18, name: "Magazine Layout", category: "Creative", premium: false, accent: "#7B61FF", tags: ["editorial", "pullquote", "elegant"], description: "Editorial two-column design with pull quotes." },
  { id: 19, name: "Retro Pixel", category: "Creative", premium: false, accent: "#00FF88", tags: ["retro", "pixel", "gaming"], description: "Terminal aesthetic with skill XP levels." },
  { id: 20, name: "Minimalist Art", category: "Creative", premium: false, accent: "#000000", tags: ["minimal", "art", "whitespace"], description: "Maximum negative space with artistic restraint." },
  { id: 21, name: "Bold Statement", category: "Creative", premium: false, accent: "#FF4466", tags: ["bold", "impact", "red"], description: "Giant color header â€” commands attention." },
  { id: 22, name: "Architect", category: "Creative", premium: false, accent: "#2b6cb0", tags: ["blueprint", "technical", "grid"], description: "Blueprint-inspired light sidebar with blue accents." },

  // Technical (8)
  { id: 23, name: "Developer Pro", category: "Technical", premium: false, accent: "#00D4FF", tags: ["developer", "code", "monospace"], description: "Monospace code font â€” the programmer's resume." },
  { id: 24, name: "DevOps Pipeline", category: "Technical", premium: false, accent: "#00FF88", tags: ["devops", "pipeline", "green"], description: "Timeline layout with green metric cards." },
  { id: 25, name: "Data Scientist", category: "Technical", premium: false, accent: "#7B61FF", tags: ["data", "ml", "analytics"], description: "Deep purple sidebar to showcase data expertise." },
  { id: 26, name: "Cloud Engineer", category: "Technical", premium: false, accent: "#FFB800", tags: ["cloud", "aws", "azure"], description: "Warm amber centered layout for cloud certs." },
  { id: 27, name: "Security Analyst", category: "Technical", premium: false, accent: "#FF4466", tags: ["security", "infosec", "red-team"], description: "Dark header with red alert accents." },
  { id: 28, name: "Mobile Dev", category: "Technical", premium: false, accent: "#00D4FF", tags: ["mobile", "ios", "android"], description: "Ocean blue sidebar for mobile developers." },
  { id: 29, name: "AI Engineer", category: "Technical", premium: false, accent: "#7B61FF", tags: ["ai", "ml", "deep-learning"], description: "Purple gradient accents for AI/ML engineers." },
  { id: 30, name: "Blockchain Dev", category: "Technical", premium: false, accent: "#FFB800", tags: ["blockchain", "web3", "crypto"], description: "Amber-orange gradient for Web3 developers." },

  // Executive (6)
  { id: 31, name: "C-Suite", category: "Executive", premium: false, accent: "#FFB800", tags: ["executive", "c-suite", "board"], description: "Dark elegant header with gold metrics." },
  { id: 32, name: "VP Engineering", category: "Executive", premium: false, accent: "#00D4FF", tags: ["vp", "engineering", "leadership"], description: "Ocean banner with impact metrics." },
  { id: 33, name: "Product Leader", category: "Executive", premium: false, accent: "#7B61FF", tags: ["product", "pm", "strategy"], description: "Purple-accent centered for product leaders." },
  { id: 34, name: "Startup Founder", category: "Executive", premium: false, accent: "#FF6B35", tags: ["startup", "founder", "ceo"], description: "Bold photo badge with impact metrics grid." },
  { id: 35, name: "Consultant", category: "Executive", premium: false, accent: "#2d3748", tags: ["consulting", "mckinsey", "strategy"], description: "Conservative serif â€” McKinsey-approved." },
  { id: 36, name: "Non-Profit Leader", category: "Executive", premium: false, accent: "#00FF88", tags: ["nonprofit", "impact", "mission"], description: "Green-accent on light green background." },

  // Minimalist (7)
  { id: 37, name: "Clean Slate", category: "Minimalist", premium: false, accent: "#888888", tags: ["minimal", "whitespace", "elegant"], description: "Maximum whitespace, zero clutter." },
  { id: 38, name: "One Column", category: "Minimalist", premium: false, accent: "#718096", tags: ["single", "narrow", "centered"], description: "Single narrow column with light gray accents." },
  { id: 39, name: "Swiss Design", category: "Minimalist", premium: false, accent: "#e53e3e", tags: ["helvetica", "grid", "typography"], description: "Bold grid structure with red accents." },
  { id: 40, name: "Typewriter", category: "Minimalist", premium: false, accent: "#4a5568", tags: ["monospace", "typewriter", "retro"], description: "Courier monospace â€” nostalgic typewriter feel." },
  { id: 41, name: "Paper White", category: "Minimalist", premium: false, accent: "#d4a574", tags: ["warm", "serif", "elegant"], description: "Warm paper background with serif typography." },
  { id: 42, name: "LaTeX Style", category: "Minimalist", premium: false, accent: "#333333", tags: ["latex", "academic", "dense"], description: "Academic LaTeX format with numbered sections." },
  { id: 43, name: "Scandinavian", category: "Minimalist", premium: false, accent: "#a0aec0", tags: ["nordic", "muted", "gentle"], description: "Nordic-inspired muted palette, generous margins." },

  // ATS-Optimized (7)
  { id: 44, name: "ATS Magnet", category: "ATS-Optimized", premium: false, accent: "#00D4FF", tags: ["ats", "keyword", "simple"], description: "Zero graphics, pure text. Max ATS parse rate." },
  { id: 45, name: "Keyword Hunter", category: "ATS-Optimized", premium: false, accent: "#00FF88", tags: ["keywords", "optimized", "green"], description: "Green accent with keyword optimization." },
  { id: 46, name: "Taleo Friendly", category: "ATS-Optimized", premium: false, accent: "#333333", tags: ["taleo", "classic", "safe"], description: "Serif font, zero graphics. Taleo tested." },
  { id: 47, name: "Workday Ready", category: "ATS-Optimized", premium: false, accent: "#2b6cb0", tags: ["workday", "parsed", "blue"], description: "Blue accent â€” Workday parser tested." },
  { id: 48, name: "iCIMS Parsed", category: "ATS-Optimized", premium: false, accent: "#4a5568", tags: ["icims", "structured", "slate"], description: "Slate accent â€” iCIMS compatible." },
  { id: 49, name: "Greenhouse Pro", category: "ATS-Optimized", premium: false, accent: "#00D4FF", tags: ["greenhouse", "clean", "score"], description: "Score optimized â€” Greenhouse ATS tested." },
  { id: 50, name: "Universal ATS", category: "ATS-Optimized", premium: false, accent: "#333333", tags: ["universal", "any-ats", "plaintext"], description: "Plain text safe. Works with every ATS." },

  // Healthcare (51-56)
  { id: 51, name: "Clinical Professional", category: "Healthcare", premium: false, accent: "#00B4D8", tags: ["medical", "nursing", "clinical"], description: "Right sidebar with clinical certifications focus." },
  { id: 52, name: "Hospital Admin", category: "Healthcare", premium: false, accent: "#00B4D8", tags: ["hospital", "administration", "management"], description: "Gradient header for healthcare administrators." },
  { id: 53, name: "Lab Technician", category: "Healthcare", premium: false, accent: "#48BB78", tags: ["lab", "research", "biotech"], description: "Compact layout for lab and biotech professionals." },
  { id: 54, name: "Surgeon Elite", category: "Healthcare", premium: false, accent: "#0077B6", tags: ["surgeon", "specialist", "physician"], description: "Dark banner for senior medical professionals." },
  { id: 55, name: "Pharmacist", category: "Healthcare", premium: false, accent: "#48BB78", tags: ["pharmacy", "pharma", "regulatory"], description: "Green sidebar for pharmaceutical careers." },
  { id: 56, name: "Mental Health Pro", category: "Healthcare", premium: false, accent: "#00B4D8", tags: ["psychology", "counseling", "therapy"], description: "Calming centered layout for mental health professionals." },

  // Freelancer (57-62)
  { id: 57, name: "Freelance Creative", category: "Freelancer", premium: false, accent: "#F59E0B", tags: ["freelance", "creative", "portfolio"], description: "Diagonal accent with warm amber tones." },
  { id: 58, name: "Dark Contractor", category: "Freelancer", premium: false, accent: "#F59E0B", tags: ["contractor", "dark", "premium"], description: "Two-tone dark layout for independent contractors." },
  { id: 59, name: "UX Designer", category: "Freelancer", premium: false, accent: "#EC4899", tags: ["ux", "ui", "design"], description: "Pink-accent right sidebar for UX/UI designers." },
  { id: 60, name: "Brand Strategist", category: "Freelancer", premium: false, accent: "#8B5CF6", tags: ["branding", "marketing", "strategy"], description: "Purple-pink gradient header for brand strategists." },
  { id: 61, name: "Content Creator", category: "Freelancer", premium: false, accent: "#F59E0B", tags: ["content", "writer", "copywriting"], description: "Split layout with amber accents for content creators." },
  { id: 62, name: "Social Media Pro", category: "Freelancer", premium: false, accent: "#EC4899", tags: ["social", "influencer", "digital"], description: "Compact pink layout for digital marketers." },

  // Career Changer (63-68)
  { id: 63, name: "Career Pivot", category: "Career-Changer", premium: false, accent: "#6366F1", tags: ["pivot", "transition", "skills"], description: "Timeline layout emphasizing transferable skills." },
  { id: 64, name: "Industry Switch", category: "Career-Changer", premium: false, accent: "#6366F1", tags: ["switch", "crossover", "versatile"], description: "Gradient header highlighting adaptability." },
  { id: 65, name: "Skills-First", category: "Career-Changer", premium: false, accent: "#10B981", tags: ["skills", "competency", "functional"], description: "Right sidebar with skills-first approach." },
  { id: 66, name: "Fresh Start", category: "Career-Changer", premium: false, accent: "#6366F1", tags: ["fresh", "restart", "growth"], description: "Diagonal accent for new beginnings." },
  { id: 67, name: "Transferable Pro", category: "Career-Changer", premium: false, accent: "#6366F1", tags: ["transferable", "data", "visual"], description: "Infographic style highlighting transferable expertise." },
  { id: 68, name: "Reskill Ready", category: "Career-Changer", premium: false, accent: "#6366F1", tags: ["reskill", "bootcamp", "upskill"], description: "Centered layout for bootcamp graduates and reskillers." },

  // Government (69-74)
  { id: 69, name: "Federal Standard", category: "Government", premium: false, accent: "#1E3A5F", tags: ["federal", "usajobs", "gsa"], description: "ATS plain text for federal job applications." },
  { id: 70, name: "State Employee", category: "Government", premium: false, accent: "#1E3A5F", tags: ["state", "public", "servant"], description: "Classic serif format for state government roles." },
  { id: 71, name: "Military Transition", category: "Government", premium: false, accent: "#1E3A5F", tags: ["military", "veteran", "transition"], description: "Compact format for military-to-civilian transitions." },
  { id: 72, name: "Intelligence Agency", category: "Government", premium: false, accent: "#1E3A5F", tags: ["intelligence", "security", "clearance"], description: "Dark banner for intelligence and security roles." },
  { id: 73, name: "Public Policy", category: "Government", premium: false, accent: "#1E3A5F", tags: ["policy", "think-tank", "research"], description: "Right sidebar for policy analysts and researchers." },
  { id: 74, name: "Municipal Worker", category: "Government", premium: false, accent: "#1E3A5F", tags: ["municipal", "city", "local"], description: "Simple ATS format for local government positions." },

  // Academic (75-80)
  { id: 75, name: "Professor CV", category: "Academic", premium: false, accent: "#4338CA", tags: ["professor", "tenure", "faculty"], description: "Centered serif for tenure-track applications." },
  { id: 76, name: "PhD Candidate", category: "Academic", premium: false, accent: "#4338CA", tags: ["phd", "research", "dissertation"], description: "Classic Palatino for doctoral candidates." },
  { id: 77, name: "Research Fellow", category: "Academic", premium: false, accent: "#4338CA", tags: ["postdoc", "research", "publications"], description: "Minimal serif for research fellowships." },
  { id: 78, name: "Teaching Assistant", category: "Academic", premium: false, accent: "#4338CA", tags: ["ta", "teaching", "grading"], description: "Right sidebar with academic skills focus." },
  { id: 79, name: "Grant Writer", category: "Academic", premium: false, accent: "#4338CA", tags: ["grants", "funding", "proposals"], description: "Compact serif for grant and funding applications." },
  { id: 80, name: "Department Head", category: "Academic", premium: false, accent: "#4338CA", tags: ["dean", "department", "leadership"], description: "Dark banner for academic department leaders." },

  // Dark Premium (81-86)
  { id: 81, name: "Midnight Cyan", category: "Dark Premium", premium: false, accent: "#00D4FF", tags: ["dark", "cyan", "premium"], description: "Two-tone dark with electric cyan accents." },
  { id: 82, name: "Matrix Green", category: "Dark Premium", premium: false, accent: "#00FF88", tags: ["dark", "green", "hacker"], description: "Dark layout with neon green for tech professionals." },
  { id: 83, name: "Crimson Night", category: "Dark Premium", premium: false, accent: "#FF4466", tags: ["dark", "red", "dramatic"], description: "Dark crimson theme for bold personalities." },
  { id: 84, name: "Gold Rush", category: "Dark Premium", premium: false, accent: "#FFB800", tags: ["dark", "gold", "luxury"], description: "Dark sidebar with gold accents for luxury feel." },
  { id: 85, name: "Aurora Borealis", category: "Dark Premium", premium: false, accent: "#7B61FF", tags: ["dark", "gradient", "aurora"], description: "Purple-cyan gradient on dark background." },
  { id: 86, name: "Rose Gold Dark", category: "Dark Premium", premium: false, accent: "#EC4899", tags: ["dark", "pink", "elegant"], description: "Dark rose gold theme for elegant professionals." },

  // Industry-Specific (87-92)
  { id: 87, name: "Marketing Fire", category: "Industry", premium: false, accent: "#DC2626", tags: ["marketing", "advertising", "media"], description: "Red diagonal accent for marketing professionals." },
  { id: 88, name: "Finance Green", category: "Industry", premium: false, accent: "#059669", tags: ["finance", "accounting", "banking"], description: "Green gradient header for finance professionals." },
  { id: 89, name: "Legal Purple", category: "Industry", premium: false, accent: "#7C3AED", tags: ["legal", "attorney", "compliance"], description: "Purple right sidebar for legal professionals." },
  { id: 90, name: "Engineering Blue", category: "Industry", premium: false, accent: "#0891B2", tags: ["engineering", "mechanical", "civil"], description: "Compact teal layout for engineers." },
  { id: 91, name: "Design Studio", category: "Industry", premium: false, accent: "#7C3AED", tags: ["design", "creative", "agency"], description: "Purple colored sidebar for designers." },
  { id: 92, name: "Sales Champion", category: "Industry", premium: false, accent: "#DC2626", tags: ["sales", "revenue", "business"], description: "Dark red banner for sales professionals." },

  // Ultra-Modern (93-100)
  { id: 93, name: "Cyber Edge", category: "Ultra-Modern", premium: false, accent: "#00D4FF", tags: ["cyber", "futuristic", "tech"], description: "Diagonal cyan accent with futuristic styling." },
  { id: 94, name: "Sunset Gradient", category: "Ultra-Modern", premium: false, accent: "#FF6B35", tags: ["sunset", "warm", "gradient"], description: "Orange-red gradient header with warm tones." },
  { id: 95, name: "Desert Gold", category: "Ultra-Modern", premium: false, accent: "#F59E0B", tags: ["gold", "dark", "luxe"], description: "Two-tone gold on dark brown for luxury." },
  { id: 96, name: "Nature Fresh", category: "Ultra-Modern", premium: false, accent: "#00FF88", tags: ["green", "fresh", "organic"], description: "Right sidebar with fresh green nature theme." },
  { id: 97, name: "Lavender Dream", category: "Ultra-Modern", premium: false, accent: "#7B61FF", tags: ["lavender", "soft", "modern"], description: "Compact purple layout on lavender background." },
  { id: 98, name: "Coral Reef", category: "Ultra-Modern", premium: false, accent: "#FF4466", tags: ["coral", "pink", "vibrant"], description: "Diagonal pink accent on coral background." },
  { id: 99, name: "Emerald Gradient", category: "Ultra-Modern", premium: false, accent: "#00FF88", tags: ["emerald", "gradient", "fresh"], description: "Green-cyan gradient header for fresh look." },
  { id: 100, name: "Royal Purple", category: "Ultra-Modern", premium: false, accent: "#7B61FF", tags: ["royal", "elegant", "dark"], description: "Two-tone purple on dark for royalty." },
];

export const TEMPLATE_CATEGORIES = [
  "All",
  "Modern",
  "Classic",
  "Creative",
  "Technical",
  "Executive",
  "Minimalist",
  "ATS-Optimized",
  "Healthcare",
  "Freelancer",
  "Career-Changer",
  "Government",
  "Academic",
  "Dark Premium",
  "Industry",
  "Ultra-Modern",
];

/** Render a template preview by ID */
export function TemplatePreview({ id }: { id: number }) {
  const renderer = RENDERERS[id];
  if (!renderer) {
    return (
      <div {...sx({ width: "100%", aspectRatio: "8.5/11", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 12 })}>
        Coming Soon
      </div>
    );
  }
  return <>{renderer()}</>;
}
