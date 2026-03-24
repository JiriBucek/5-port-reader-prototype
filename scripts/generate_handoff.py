#!/usr/bin/env python3

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import subprocess
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
CHANGELOG_PAGE = "changelog.html"
OVERVIEW_PAGE = "index.html"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate the Figma handoff HTML site.")
    parser.add_argument(
        "--manifest",
        default=str(ROOT_DIR / "handoff" / "manifest.json"),
        help="Path to the handoff manifest JSON file.",
    )
    parser.add_argument(
        "--output",
        default=str(ROOT_DIR / "handoff" / "index.html"),
        help="Path to the generated overview HTML file.",
    )
    parser.add_argument(
        "--screens-dir",
        default=str(ROOT_DIR / "handoff" / "screenshots"),
        help="Directory where screenshots should be written.",
    )
    parser.add_argument(
        "--version",
        default="",
        help="Optional version override shown in the generated site.",
    )
    parser.add_argument(
        "--skip-capture",
        action="store_true",
        help="Skip screenshot capture and only regenerate the HTML pages.",
    )
    return parser.parse_args()


def read_manifest(manifest_path: Path) -> dict:
    with manifest_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def run_capture(manifest_path: Path, screens_dir: Path) -> None:
    subprocess.run(
        [
            "node",
            str(ROOT_DIR / "scripts" / "capture_handoff.mjs"),
            "--manifest",
            str(manifest_path),
            "--output",
            str(screens_dir),
        ],
        cwd=ROOT_DIR,
        check=True,
    )


def format_created_at(now: dt.datetime) -> str:
    return now.strftime("%Y-%m-%d %H:%M")


def section_page_name(section: dict) -> str:
    return f"{section['id']}.html"


def total_state_count(sections: list[dict]) -> int:
    return sum(len(section.get("states", [])) for section in sections)


def render_build_block(version: str, created_at: str) -> str:
    return f"""
    <section class="meta-block build-block">
        <h3>Build</h3>
        <p><strong>Version:</strong> {html.escape(version)}</p>
        <p><strong>Created:</strong> {html.escape(created_at)}</p>
        <p><strong>Regenerate:</strong> <code>python3 scripts/generate_handoff.py</code></p>
    </section>
    """


def render_sidebar(manifest: dict, active_page: str, version: str, created_at: str) -> str:
    sections = manifest.get("sections", [])
    section_links = []
    for section in sections:
        href = section_page_name(section)
        active_class = " is-active" if active_page == href else ""
        section_links.append(
            f"""
            <a class="sidebar-link{active_class}" href="{html.escape(href)}">
                <span>{html.escape(section['title'])}</span>
                <strong>{len(section.get('states', []))}</strong>
            </a>
            """
        )

    overview_active = " is-active" if active_page == OVERVIEW_PAGE else ""
    changelog_active = " is-active" if active_page == CHANGELOG_PAGE else ""

    return f"""
    <aside class="sidebar">
        <div class="sidebar-main">
            <h1>{html.escape(manifest.get("title", "Figma Handoff Catalog"))}</h1>
            <p>{html.escape(manifest.get("subtitle", ""))}</p>

            <div class="sidebar-group">
                <span class="sidebar-label">Pages</span>
                <a class="sidebar-link{overview_active}" href="{OVERVIEW_PAGE}">
                    <span>Overview</span>
                </a>
                <a class="sidebar-link{changelog_active}" href="{CHANGELOG_PAGE}">
                    <span>Change Log</span>
                </a>
            </div>

            <div class="sidebar-group">
                <span class="sidebar-label">Sections</span>
                {''.join(section_links)}
            </div>
        </div>

        <div class="sidebar-meta">
            {render_build_block(version, created_at)}
        </div>
    </aside>
    """


def render_viewer_markup() -> str:
    return """
    <div class="viewer" id="viewer" hidden>
        <div class="viewer-backdrop" data-viewer-close="true"></div>
        <div class="viewer-dialog" role="dialog" aria-modal="true" aria-labelledby="viewer-title">
            <button class="viewer-close" id="viewer-close" aria-label="Close">Close</button>
            <div class="viewer-copy">
                <h2 id="viewer-title"></h2>
                <p id="viewer-description"></p>
            </div>
            <div class="viewer-image-wrap">
                <img id="viewer-image" alt="">
            </div>
        </div>
    </div>
    """


def render_viewer_script() -> str:
    return """
    <script>
        (function () {
            const viewer = document.getElementById('viewer');
            const viewerImage = document.getElementById('viewer-image');
            const viewerTitle = document.getElementById('viewer-title');
            const viewerDescription = document.getElementById('viewer-description');
            const closeBtn = document.getElementById('viewer-close');

            if (!viewer || !viewerImage || !viewerTitle || !viewerDescription || !closeBtn) return;

            function closeViewer() {
                viewer.hidden = true;
                viewer.classList.remove('is-open');
                viewerImage.removeAttribute('src');
                viewerImage.alt = '';
                viewerTitle.textContent = '';
                viewerDescription.textContent = '';
            }

            document.querySelectorAll('[data-viewer-src]').forEach(trigger => {
                trigger.addEventListener('click', () => {
                    viewerImage.src = trigger.dataset.viewerSrc || '';
                    viewerImage.alt = trigger.dataset.viewerTitle || '';
                    viewerTitle.textContent = trigger.dataset.viewerTitle || '';
                    viewerDescription.textContent = trigger.dataset.viewerDescription || '';
                    viewer.hidden = false;
                    viewer.classList.add('is-open');
                });
            });

            closeBtn.addEventListener('click', closeViewer);
            viewer.addEventListener('click', event => {
                if (event.target instanceof HTMLElement && event.target.dataset.viewerClose === 'true') {
                    closeViewer();
                }
            });

            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && !viewer.hidden) {
                    closeViewer();
                }
            });
        })();
    </script>
    """


def render_state_card(state: dict, screens_dir_name: str = "screenshots") -> str:
    image_name = f"{state['id']}.png"
    image_src = f"{screens_dir_name}/{image_name}"
    image_path = ROOT_DIR / "handoff" / screens_dir_name / image_name

    if image_path.exists():
        preview = f"""
        <button
            class="shot-open"
            type="button"
            data-viewer-src="{html.escape(image_src)}"
            data-viewer-title="{html.escape(state['title'])}"
            data-viewer-description="{html.escape(state['description'])}"
        >
            <img loading="lazy" src="{html.escape(image_src)}" alt="{html.escape(state['title'])}">
            <span class="shot-open-hint">Open full size</span>
        </button>
        """
    else:
        preview = "<div class=\"shot-missing\">Screenshot missing</div>"

    return f"""
    <article class="state-card" id="state-{html.escape(state['id'])}">
        <div class="shot-frame">
            {preview}
        </div>
        <div class="state-copy">
            <div class="state-meta">
                <span class="state-tag">{html.escape(state.get('capture', 'screen').title())}</span>
                <span class="state-tag is-muted">{html.escape(state['preset'])}</span>
            </div>
            <h3>{html.escape(state['title'])}</h3>
            <p>{html.escape(state['description'])}</p>
        </div>
    </article>
    """


def render_section_cards(section: dict) -> str:
    return "".join(render_state_card(state) for state in section.get("states", []))


def render_section_header(kicker: str, title: str, summary: str, count_label: str = "") -> str:
    count_markup = f"<span class=\"section-count\">{html.escape(count_label)}</span>" if count_label else ""
    return f"""
    <header class="page-header">
        <div>
            <span class="section-kicker">{html.escape(kicker)}</span>
            <h2>{html.escape(title)}</h2>
            <p class="section-summary">{html.escape(summary)}</p>
        </div>
        {count_markup}
    </header>
    """


def render_overview_page(manifest: dict) -> str:
    overview = manifest.get("overview", {})
    blocks = []
    for block in overview.get("blocks", []):
        paragraphs = "".join(
            f"<p>{html.escape(paragraph)}</p>"
            for paragraph in block.get("body", [])
        )
        bullet_items = "".join(
            f"<li>{html.escape(item)}</li>"
            for item in block.get("bullets", [])
        )
        bullets = f"<ul class=\"overview-list\">{bullet_items}</ul>" if bullet_items else ""
        blocks.append(
            f"""
            <section class="overview-card">
                <h3>{html.escape(block.get('title', ''))}</h3>
                <div class="overview-copy">
                    {paragraphs}
                    {bullets}
                </div>
            </section>
            """
        )

    return f"""
    {render_section_header(
        "Overview",
        "Device Overview",
        overview.get("intro", "")
    )}
    <div class="overview-grid">
        {''.join(blocks)}
    </div>
    """


def render_change_log_page(manifest: dict) -> str:
    entries = manifest.get("changeLog", [])
    if not entries:
        content = "<p class=\"empty-copy\">No change log entries yet.</p>"
    else:
        blocks = []
        for entry in entries:
            items = "".join(
                f"<li>{html.escape(item)}</li>"
                for item in entry.get("items", [])
            )
            blocks.append(
                f"""
                <section class="log-card">
                    <div class="state-meta">
                        <span class="state-tag">{html.escape(entry.get('date', ''))}</span>
                    </div>
                    <ul class="log-list">{items}</ul>
                </section>
                """
            )
        content = f"<div class=\"log-stack\">{''.join(blocks)}</div>"

    return f"""
    {render_section_header(
        "Meta",
        "Change Log",
        "Track what changed between handoff exports."
    )}
    {content}
    """


def render_section_page(section: dict) -> str:
    count = len(section.get("states", []))
    return f"""
    {render_section_header(
        "Section",
        section['title'],
        section.get('summary', ''),
        f"{count} states"
    )}
    <div class="state-grid">
        {render_section_cards(section)}
    </div>
    """


def build_document(manifest: dict, version: str, created_at: str, active_page: str, page_title: str, main_content: str) -> str:
    total_sections = len(manifest.get("sections", []))
    total_states = total_state_count(manifest.get("sections", []))

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html.escape(page_title)}</title>
    <style>
        :root {{
            --bg: #f3f5f8;
            --surface: #ffffff;
            --surface-2: #f8fafc;
            --surface-3: #eef4ff;
            --text: #0f172a;
            --muted: #475569;
            --line: #dbe2ea;
            --primary: #2563eb;
            --primary-soft: #dbeafe;
            --shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
            --radius: 16px;
        }}
        * {{
            box-sizing: border-box;
        }}
        html {{
            scroll-behavior: smooth;
        }}
        body {{
            margin: 0;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: var(--text);
            background: linear-gradient(180deg, #f8fafc 0%, var(--bg) 100%);
        }}
        a {{
            color: inherit;
            text-decoration: none;
        }}
        code {{
            font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 12px;
        }}
        .layout {{
            min-height: 100vh;
            display: grid;
            grid-template-columns: 300px minmax(0, 1fr);
        }}
        .sidebar {{
            position: sticky;
            top: 0;
            align-self: start;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 24px;
            padding: 24px 20px;
            border-right: 1px solid var(--line);
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(16px);
        }}
        .sidebar h1 {{
            margin: 0 0 8px;
            font-size: 22px;
            line-height: 1.1;
        }}
        .sidebar p {{
            margin: 0;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.5;
        }}
        .sidebar-group + .sidebar-group {{
            margin-top: 20px;
        }}
        .sidebar-label {{
            display: inline-block;
            margin-bottom: 10px;
            color: var(--muted);
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-weight: 700;
        }}
        .sidebar-links,
        .sidebar-group {{
            display: grid;
            gap: 8px;
        }}
        .sidebar-link {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 12px 14px;
            border-radius: 12px;
            background: var(--surface-2);
            border: 1px solid var(--line);
            font-size: 14px;
            color: var(--muted);
        }}
        .sidebar-link strong {{
            min-width: 28px;
            text-align: center;
            padding: 3px 8px;
            border-radius: 999px;
            background: var(--surface);
            color: var(--text);
            font-size: 12px;
        }}
        .sidebar-link.is-active {{
            background: var(--primary-soft);
            border-color: #bfdbfe;
            color: var(--primary);
            font-weight: 700;
        }}
        .sidebar-link.is-active strong {{
            background: #ffffff;
            color: var(--primary);
        }}
        .meta-block {{
            padding: 16px;
            border: 1px solid var(--line);
            border-radius: 14px;
            background: var(--surface);
            box-shadow: var(--shadow);
        }}
        .meta-block h3 {{
            margin: 0 0 10px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--muted);
        }}
        .meta-block p {{
            margin: 0;
        }}
        .meta-block p + p {{
            margin-top: 8px;
        }}
        .sidebar-meta::before {{
            content: "{total_sections} sections · {total_states} states";
            display: block;
            margin-bottom: 10px;
            color: var(--muted);
            font-size: 12px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            font-weight: 700;
        }}
        .content {{
            padding: 28px;
        }}
        .page-header {{
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 22px;
        }}
        .section-kicker {{
            display: inline-block;
            margin-bottom: 6px;
            color: var(--primary);
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-weight: 700;
        }}
        .page-header h2 {{
            margin: 0;
            font-size: 30px;
            line-height: 1.08;
        }}
        .section-summary {{
            margin: 10px 0 0;
            color: var(--muted);
            max-width: 820px;
            line-height: 1.55;
        }}
        .section-count {{
            padding: 8px 12px;
            border-radius: 999px;
            background: var(--surface);
            border: 1px solid var(--line);
            color: var(--muted);
            font-size: 13px;
            white-space: nowrap;
        }}
        .section-grid {{
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
        }}
        .overview-grid {{
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
        }}
        .section-card-link {{
            display: block;
        }}
        .section-card {{
            height: 100%;
            padding: 18px;
            border-radius: 18px;
            border: 1px solid var(--line);
            background: var(--surface);
            box-shadow: var(--shadow);
        }}
        .section-card h3 {{
            margin: 0 0 8px;
            font-size: 20px;
        }}
        .section-card p {{
            margin: 0;
            color: var(--muted);
            line-height: 1.5;
        }}
        .overview-card {{
            padding: 18px;
            border-radius: 18px;
            border: 1px solid var(--line);
            background: var(--surface);
            box-shadow: var(--shadow);
        }}
        .overview-card h3 {{
            margin: 0 0 10px;
            font-size: 20px;
            line-height: 1.15;
        }}
        .overview-copy {{
            display: grid;
            gap: 10px;
        }}
        .overview-copy p {{
            margin: 0;
            color: var(--muted);
            line-height: 1.58;
        }}
        .overview-list {{
            margin: 0;
            padding-left: 18px;
            color: var(--muted);
            display: grid;
            gap: 8px;
            line-height: 1.5;
        }}
        .state-grid {{
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
        }}
        .state-card {{
            overflow: hidden;
            border-radius: 18px;
            border: 1px solid var(--line);
            background: var(--surface);
            box-shadow: var(--shadow);
        }}
        .shot-frame {{
            background: #e2e8f0;
            padding: 12px;
            border-bottom: 1px solid var(--line);
        }}
        .shot-open {{
            width: 100%;
            display: block;
            padding: 0;
            border: none;
            background: transparent;
            text-align: left;
            cursor: zoom-in;
        }}
        .shot-open img,
        .shot-missing {{
            display: block;
            width: 100%;
            border-radius: 10px;
            background: #ffffff;
        }}
        .shot-open img {{
            height: auto;
        }}
        .shot-open-hint {{
            display: inline-flex;
            margin-top: 10px;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid var(--line);
            color: var(--muted);
            font-size: 12px;
            font-weight: 700;
        }}
        .shot-missing {{
            min-height: 180px;
            display: grid;
            place-items: center;
            color: var(--muted);
            border: 1px dashed var(--line);
        }}
        .state-copy {{
            padding: 16px;
        }}
        .state-copy h3 {{
            margin: 0 0 8px;
            font-size: 18px;
            line-height: 1.2;
        }}
        .state-copy p {{
            margin: 0;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.5;
        }}
        .state-meta {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 10px;
        }}
        .state-tag {{
            display: inline-flex;
            align-items: center;
            min-height: 28px;
            padding: 4px 10px;
            border-radius: 999px;
            background: var(--primary-soft);
            color: var(--primary);
            font-size: 12px;
            font-weight: 700;
        }}
        .state-tag.is-muted {{
            background: var(--surface-2);
            color: var(--muted);
        }}
        .log-stack {{
            display: grid;
            gap: 18px;
        }}
        .log-card {{
            padding: 18px;
            border-radius: 18px;
            border: 1px solid var(--line);
            background: var(--surface);
            box-shadow: var(--shadow);
        }}
        .log-list {{
            margin: 0;
            padding-left: 18px;
            color: var(--muted);
            display: grid;
            gap: 8px;
            line-height: 1.5;
        }}
        .empty-copy {{
            color: var(--muted);
        }}
        .viewer {{
            position: fixed;
            inset: 0;
            z-index: 1000;
        }}
        .viewer[hidden] {{
            display: none;
        }}
        .viewer-backdrop {{
            position: absolute;
            inset: 0;
            background: rgba(15, 23, 42, 0.8);
        }}
        .viewer-dialog {{
            position: relative;
            z-index: 1;
            width: min(96vw, 1680px);
            max-height: calc(100vh - 32px);
            margin: 16px auto;
            padding: 20px;
            border-radius: 20px;
            background: var(--surface);
            box-shadow: 0 24px 50px rgba(15, 23, 42, 0.28);
            display: grid;
            gap: 16px;
        }}
        .viewer-close {{
            justify-self: end;
            min-height: 44px;
            padding: 0 16px;
            border-radius: 999px;
            border: 1px solid var(--line);
            background: var(--surface-2);
            color: var(--text);
            font: inherit;
            cursor: pointer;
        }}
        .viewer-copy h2 {{
            margin: 0 0 6px;
            font-size: 24px;
            line-height: 1.12;
        }}
        .viewer-copy p {{
            margin: 0;
            color: var(--muted);
            line-height: 1.5;
        }}
        .viewer-image-wrap {{
            overflow: auto;
            border-radius: 14px;
            background: #edf2f7;
            padding: 12px;
        }}
        .viewer-image-wrap img {{
            display: block;
            width: 100%;
            height: auto;
            border-radius: 10px;
            background: #ffffff;
        }}
        @media (max-width: 1180px) {{
            .layout {{
                grid-template-columns: 1fr;
            }}
            .sidebar {{
                position: static;
                height: auto;
                border-right: none;
                border-bottom: 1px solid var(--line);
            }}
            .content {{
                padding: 20px;
            }}
        }}
        @media (max-width: 1100px) {{
            .state-grid,
            .section-grid,
            .overview-grid {{
                grid-template-columns: 1fr;
            }}
            .page-header {{
                align-items: flex-start;
                flex-direction: column;
            }}
            .viewer-dialog {{
                width: calc(100vw - 20px);
                margin: 10px;
                max-height: calc(100vh - 20px);
            }}
        }}
    </style>
</head>
<body>
    <div class="layout">
        {render_sidebar(manifest, active_page, version, created_at)}
        <main class="content">
            {main_content}
        </main>
    </div>
    {render_viewer_markup()}
    {render_viewer_script()}
</body>
</html>
"""


def write_site(output_path: Path, manifest: dict, version: str, created_at: str) -> None:
    site_dir = output_path.parent
    sections = manifest.get("sections", [])

    overview_html = build_document(
        manifest=manifest,
        version=version,
        created_at=created_at,
        active_page=OVERVIEW_PAGE,
        page_title=f"{manifest.get('title', 'Figma Handoff Catalog')} - Overview",
        main_content=render_overview_page(manifest),
    )
    (site_dir / OVERVIEW_PAGE).write_text(overview_html, encoding="utf-8")

    changelog_html = build_document(
        manifest=manifest,
        version=version,
        created_at=created_at,
        active_page=CHANGELOG_PAGE,
        page_title=f"{manifest.get('title', 'Figma Handoff Catalog')} - Change Log",
        main_content=render_change_log_page(manifest),
    )
    (site_dir / CHANGELOG_PAGE).write_text(changelog_html, encoding="utf-8")

    for section in sections:
        section_html = build_document(
            manifest=manifest,
            version=version,
            created_at=created_at,
            active_page=section_page_name(section),
            page_title=f"{manifest.get('title', 'Figma Handoff Catalog')} - {section['title']}",
            main_content=render_section_page(section),
        )
        (site_dir / section_page_name(section)).write_text(section_html, encoding="utf-8")


def main() -> None:
    args = parse_args()
    manifest_path = Path(args.manifest).resolve()
    output_path = Path(args.output).resolve()
    screens_dir = Path(args.screens_dir).resolve()

    manifest = read_manifest(manifest_path)
    version = args.version or manifest.get("defaultVersion") or dt.date.today().isoformat()
    created_at = format_created_at(dt.datetime.now())

    screens_dir.mkdir(parents=True, exist_ok=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not args.skip_capture:
        run_capture(manifest_path, screens_dir)

    write_site(output_path, manifest, version, created_at)
    print(f"Generated site in {output_path.parent}")


if __name__ == "__main__":
    main()
