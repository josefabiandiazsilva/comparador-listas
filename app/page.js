'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────
// LÓGICA DE COMPARACIÓN POR NOMBRE
// ─────────────────────────────────────────────
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'y'])

function normalizar(texto) {
  if (!texto) return []
  let t = String(texto).toLowerCase().trim()
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  t = t.replace(/ñ/g, 'n')
  t = t.replace(/[^a-z0-9\s]/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  return t.split(' ').filter(tok => tok && !CONECTORES.has(tok))
}

function reorganizar(tokens) {
  const n = tokens.length
  if (n === 4) return [...tokens.slice(2), ...tokens.slice(0, 2)]
  if (n === 5) return [...tokens.slice(3), ...tokens.slice(0, 3)]
  if (n >= 6) return [...tokens.slice(-2), ...tokens.slice(0, -2)]
  return tokens
}

function compararSimple(nombre1, nombre2) {
  const t1 = normalizar(nombre1)
  const t2 = normalizar(nombre2)
  const f1 = reorganizar(t1)
  const f2 = reorganizar(t2)
  if (JSON.stringify(f1) === JSON.stringify(f2)) return true
  if (t1.length === t2.length && t1.length > 0) {
    const s1 = [...t1].sort().join('|')
    const s2 = [...t2].sort().join('|')
    if (s1 === s2) return true
  }
  return false
}

// ─────────────────────────────────────────────
// LECTURA DE EXCEL
// ─────────────────────────────────────────────
function leerExcel(buffer, colIndex, filaInicio) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const nombres = []
  const filas = []
  for (let i = filaInicio - 1; i < data.length; i++) {
    const row = data[i]
    const nombre = row[colIndex]
    if (nombre && String(nombre).trim() !== '') {
      nombres.push(String(nombre).trim())
      filas.push(row)
    }
  }
  return { nombres, filas }
}

// ─────────────────────────────────────────────
// COMPONENTE: Zona de carga
// ─────────────────────────────────────────────
function DropZone({ label, sublabel, color, icon, file, onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  const colors = {
    purple: {
      border: dragging ? 'border-purple-500 bg-purple-50' : file ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-purple-300 bg-white hover:bg-purple-50',
      badge: 'bg-purple-100 text-purple-700 border border-purple-200',
      icon: 'text-purple-500',
      btn: 'bg-purple-600 hover:bg-purple-700 text-white',
      dot: 'bg-purple-500',
    },
    orange: {
      border: dragging ? 'border-orange-500 bg-orange-50' : file ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-orange-300 bg-white hover:bg-orange-50',
      badge: 'bg-orange-100 text-orange-700 border border-orange-200',
      icon: 'text-orange-500',
      btn: 'bg-orange-500 hover:bg-orange-600 text-white',
      dot: 'bg-orange-500',
    },
    green: {
      border: dragging ? 'border-green-500 bg-green-50' : file ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-green-300 bg-white hover:bg-green-50',
      badge: 'bg-green-100 text-green-700 border border-green-200',
      icon: 'text-green-500',
      btn: 'bg-green-600 hover:bg-green-700 text-white',
      dot: 'bg-green-500',
    },
  }
  const c = colors[color]

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-5 transition-all cursor-pointer ${c.border}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]) }}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`text-4xl ${c.icon}`}>{icon}</div>
        <div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${c.badge}`}>{label}</span>
          <p className="text-slate-500 text-xs mt-2">{sublabel}</p>
        </div>
        {file ? (
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-slate-100 max-w-full">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`}></span>
            <span className="text-sm font-medium text-slate-700 truncate max-w-[160px] sm:max-w-[180px]">{file.name}</span>
            <button
              className="ml-auto text-slate-400 hover:text-red-500 flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); onFile(null) }}
              title="Quitar archivo"
            >✕</button>
          </div>
        ) : (
          <span className={`text-xs px-4 py-2 rounded-lg font-medium ${c.btn}`}>
            Seleccionar archivo
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE: Tabla de resultados simple
// ─────────────────────────────────────────────
function TablaResultados({ filas, emptyMsg, headers }) {
  if (filas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <span className="text-4xl mb-2">📭</span>
        <p className="text-sm">{emptyMsg}</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-3 py-2 text-slate-500 font-semibold text-xs w-10">#</th>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 text-slate-500 font-semibold text-xs whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-3 py-2 text-slate-400 text-xs">{idx + 1}</td>
              {(Array.isArray(fila) ? fila : [fila]).map((cel, ci) => (
                <td key={ci} className="px-3 py-2 text-slate-700 whitespace-nowrap">{cel ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Badge para tipo de match
function MatchBadge({ tipo }) {
  if (!tipo) return <span className="text-slate-300 text-xs">—</span>
  if (tipo === 'email') return (
    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">email</span>
  )
  return (
    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">nombre</span>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function ComparadorPage() {
  const [listaFile, setListaFile]   = useState(null)
  const [moodleFile, setMoodleFile] = useState(null)
  const [sigaFile, setSigaFile]     = useState(null)
  const [preview, setPreview]       = useState({ lista: [], moodle: [], siga: [] })
  const [resultados, setResultados] = useState(null)
  const [tab, setTab]               = useState('coincidencias')
  const [cargando, setCargando]     = useState(false)
  const [error, setError]           = useState('')

  const leerBuffer = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(new Uint8Array(e.target.result))
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })

  // ── Previews ──
  const cargarPreviewLista = async (file) => {
    setListaFile(file)
    setResultados(null)
    if (!file) { setPreview(p => ({ ...p, lista: [] })); return }
    try {
      const buf = await leerBuffer(file)
      const { nombres } = leerExcel(buf, 0, 2)  // Col A, fila 2
      setPreview(p => ({ ...p, lista: nombres.slice(0, 5) }))
    } catch { setPreview(p => ({ ...p, lista: [] })) }
  }

  const cargarPreviewMoodle = async (file) => {
    setMoodleFile(file)
    setResultados(null)
    if (!file) { setPreview(p => ({ ...p, moodle: [] })); return }
    try {
      const buf = await leerBuffer(file)
      const { nombres } = leerExcel(buf, 0, 2)  // Col A, fila 2
      setPreview(p => ({ ...p, moodle: nombres.slice(0, 5) }))
    } catch { setPreview(p => ({ ...p, moodle: [] })) }
  }

  const cargarPreviewSiga = async (file) => {
    setSigaFile(file)
    setResultados(null)
    if (!file) { setPreview(p => ({ ...p, siga: [] })); return }
    try {
      const buf = await leerBuffer(file)
      const { nombres } = leerExcel(buf, 1, 6)  // Col B, fila 6
      setPreview(p => ({ ...p, siga: nombres.slice(0, 5) }))
    } catch { setPreview(p => ({ ...p, siga: [] })) }
  }

  // ── Comparación principal ──
  const comparar = async () => {
    setError('')
    if (!listaFile || !moodleFile || !sigaFile) {
      setError('Por favor selecciona los tres archivos antes de comparar.')
      return
    }
    setCargando(true)
    try {
      const [bufLista, bufMoodle, bufSiga] = await Promise.all([
        leerBuffer(listaFile),
        leerBuffer(moodleFile),
        leerBuffer(sigaFile),
      ])

      // LISTA : Col A=nombre · Col B=correo personal · Col C=correo institucional · desde fila 2
      const lista  = leerExcel(bufLista,  0, 2)
      // MOODLE: Col A=nombre · Col B=código          · Col C=correo institucional · desde fila 2
      const moodle = leerExcel(bufMoodle, 0, 2)
      // SIGA  : Col B=nombre · Col C=código          · Col D=correo personal      · desde fila 6
      const siga   = leerExcel(bufSiga,   1, 6)

      const moodleUsado = new Array(moodle.nombres.length).fill(false)
      const sigaUsado   = new Array(siga.nombres.length).fill(false)

      const coincidencias = []  // entradas de LISTA con al menos un match
      const soloEnLista   = []  // entradas de LISTA sin match en ningún sistema

      for (let i = 0; i < lista.nombres.length; i++) {
        const lRow            = lista.filas[i]
        const nombreLista     = lista.nombres[i]
        const correoPersonalL = String(lRow[1] ?? '').trim()  // Col B
        const correoInstL     = String(lRow[2] ?? '').trim()  // Col C

        // ══ BUSCAR EN MOODLE ══
        // 1) Correo institucional exacto (LISTA.C == MOODLE.C)
        let moodleIdx = -1
        let matchTipoMoodle = ''
        for (let j = 0; j < moodle.nombres.length; j++) {
          if (!moodleUsado[j]) {
            const correoInstM = String(moodle.filas[j][2] ?? '').trim()  // Col C
            if (correoInstL && correoInstM &&
                correoInstL.toLowerCase() === correoInstM.toLowerCase()) {
              moodleIdx = j
              matchTipoMoodle = 'email'
              break
            }
          }
        }
        // 2) Fallback: comparación por nombre
        if (moodleIdx === -1) {
          for (let j = 0; j < moodle.nombres.length; j++) {
            if (!moodleUsado[j] && compararSimple(nombreLista, moodle.nombres[j])) {
              moodleIdx = j
              matchTipoMoodle = 'nombre'
              break
            }
          }
        }

        // ══ BUSCAR EN SIGA ══
        // 1) Correo personal exacto (LISTA.B == SIGA.D)
        let sigaIdx = -1
        let matchTipoSiga = ''
        for (let j = 0; j < siga.nombres.length; j++) {
          if (!sigaUsado[j]) {
            const correoPersonalS = String(siga.filas[j][3] ?? '').trim()  // Col D
            if (correoPersonalL && correoPersonalS &&
                correoPersonalL.toLowerCase() === correoPersonalS.toLowerCase()) {
              sigaIdx = j
              matchTipoSiga = 'email'
              break
            }
          }
        }
        // 2) Fallback: comparación por nombre
        if (sigaIdx === -1) {
          for (let j = 0; j < siga.nombres.length; j++) {
            if (!sigaUsado[j] && compararSimple(nombreLista, siga.nombres[j])) {
              sigaIdx = j
              matchTipoSiga = 'nombre'
              break
            }
          }
        }

        // ══ CONSTRUIR ENTRADA ══
        let moodleData = null
        if (moodleIdx !== -1) {
          const mRow = moodle.filas[moodleIdx]
          moodleData = {
            nombre:     moodle.nombres[moodleIdx],
            codigo:     String(mRow[1] ?? '').trim(),   // Col B
            correoInst: String(mRow[2] ?? '').trim(),   // Col C
            matchTipo:  matchTipoMoodle,
          }
          moodleUsado[moodleIdx] = true
        }

        let sigaData = null
        if (sigaIdx !== -1) {
          const sRow = siga.filas[sigaIdx]
          sigaData = {
            nombre:         siga.nombres[sigaIdx],
            codigo:         String(sRow[2] ?? '').trim(),   // Col C
            correoPersonal: String(sRow[3] ?? '').trim(),   // Col D
            matchTipo:      matchTipoSiga,
          }
          sigaUsado[sigaIdx] = true
        }

        const entry = { nombreLista, correoPersonalL, correoInstL, moodle: moodleData, siga: sigaData }

        if (!moodleData && !sigaData) {
          soloEnLista.push(entry)
        } else {
          coincidencias.push(entry)
        }
      }

      // Entradas de MOODLE sin match en LISTA
      const soloMoodle = []
      for (let j = 0; j < moodle.nombres.length; j++) {
        if (!moodleUsado[j]) {
          const mRow = moodle.filas[j]
          soloMoodle.push({
            nombre:     moodle.nombres[j],
            codigo:     String(mRow[1] ?? '').trim(),
            correoInst: String(mRow[2] ?? '').trim(),
          })
        }
      }

      // Entradas de SIGA sin match en LISTA
      const soloSiga = []
      for (let j = 0; j < siga.nombres.length; j++) {
        if (!sigaUsado[j]) {
          const sRow = siga.filas[j]
          soloSiga.push({
            nombre:         siga.nombres[j],
            codigo:         String(sRow[2] ?? '').trim(),
            correoPersonal: String(sRow[3] ?? '').trim(),
          })
        }
      }

      setResultados({
        coincidencias,
        soloEnLista,
        soloMoodle,
        soloSiga,
        totalLista:  lista.nombres.length,
        totalMoodle: moodle.nombres.length,
        totalSiga:   siga.nombres.length,
      })
      setTab('coincidencias')
    } catch (e) {
      console.error(e)
      setError('Error al procesar los archivos. Verifica que sean archivos Excel válidos (.xlsx o .xls).')
    } finally {
      setCargando(false)
    }
  }

  // ── Descarga Excel ──
  const descargarExcel = () => {
    if (!resultados) return
    const { coincidencias, soloEnLista, soloMoodle, soloSiga } = resultados
    const wb = XLSX.utils.book_new()

    // Hoja 1: Resultados completos ordenados por LISTA
    // Primera columna = Nombre LISTA (orden de LISTA)
    const todasLasEntradas = [...coincidencias, ...soloEnLista]
    const wsData1 = [
      ['#', 'Nombre LISTA', 'Nombre MOODLE', 'Nombre SIGA',
       'Código MOODLE', 'Código SIGA',
       'Correo Institucional', 'Correo Personal',
       'Match MOODLE', 'Match SIGA'],
      ...todasLasEntradas.map((c, i) => [
        i + 1,
        c.nombreLista,
        c.moodle?.nombre         ?? '',
        c.siga?.nombre           ?? '',
        c.moodle?.codigo         ?? '',
        c.siga?.codigo           ?? '',
        c.moodle?.correoInst     ?? c.correoInstL     ?? '',
        c.siga?.correoPersonal   ?? c.correoPersonalL ?? '',
        c.moodle ? c.moodle.matchTipo : 'no encontrado',
        c.siga   ? c.siga.matchTipo   : 'no encontrado',
      ]),
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(wsData1)
    ws1['!cols'] = [
      { wch: 5 }, { wch: 36 }, { wch: 36 }, { wch: 36 },
      { wch: 16 }, { wch: 16 },
      { wch: 38 }, { wch: 38 },
      { wch: 14 }, { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, ws1, 'Resultados LISTA')

    // Hoja 2: Solo en MOODLE
    const wsData2 = [
      ['#', 'Nombre MOODLE', 'Código MOODLE', 'Correo Institucional'],
      ...soloMoodle.map((r, i) => [i + 1, r.nombre, r.codigo, r.correoInst]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(wsData2)
    ws2['!cols'] = [{ wch: 5 }, { wch: 36 }, { wch: 16 }, { wch: 38 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Solo en MOODLE')

    // Hoja 3: Solo en SIGA
    const wsData3 = [
      ['#', 'Nombre SIGA', 'Código SIGA', 'Correo Personal'],
      ...soloSiga.map((r, i) => [i + 1, r.nombre, r.codigo, r.correoPersonal]),
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(wsData3)
    ws3['!cols'] = [{ wch: 5 }, { wch: 36 }, { wch: 16 }, { wch: 38 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Solo en SIGA')

    // Hoja 4: Solo en LISTA
    const wsData4 = [
      ['#', 'Nombre LISTA', 'Correo Personal', 'Correo Institucional'],
      ...soloEnLista.map((r, i) => [i + 1, r.nombreLista, r.correoPersonalL, r.correoInstL]),
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(wsData4)
    ws4['!cols'] = [{ wch: 5 }, { wch: 36 }, { wch: 38 }, { wch: 38 }]
    XLSX.utils.book_append_sheet(wb, ws4, 'Solo en LISTA')

    // Hoja 5: Resumen
    const wsData5 = [
      ['Resumen de comparación'],
      [''],
      ['Categoría', 'Cantidad'],
      ['Total en LISTA',  resultados.totalLista],
      ['Total en MOODLE', resultados.totalMoodle],
      ['Total en SIGA',   resultados.totalSiga],
      [''],
      ['Coincidencias (LISTA con match)',      coincidencias.length],
      ['Solo en LISTA (sin match)',             soloEnLista.length],
      ['Solo en MOODLE (sin match en LISTA)',  soloMoodle.length],
      ['Solo en SIGA (sin match en LISTA)',    soloSiga.length],
    ]
    const ws5 = XLSX.utils.aoa_to_sheet(wsData5)
    ws5['!cols'] = [{ wch: 36 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws5, 'Resumen')

    XLSX.writeFile(wb, 'comparacion_lista_moodle_siga.xlsx')
  }

  // ── Tabs config ──
  const tabs = resultados ? [
    {
      id: 'coincidencias', label: '✓ Coincidencias', count: resultados.coincidencias.length,
      color: 'text-green-600', active: 'border-green-500 text-green-700 bg-green-50',
    },
    {
      id: 'soloMoodle', label: 'Solo MOODLE', count: resultados.soloMoodle.length,
      color: 'text-orange-600', active: 'border-orange-500 text-orange-700 bg-orange-50',
    },
    {
      id: 'soloSiga', label: 'Solo SIGA', count: resultados.soloSiga.length,
      color: 'text-blue-600', active: 'border-blue-500 text-blue-700 bg-blue-50',
    },
    {
      id: 'soloLista', label: 'Solo en LISTA', count: resultados.soloEnLista.length,
      color: 'text-purple-600', active: 'border-purple-500 text-purple-700 bg-purple-50',
    },
  ] : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">C</div>
          <div>
            <h1 className="font-bold text-slate-800 text-base leading-tight">Comparador LISTA · MOODLE · SIGA</h1>
            <p className="text-slate-400 text-xs hidden sm:block">Tecnológica del Oriente · Comparación inteligente de listados</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">

        {/* ── Carga de archivos ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">1. Selecciona los tres archivos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* LISTA */}
            <div>
              <DropZone
                label="LISTA (principal)"
                sublabel="Col A=nombre · Col B=correo personal · Col C=correo inst. · Fila 2"
                color="purple"
                icon="📋"
                file={listaFile}
                onFile={cargarPreviewLista}
              />
              {preview.lista.length > 0 && (
                <div className="mt-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-purple-600 mb-1">Vista previa:</p>
                  {preview.lista.map((n, i) => <p key={i} className="text-xs text-slate-600 truncate">· {n}</p>)}
                </div>
              )}
            </div>

            {/* MOODLE */}
            <div>
              <DropZone
                label="MOODLE"
                sublabel="Col A=nombre · Col B=código · Col C=correo inst. · Fila 2"
                color="orange"
                icon="📗"
                file={moodleFile}
                onFile={cargarPreviewMoodle}
              />
              {preview.moodle.length > 0 && (
                <div className="mt-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-orange-600 mb-1">Vista previa:</p>
                  {preview.moodle.map((n, i) => <p key={i} className="text-xs text-slate-600 truncate">· {n}</p>)}
                </div>
              )}
            </div>

            {/* SIGA */}
            <div>
              <DropZone
                label="SIGA"
                sublabel="Col B=nombre · Col C=código · Col D=correo personal · Fila 6"
                color="green"
                icon="📘"
                file={sigaFile}
                onFile={cargarPreviewSiga}
              />
              {preview.siga.length > 0 && (
                <div className="mt-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-green-600 mb-1">Vista previa:</p>
                  {preview.siga.map((n, i) => <p key={i} className="text-xs text-slate-600 truncate">· {n}</p>)}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-start gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={comparar}
              disabled={cargando || !listaFile || !moodleFile || !sigaFile}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Comparando...
                </>
              ) : '🔍 Comparar listados'}
            </button>
            {resultados && (
              <button
                onClick={descargarExcel}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-green-700 border-2 border-green-500 hover:bg-green-50 transition-all text-sm flex items-center justify-center gap-2"
              >
                📥 Descargar Excel
              </button>
            )}
          </div>
        </section>

        {/* ── Resultados ── */}
        {resultados && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">2. Resultados</h2>

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">{resultados.coincidencias.length}</div>
                <div className="text-xs text-green-500 font-medium mt-1">Coincidencias</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {resultados.totalLista > 0
                    ? Math.round((resultados.coincidencias.length / resultados.totalLista) * 100) + '%'
                    : '0%'}
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-orange-500">{resultados.soloMoodle.length}</div>
                <div className="text-xs text-orange-500 font-medium mt-1">Solo MOODLE</div>
                <div className="text-xs text-slate-400 mt-0.5">sin par en LISTA</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-500">{resultados.soloSiga.length}</div>
                <div className="text-xs text-blue-500 font-medium mt-1">Solo SIGA</div>
                <div className="text-xs text-slate-400 mt-0.5">sin par en LISTA</div>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-purple-500">{resultados.soloEnLista.length}</div>
                <div className="text-xs text-purple-500 font-medium mt-1">Solo en LISTA</div>
                <div className="text-xs text-slate-400 mt-0.5">sin match encontrado</div>
              </div>
            </div>

            {/* Pestañas */}
            <div className="flex border-b border-slate-200 mb-4 gap-1 overflow-x-auto">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0 rounded-t-lg
                    ${tab === t.id
                      ? t.active + ' border-b-2'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {t.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold
                    ${tab === t.id ? 'bg-white shadow-sm' : 'bg-slate-100'} ${t.color}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* ── Tab: Coincidencias ── */}
            {tab === 'coincidencias' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                {resultados.coincidencias.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <span className="text-4xl mb-2">📭</span>
                    <p className="text-sm">No se encontraron coincidencias.</p>
                  </div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2 text-slate-400 font-semibold text-xs w-10">#</th>
                        <th className="text-left px-3 py-2 text-purple-500 font-semibold text-xs whitespace-nowrap">Nombre LISTA</th>
                        <th className="text-left px-3 py-2 text-orange-500 font-semibold text-xs whitespace-nowrap">Nombre MOODLE</th>
                        <th className="text-left px-3 py-2 text-green-600 font-semibold text-xs whitespace-nowrap">Nombre SIGA</th>
                        <th className="text-left px-3 py-2 text-slate-400 font-semibold text-xs whitespace-nowrap">Cód. MOODLE</th>
                        <th className="text-left px-3 py-2 text-slate-400 font-semibold text-xs whitespace-nowrap">Cód. SIGA</th>
                        <th className="text-left px-3 py-2 text-slate-400 font-semibold text-xs whitespace-nowrap">Correo Institucional</th>
                        <th className="text-left px-3 py-2 text-slate-400 font-semibold text-xs whitespace-nowrap">Correo Personal</th>
                        <th className="text-left px-3 py-2 text-slate-400 font-semibold text-xs whitespace-nowrap">Match M</th>
                        <th className="text-left px-3 py-2 text-slate-400 font-semibold text-xs whitespace-nowrap">Match S</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.coincidencias.map((c, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="px-3 py-2 text-slate-400 text-xs">{idx + 1}</td>
                          <td className="px-3 py-2 text-slate-800 font-medium whitespace-nowrap">{c.nombreLista}</td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c.moodle?.nombre ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c.siga?.nombre ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{c.moodle?.codigo ?? ''}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{c.siga?.codigo ?? ''}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-xs">{c.moodle?.correoInst ?? c.correoInstL}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-xs">{c.siga?.correoPersonal ?? c.correoPersonalL}</td>
                          <td className="px-3 py-2"><MatchBadge tipo={c.moodle?.matchTipo} /></td>
                          <td className="px-3 py-2"><MatchBadge tipo={c.siga?.matchTipo} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Tab: Solo MOODLE ── */}
            {tab === 'soloMoodle' && (
              <TablaResultados
                filas={resultados.soloMoodle.map(r => [r.nombre, r.codigo, r.correoInst])}
                headers={['Nombre MOODLE', 'Código MOODLE', 'Correo Institucional']}
                emptyMsg="Todos los registros de MOODLE tienen coincidencia en LISTA."
              />
            )}

            {/* ── Tab: Solo SIGA ── */}
            {tab === 'soloSiga' && (
              <TablaResultados
                filas={resultados.soloSiga.map(r => [r.nombre, r.codigo, r.correoPersonal])}
                headers={['Nombre SIGA', 'Código SIGA', 'Correo Personal']}
                emptyMsg="Todos los registros de SIGA tienen coincidencia en LISTA."
              />
            )}

            {/* ── Tab: Solo en LISTA ── */}
            {tab === 'soloLista' && (
              <TablaResultados
                filas={resultados.soloEnLista.map(r => [r.nombreLista, r.correoPersonalL, r.correoInstL])}
                headers={['Nombre LISTA', 'Correo Personal', 'Correo Institucional']}
                emptyMsg="Todos los registros de LISTA tienen al menos una coincidencia."
              />
            )}

            {/* Totales */}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>📋 Total LISTA: <strong className="text-slate-600">{resultados.totalLista}</strong></span>
              <span>📗 Total MOODLE: <strong className="text-slate-600">{resultados.totalMoodle}</strong></span>
              <span>📘 Total SIGA: <strong className="text-slate-600">{resultados.totalSiga}</strong></span>
            </div>
          </section>
        )}

        {/* ── Panel informativo ── */}
        {!resultados && (
          <section className="bg-white/60 rounded-2xl border border-slate-100 p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-500 mb-4">¿Cómo funciona?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-500">
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">📋</span>
                <div>
                  <p className="font-medium text-slate-600">LISTA (archivo principal)</p>
                  <p className="text-xs mt-1">Es el ancla. Los resultados se ordenan según el orden de esta lista. Fila 2 en adelante.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">📗</span>
                <div>
                  <p className="font-medium text-slate-600">LISTA ↔ MOODLE</p>
                  <p className="text-xs mt-1">Primero compara correos institucionales (Col C de cada uno). Si no coincide, busca por nombre.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">📘</span>
                <div>
                  <p className="font-medium text-slate-600">LISTA ↔ SIGA</p>
                  <p className="text-xs mt-1">Primero compara correos personales (LISTA Col B vs SIGA Col D). Si no coincide, busca por nombre.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 items-center text-xs text-slate-500">
              <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">email</span>
              <span>= match por correo exacto</span>
              <span className="bg-amber-100 text-amber-600 px-2 py-1 rounded-full font-medium ml-2">nombre</span>
              <span>= match por comparación inteligente de nombre</span>
            </div>
          </section>
        )}
      </main>

      <footer className="text-center text-xs text-slate-300 py-6">
        Tecnológica del Oriente · Comparador LISTA · MOODLE · SIGA
      </footer>
    </div>
  )
}
