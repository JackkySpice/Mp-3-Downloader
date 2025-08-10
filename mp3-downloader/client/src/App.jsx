import React, { useEffect, useMemo, useState } from 'react'
import { Download, Music2, Search, Scissors, QrCode, Moon, Sun } from 'lucide-react'
import QRCode from 'qrcode.react'

const BITRATES = [128, 192, 256, 320]

function classNames(...xs) {
  return xs.filter(Boolean).join(' ')
}

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])
  return { isDark, setIsDark }
}

function formatDuration(d) {
  if (!d) return '—'
  const parts = d.split(':').map(Number)
  if (parts.length === 3) return `${parts[0]}h ${parts[1]}m ${parts[2]}s`
  if (parts.length === 2) return `${parts[0]}m ${parts[1]}s`
  return d
}

export default function App() {
  const { isDark, setIsDark } = useDarkMode()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [bitrate, setBitrate] = useState(192)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [selected, setSelected] = useState(null)
  const [showQR, setShowQR] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function download(video) {
    const params = new URLSearchParams({ id: video.id, bitrate: String(bitrate) })
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    const url = `/api/convert?${params.toString()}`
    window.open(url, '_blank')
  }

  const shareLink = useMemo(() => {
    if (!selected) return ''
    const params = new URLSearchParams({ id: selected.id, bitrate: String(bitrate) })
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    return `${window.location.origin}/api/convert?${params.toString()}`
  }, [selected, bitrate, start, end])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-emerald-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/60 dark:bg-slate-900/50 border-b border-white/30 dark:border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white grid place-items-center shadow-lg"><Music2 /></div>
          <div className="font-semibold text-xl">MP3 Downloader</div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-lg bg-white/60 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border border-white/40 dark:border-slate-700 transition">
              {isDark ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <a href="https://github.com/" target="_blank" className="text-xs opacity-70 hover:opacity-100">Star on GitHub</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <section className="mt-8">
          <div className="rounded-2xl p-4 sm:p-6 bg-white/70 dark:bg-slate-900/60 border border-white/50 dark:border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  placeholder="Search YouTube tracks, artists, podcasts..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <button onClick={search} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow hover:opacity-95">
                <Search size={18}/> Search
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:flex gap-3 items-center">
              <div className="text-sm opacity-70">Bitrate</div>
              <div className="flex gap-2 col-span-1 sm:col-span-1">
                {BITRATES.map(b => (
                  <button key={b} onClick={() => setBitrate(b)} className={classNames(
                    'px-3 py-1 text-sm rounded-full border transition',
                    bitrate === b ? 'bg-sky-600 text-white border-sky-600' : 'bg-white/70 dark:bg-slate-800/70 border-slate-300/60 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                  )}>{b} kbps</button>
                ))}
              </div>
              <div className="hidden sm:block flex-1" />
              <div className="flex items-center gap-2">
                <Scissors size={16} className="opacity-70"/>
                <input value={start} onChange={(e)=>setStart(e.target.value)} placeholder="Start (mm:ss or ss)" className="px-2 py-1 text-sm rounded border bg-white/70 dark:bg-slate-800/70 border-slate-300/60 dark:border-slate-700"/>
                <span className="opacity-60">to</span>
                <input value={end} onChange={(e)=>setEnd(e.target.value)} placeholder="End (mm:ss or ss)" className="px-2 py-1 text-sm rounded border bg-white/70 dark:bg-slate-800/70 border-slate-300/60 dark:border-slate-700"/>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          {loading && (
            <div className="text-center py-8 opacity-70">Searching...</div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map((v) => (
                <div key={v.id} className="group rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-900/60 border border-white/50 dark:border-slate-800 shadow-xl hover:shadow-2xl transition">
                  <div className="aspect-video overflow-hidden">
                    <img src={v.thumbnails?.[v.thumbnails.length-1]?.url || v.thumbnails?.[0]?.url} alt={v.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition"/>
                  </div>
                  <div className="p-4">
                    <div className="font-semibold line-clamp-2 min-h-[3rem]">{v.title}</div>
                    <div className="text-xs opacity-70 mt-1">{v.author?.name || 'Unknown'} • {formatDuration(v.duration)}</div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => download(v)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-600 text-white shadow hover:bg-sky-700"><Download size={16}/> Download</button>
                      <button onClick={() => { setSelected(v); setShowQR(true); }} className="px-3 py-2 rounded-lg border border-slate-200/70 dark:border-slate-700 hover:bg-white/60 dark:hover:bg-slate-800"><QrCode size={16}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showQR && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-white/50 dark:border-slate-800 shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="font-semibold mb-3 line-clamp-2">Share download link</div>
            <div className="bg-white p-4 rounded-xl grid place-items-center">
              <QRCode value={shareLink} size={220} includeMargin />
            </div>
            <div className="mt-3 text-xs break-all opacity-70">{shareLink}</div>
            <div className="mt-4 flex justify-end">
              <button className="px-3 py-1.5 rounded-lg bg-sky-600 text-white" onClick={() => setShowQR(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-6xl mx-auto p-6 opacity-70 text-sm">
        <div>Built with ❤️. For personal use only.</div>
      </footer>
    </div>
  )
}