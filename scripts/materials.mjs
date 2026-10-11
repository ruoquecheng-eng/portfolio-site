import { stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const materialsDescription = 'Browse public papers, project packages, design documents, an internship certificate, and the current-language resume.';

// Read only approved records and their existing source-page links, never the asset directory.
export function approvedMaterials(records, pages) {
  const { hypergraph, radio, battery, rail, internship, scenic } = records;
  const pageFile = (route, extension) => {
    const source = pages.find((page) => page.route === route);
    const files = new Set();
    for (const match of (source?.html ?? '').matchAll(/\bhref="([^"]+)"/g)) {
      const url = new URL(match[1], `https://portfolio.invalid${route}`);
      if (url.origin === 'https://portfolio.invalid' && url.pathname.startsWith('/assets/') && url.pathname.endsWith(`.${extension}`)) {
        files.add(url.pathname.slice('/assets/'.length));
      }
    }
    if (files.size !== 1) throw new Error(`Expected one approved ${extension} material on ${route}`);
    return [...files][0];
  };
  if (hypergraph.manuscript.public !== true || hypergraph.manuscript.status !== 'verified') {
    throw new Error('Hypergraph manuscript must be verified for public reading');
  }
  return [
    { title: 'Resume', kind: 'Resume PDF', file: 'documents/resume-en.pdf', context: 'Education, experience, projects, research, and supporting records.', source: '/resume/', sourceLabel: 'Resume', resume: true },
    { title: hypergraph.title, kind: 'Submitted manuscript', file: hypergraph.manuscript.file, context: 'Read the public submitted manuscript on edge-local spectral information in nonuniform hypergraph tensors.', status: hypergraph.statusText, source: `/research/${hypergraph.slug}/`, sourceLabel: hypergraph.title, formalTitle: true },
    { title: radio.title, kind: 'Final competition paper', file: radio.paper, context: 'Read the localization and clearance methods, comparisons, and retained simulator results.', status: radio.competitionResult, source: `/projects/${radio.slug}/`, sourceLabel: radio.title },
    { title: radio.title, kind: 'Supporting materials', file: radio.support, context: 'Inspect the public code, result summaries, evidence indexes, and AI-use statement.', source: `/projects/${radio.slug}/#materials`, sourceLabel: radio.title },
    { title: battery.title, kind: 'Competition modeling paper', file: pageFile(`/projects/${battery.slug}/`, 'pdf'), context: 'Read the battery RUL and cascade utilization report with its fully simulated-data boundary.', source: `/projects/${battery.slug}/`, sourceLabel: battery.title },
    { title: rail.components.engineeringDesign.title, kind: 'Design paper', file: pageFile(`/projects/${rail.slug}/`, 'docx'), context: 'Read the design paper on lightweight recycled-carbon-fiber carriage components, structural integration, and assumption-based estimates.', source: `/projects/${rail.slug}/`, sourceLabel: rail.title },
    { title: rail.components.engineeringDesign.title, kind: 'Design presentation', file: pageFile(`/projects/${rail.slug}/`, 'pptx'), context: 'Review the accompanying design slides, calculations, risks, and next steps.', source: `/projects/${rail.slug}/`, sourceLabel: rail.title },
    { title: internship.title, kind: internship.certificate.caption, file: internship.certificate.file, context: 'View the issued certificate supporting the software development internship entry.', source: '/resume/', sourceLabel: 'Resume' },
    { title: scenic.title, kind: 'Source code', file: scenic.download.file, context: scenic.download.disclosure, source: '/projects/#scenic-guide', sourceLabel: scenic.title },
  ];
}

export function formatFileSize(bytes) {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

export async function materialsBody(materials, { root, local, escapeHtml }) {
  const cards = await Promise.all(materials.map(async (material) => {
    const format = path.extname(material.file).slice(1).toUpperCase();
    const meta = material.resume ? 'PDF · A4' : `${format} · ${formatFileSize((await stat(path.join(root, 'src/assets', material.file))).size)}`;
    const href = escapeHtml(local(1, `assets/${material.file}`));
    const pdf = format === 'PDF';
    return `<article class="material-card">
      <p class="project-type">${escapeHtml(material.kind)}</p>
      <h2${material.formalTitle ? ' lang="en"' : ''}>${escapeHtml(material.title)}</h2>
      <p>${escapeHtml(material.context)}</p>
      ${material.status ? `<p class="status">${escapeHtml(material.status)}</p>` : ''}
      <p class="material-meta">${escapeHtml(meta)}</p>
      <p class="material-source"><span>Source page:</span> <a${material.formalTitle ? ' lang="en"' : ''} href="${escapeHtml(local(1, material.source.slice(1)))}">${escapeHtml(material.sourceLabel)}</a></p>
      <div class="material-actions">
        ${pdf ? `<a class="button-secondary" href="${href}" target="_blank" rel="noopener">Open PDF <span aria-hidden="true">↗</span></a>` : ''}
        <a class="${pdf ? 'text-link' : 'button-secondary'}" href="${href}" download>${material.resume ? 'Download resume PDF' : `Download ${format}`} <span aria-hidden="true">↓</span></a>
      </div>
    </article>`;
  }));
  return `<section class="page-hero materials-intro"><div><p class="hero-kicker">Public evidence</p><h1>Materials</h1><p>${materialsDescription}</p><p>Each file links back to its source page for contribution, status, and validation context.</p></div></section>
    <section class="section materials-list" aria-label="Public materials">${cards.join('\n')}</section>`;
}

export function versionResumeLinks(html, versions) {
  return html.replace(/(\bhref="[^"?#]*documents\/resume-(en|zh)\.pdf)(?:\?[^"#]*)?(#[^"]*)?"/g,
    (_, href, locale, fragment = '') => `${href}${versions ? `?v=${versions[locale]}` : ''}${fragment}"`);
}

export function resumeVersion(html, localization, styles) {
  return createHash('sha256').update(JSON.stringify([versionResumeLinks(html), localization, ...styles])).digest('hex').slice(0, 12);
}
