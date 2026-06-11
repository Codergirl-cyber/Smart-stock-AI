import { Link } from 'react-router-dom';

export default function SupabaseConfigScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--background, #f5f3ed)',
        color: 'var(--text-primary, #1f2119)',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid var(--border, #ded6c7)',
          background: 'var(--card, #fffdf7)',
          boxShadow: '0 10px 30px rgba(31, 33, 25, 0.08)',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>
          Supabase not configured
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary, #626052)', lineHeight: 1.6, marginBottom: '16px' }}>
          Authentication cannot run without valid environment variables. The app was trying to use a placeholder URL.
        </p>
        <ol style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: '20px', marginBottom: '20px' }}>
          <li>Copy <code>.env.local.example</code> to <code>.env</code></li>
          <li>Add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code></li>
          <li>Restart <code>npm run dev</code></li>
          <li>For Vercel, set the same variables in Project Settings → Environment Variables</li>
        </ol>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          <Link to="/" style={{ color: 'var(--accent, #5f6f3f)', fontWeight: 600 }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
