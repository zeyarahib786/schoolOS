/** Standalone isolated render of DataTable with onRowClick wired up, used only for the
 * component-level accessibility check in tests-a11y/ - not part of the shipped application
 * (not imported anywhere in src/app or src/features). Exists so the reusable table component
 * every future module will use can be verified for real, in a real browser, before it's reused
 * in 35 more places. */
import ReactDOM from 'react-dom/client';
import { DataTable } from '../components/ui/DataTable';

interface Row {
  id: string;
  name: string;
  value: string;
}

const rows: Row[] = [
  { id: '1', name: 'Fatima Al Hashimi', value: 'Grade 10 · A' },
  { id: '2', name: 'Omar Siddiqui', value: 'Grade 11 · C' },
];

function Harness() {
  return (
    <main style={{ padding: 24 }}>
      <h1>DataTable accessibility harness</h1>
      <DataTable<Row>
        keyField={(r) => r.id}
        rows={rows}
        onRowClick={(r) => {
          document.title = `clicked:${r.id}`;
        }}
        columns={[
          { header: 'Name', render: (r) => r.name },
          { header: 'Grade', render: (r) => r.value },
        ]}
      />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Harness />);
