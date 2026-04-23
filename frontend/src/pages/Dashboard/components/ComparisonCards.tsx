import { motion } from 'framer-motion';

interface ComparisonCard {
  emoji: string;
  title: string;
  detail: string;
  label: string;
}

interface ComparisonCardsProps {
  cards: ComparisonCard[];
}

function defaultCards(): ComparisonCard[] {
  return [
    {
      emoji: '😊',
      title: 'Your smile was',
      detail: '90% stronger today than your last session',
      label: '↑ Great improvement!',
    },
    {
      emoji: '😴',
      title: 'Your sleep quality',
      detail: 'improved by 23% compared to last week',
      label: '↑ Keep it up!',
    },
    {
      emoji: '🧘',
      title: 'You stayed calm for',
      detail: '18 minutes today — your longest streak yet!',
      label: '↑ New personal best!',
    },
    {
      emoji: '💬',
      title: 'You opened up more',
      detail: "in today's consultation — that takes real courage",
      label: "↑ We're proud of you",
    },
  ];
}

function ComparisonCards({ cards }: ComparisonCardsProps): React.ReactElement {
  const displayCards = cards.length > 0 ? cards : defaultCards();

  return (
    <div>
      <h2
        style={{
          color: '#2d3748',
          fontSize: '1.05rem',
          fontWeight: 600,
          marginBottom: '16px',
        }}
      >
        How You're Doing 🌟
      </h2>
      <div className="comparison-cards-row">
        {displayCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="comparison-card"
          >
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{card.emoji}</div>
            <p
              style={{
                fontWeight: 600,
                color: '#2d3748',
                fontSize: '0.95rem',
                marginBottom: '4px',
                lineHeight: 1.5,
              }}
            >
              {card.title}
            </p>
            <p
              style={{
                color: '#718096',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                marginBottom: '8px',
              }}
            >
              {card.detail}
            </p>
            <p
              style={{
                color: '#52c99a',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {card.label}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default ComparisonCards;
