/**
 * SVG Workbench — DOM-centric transform helpers.
 * Always parse with DOMParser('image/svg+xml') and serialise with XMLSerializer.
 */

export type ParseResult =
  | { ok: true; doc: Document; svg: SVGSVGElement }
  | { ok: false; error: string }

const COLOR_ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'] as const
const COLOR_STYLE_PROPS = ['fill', 'stroke', 'stop-color', 'flood-color', 'color'] as const

const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
const RGB_RE = /rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+\s*)?\)/gi

export function parseSvg(markup: string): ParseResult {
  const trimmed = markup.trim()
  if (!trimmed) return { ok: false, error: 'Empty markup' }

  const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml')
  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    return { ok: false, error: parserError.textContent?.trim() || 'Malformed XML' }
  }
  const svg = doc.documentElement
  if (!svg || svg.localName.toLowerCase() !== 'svg') {
    return { ok: false, error: 'Root element is not <svg>' }
  }
  return { ok: true, doc, svg: svg as unknown as SVGSVGElement }
}

export function serializeSvg(doc: Document): string {
  return new XMLSerializer().serializeToString(doc)
}

export function normalizeHex(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (s === 'none' || s === 'transparent' || s === 'currentcolor' || s === 'inherit') {
    return null
  }
  if (s.startsWith('#')) {
    if (s.length === 4 || s.length === 5) {
      const r = s[1]
      const g = s[2]
      const b = s[3]
      const a = s[4]
      return a ? `#${r}${r}${g}${g}${b}${b}${a}${a}` : `#${r}${r}${g}${g}${b}${b}`
    }
    if (s.length === 7 || s.length === 9) return s
  }
  const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+)\s*)?\)$/i)
  if (rgb) {
    const toHex = (n: string) => {
      const v = Math.max(0, Math.min(255, Math.round(Number(n))))
      return v.toString(16).padStart(2, '0')
    }
    const base = `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`
    if (rgb[4] !== undefined) {
      const a = Math.max(0, Math.min(1, Number(rgb[4])))
      return `${base}${Math.round(a * 255)
        .toString(16)
        .padStart(2, '0')}`
    }
    return base
  }
  return null
}

function collectFromString(value: string, set: Set<string>) {
  for (const m of value.matchAll(HEX_RE)) {
    const n = normalizeHex(m[0])
    if (n) set.add(n.slice(0, 7))
  }
  for (const m of value.matchAll(RGB_RE)) {
    const n = normalizeHex(m[0])
    if (n) set.add(n.slice(0, 7))
  }
}

export function detectColors(markup: string): string[] {
  const parsed = parseSvg(markup)
  if (!parsed.ok) return []
  const set = new Set<string>()
  const walk = (el: Element) => {
    for (const attr of COLOR_ATTRS) {
      const v = el.getAttribute(attr)
      if (v) {
        const n = normalizeHex(v)
        if (n) set.add(n.slice(0, 7))
        else collectFromString(v, set)
      }
    }
    const style = el.getAttribute('style')
    if (style) {
      for (const prop of COLOR_STYLE_PROPS) {
        const re = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i')
        const m = style.match(re)
        if (m) {
          const n = normalizeHex(m[1].trim())
          if (n) set.add(n.slice(0, 7))
          else collectFromString(m[1], set)
        }
      }
      collectFromString(style, set)
    }
    for (const child of Array.from(el.children)) walk(child)
  }
  walk(parsed.svg as unknown as Element)
  return Array.from(set).sort()
}

function replaceInValue(value: string, fromNorm: string, to: string): string {
  return value.replace(HEX_RE, (m) => {
    const n = normalizeHex(m)
    if (n && n.slice(0, 7) === fromNorm) {
      return n.length > 7 ? `${to}${n.slice(7)}` : to
    }
    return m
  }).replace(RGB_RE, (m) => {
    const n = normalizeHex(m)
    if (n && n.slice(0, 7) === fromNorm) {
      return n.length > 7 ? `${to}${n.slice(7)}` : to
    }
    return m
  })
}

export function replaceColor(markup: string, from: string, to: string): string {
  const fromNorm = normalizeHex(from)?.slice(0, 7)
  const toNorm = normalizeHex(to)?.slice(0, 7) ?? to
  if (!fromNorm) return markup
  const parsed = parseSvg(markup)
  if (!parsed.ok) return markup

  const walk = (el: Element) => {
    for (const attr of COLOR_ATTRS) {
      const v = el.getAttribute(attr)
      if (!v) continue
      const n = normalizeHex(v)
      if (n && n.slice(0, 7) === fromNorm) {
        el.setAttribute(attr, n.length > 7 ? `${toNorm}${n.slice(7)}` : toNorm)
      } else if (HEX_RE.test(v) || RGB_RE.test(v)) {
        HEX_RE.lastIndex = 0
        RGB_RE.lastIndex = 0
        el.setAttribute(attr, replaceInValue(v, fromNorm, toNorm))
      }
    }
    const style = el.getAttribute('style')
    if (style) {
      el.setAttribute('style', replaceInValue(style, fromNorm, toNorm))
    }
    for (const child of Array.from(el.children)) walk(child)
  }
  walk(parsed.svg as unknown as Element)
  return serializeSvg(parsed.doc)
}

export function replaceText(
  markup: string,
  find: string,
  replace: string,
  useRegex = false,
): string {
  if (!find) return markup
  const parsed = parseSvg(markup)
  if (!parsed.ok) return markup

  let pattern: RegExp | null = null
  if (useRegex) {
    try {
      pattern = new RegExp(find, 'g')
    } catch {
      return markup
    }
  }

  const nodes = parsed.doc.querySelectorAll('text, tspan')
  nodes.forEach((node) => {
    const texts = Array.from(node.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE)
    for (const tn of texts) {
      const cur = tn.textContent ?? ''
      if (pattern) {
        tn.textContent = cur.replace(pattern, replace)
      } else if (cur.includes(find)) {
        tn.textContent = cur.split(find).join(replace)
      }
    }
  })
  return serializeSvg(parsed.doc)
}

export type CanvasSizeOptions = {
  width: number
  height: number
  /** When true, scale viewBox to match new aspect (keeps content fitting). */
  updateViewBox?: boolean
  /** When true, preserve viewBox aspect by adjusting only one dimension — unused; we keep viewBox and set w/h. */
  lockAspect?: boolean
}

export function setCanvasSize(
  markup: string,
  width: number,
  height: number,
  opts: { updateViewBox?: boolean; lockAspect?: boolean } = {},
): string {
  const parsed = parseSvg(markup)
  if (!parsed.ok) return markup
  const svg = parsed.svg as unknown as Element

  const prevW = parseFloat(svg.getAttribute('width') || '') || 0
  const prevH = parseFloat(svg.getAttribute('height') || '') || 0
  let w = width
  let h = height

  if (opts.lockAspect && prevW > 0 && prevH > 0) {
    const aspect = prevW / prevH
    // Prefer the dimension that changed more relative to previous
    if (Math.abs(width - prevW) >= Math.abs(height - prevH)) {
      h = Math.round(width / aspect)
      w = width
    } else {
      w = Math.round(height * aspect)
      h = height
    }
  }

  svg.setAttribute('width', String(w))
  svg.setAttribute('height', String(h))

  if (opts.updateViewBox) {
    const vb = svg.getAttribute('viewBox')
    if (vb) {
      const parts = vb.trim().split(/[\s,]+/).map(Number)
      if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
        svg.setAttribute('viewBox', `${parts[0]} ${parts[1]} ${w} ${h}`)
      }
    } else {
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    }
  }

  return serializeSvg(parsed.doc)
}

export function injectAttributes(
  markup: string,
  selector: string,
  attrs: Record<string, string>,
): { markup: string; count: number; error?: string } {
  const parsed = parseSvg(markup)
  if (!parsed.ok) return { markup, count: 0, error: parsed.error }
  if (!selector.trim()) return { markup, count: 0, error: 'Selector required' }

  let nodes: NodeListOf<Element>
  try {
    nodes = parsed.doc.querySelectorAll(selector)
  } catch {
    return { markup, count: 0, error: 'Invalid CSS selector' }
  }

  let count = 0
  nodes.forEach((el) => {
    for (const [k, v] of Object.entries(attrs)) {
      if (!k.trim()) continue
      if (v === '') el.removeAttribute(k)
      else el.setAttribute(k, v)
    }
    count += 1
  })
  return { markup: serializeSvg(parsed.doc), count }
}

export type OptimizeOptions = {
  removeComments?: boolean
  removeMetadata?: boolean
  removeUnusedDefs?: boolean
  removeEmptyAttrs?: boolean
  removeHidden?: boolean
  collapseGroups?: boolean
  minifyIds?: boolean
  /** Prefer SVGO when available (dynamic import). Falls back to DOM cleanup. */
  preferSvgo?: boolean
}

const DEFAULT_OPTIMIZE: Required<OptimizeOptions> = {
  removeComments: true,
  removeMetadata: true,
  removeUnusedDefs: true,
  removeEmptyAttrs: true,
  removeHidden: true,
  collapseGroups: false,
  minifyIds: false,
  preferSvgo: true,
}

function removeComments(node: Node) {
  const toRemove: Comment[] = []
  const walk = (n: Node) => {
    if (n.nodeType === Node.COMMENT_NODE) toRemove.push(n as Comment)
    for (const c of Array.from(n.childNodes)) walk(c)
  }
  walk(node)
  toRemove.forEach((c) => c.parentNode?.removeChild(c))
}

export function optimizeDom(markup: string, options: OptimizeOptions = {}): string {
  const opts = { ...DEFAULT_OPTIMIZE, ...options }
  const parsed = parseSvg(markup)
  if (!parsed.ok) return markup
  const doc = parsed.doc
  const root = parsed.svg as unknown as Element

  if (opts.removeComments) removeComments(doc)

  if (opts.removeMetadata) {
    doc.querySelectorAll('metadata, title, desc').forEach((el) => {
      // Keep title/desc if they look intentional (have text and id) — still remove metadata always
      if (el.localName === 'metadata') el.remove()
      else if (!el.id) el.remove()
    })
  }

  if (opts.removeHidden) {
    doc.querySelectorAll('[display="none"], [visibility="hidden"]').forEach((el) => el.remove())
  }

  if (opts.removeEmptyAttrs) {
    const walk = (el: Element) => {
      for (const attr of Array.from(el.attributes)) {
        if (attr.value === '' && attr.name !== 'd') el.removeAttribute(attr.name)
      }
      for (const child of Array.from(el.children)) walk(child)
    }
    walk(root)
  }

  if (opts.removeUnusedDefs) {
    const defs = doc.querySelector('defs')
    if (defs) {
      const used = new Set<string>()
      const hrefRe = /url\(#([^)]+)\)|#([A-Za-z_][\w.-]*)/g
      const scan = (el: Element) => {
        for (const attr of Array.from(el.attributes)) {
          let m: RegExpExecArray | null
          hrefRe.lastIndex = 0
          while ((m = hrefRe.exec(attr.value))) {
            used.add(m[1] || m[2])
          }
          if (attr.name === 'href' || attr.name === 'xlink:href') {
            const id = attr.value.replace(/^#/, '')
            if (id) used.add(id)
          }
        }
        for (const child of Array.from(el.children)) scan(child)
      }
      scan(root)
      Array.from(defs.children).forEach((child) => {
        const id = child.getAttribute('id')
        if (id && !used.has(id)) child.remove()
      })
      if (!defs.children.length) defs.remove()
    }
  }

  if (opts.collapseGroups) {
    doc.querySelectorAll('g').forEach((g) => {
      if (g.attributes.length === 0 && g.parentNode) {
        while (g.firstChild) g.parentNode.insertBefore(g.firstChild, g)
        g.remove()
      }
    })
  }

  if (opts.minifyIds) {
    const idMap = new Map<string, string>()
    let i = 0
    const gen = () => {
      const s = `a${(i++).toString(36)}`
      return s
    }
    doc.querySelectorAll('[id]').forEach((el) => {
      const id = el.getAttribute('id')
      if (!id) return
      if (!idMap.has(id)) idMap.set(id, gen())
      el.setAttribute('id', idMap.get(id)!)
    })
    const rewrite = (val: string) => {
      let out = val
      for (const [oldId, newId] of idMap) {
        out = out.split(`#${oldId}`).join(`#${newId}`)
        out = out.split(`url(#${oldId})`).join(`url(#${newId})`)
      }
      return out
    }
    const walk = (el: Element) => {
      for (const attr of Array.from(el.attributes)) {
        if (attr.value.includes('#')) el.setAttribute(attr.name, rewrite(attr.value))
      }
      for (const child of Array.from(el.children)) walk(child)
    }
    walk(root)
  }

  return serializeSvg(doc)
}

/** Attempt SVGO; fall back to optimizeDom. */
export async function optimizeSvg(
  markup: string,
  options: OptimizeOptions = {},
): Promise<{ markup: string; engine: 'svgo' | 'dom' }> {
  const opts = { ...DEFAULT_OPTIMIZE, ...options }
  if (opts.preferSvgo) {
    try {
      const svgo = await import('svgo/browser')
      const plugins: { name: string; params?: Record<string, unknown> }[] = []
      if (opts.removeComments) plugins.push({ name: 'removeComments' })
      if (opts.removeMetadata) plugins.push({ name: 'removeMetadata' }, { name: 'removeTitle' }, { name: 'removeDesc' })
      if (opts.removeHidden) plugins.push({ name: 'removeHiddenElems' })
      if (opts.removeEmptyAttrs) plugins.push({ name: 'removeEmptyAttrs' })
      if (opts.collapseGroups) plugins.push({ name: 'collapseGroups' })
      if (opts.minifyIds) plugins.push({ name: 'cleanupIds', params: { minify: true } })
      if (opts.removeUnusedDefs) plugins.push({ name: 'removeUselessDefs' })

      const result = svgo.optimize(markup, {
        multipass: true,
        plugins: plugins.length ? (plugins as any) : undefined,
      })
      if (result?.data) return { markup: result.data, engine: 'svgo' }
    } catch {
      // Fall through to DOM cleanup
    }
  }
  return { markup: optimizeDom(markup, { ...opts, preferSvgo: false }), engine: 'dom' }
}

export function ensureElementIds(markup: string): string {
  const parsed = parseSvg(markup)
  if (!parsed.ok) return markup
  let n = 0
  const used = new Set<string>()
  parsed.doc.querySelectorAll('[id]').forEach((el) => {
    const id = el.getAttribute('id')
    if (id) used.add(id)
  })
  const shapeSel =
    'path,rect,circle,ellipse,line,polyline,polygon,text,tspan,g,image,use,symbol'
  parsed.doc.querySelectorAll(shapeSel).forEach((el) => {
    if (!el.getAttribute('id')) {
      let id = `el-${n++}`
      while (used.has(id)) id = `el-${n++}`
      el.setAttribute('id', id)
      used.add(id)
    }
  })
  return serializeSvg(parsed.doc)
}

export function getElementAttrs(
  markup: string,
  elementId: string,
): Record<string, string> | null {
  const parsed = parseSvg(markup)
  if (!parsed.ok) return null
  const el = parsed.doc.getElementById(elementId)
  if (!el) return null
  const out: Record<string, string> = {
    id: el.getAttribute('id') || '',
    class: el.getAttribute('class') || '',
    fill: el.getAttribute('fill') || '',
    stroke: el.getAttribute('stroke') || '',
    transform: el.getAttribute('transform') || '',
    tag: el.localName,
  }
  // Include style fill/stroke if present
  const style = el.getAttribute('style')
  if (style) {
    const fillM = style.match(/fill\s*:\s*([^;]+)/i)
    const strokeM = style.match(/stroke\s*:\s*([^;]+)/i)
    if (fillM && !out.fill) out.fill = fillM[1].trim()
    if (strokeM && !out.stroke) out.stroke = strokeM[1].trim()
  }
  return out
}

export function updateElementAttrs(
  markup: string,
  elementId: string,
  attrs: Partial<{
    id: string
    class: string
    fill: string
    stroke: string
    transform: string
  }>,
): string {
  const parsed = parseSvg(markup)
  if (!parsed.ok) return markup
  const el = parsed.doc.getElementById(elementId)
  if (!el) return markup

  if (attrs.fill !== undefined) {
    if (attrs.fill === '') el.removeAttribute('fill')
    else el.setAttribute('fill', attrs.fill)
  }
  if (attrs.stroke !== undefined) {
    if (attrs.stroke === '') el.removeAttribute('stroke')
    else el.setAttribute('stroke', attrs.stroke)
  }
  if (attrs.class !== undefined) {
    if (attrs.class === '') el.removeAttribute('class')
    else el.setAttribute('class', attrs.class)
  }
  if (attrs.transform !== undefined) {
    if (attrs.transform === '') el.removeAttribute('transform')
    else el.setAttribute('transform', attrs.transform)
  }
  if (attrs.id !== undefined && attrs.id !== '' && attrs.id !== elementId) {
    el.setAttribute('id', attrs.id)
  }
  return serializeSvg(parsed.doc)
}

export async function exportPng(
  markup: string,
  scale: 1 | 2 | 4 = 1,
): Promise<Blob> {
  const parsed = parseSvg(markup)
  if (!parsed.ok) throw new Error(parsed.error)

  const svg = parsed.svg as unknown as Element
  let w = parseFloat(svg.getAttribute('width') || '') || 0
  let h = parseFloat(svg.getAttribute('height') || '') || 0
  const vb = svg.getAttribute('viewBox')
  if ((!w || !h) && vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number)
    if (p.length === 4) {
      w = w || p[2]
      h = h || p[3]
    }
  }
  if (!w || !h) {
    w = w || 300
    h = h || 150
  }

  const clone = serializeSvg(parsed.doc)
  const blob = new Blob([clone], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(w * scale))
    canvas.height = Math.max(1, Math.round(h * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unsupported')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png')
    })
    return png
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to rasterise SVG'))
    img.src = url
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function getCanvasDimensions(markup: string): { width: number; height: number; viewBox: string } {
  const parsed = parseSvg(markup)
  if (!parsed.ok) return { width: 0, height: 0, viewBox: '' }
  const svg = parsed.svg as unknown as Element
  const vb = svg.getAttribute('viewBox') || ''
  let w = parseFloat(svg.getAttribute('width') || '') || 0
  let h = parseFloat(svg.getAttribute('height') || '') || 0
  if ((!w || !h) && vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number)
    if (p.length === 4) {
      w = w || p[2]
      h = h || p[3]
    }
  }
  return { width: w, height: h, viewBox: vb }
}

export type PaletteBrand = 'vrijji' | 'vijji-admin' | 'vijji-chat'

export type PalettesFile = {
  _meta?: unknown
  vrijji: Record<string, string>
  'vijji-admin': Record<string, string>
  'vijji-chat': Record<string, string>
  aliases?: Record<string, string>
}

/** Flatten brand tokens into name→hex, skipping notes and non-hex. */
export function flattenBrandTokens(
  palettes: PalettesFile,
  brand: PaletteBrand,
  chatToken?: 'brand-live' | 'brand-doc',
): { name: string; hex: string }[] {
  const raw = palettes[brand]
  if (!raw) return []
  const out: { name: string; hex: string }[] = []
  for (const [name, value] of Object.entries(raw)) {
    if (name.startsWith('_')) continue
    if (typeof value !== 'string' || !value.startsWith('#')) continue
    if (brand === 'vijji-chat') {
      // Chat brand: only expose brand-live / brand-doc unless listing all non-brand colours
      if (name === 'brand-live' || name === 'brand-doc') {
        if (chatToken && name !== chatToken) continue
        out.push({ name, hex: value })
      } else if (!chatToken) {
        // When no explicit chat token filter for "other" colours, include non-brand
        if (name !== 'brand-hover') out.push({ name, hex: value })
      }
    } else {
      out.push({ name, hex: value })
    }
  }
  return out
}
