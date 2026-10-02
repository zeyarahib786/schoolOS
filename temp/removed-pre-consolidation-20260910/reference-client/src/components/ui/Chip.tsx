type ChipTone = 'green' | 'amber' | 'red' | 'blue' | 'gray';

const toneColors: Record<ChipTone, { bg: string; fg: string }> = {
  green: { bg: '#E7F7EE', fg: '#0E7C39' },
  amber: { bg: '#FEF3E2', fg: '#B45309' },
  red: { bg: '#FDECEC', fg: '#B42318' },
  blue: { bg: '#EAF1FF', fg: '#1D4ED8' },
  gray: { bg: '#F1F5F9', fg: '#475569' },
};

export function Chip({ label, tone = 'gray' }: { label: string; tone?: ChipTone }): JSX.Element {
  const c = toneColors[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: c.bg,
        color: c.fg,
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: 11.5,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}
