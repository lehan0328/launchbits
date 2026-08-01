export default function Loading() {
  return (
    <div className="app-content">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '24px 0',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        {/* Skeleton toolbar */}
        <div style={{
          height: 40,
          background: 'var(--bg-surface-container)',
          borderRadius: 6,
          width: '30%',
        }} />
        {/* Skeleton table rows */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: 52,
            background: 'var(--bg-surface-container)',
            borderRadius: 6,
            opacity: 1 - i * 0.15,
          }} />
        ))}
      </div>
    </div>
  );
}
