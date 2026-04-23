import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const emotionPieData = [
  { name: 'Neutral', value: 35, fill: '#8fa8b8' },
  { name: 'Happy', value: 20, fill: '#52b788' },
  { name: 'Thoughtful', value: 18, fill: '#e8a838' },
  { name: 'Worried', value: 12, fill: '#9d8fcc' },
  { name: 'Sad', value: 8, fill: '#5b9bd5' },
  { name: 'Surprised', value: 4, fill: '#d4829a' },
  { name: 'Other', value: 3, fill: '#b8ccd8' },
];

function ModelComparison(): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      style={{ padding: 24 }}
    >
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        How You Express Yourself
      </h2>

      <div style={{ height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, alignSelf: 'flex-start' }}>
          Your expression patterns across sessions
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={emotionPieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {emotionPieData.map((entry, index) => (
                <Cell key={`pie-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #dde7ef',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#2c3e50',
                boxShadow: '0 4px 12px rgba(91,155,213,0.1)',
              }}
              formatter={(value: number) => [`${value}%`, 'Frequency']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 12px', marginTop: 8 }}>
          {emotionPieData.map((e) => (
            <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: e.fill }} />
              {e.name}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default ModelComparison;
