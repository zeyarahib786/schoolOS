interface Column<T> {
  header: string;
  render: (row: T) => JSX.Element | string;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  keyField: (row: T) => string;
}

/** Generic sortable-ready table shell matching the prototype's `.tbl` pattern reused across
 * all 36 modules - one component instead of 36 bespoke tables. */
export function DataTable<T>({
  columns,
  rows,
  onRowClick,
  emptyLabel = 'No records found',
  keyField,
}: DataTableProps<T>): JSX.Element {
  if (rows.length === 0) {
    return <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 13 }}>{emptyLabel}</div>;
  }
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            {columns.map((c) => (
              <th
                key={c.header}
                style={{ textAlign: c.align ?? 'left', padding: '10px 14px', fontWeight: 600, color: '#475569' }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyField(row)}
              onClick={() => onRowClick?.(row)}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                borderTop: '1px solid #F1F5F9',
                outlineOffset: -2,
              }}
            >
              {columns.map((c) => (
                <td key={c.header} style={{ padding: '10px 14px', textAlign: c.align ?? 'left' }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
