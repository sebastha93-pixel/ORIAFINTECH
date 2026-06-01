import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:'100vh', background:'#070B14', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ background:'#0F172A', border:'1px solid #1E2D45', borderRadius:20, padding:28, maxWidth:380, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
            <div style={{ color:'#F8FAFC', fontSize:18, fontWeight:700, marginBottom:8 }}>Algo salió mal</div>
            <div style={{ color:'#64748B', fontSize:13, marginBottom:20, fontFamily:'monospace', textAlign:'left', background:'#070B14', padding:12, borderRadius:10 }}>
              {(this.state.error as Error).message}
            </div>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{ padding:'12px 24px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#22C55E,#16A34A)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}
            >
              Recargar app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
