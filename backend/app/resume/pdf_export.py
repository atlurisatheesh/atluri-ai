"""
ARIA PDF Export Engine — Server-Side PDF Generation.

Uses WeasyPrint (HTML→PDF) for high-quality, ATS-friendly PDF export.
Falls back to basic HTML string if WeasyPrint is not installed.
"""

import io
import json
import logging
from typing import Any

logger = logging.getLogger("aria.pdf_export")


def _build_html(resume: dict, style: str = "classic") -> str:
    """Build a complete HTML document from a structured resume JSON."""
    header = resume.get("header", {})
    summary = resume.get("summary", "")
    experience = resume.get("experience", [])
    skills = resume.get("skills", {})
    education = resume.get("education", [])
    certifications = resume.get("certifications", [])
    projects = resume.get("projects", [])
    # Extended sections
    awards = resume.get("awards", [])
    volunteer = resume.get("volunteer", [])
    publications = resume.get("publications", [])
    languages = resume.get("languages", [])
    board_affiliations = resume.get("board_affiliations", [])
    patents = resume.get("patents", [])
    speaking = resume.get("speaking", [])
    open_source = resume.get("open_source", [])

    # Style presets
    styles = {
        "classic": {"accent": "#2563EB", "font": "Georgia, serif", "bg": "#ffffff"},
        "modern": {"accent": "#6366F1", "font": "'Inter', sans-serif", "bg": "#ffffff"},
        "minimal": {"accent": "#94A3B8", "font": "'Inter', sans-serif", "bg": "#ffffff"},
        "executive": {"accent": "#1E293B", "font": "Georgia, serif", "bg": "#ffffff"},
        "tech": {"accent": "#10B981", "font": "'JetBrains Mono', monospace", "bg": "#ffffff"},
    }
    s = styles.get(style, styles["classic"])

    # Build skills HTML
    skills_html = ""
    if isinstance(skills, dict):
        for cat, items in skills.items():
            if isinstance(items, list) and items:
                cat_name = cat.replace("_", " ").title()
                skills_html += f'<div class="skill-cat"><strong>{cat_name}:</strong> {", ".join(items)}</div>'
    elif isinstance(skills, list):
        skills_html = f'<div class="skill-cat">{", ".join(skills)}</div>'

    # Build experience HTML
    exp_html = ""
    for e in experience:
        bullets = "".join(f"<li>{b}</li>" for b in e.get("bullets", []))
        exp_html += f"""
        <div class="exp-entry">
            <div class="exp-header">
                <div><strong>{e.get('title', '')}</strong> — {e.get('company', '')}</div>
                <div class="exp-dates">{e.get('dates', '')} | {e.get('location', '')}</div>
            </div>
            <ul>{bullets}</ul>
        </div>"""

    # Build education HTML
    edu_html = ""
    for e in education:
        honors = f" — {e['honors']}" if e.get("honors") else ""
        edu_html += f'<div class="edu-entry"><strong>{e.get("degree", "")}</strong>{honors}<br>{e.get("school", "")} | {e.get("year", "")}</div>'

    # Build certifications HTML
    cert_html = ", ".join(certifications) if certifications else ""

    # Build projects HTML
    proj_html = ""
    for p in projects:
        tech = p.get("tech", [])
        tech_str = ", ".join(tech) if isinstance(tech, list) else str(tech)
        proj_html += f'<div class="proj-entry"><strong>{p.get("name", "")}</strong> — {p.get("description", "")} <em>({tech_str})</em></div>'

    # Extended sections
    extra_sections = ""

    if awards:
        items = "".join(f"<li>{a if isinstance(a, str) else a.get('name', '')}</li>" for a in awards)
        extra_sections += f'<div class="section"><h2>Awards & Honors</h2><ul>{items}</ul></div>'

    if volunteer:
        items = ""
        for v in volunteer:
            if isinstance(v, str):
                items += f"<li>{v}</li>"
            else:
                items += f"<li><strong>{v.get('role', '')}</strong> — {v.get('organization', '')} ({v.get('dates', '')})</li>"
        extra_sections += f'<div class="section"><h2>Volunteer Experience</h2><ul>{items}</ul></div>'

    if publications:
        items = "".join(f"<li>{p if isinstance(p, str) else p.get('title', '')}</li>" for p in publications)
        extra_sections += f'<div class="section"><h2>Publications</h2><ul>{items}</ul></div>'

    if languages:
        items = ""
        for l in languages:
            if isinstance(l, str):
                items += f"<span class='lang-tag'>{l}</span> "
            else:
                items += f"<span class='lang-tag'>{l.get('language', '')} ({l.get('proficiency', '')})</span> "
        extra_sections += f'<div class="section"><h2>Languages</h2><div>{items}</div></div>'

    if board_affiliations:
        items = "".join(f"<li>{b if isinstance(b, str) else b.get('title', '') + ' — ' + b.get('organization', '')}</li>" for b in board_affiliations)
        extra_sections += f'<div class="section"><h2>Board Affiliations</h2><ul>{items}</ul></div>'

    if patents:
        items = "".join(f"<li>{p if isinstance(p, str) else p.get('title', '')}</li>" for p in patents)
        extra_sections += f'<div class="section"><h2>Patents</h2><ul>{items}</ul></div>'

    if speaking:
        items = "".join(f"<li>{s if isinstance(s, str) else s.get('title', '') + ' — ' + s.get('event', '')}</li>" for s in speaking)
        extra_sections += f'<div class="section"><h2>Speaking Engagements</h2><ul>{items}</ul></div>'

    if open_source:
        items = ""
        for o in open_source:
            if isinstance(o, str):
                items += f"<li>{o}</li>"
            else:
                items += f"<li><strong>{o.get('project', '')}</strong> — {o.get('description', '')} ({o.get('role', 'contributor')})</li>"
        extra_sections += f'<div class="section"><h2>Open Source</h2><ul>{items}</ul></div>'

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{ margin: 0.6in; size: letter; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: {s['font']}; font-size: 11pt; line-height: 1.4; color: #1a1a1a; background: {s['bg']}; }}
  .header {{ text-align: left; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid {s['accent']}; }}
  .header h1 {{ font-size: 22pt; color: #111; margin-bottom: 2px; }}
  .header .headline {{ font-size: 11pt; color: {s['accent']}; margin-bottom: 6px; }}
  .header .contact {{ font-size: 9pt; color: #555; }}
  .header .contact a {{ color: {s['accent']}; text-decoration: none; }}
  .section {{ margin-bottom: 14px; }}
  .section h2 {{ font-size: 12pt; color: {s['accent']}; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 8px; }}
  .summary {{ font-size: 10.5pt; color: #333; line-height: 1.5; margin-bottom: 14px; }}
  .exp-entry {{ margin-bottom: 12px; }}
  .exp-header {{ display: flex; justify-content: space-between; margin-bottom: 4px; }}
  .exp-dates {{ font-size: 9.5pt; color: #666; text-align: right; }}
  ul {{ padding-left: 18px; }}
  li {{ font-size: 10.5pt; margin-bottom: 3px; line-height: 1.4; }}
  .skill-cat {{ font-size: 10.5pt; margin-bottom: 4px; }}
  .edu-entry {{ margin-bottom: 6px; font-size: 10.5pt; }}
  .proj-entry {{ margin-bottom: 6px; font-size: 10.5pt; }}
  .lang-tag {{ display: inline-block; padding: 2px 8px; background: #f0f0f0; border-radius: 4px; font-size: 9.5pt; margin: 2px; }}
</style>
</head>
<body>

<div class="header">
  <h1>{header.get('name', '')}</h1>
  <div class="headline">{header.get('headline', '')}</div>
  <div class="contact">
    {header.get('email', '')} · {header.get('phone', '')} · {header.get('location', '')}
    {f' · <a href="https://{header["linkedin"]}">{header["linkedin"]}</a>' if header.get('linkedin') else ''}
    {f' · <a href="{header["github"]}">{header["github"]}</a>' if header.get('github') else ''}
    {f' · <a href="{header["portfolio"]}">{header["portfolio"]}</a>' if header.get('portfolio') else ''}
  </div>
</div>

{'<div class="section"><h2>Summary</h2><div class="summary">' + summary + '</div></div>' if summary else ''}

{'<div class="section"><h2>Experience</h2>' + exp_html + '</div>' if exp_html else ''}

{'<div class="section"><h2>Skills</h2>' + skills_html + '</div>' if skills_html else ''}

{'<div class="section"><h2>Education</h2>' + edu_html + '</div>' if edu_html else ''}

{'<div class="section"><h2>Certifications</h2><div class="skill-cat">' + cert_html + '</div></div>' if cert_html else ''}

{'<div class="section"><h2>Projects</h2>' + proj_html + '</div>' if proj_html else ''}

{extra_sections}

</body>
</html>"""

    return html


def export_pdf_bytes(resume: dict, style: str = "classic") -> bytes:
    """Export a resume dict to PDF bytes. Returns PDF binary data."""
    html = _build_html(resume, style)

    try:
        from weasyprint import HTML as WeasyHTML
        pdf_bytes = WeasyHTML(string=html).write_pdf()
        return pdf_bytes
    except ImportError:
        logger.warning("WeasyPrint not installed — falling back to HTML bytes")
        return html.encode("utf-8")
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        return html.encode("utf-8")


def export_html(resume: dict, style: str = "classic") -> str:
    """Export a resume dict to HTML string."""
    return _build_html(resume, style)
