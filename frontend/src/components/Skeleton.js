import React from 'react';

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <span className="skeleton" style={{ width: '60%', height: 14 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <span
                    className="skeleton"
                    style={{ width: `${50 + Math.random() * 40}%`, height: 14 }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="stat-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <div className="skeleton" style={{ width: '40%', height: 12, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '60%', height: 44, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '30%', height: 12 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 260 }) {
  return (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        padding: '20px 0',
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            flex: 1,
            height: `${20 + Math.random() * 80}%`,
            borderRadius: '6px 6px 0 0',
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="skeleton" style={{ width: 34, height: 34, borderRadius: 10 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="skeleton" style={{ width: `${40 + Math.random() * 40}%`, height: 12 }} />
            <span className="skeleton" style={{ width: `${20 + Math.random() * 30}%`, height: 10 }} />
          </div>
          <span className="skeleton" style={{ width: 60, height: 20, borderRadius: 999 }} />
        </div>
      ))}
    </div>
  );
}

export default SkeletonTable;
