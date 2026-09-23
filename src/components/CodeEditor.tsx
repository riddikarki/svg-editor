import { useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { xml } from '@codemirror/lang-xml'
import { oneDark } from '@codemirror/theme-one-dark'
import { AlertTriangle } from 'lucide-react'
import { parseSvg } from '../utils/svgTransforms'

type Props = {
  value: string
  onChange: (value: string) => void
}

export function CodeEditor({ value, onChange }: Props) {
  const [local, setLocal] = useState(value)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    const result = parseSvg(local)
    setError(result.ok ? null : result.error)
  }, [local])

  const extensions = useMemo(() => [xml()], [])

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-900">
      <div className="flex h-9 shrink-0 items-center border-b border-surface-600 px-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Code
        </span>
        {error ? (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-red-400">
            <AlertTriangle size={12} /> Malformed
          </span>
        ) : (
          <span className="ml-auto text-[11px] text-emerald-500/80">Valid SVG</span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 border-b border-red-900/60 bg-red-950/50 px-3 py-2 text-[12px] text-red-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span className="break-words font-mono leading-snug">{error}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-[12px]">
        <CodeMirror
          value={local}
          height="100%"
          theme={oneDark}
          extensions={extensions}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: false,
          }}
          onChange={(v) => {
            setLocal(v)
            onChange(v)
          }}
          className="h-full text-left"
        />
      </div>
    </div>
  )
}
