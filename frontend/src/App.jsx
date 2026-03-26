import { useState, useEffect, useCallback } from 'react'

const API_BASE = '/api'

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  get:    (path)       => fetch(`${API_BASE}${path}`).then(r => r.json()),
  post:   (path, body) => fetch(`${API_BASE}${path}`, { method: 'POST',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  put:    (path, body) => fetch(`${API_BASE}${path}`, { method: 'PUT',    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  delete: (path)       => fetch(`${API_BASE}${path}`, { method: 'DELETE' }).then(r => r.json()),
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const color = status === 'active' ? '#22c55e' : '#f59e0b'
  return (
    <span style={{ background: color + '22', color, border: `1px solid ${color}`, borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
      {status}
    </span>
  )
}

// ─── Item Form (create / edit) ────────────────────────────────────────────────
function ItemForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || { name: '', description: '', status: 'active' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 8, padding: 20, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 16px', color: '#f1f5f9', fontSize: 16 }}>
        {initial?.id ? '✏️ Edit Item' : '➕ New Item'}
      </h3>
      <div style={{ display: 'grid', gap: 12 }}>
        <input
          placeholder="Name *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          style={inputStyle}
        />
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onSave(form)} disabled={loading || !form.name.trim()} style={btnStyle('#3b82f6')}>
            {loading ? 'Saving…' : (initial?.id ? 'Update Item' : 'Create Item')}
          </button>
          <button onClick={onCancel} style={btnStyle('#475569')}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Item Row ─────────────────────────────────────────────────────────────────
function ItemRow({ item, onEdit, onDelete }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 15 }}>{item.name}</span>
          <StatusBadge status={item.status} />
          <span style={{ color: '#64748b', fontSize: 11, marginLeft: 'auto' }}>ID: {item.id}</span>
        </div>
        {item.description && <div style={{ color: '#94a3b8', fontSize: 13 }}>{item.description}</div>}
        {item.createdAt && (
          <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
            Created: {new Date(item.createdAt).toLocaleString()}
            {item.updatedAt && item.updatedAt !== item.createdAt &&
              ` · Updated: ${new Date(item.updatedAt).toLocaleString()}`}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEdit(item)} style={btnStyle('#0ea5e9', true)}>Edit</button>
        <button onClick={() => onDelete(item.id)} style={btnStyle('#ef4444', true)}>Delete</button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [items, setItems]         = useState([])
  const [health, setHealth]       = useState(null)
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [formMode, setFormMode]   = useState(null)   // null | 'create' | item-object
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [toast, setToast]         = useState(null)
  const [activeTab, setActiveTab] = useState('items')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Fetch data ─────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      let path = '/items'
      if (search) path += `?search=${encodeURIComponent(search)}`
      else if (filterStatus) path += `?status=${filterStatus}`
      const data = await api.get(path)
      setItems(Array.isArray(data) ? data : [])
    } catch { showToast('Failed to fetch items from RDS', 'error') }
    finally { setLoading(false) }
  }, [search, filterStatus])

  const fetchHealth = async () => {
    try { setHealth(await api.get('/health')) }
    catch { setHealth({ status: 'DOWN', error: 'Cannot reach backend' }) }
  }

  const fetchStats = async () => {
    try { setStats(await api.get('/items/stats')) }
    catch { /* stats are optional */ }
  }

  useEffect(() => { fetchHealth(); fetchStats() }, [])
  useEffect(() => { fetchItems() }, [fetchItems])

  // ─── CRUD handlers ──────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    setLoading(true)
    try {
      if (formMode?.id) {
        await api.put(`/items/${formMode.id}`, form)
        showToast('Item updated in MySQL RDS ✓')
      } else {
        await api.post('/items', form)
        showToast('Item created in MySQL RDS ✓')
      }
      setFormMode(null)
      fetchItems()
      fetchStats()
    } catch { showToast('Save failed', 'error') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item from the database?')) return
    try {
      await api.delete(`/items/${id}`)
      showToast('Item deleted from MySQL RDS ✓')
      fetchItems()
      fetchStats()
    } catch { showToast('Delete failed', 'error') }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            🚀 AWS CI/CD Pipeline Demo
          </h1>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            React + Spring Boot + <strong style={{ color: '#f59e0b' }}>MySQL RDS</strong> + CodePipeline
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: health?.status === 'UP' ? '#22c55e22' : '#ef444422',
            color: health?.status === 'UP' ? '#22c55e' : '#ef4444',
            border: `1px solid ${health?.status === 'UP' ? '#22c55e' : '#ef4444'}`,
            borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600
          }}>
            {health?.status === 'UP' ? '● ONLINE' : '● OFFLINE'}
          </span>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#22c55e',
          color: '#fff', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* Stats Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total in RDS',  value: stats.total,    color: '#3b82f6' },
              { label: 'Active',        value: stats.active,   color: '#22c55e' },
              { label: 'Inactive',      value: stats.inactive, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background: '#1e293b', border: `1px solid ${s.color}44`, borderRadius: 8, padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #334155' }}>
          {[
            { key: 'items',  label: '📦 Items (MySQL RDS)' },
            { key: 'health', label: '🩺 Health' },
            { key: 'info',   label: 'ℹ️ Pipeline Info' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              background: activeTab === tab.key ? '#3b82f6' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#94a3b8',
              border: 'none', borderRadius: '6px 6px 0 0', padding: '8px 18px',
              cursor: 'pointer', fontWeight: 600, fontSize: 13
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Items Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'items' && (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                placeholder="🔍 Search by name…"
                value={search}
                onChange={e => { setSearch(e.target.value); setFilterStatus('') }}
                style={{ ...inputStyle, flex: 1, minWidth: 160 }}
              />
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setSearch('') }}
                style={{ ...inputStyle, width: 150 }}
              >
                <option value="">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
              <button onClick={() => setFormMode('create')} style={btnStyle('#22c55e')}>
                + New Item
              </button>
              <button onClick={() => { fetchItems(); fetchStats() }} style={btnStyle('#475569')}>
                ↻ Refresh
              </button>
            </div>

            {/* Create / Edit Form */}
            {formMode && (
              <ItemForm
                initial={formMode === 'create' ? null : formMode}
                onSave={handleSave}
                onCancel={() => setFormMode(null)}
                loading={loading}
              />
            )}

            {/* Items List */}
            {loading && !formMode ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
                Loading from MySQL RDS…
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: 40, background: '#1e293b', borderRadius: 8 }}>
                No items found. Click <strong style={{ color: '#22c55e' }}>+ New Item</strong> to add one to the database.
              </div>
            ) : (
              items.map(item => (
                <ItemRow key={item.id} item={item} onEdit={setFormMode} onDelete={handleDelete} />
              ))
            )}
          </>
        )}

        {/* ── Health Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'health' && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: 18 }}>Backend Health Status</h2>
              <button onClick={fetchHealth} style={btnStyle('#475569', true)}>↻ Refresh</button>
            </div>
            {health ? (
              <div style={{ display: 'grid', gap: 0 }}>
                {Object.entries(health).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1e293b' }}>
                    <span style={{ color: '#64748b', fontSize: 14, textTransform: 'capitalize', minWidth: 140 }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span style={{
                      color: k === 'status' ? (v === 'UP' ? '#22c55e' : '#ef4444') : '#e2e8f0',
                      fontWeight: k === 'status' ? 700 : 400, fontSize: 14, textAlign: 'right'
                    }}>
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b' }}>Loading health data…</div>
            )}
          </div>
        )}

        {/* ── Pipeline Info Tab ──────────────────────────────────────────────── */}
        {activeTab === 'info' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { stage: '1. Source',  color: '#3b82f6', desc: 'GitHub push to main branch triggers the pipeline via webhook.' },
              { stage: '2. Build',   color: '#f59e0b', desc: 'CodeBuild compiles the Spring Boot JAR, builds the React dist, and packages all artifacts into a ZIP.' },
              { stage: '3. Deploy',  color: '#22c55e', desc: 'CodeDeploy delivers the ZIP to EC2, runs docker-compose up, and validates the /api/health endpoint.' },
            ].map(s => (
              <div key={s.stage} style={{ background: '#1e293b', border: `1px solid ${s.color}44`, borderRadius: 8, padding: 20 }}>
                <div style={{ color: s.color, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{s.stage}</div>
                <div style={{ color: '#94a3b8', fontSize: 14 }}>{s.desc}</div>
              </div>
            ))}
            <div style={{ background: '#1e293b', border: '1px solid #f59e0b44', borderRadius: 8, padding: 20 }}>
              <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>🗄️ Database</div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>
                All Items data is persisted in <strong style={{ color: '#e2e8f0' }}>Amazon RDS MySQL</strong>.
                The Spring Boot backend connects via JDBC using environment variables injected at deployment time.
                Data survives container restarts and re-deployments.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputStyle = {
  background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
  color: '#e2e8f0', padding: '8px 12px', fontSize: 14, outline: 'none',
  width: '100%', boxSizing: 'border-box'
}

const btnStyle = (bg, small = false) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: small ? '6px 12px' : '8px 16px', cursor: 'pointer',
  fontWeight: 600, fontSize: small ? 13 : 14, whiteSpace: 'nowrap'
})
