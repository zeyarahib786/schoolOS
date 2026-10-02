import { FormEvent, useEffect, useState } from 'react';
import * as studentsApi from '../students/students.api';
import * as api from './transport.api';

interface Props { mode: 'vehicle' | 'route' | 'assign'; route?: api.RouteItem; onClose: () => void; onSaved: () => void }

export function TransportActionModal({ mode, route, onClose, onSaved }: Props): JSX.Element {
  const [vehicles, setVehicles] = useState<api.Vehicle[]>([]);
  const [students, setStudents] = useState<studentsApi.Student[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(mode !== 'vehicle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'route') api.listVehicles().then(setVehicles).catch(() => setError('Could not load vehicles.')).finally(() => setLoadingOptions(false));
    if (mode === 'assign') studentsApi.listStudents(1, '', { limit: 100, status: 'Active' }).then((result) => setStudents(result.items)).catch(() => setError('Could not load active students.')).finally(() => setLoadingOptions(false));
  }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(null);
    try {
      if (mode === 'vehicle') await api.createVehicle({ regNumber: String(data.get('regNumber')), capacity: Number(data.get('capacity')), driverName: String(data.get('driverName')), driverPhone: String(data.get('driverPhone')) });
      if (mode === 'route') await api.createRoute({ name: String(data.get('name')), vehicleId: String(data.get('vehicleId')), stops: String(data.get('stops')).split(',').map((stop) => stop.trim()).filter(Boolean) });
      if (mode === 'assign' && route) await api.assignStudent(route._id, String(data.get('studentId')));
      onSaved(); onClose();
    } catch {
      setError(mode === 'vehicle' ? 'Could not add vehicle. Registration number may already exist.' : mode === 'route' ? 'Could not create route. Check the route name, vehicle, and stops.' : 'Could not assign student. The route may be at full capacity.');
    } finally { setBusy(false); }
  }

  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  const title = mode === 'vehicle' ? 'Add vehicle' : mode === 'route' ? 'Create route' : `Assign student to ${route?.name ?? 'route'}`;
  const assignedIds = new Set(route?.assignedStudents.map((student) => typeof student === 'string' ? student : student._id) ?? []);
  const availableStudents = students.filter((student) => !assignedIds.has(student._id));

  return <div role="dialog" aria-modal="true" aria-labelledby="transport-modal-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
    <form onSubmit={submit} style={{ width: 'min(500px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
      <h2 id="transport-modal-title">{title}</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {mode === 'vehicle' && <><input name="regNumber" required maxLength={30} placeholder="Registration number" style={field} /><input name="capacity" type="number" min="1" required placeholder="Seat capacity" style={field} /><input name="driverName" required minLength={2} maxLength={120} placeholder="Driver name" style={field} /><input name="driverPhone" required pattern="\+?[0-9 ]{7,20}" placeholder="Driver phone" style={field} /></>}
        {mode === 'route' && <><input name="name" required maxLength={120} placeholder="Route name" style={field} /><select name="vehicleId" required defaultValue="" style={field}><option value="">Select vehicle</option>{vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.regNumber} · {vehicle.capacity} seats · {vehicle.driverName}</option>)}</select><textarea name="stops" required placeholder="Stops separated by commas" style={{ ...field, height: 80, padding: 10 }} /></>}
        {mode === 'assign' && <select name="studentId" required defaultValue="" style={field}><option value="">Select active student</option>{availableStudents.map((student) => <option key={student._id} value={student._id}>{student.name} · {student.refId} · {student.grade}</option>)}</select>}
      </div>
      {error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy || loadingOptions || (mode === 'route' && vehicles.length === 0) || (mode === 'assign' && availableStudents.length === 0)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Saving…' : loadingOptions ? 'Loading…' : 'Save'}</button></div>
    </form>
  </div>;
}
