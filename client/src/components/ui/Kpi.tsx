interface KpiProps {
  label: string;
  value: string | number;
  accentColor?: string;
  onClick?: () => void;
}

/** Ported from the prototype's kpi() template-string helper. Any KPI with an onClick becomes a
 * real drill-down, matching the fix applied across the prototype in earlier rounds (Attendance,
 * Certificates, Audit Log, etc. KPIs were previously "static-looking" and were made clickable). */
export function Kpi({ label, value, accentColor = '#0E7C39', onClick }: KpiProps): JSX.Element {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className="kpi-card"
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 14,
        padding: '14px 16px',
        textAlign: 'left',
        background: '#fff',
        cursor: onClick ? 'pointer' : 'default',
        width: '100%',
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accentColor }}>{value}</div>
    </Tag>
  );
}
