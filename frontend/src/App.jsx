import React, { useState, useEffect } from 'react'

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
    fontFamily: "'Segoe UI', sans-serif"
  },
  header: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px 48px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    marginBottom: '32px',
    width: '100%',
    maxWidth: '800px'
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '8px'
  },
  subtitle: {
    color: '#718096',
    fontSize: '1rem'
  },
  badge: {
    display: 'inline-block',
    background: '#48bb78',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    marginTop: '12px'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    marginBottom: '24px',
    width: '100%',
    maxWidth: '800px'
  },
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '16px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '10px'
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 0',
    borderBottom: '1px solid #f7fafc'
  },
  dot: (color) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0
  }),
  label: {
    color: '#4a5568',
    fontWeight: '500',
    minWidth: '160px'
  },
  value: {
    color: '#2d3748',
    fontWeight: '600'
  },
  button: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '16px',
    transition: 'opacity 0.2s'
  },
  errorBox: {
    background: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: '8px',
    padding: '16px',
    color: '#c53030',
    fontSize: '0.9rem'
  },
  successBox: {
    background: '#f0fff4',
    border: '1px solid #9ae6b4',
    borderRadius: '8px',
    padding: '16px',
    color: '#276749',
    fontSize: '0.9rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  techTag: {
    background: '#ebf4ff',
    color: '#3182ce',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '500',
    textAlign: 'center'
  },
  loading: {
    color: '#a0aec0',
    fontStyle: 'italic'
  }
}

export default function App() {
  const [apiStatus, setApiStatus] = useState(null)
  const [apiData, setApiData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [callCount, setCallCount] = useState(0)

  const fetchHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setApiStatus(data)
      setCallCount(c => c + 1)
    } catch (e) {
      setError(`Backend unreachable: ${e.message}. Make sure Spring Boot is running on port 8080.`)
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/items')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setApiData(data)
      setCallCount(c => c + 1)
    } catch (e) {
      setError(`Failed to fetch items: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>React + Spring Boot</div>
        <div style={styles.subtitle}>AWS CI/CD Pipeline Demo — Whizlabs Sandbox</div>
        <div style={styles.badge}>DEPLOYED VIA AWS CODEPIPELINE</div>
      </div>

      {/* Architecture Info */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Tech Stack</div>
        <div style={styles.grid}>
          {['React 18 (Vite)', 'Spring Boot 3.x', 'AWS CodePipeline', 'AWS CodeBuild',
            'AWS CodeDeploy', 'Amazon EC2', 'Docker', 'GitHub'].map(t => (
            <div key={t} style={styles.techTag}>{t}</div>
          ))}
        </div>
      </div>

      {/* API Health Status */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Backend API Health</div>
        {loading && <div style={styles.loading}>Checking backend status...</div>}
        {error && <div style={styles.errorBox}>{error}</div>}
        {apiStatus && !loading && (
          <div style={styles.successBox}>
            <div style={styles.statusRow}>
              <div style={styles.dot('#48bb78')} />
              <span style={styles.label}>Status:</span>
              <span style={styles.value}>{apiStatus.status}</span>
            </div>
            <div style={styles.statusRow}>
              <div style={styles.dot('#4299e1')} />
              <span style={styles.label}>Service:</span>
              <span style={styles.value}>{apiStatus.service}</span>
            </div>
            <div style={styles.statusRow}>
              <div style={styles.dot('#ed8936')} />
              <span style={styles.label}>Version:</span>
              <span style={styles.value}>{apiStatus.version}</span>
            </div>
            <div style={styles.statusRow}>
              <div style={styles.dot('#9f7aea')} />
              <span style={styles.label}>Timestamp:</span>
              <span style={styles.value}>{apiStatus.timestamp}</span>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={styles.button} onClick={fetchHealth}>Refresh Health</button>
          <button style={{ ...styles.button, background: 'linear-gradient(135deg, #48bb78, #38a169)' }} onClick={fetchData}>
            Fetch Items
          </button>
        </div>
        <div style={{ marginTop: '8px', color: '#a0aec0', fontSize: '0.85rem' }}>
          API calls made: {callCount}
        </div>
      </div>

      {/* Items List */}
      {apiData && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Items from Backend ({apiData.length})</div>
          {apiData.map((item, i) => (
            <div key={i} style={styles.statusRow}>
              <div style={styles.dot('#667eea')} />
              <span style={styles.label}>#{item.id} — {item.name}</span>
              <span style={{ color: '#718096', fontSize: '0.9rem' }}>{item.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Info */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>CI/CD Pipeline Stages</div>
        {[
          { stage: 'Source', desc: 'GitHub repo triggers pipeline on push to main', color: '#4299e1' },
          { stage: 'Build', desc: 'CodeBuild compiles Spring Boot JAR & builds React dist', color: '#ed8936' },
          { stage: 'Deploy', desc: 'CodeDeploy installs artifacts on EC2 via deployment group', color: '#48bb78' }
        ].map(({ stage, desc, color }) => (
          <div key={stage} style={styles.statusRow}>
            <div style={styles.dot(color)} />
            <span style={{ ...styles.label, color }}>{stage}</span>
            <span style={{ color: '#4a5568' }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
