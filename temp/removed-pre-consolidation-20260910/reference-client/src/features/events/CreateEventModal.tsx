import { FormEvent, useEffect, useState } from 'react';
import * as facilitiesApi from '../facilities/facilities.api';
import * as eventsApi from './events.api';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateEventModal({ onClose, onCreated }: Props): JSX.Element {
  const [facilities, setFacilities] = useState<facilitiesApi.Facility[]>([]);
  const [useVenue, setUseVenue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    facilitiesApi.listFacilities().then(setFacilities).catch(() => setError('Could not load facilities. You can still create an event without a venue.'));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await eventsApi.createEvent({
        title: String(data.get('title')),
        description: String(data.get('description')),
        date: String(data.get('date')),
        audience: String(data.get('audience')) as eventsApi.EventItem['audience'],
        ...(useVenue
          ? {
              venue: {
                facilityId: String(data.get('facilityId')),
                startTime: String(data.get('startTime')),
                endTime: String(data.get('endTime')),
              },
            }
          : {}),
      });
      onCreated();
      onClose();
    } catch {
      setError('Could not create event. Check the details, permissions, and venue availability.');
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="create-event-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <form onSubmit={submit} style={{ width: 'min(540px,calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 20 }}>
        <h2 id="create-event-title">Create event</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <input name="title" required minLength={2} maxLength={160} placeholder="Event title" style={fieldStyle} />
          <textarea name="description" required maxLength={2000} placeholder="Description" style={{ minHeight: 100, borderRadius: 8, border: '1px solid #E2E8F0', padding: 10 }} />
          <input name="date" type="date" required style={fieldStyle} />
          <select name="audience" defaultValue="All" style={fieldStyle}>
            <option>All</option><option>Students</option><option>Staff</option><option>Parents</option>
          </select>
          <label style={{ fontSize: 12.5 }}><input type="checkbox" checked={useVenue} onChange={(e) => setUseVenue(e.target.checked)} /> Reserve a venue</label>
          {useVenue && <>
            <select name="facilityId" required defaultValue="" style={fieldStyle}>
              <option value="">Select facility</option>
              {facilities.map((facility) => <option key={facility._id} value={facility._id}>{facility.name} ({facility.capacity})</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input name="startTime" type="time" required style={fieldStyle} />
              <input name="endTime" type="time" required style={fieldStyle} />
            </div>
          </>}
        </div>
        {error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button disabled={busy || (useVenue && facilities.length === 0)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Creating…' : 'Create event'}</button>
        </div>
      </form>
    </div>
  );
}
