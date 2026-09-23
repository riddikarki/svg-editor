import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Palette,
  Type,
  Scaling,
  Braces,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import palettesJson from '../data/palettes.json'
import {
  detectColors,
  replaceColor,
  replaceText,
  setCanvasSize,
  injectAttributes,
  getCanvasDimensions,
  flattenBrandTokens,
  type PalettesFile,
  type PaletteBrand,
} from '../utils/svgTransforms'

type Props = {
  svgMarkup: string
  onChange: (markup: string) => void
}

const palettes = palettesJson as PalettesFile

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-surface-600">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400 hover:bg-surface-800"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {icon}
        {title}
      </button>
      {open && <div className="space-y-2 px-3 pb-3">{children}</div>}
    </div>
  )
}

export function BatchAutomation({ svgMarkup, onChange }: Props) {
  const colours = useMemo(() => detectColors(svgMarkup), [svgMarkup])
  const dims = useMemo(() => getCanvasDimensions(svgMarkup), [svgMarkup])

  const [replacements, setReplacements] = useState<Record<string, string>>({})
  const [brand, setBrand] = useState<PaletteBrand | ''>('')
  const [chatToken, setChatToken] = useState<'brand-live' | 'brand-doc'>('brand-live')

  const [findText, setFindText] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [useRegex, setUseRegex] = useState(false)

  const [width, setWidth] = useState(String(dims.width || ''))
  const [height, setHeight] = useState(String(dims.height || ''))
  const [lockAspect, setLockAspect] = useState(true)
  const [updateViewBox, setUpdateViewBox] = useState(false)

  const [selector, setSelector] = useState('')
  const [attrName, setAttrName] = useState('')
  const [attrValue, setAttrValue] = useState('')
  const [injectMsg, setInjectMsg] = useState<string | null>(null)

  // Sync dimension inputs when markup changes externally
  useEffect(() => {
    setWidth(String(dims.width || ''))
    setHeight(String(dims.height || ''))
  }, [dims.width, dims.height])

  const brandTokens = useMemo(() => {
    if (!brand) return []
    if (brand === 'vijji-chat') {
      return flattenBrandTokens(palettes, brand, chatToken)
    }
    return flattenBrandTokens(palettes, brand)
  }, [brand, chatToken])

  const applyPaletteSwap = () => {
    let next = svgMarkup
    for (const from of colours) {
      const to = replacements[from]
      if (to && to.toLowerCase() !== from.toLowerCase()) {
        next = replaceColor(next, from, to)
      }
    }
    onChange(next)
  }

  const applyBrandToFirst = (hex: string) => {
    if (!colours.length) return
    const from = colours[0]
    onChange(replaceColor(svgMarkup, from, hex))
    setReplacements((r) => ({ ...r, [from]: hex }))
  }

  const applyText = () => {
    if (!findText) return
    onChange(replaceText(svgMarkup, findText, replaceWith, useRegex))
  }

  const applyResize = () => {
    const w = parseFloat(width)
    const h = parseFloat(height)
    if (!w || !h || w <= 0 || h <= 0) return
    onChange(setCanvasSize(svgMarkup, w, h, { lockAspect, updateViewBox }))
  }

  const applyInject = () => {
    if (!selector || !attrName) {
      setInjectMsg('Selector and attribute name required')
      return
    }
    const result = injectAttributes(svgMarkup, selector, { [attrName]: attrValue })
    if (result.error) {
      setInjectMsg(result.error)
      return
    }
    onChange(result.markup)
    setInjectMsg(`Updated ${result.count} element${result.count === 1 ? '' : 's'}`)
  }

  return (
    <div className="panel-scroll overflow-y-auto">
      <Section title="Palette swapper" icon={<Palette size={12} />}>
        {colours.length === 0 ? (
          <p className="text-[12px] text-slate-500">No colours detected in this SVG.</p>
        ) : (
          <ul className="space-y-1.5">
            {colours.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <span
                  className="h-5 w-5 shrink-0 rounded border border-surface-600"
                  style={{ background: c }}
                  title={c}
                />
                <span className="w-[4.5rem] shrink-0 font-mono text-[11px] text-slate-400">{c}</span>
                <span className="text-slate-600">→</span>
                <input
                  type="color"
                  value={replacements[c] || c}
                  onChange={(e) =>
                    setReplacements((r) => ({ ...r, [c]: e.target.value }))
                  }
                  className="h-7 w-8 cursor-pointer rounded border border-surface-600 bg-transparent"
                />
                <input
                  type="text"
                  value={replacements[c] || ''}
                  placeholder={c}
                  onChange={(e) =>
                    setReplacements((r) => ({ ...r, [c]: e.target.value }))
                  }
                  className="min-w-0 flex-1 rounded border border-surface-600 bg-surface-950 px-1.5 py-1 font-mono text-[11px] outline-none focus:border-accent"
                  spellCheck={false}
                />
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={applyPaletteSwap}
          disabled={!colours.length}
          className="mt-1 w-full rounded bg-accent px-2 py-1.5 text-[12px] font-medium text-black hover:bg-accent-dim disabled:opacity-40"
        >
          Apply colour swaps
        </button>

        <div className="mt-2 space-y-1.5 rounded border border-surface-600 bg-surface-950/60 p-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Brand presets</p>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value as PaletteBrand | '')}
            className="w-full rounded border border-surface-600 bg-surface-900 px-2 py-1 text-[12px] outline-none focus:border-accent"
          >
            <option value="">Choose brand…</option>
            <option value="vrijji">vrijji</option>
            <option value="vijji-admin">vijji-admin</option>
            <option value="vijji-chat">vijji-chat (explicit token)</option>
          </select>
          {brand === 'vijji-chat' && (
            <select
              value={chatToken}
              onChange={(e) => setChatToken(e.target.value as 'brand-live' | 'brand-doc')}
              className="w-full rounded border border-amber-700/50 bg-surface-900 px-2 py-1 text-[12px] text-amber-200 outline-none focus:border-accent"
            >
              <option value="brand-live">brand-live (#f97316)</option>
              <option value="brand-doc">brand-doc (#4D8EF7)</option>
            </select>
          )}
          {brand && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {brandTokens.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  title={`${t.name} ${t.hex}`}
                  onClick={() => applyBrandToFirst(t.hex)}
                  className="flex items-center gap-1 rounded border border-surface-600 px-1.5 py-0.5 text-[10px] hover:border-accent"
                >
                  <span
                    className="inline-block h-3 w-3 rounded-sm border border-black/30"
                    style={{ background: t.hex }}
                  />
                  {t.name}
                </button>
              ))}
            </div>
          )}
          {brand === 'vijji-chat' && (
            <p className="text-[10px] leading-snug text-amber-500/90">
              Chat brand requires an explicit brand-live or brand-doc choice — colours are never auto-picked.
            </p>
          )}
        </div>
      </Section>

      <Section title="Text / tspan replacer" icon={<Type size={12} />}>
        <input
          type="text"
          placeholder="Find"
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          className="w-full rounded border border-surface-600 bg-surface-950 px-2 py-1 text-[12px] outline-none focus:border-accent"
        />
        <input
          type="text"
          placeholder="Replace with"
          value={replaceWith}
          onChange={(e) => setReplaceWith(e.target.value)}
          className="w-full rounded border border-surface-600 bg-surface-950 px-2 py-1 text-[12px] outline-none focus:border-accent"
        />
        <label className="flex items-center gap-2 text-[12px] text-slate-400">
          <input
            type="checkbox"
            checked={useRegex}
            onChange={(e) => setUseRegex(e.target.checked)}
            className="accent-accent"
          />
          Use regular expression
        </label>
        <button
          type="button"
          onClick={applyText}
          disabled={!findText}
          className="w-full rounded bg-surface-700 px-2 py-1.5 text-[12px] font-medium text-slate-100 hover:bg-surface-600 disabled:opacity-40"
        >
          Replace text
        </button>
      </Section>

      <Section title="Resizer" icon={<Scaling size={12} />}>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-0.5 block text-[10px] uppercase text-slate-500">Width</span>
            <input
              type="number"
              min={1}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full rounded border border-surface-600 bg-surface-950 px-2 py-1 font-mono text-[12px] outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[10px] uppercase text-slate-500">Height</span>
            <input
              type="number"
              min={1}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full rounded border border-surface-600 bg-surface-950 px-2 py-1 font-mono text-[12px] outline-none focus:border-accent"
            />
          </label>
        </div>
        {dims.viewBox && (
          <p className="font-mono text-[10px] text-slate-500">viewBox: {dims.viewBox}</p>
        )}
        <label className="flex items-center gap-2 text-[12px] text-slate-400">
          <input
            type="checkbox"
            checked={lockAspect}
            onChange={(e) => setLockAspect(e.target.checked)}
            className="accent-accent"
          />
          Lock aspect ratio
        </label>
        <label className="flex items-center gap-2 text-[12px] text-slate-400">
          <input
            type="checkbox"
            checked={updateViewBox}
            onChange={(e) => setUpdateViewBox(e.target.checked)}
            className="accent-accent"
          />
          Update viewBox to match
        </label>
        <button
          type="button"
          onClick={applyResize}
          className="w-full rounded bg-surface-700 px-2 py-1.5 text-[12px] font-medium text-slate-100 hover:bg-surface-600"
        >
          Apply size
        </button>
      </Section>

      <Section title="Attribute injector" icon={<Braces size={12} />} defaultOpen={false}>
        <input
          type="text"
          placeholder="CSS selector (e.g. path, #leaf, .icon)"
          value={selector}
          onChange={(e) => setSelector(e.target.value)}
          className="w-full rounded border border-surface-600 bg-surface-950 px-2 py-1 font-mono text-[12px] outline-none focus:border-accent"
          spellCheck={false}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Attribute"
            value={attrName}
            onChange={(e) => setAttrName(e.target.value)}
            className="rounded border border-surface-600 bg-surface-950 px-2 py-1 font-mono text-[12px] outline-none focus:border-accent"
            spellCheck={false}
          />
          <input
            type="text"
            placeholder="Value (empty = remove)"
            value={attrValue}
            onChange={(e) => setAttrValue(e.target.value)}
            className="rounded border border-surface-600 bg-surface-950 px-2 py-1 font-mono text-[12px] outline-none focus:border-accent"
            spellCheck={false}
          />
        </div>
        <button
          type="button"
          onClick={applyInject}
          className="w-full rounded bg-surface-700 px-2 py-1.5 text-[12px] font-medium text-slate-100 hover:bg-surface-600"
        >
          Inject attribute
        </button>
        {injectMsg && <p className="text-[11px] text-slate-400">{injectMsg}</p>}
      </Section>
    </div>
  )
}
