import { useCallback, useEffect, useRef, useState, type WheelEvent, type PointerEvent, type MouseEvent } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react'
import { ensureElementIds, parseSvg, serializeSvg } from '../utils/svgTransforms'

type Props = {
  svgMarkup: string
  selectedElementId: string | null
  onSelectElement: (id: string | null) => void
  onMarkupChange?: (markup: string) => void
}

const SHAPE_SEL =
  'path,rect,circle,ellipse,line,polyline,polygon,text,g,image,use'

export function CanvasPreview({
  svgMarkup,
  selectedElementId,
  onSelectElement,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const [renderHtml, setRenderHtml] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => {
    const parsed = parseSvg(svgMarkup)
    if (!parsed.ok) {
      setParseError(parsed.error)
      setRenderHtml('')
      return
    }
    setParseError(null)

    // Ensure ids locally for selection without rewriting parent state in a loop
    let docMarkup = svgMarkup
    const missing = Array.from(parsed.doc.querySelectorAll(SHAPE_SEL)).some(
      (el) => !el.getAttribute('id'),
    )
    if (missing) {
      docMarkup = ensureElementIds(svgMarkup)
    }

    const again = parseSvg(docMarkup)
    if (!again.ok) {
      setParseError(again.error)
      return
    }

    if (selectedElementId) {
      const el = again.doc.getElementById(selectedElementId)
      if (el) {
        el.setAttribute('data-sw-selected', '1')
        const prev = el.getAttribute('style') || ''
        if (!/outline/.test(prev)) {
          el.setAttribute(
            'style',
            `${prev}${prev && !prev.endsWith(';') ? ';' : ''}outline:2px solid #FF7D00;outline-offset:2px`,
          )
        }
      }
    }

    const svgEl = again.svg as unknown as Element
    svgEl.setAttribute('style', 'max-width:100%;max-height:100%;overflow:visible')
    setRenderHtml(serializeSvg(again.doc))
  }, [svgMarkup, selectedElementId])


  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setZoom((z) => Math.min(8, Math.max(0.1, Number((z + delta).toFixed(3)))))
  }, [])

  const onPointerDown = (e: PointerEvent) => {
    if (e.button === 1 || e.altKey || (e.button === 0 && e.shiftKey)) {
      e.preventDefault()
      setPanning(true)
      dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }

  const onPointerUp = () => {
    dragRef.current = null
    setPanning(false)
  }

  const onClickCapture = (e: MouseEvent) => {
    if (panning) return
    const target = e.target as Element
    if (!target || target === viewportRef.current) {
      onSelectElement(null)
      return
    }
    // Walk up to find an id'd shape
    let node: Element | null = target
    while (node && node !== viewportRef.current) {
      const id = node.getAttribute?.('id')
      const tag = node.localName?.toLowerCase()
      if (id && tag && tag !== 'svg' && SHAPE_SEL.split(',').includes(tag)) {
        onSelectElement(id)
        e.stopPropagation()
        return
      }
      if (id && tag && tag !== 'svg') {
        onSelectElement(id)
        e.stopPropagation()
        return
      }
      node = node.parentElement
    }
    onSelectElement(null)
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-900">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-surface-600 px-2">
        <span className="mr-auto text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Canvas
        </span>
        <button
          type="button"
          title="Zoom out"
          className="rounded p-1.5 text-slate-300 hover:bg-surface-700"
          onClick={() => setZoom((z) => Math.max(0.1, Number((z - 0.15).toFixed(2))))}
        >
          <ZoomOut size={14} />
        </button>
        <span className="min-w-[3.2rem] text-center font-mono text-[11px] text-slate-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          title="Zoom in"
          className="rounded p-1.5 text-slate-300 hover:bg-surface-700"
          onClick={() => setZoom((z) => Math.min(8, Number((z + 0.15).toFixed(2))))}
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          title="Reset view"
          className="rounded p-1.5 text-slate-300 hover:bg-surface-700"
          onClick={resetView}
        >
          <Maximize2 size={14} />
        </button>
        <span className="ml-1 flex items-center gap-1 text-[10px] text-slate-500" title="Shift-drag or middle-mouse to pan">
          <Move size={12} /> Pan
        </span>
      </div>

      <div
        ref={viewportRef}
        className="checkerboard relative min-h-0 flex-1 cursor-default overflow-hidden"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClickCapture}
        style={{ cursor: panning ? 'grabbing' : undefined }}
      >
        {parseError ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-400">
            Preview unavailable — fix the markup in the editor.
          </div>
        ) : (
          <div
            className="absolute left-1/2 top-1/2 origin-center"
            style={{
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            }}
            dangerouslySetInnerHTML={{ __html: renderHtml }}
          />
        )}
      </div>
    </div>
  )
}
