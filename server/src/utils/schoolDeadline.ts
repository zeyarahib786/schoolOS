import { getSettings } from '../modules/settings/settings.repository';
/** Date-only deadlines end at 23:59:59.999 in the configured school timezone. */
export async function schoolDeadline(value: string): Promise<Date> {
  if (value.includes('T')) return new Date(value);
  const zone = (await getSettings()).timezone;
  const [year, month, day] = value.split('-').map(Number),
    wall = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  let instant = wall;
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  for (let n = 0; n < 3; n++) {
    const parts = format.formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const represented = Date.UTC(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute'),
      part('second'),
      999,
    );
    const difference = represented - wall;
    if (!difference) break;
    instant -= difference;
  }
  return new Date(instant);
}
