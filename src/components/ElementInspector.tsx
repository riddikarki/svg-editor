import { useEffect, useState } from 'react'
import { MousePointer2 } from 'lucide-react'
import { getElementAttrs, updateElementAttrs } from '../utils/svgTransforms'

type Props = {
  svgMarkup: string
  selectedElementId: string | null
  onChange: (markup: string) => void
  onSelectId: (id: string | null) => void
}

type Fields = {
  id: string
  class: string
  fill: string
  stroke: string
  transform: string
  tag: string
}

const empty: Fields = { id: '', class: '', fill: '', stroke: '', transform: '', tag: '' }

export function ElementInspector({
  svgMarkup,
  selectedElementId,
  onChange,
  onSelectId,
}: Props) {
  const [fields, setFields] = useState<Fields>(empty)

  useEffect(() => {
    if (!selectedElementId) {
      setFields(empty)
      return
    }
    const attrs = getElementAttrs(svgMarkup, selectedElementId)
    if (!attrs) {
      setFields(empty)
      return
    }
    setFields({
      id: attrs.id,
      class: attrs.class,
      fill: attrs.fill,
      stroke: attrs.stroke,
      transform: attrs.transform,
      tag: attrs.tag,
    })
  }, [svgMarkup, selectedElementId])

  const apply = (patch: Partial<Fields>) => {
    if (!selectedElementId) return
    const next = { ...fields, ...patch }
    setFields(next)
    const markup = updateElementAttrs(svgMarkup, selectedElementId, {
      id: next.id,
      class: next.class,
      fill: next.fill,
      stroke: next.stroke,
      transform: next.transform,
    })
    onChange(markup)
    if (patch.id && patch.id !== selectedElementId) {
      onSelectId(patch.id)
    }
  }

  const field = (
    label: string,
    key: keyof Fields,
    opts?: { type?: string; mono?: boolean },
  ) => (
    <label className="block">
      <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="flex gap-1">
        <input
          type={opts?.type === 'color' ? 'text' : opts?.type || 'text'}
          disabled={!selectedElementId}
          value={fields[key]}
          onChange={(e) => apply({ [key]: e.target.value })}
          className={`w-full rounded border border-surface-600 bg-surface-950 px-2 py-1 text-[12px] text-slate-200 outline-none focus:border-accent disabled:opacity-40 ${
            opts?.mono ? 'font-mono' : ''
          }`}
          spellCheck={false}
        />
        {opts?.type === 'color' && (
          <input
            type="color"
            disabled={!selectedElementId || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(fields[key])}
            value={/^#([0-9a-f]{6})$/i.test(fields[key]) ? fields[key] : '#000000'}
            onChange={(e) => apply({ [key]: e.target.value })}
            className="h-[30px] w-8 shrink-0 cursor-pointer rounded border border-surface-600 bg-transparent disabled:opacity-40"
          />
        )}
      </div>
    </label>
  )

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        <MousePointer2 size={12} />
        Element
      </div>

      {!selectedElementId ? (
        <p className="text-[12px] leading-relaxed text-slate-500">
          Click a shape on the canvas to inspect fill, stroke, id, class and transform.
        </p>
      ) : (
        <>
          <p className="font-mono text-[11px] text-accent">
            &lt;{fields.tag || '?'}&gt; · {selectedElementId}
          </p>
          <div className="grid gap-2">
            {field('ID', 'id', { mono: true })}
            {field('Class', 'class', { mono: true })}
            {field('Fill', 'fill', { type: 'color', mono: true })}
            {field('Stroke', 'stroke', { type: 'color', mono: true })}
            {field('Transform', 'transform', { mono: true })}
          </div>
        </>
      )}
    </div>
  )
}
