import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import {
  Download,
  Copy,
  Image as ImageIcon,
  Upload,
  FileCode2,
  Sparkles,
  Check,
} from 'lucide-react'
import { CanvasPreview } from './components/CanvasPreview'
import { CodeEditor } from './components/CodeEditor'
import { BatchAutomation } from './components/BatchAutomation'
import { ElementInspector } from './components/ElementInspector'
import { PRESETS, type PresetId } from './samples/presets'
import {
  ensureElementIds,
  optimizeSvg,
  exportPng,
  downloadBlob,
  type OptimizeOptions,
} from './utils/svgTransforms'

const DEFAULT = ensureElementIds(PRESETS.icon.markup)

export default function App() {
  const [svgMarkup, setSvgMarkup] = useState(DEFAULT)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteBuf, setPasteBuf] = useState('')
  const [copied, setCopied] = useState(false)
  const [optStatus, setOptStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [opt, setOpt] = useState<OptimizeOptions>({
    removeComments: true,
    removeMetadata: true,
    removeUnusedDefs: true,
    removeEmptyAttrs: true,
    removeHidden: true,
    collapseGroups: false,
    minifyIds: false,
    preferSvgo: true,
  })

  const loadMarkup = useCallback((raw: string) => {
    setSvgMarkup(ensureElementIds(raw.trim()))
    setSelectedElementId(null)
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') loadMarkup(reader.result)
      }
      reader.readAsText(file)
    },
    [loadMarkup],
  )

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') loadMarkup(reader.result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const loadPreset = (id: PresetId) => {
    loadMarkup(PRESETS[id].markup)
  }

  const doOptimize = async () => {
    setBusy(true)
    setOptStatus(null)
    try {
      const { markup, engine } = await optimizeSvg(svgMarkup, opt)
      setSvgMarkup(ensureElementIds(markup))
      setOptStatus(engine === 'svgo' ? 'Optimised with SVGO' : 'Optimised with DOM cleanup')
    } catch (err) {
      setOptStatus(err instanceof Error ? err.message : 'Optimise failed')
    } finally {
      setBusy(false)
    }
  }

  const doDownloadSvg = async () => {
    let out = svgMarkup
    try {
      const { markup } = await optimizeSvg(svgMarkup, opt)
      out = markup
    } catch {
      /* use raw */
    }
    downloadBlob(new Blob([out], { type: 'image/svg+xml;charset=utf-8' }), 'workbench.svg')
  }

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgMarkup)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const doPng = async (scale: 1 | 2 | 4) => {
    setBusy(true)
    try {
      const blob = await exportPng(svgMarkup, scale)
      downloadBlob(blob, `workbench@${scale}x.png`)
    } catch (err) {
      setOptStatus(err instanceof Error ? err.message : 'PNG export failed')
    } finally {
      setBusy(false)
    }
  }

  const toggleOpt = (key: keyof OptimizeOptions) => {
    setOpt((o) => ({ ...o, [key]: !o[key] }))
  }

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={onDrop}
    >
      {/* Top bar */}
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-surface-600 bg-surface-900 px-3">
        <FileCode2 size={18} className="text-accent" />
        <h1 className="text-sm font-semibold tracking-tight text-slate-100">SVG Workbench</h1>
        <div className="mx-2 h-4 w-px bg-surface-600" />

        <input ref={fileRef} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={onFile} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded border border-surface-600 px-2 py-1 text-[12px] text-slate-300 hover:bg-surface-700"
        >
          <Upload size={13} /> Open SVG
        </button>
        <button
          type="button"
          onClick={() => {
            setPasteBuf('')
            setPasteOpen(true)
          }}
          className="rounded border border-surface-600 px-2 py-1 text-[12px] text-slate-300 hover:bg-surface-700"
        >
          Paste code
        </button>

        <div className="flex items-center gap-1">
          {(Object.keys(PRESETS) as PresetId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => loadPreset(id)}
              className="rounded bg-surface-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-surface-700"
            >
              {PRESETS[id].label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {optStatus && <span className="mr-1 text-[11px] text-slate-500">{optStatus}</span>}
          <button
            type="button"
            disabled={busy}
            onClick={doOptimize}
            className="inline-flex items-center gap-1 rounded border border-surface-600 px-2 py-1 text-[12px] text-slate-300 hover:bg-surface-700 disabled:opacity-40"
          >
            <Sparkles size={13} /> Optimise
          </button>
          <button
            type="button"
            onClick={doCopy}
            className="inline-flex items-center gap-1 rounded border border-surface-600 px-2 py-1 text-[12px] text-slate-300 hover:bg-surface-700"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={doDownloadSvg}
            className="inline-flex items-center gap-1 rounded bg-accent px-2 py-1 text-[12px] font-medium text-black hover:bg-accent-dim"
          >
            <Download size={13} /> Download SVG
          </button>
          <div className="flex overflow-hidden rounded border border-surface-600">
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => doPng(s)}
                className="inline-flex items-center gap-1 border-r border-surface-600 px-2 py-1 text-[11px] text-slate-300 last:border-0 hover:bg-surface-700 disabled:opacity-40"
                title={`Export PNG at ${s}×`}
              >
                <ImageIcon size={12} /> {s}×
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left: ingestion hints + batch + inspector */}
        <aside className="flex min-h-0 flex-col border-r border-surface-600 bg-surface-900">
          <div className="border-b border-surface-600 px-3 py-2">
            <p className="text-[11px] leading-relaxed text-slate-500">
              Drop an <span className="text-slate-300">.svg</span> anywhere, open a file, paste markup, or load a preset.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <BatchAutomation svgMarkup={svgMarkup} onChange={setSvgMarkup} />
          </div>
          <div className="max-h-[40%] shrink-0 overflow-y-auto border-t border-surface-600 panel-scroll">
            <ElementInspector
              svgMarkup={svgMarkup}
              selectedElementId={selectedElementId}
              onChange={setSvgMarkup}
              onSelectId={setSelectedElementId}
            />
          </div>
          {/* Optimise toggles */}
          <div className="shrink-0 border-t border-surface-600 px-3 py-2">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Export / optimise
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {(
                [
                  ['removeComments', 'Comments'],
                  ['removeMetadata', 'Metadata'],
                  ['removeUnusedDefs', 'Unused defs'],
                  ['removeEmptyAttrs', 'Empty attrs'],
                  ['removeHidden', 'Hidden'],
                  ['collapseGroups', 'Collapse groups'],
                  ['minifyIds', 'Minify IDs'],
                  ['preferSvgo', 'Prefer SVGO'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={!!opt[key]}
                    onChange={() => toggleOpt(key)}
                    className="accent-accent"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Centre: canvas */}
        <main className="min-h-0 min-w-0">
          <CanvasPreview
            svgMarkup={svgMarkup}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onMarkupChange={setSvgMarkup}
          />
        </main>

        {/* Right: code */}
        <section className="min-h-0 min-w-0 border-l border-surface-600">
          <CodeEditor value={svgMarkup} onChange={setSvgMarkup} />
        </section>
      </div>

      {/* Paste modal */}
      {pasteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setPasteOpen(false)}
        >
          <div
            className="flex w-full max-w-xl flex-col gap-3 rounded-lg border border-surface-600 bg-surface-900 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold text-slate-100">Paste SVG markup</h2>
            <textarea
              value={pasteBuf}
              onChange={(e) => setPasteBuf(e.target.value)}
              rows={14}
              placeholder="<svg …>"
              className="w-full resize-y rounded border border-surface-600 bg-surface-950 p-3 font-mono text-[12px] text-slate-200 outline-none focus:border-accent"
              spellCheck={false}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="rounded px-3 py-1.5 text-[12px] text-slate-400 hover:bg-surface-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pasteBuf.trim()}
                onClick={() => {
                  loadMarkup(pasteBuf)
                  setPasteOpen(false)
                }}
                className="rounded bg-accent px-3 py-1.5 text-[12px] font-medium text-black hover:bg-accent-dim disabled:opacity-40"
              >
                Load
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
