/** Three built-in SVG presets for smoke testing and demos. */

export const PRESET_ICON = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Leaf icon">
  <rect id="icon-bg" width="64" height="64" rx="12" fill="#EAF2EC"/>
  <path id="leaf" fill="#0F5C2E" d="M48 16c-14 2-24 12-28 26 8-2 16 0 22 6 8-10 12-22 6-32z"/>
  <path id="stem" stroke="#17803E" stroke-width="2.5" stroke-linecap="round" fill="none" d="M20 48c6-8 14-14 24-18"/>
  <circle id="dot" cx="44" cy="22" r="3" fill="#A96A00"/>
</svg>`

export const PRESET_ILLUSTRATION = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160" role="img" aria-label="Mountain scene">
  <rect id="sky" width="240" height="160" fill="#EAF2EC"/>
  <circle id="sun" cx="190" cy="40" r="22" fill="#A96A00"/>
  <path id="mountain-back" fill="#8B908A" d="M0 160 L60 70 L110 120 L160 50 L240 160 Z"/>
  <path id="mountain-front" fill="#52564F" d="M0 160 L80 90 L130 130 L180 75 L240 160 Z"/>
  <path id="tree" fill="#0F5C2E" d="M48 120 L60 90 L72 120 Z"/>
  <rect id="trunk" x="57" y="120" width="6" height="14" fill="#0B0B0C"/>
  <path id="river" fill="#17803E" opacity="0.35" d="M100 160 Q130 130 160 160 Z"/>
</svg>`

export const PRESET_CERTIFICATE = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300" role="img" aria-label="Certificate badge">
  <rect id="cert-bg" width="420" height="300" rx="8" fill="#FFFFFF" stroke="#CDD3CD" stroke-width="2"/>
  <rect id="cert-border" x="16" y="16" width="388" height="268" rx="4" fill="none" stroke="#0F5C2E" stroke-width="3"/>
  <circle id="seal" cx="210" cy="78" r="28" fill="#0F5C2E"/>
  <text id="seal-text" x="210" y="84" text-anchor="middle" fill="#FFFFFF" font-family="Georgia, serif" font-size="14" font-weight="700">VK</text>
  <text id="title" x="210" y="140" text-anchor="middle" fill="#0B0B0C" font-family="Georgia, serif" font-size="22" font-weight="700">Certificate of Excellence</text>
  <text id="subtitle" x="210" y="168" text-anchor="middle" fill="#52564F" font-family="system-ui, sans-serif" font-size="13">Presented to</text>
  <text id="recipient" x="210" y="198" text-anchor="middle" fill="#0F5C2E" font-family="Georgia, serif" font-size="20">
    <tspan>Riddi Karki</tspan>
  </text>
  <text id="body" x="210" y="230" text-anchor="middle" fill="#8B908A" font-family="system-ui, sans-serif" font-size="11">For outstanding design craftsmanship</text>
  <line id="sig-line" x1="80" y1="268" x2="160" y2="268" stroke="#CDD3CD" stroke-width="1"/>
  <text id="sig-label" x="120" y="282" text-anchor="middle" fill="#8B908A" font-family="system-ui, sans-serif" font-size="9">Director</text>
</svg>`

export type PresetId = 'icon' | 'illustration' | 'certificate'

export const PRESETS: Record<PresetId, { label: string; markup: string }> = {
  icon: { label: 'Icon', markup: PRESET_ICON },
  illustration: { label: 'Illustration', markup: PRESET_ILLUSTRATION },
  certificate: { label: 'Certificate', markup: PRESET_CERTIFICATE },
}
