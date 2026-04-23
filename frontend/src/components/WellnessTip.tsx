const TIPS: { icon: string; title: string; tip: string }[] = [
  { icon: '😴', title: 'Sleep', tip: '7–9 hours of sleep reduces cortisol by up to 37%.' },
  { icon: '🚶', title: 'Movement', tip: 'A 10-minute walk reduces anxiety for up to 4 hours.' },
  { icon: '💧', title: 'Hydration', tip: 'Even mild dehydration increases stress hormones.' },
  { icon: '🌿', title: 'Nature', tip: '20 minutes outdoors lowers cortisol significantly.' },
  { icon: '📱', title: 'Screen time', tip: 'Blue light before bed delays melatonin by up to 3 hours.' },
  { icon: '🤝', title: 'Connection', tip: 'Talking to a friend for 10 minutes reduces stress hormones.' },
  { icon: '🎵', title: 'Music', tip: 'Listening to calm music lowers heart rate and blood pressure.' },
  { icon: '✍️', title: 'Journaling', tip: 'Writing feelings reduces amygdala activity within minutes.' },
  { icon: '🌬️', title: 'Breathing', tip: 'Slow breathing activates the vagus nerve and calms the body.' },
  { icon: '☀️', title: 'Sunlight', tip: 'Morning sunlight for 10 minutes regulates your circadian rhythm.' },
]

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86400000)
}

function WellnessTip(): React.ReactElement {
  const tip = TIPS[getDayOfYear() % TIPS.length]

  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--primary-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {tip.icon}
      </div>
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--primary)',
            margin: '0 0 3px',
          }}
        >
          Today&apos;s Tip — {tip.title}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {tip.tip}
        </p>
      </div>
    </div>
  )
}

export default WellnessTip
