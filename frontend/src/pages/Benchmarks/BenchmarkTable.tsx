import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, Trophy, Star, Filter, Info } from 'lucide-react';

interface BenchmarkRow {
  rank: number;
  cnn: string;
  mfcc: string;
  lstm: string;
  cnnF1: number;
  mfccF1: number;
  lstmF1: number;
  combinedF1: number;
  auc: number;
  isTop: boolean;
}

const benchmarkData: BenchmarkRow[] = [
  { rank: 1, cnn: 'ViT-B/16', mfcc: 'Raw Spec CNN', lstm: 'Mamba SSM', cnnF1: 71.2, mfccF1: 68.4, lstmF1: 75.8, combinedF1: 79.5, auc: 0.842, isTop: true },
  { rank: 2, cnn: 'ViT-B/16', mfcc: 'Spec CNN-2D', lstm: 'Mamba SSM', cnnF1: 71.2, mfccF1: 65.1, lstmF1: 75.8, combinedF1: 76.2, auc: 0.821, isTop: true },
  { rank: 3, cnn: 'ViT-B/16', mfcc: 'MFCC CNN-1D', lstm: 'S4 SSM', cnnF1: 71.2, mfccF1: 58.3, lstmF1: 72.1, combinedF1: 72.8, auc: 0.798, isTop: true },
  { rank: 4, cnn: 'ResNet-50', mfcc: 'Raw Spec CNN', lstm: 'Mamba SSM', cnnF1: 64.8, mfccF1: 68.4, lstmF1: 75.8, combinedF1: 70.1, auc: 0.781, isTop: false },
  { rank: 5, cnn: 'ResNet-50', mfcc: 'Spec CNN-2D', lstm: 'LSTM-2L', cnnF1: 64.8, mfccF1: 65.1, lstmF1: 61.3, combinedF1: 68.4, auc: 0.763, isTop: false },
  { rank: 6, cnn: 'VGG-16', mfcc: 'MFCC CNN-1D', lstm: 'Mamba SSM', cnnF1: 59.2, mfccF1: 58.3, lstmF1: 75.8, combinedF1: 66.7, auc: 0.745, isTop: false },
  { rank: 7, cnn: 'ResNet-50', mfcc: 'MFCC CNN-1D', lstm: 'GRU-2L', cnnF1: 64.8, mfccF1: 58.3, lstmF1: 59.7, combinedF1: 65.2, auc: 0.732, isTop: false },
  { rank: 8, cnn: 'VGG-16', mfcc: 'Raw Spec CNN', lstm: 'S4 SSM', cnnF1: 59.2, mfccF1: 68.4, lstmF1: 72.1, combinedF1: 63.1, auc: 0.718, isTop: false },
  { rank: 9, cnn: 'ViT-B/16', mfcc: 'MFCC MLP', lstm: 'LSTM-2L', cnnF1: 71.2, mfccF1: 51.5, lstmF1: 61.3, combinedF1: 62.8, auc: 0.706, isTop: false },
  { rank: 10, cnn: 'EfficientNet-B0', mfcc: 'Spec CNN-2D', lstm: 'GRU-2L', cnnF1: 62.1, mfccF1: 65.1, lstmF1: 59.7, combinedF1: 61.5, auc: 0.695, isTop: false },
  { rank: 11, cnn: 'VGG-16', mfcc: 'MFCC CNN-1D', lstm: 'LSTM-2L', cnnF1: 59.2, mfccF1: 58.3, lstmF1: 61.3, combinedF1: 60.2, auc: 0.682, isTop: false },
  { rank: 12, cnn: 'EfficientNet-B0', mfcc: 'MFCC CNN-1D', lstm: 'Mamba SSM', cnnF1: 62.1, mfccF1: 58.3, lstmF1: 75.8, combinedF1: 59.8, auc: 0.678, isTop: false },
  { rank: 13, cnn: 'MobileNet-V3', mfcc: 'Raw Spec CNN', lstm: 'LSTM-2L', cnnF1: 55.7, mfccF1: 68.4, lstmF1: 61.3, combinedF1: 58.4, auc: 0.665, isTop: false },
  { rank: 14, cnn: 'ResNet-18', mfcc: 'MFCC MLP', lstm: 'GRU-2L', cnnF1: 58.9, mfccF1: 51.5, lstmF1: 59.7, combinedF1: 57.1, auc: 0.652, isTop: false },
  { rank: 15, cnn: 'DenseNet-121', mfcc: 'Spec CNN-2D', lstm: 'S4 SSM', cnnF1: 60.5, mfccF1: 65.1, lstmF1: 72.1, combinedF1: 56.3, auc: 0.641, isTop: false },
  { rank: 16, cnn: 'MobileNet-V3', mfcc: 'MFCC CNN-1D', lstm: 'S4 SSM', cnnF1: 55.7, mfccF1: 58.3, lstmF1: 72.1, combinedF1: 55.8, auc: 0.635, isTop: false },
  { rank: 17, cnn: 'CNN-Custom', mfcc: 'Raw Spec CNN', lstm: 'GRU-2L', cnnF1: 52.3, mfccF1: 68.4, lstmF1: 59.7, combinedF1: 54.2, auc: 0.621, isTop: false },
  { rank: 18, cnn: 'ResNet-18', mfcc: 'Spec CNN-2D', lstm: 'Transformer-4L', cnnF1: 58.9, mfccF1: 65.1, lstmF1: 48.3, combinedF1: 53.5, auc: 0.612, isTop: false },
  { rank: 19, cnn: 'DenseNet-121', mfcc: 'MFCC MLP', lstm: 'Mamba SSM', cnnF1: 60.5, mfccF1: 51.5, lstmF1: 75.8, combinedF1: 52.8, auc: 0.605, isTop: false },
  { rank: 20, cnn: 'CNN-Custom', mfcc: 'MFCC CNN-1D', lstm: 'LSTM-2L', cnnF1: 52.3, mfccF1: 58.3, lstmF1: 61.3, combinedF1: 51.4, auc: 0.592, isTop: false },
  { rank: 21, cnn: 'VGG-16', mfcc: 'MFCC MLP', lstm: 'Transformer-4L', cnnF1: 59.2, mfccF1: 51.5, lstmF1: 48.3, combinedF1: 50.1, auc: 0.581, isTop: false },
  { rank: 22, cnn: 'EfficientNet-B0', mfcc: 'MFCC MLP', lstm: 'LSTM-2L', cnnF1: 62.1, mfccF1: 51.5, lstmF1: 61.3, combinedF1: 49.7, auc: 0.575, isTop: false },
  { rank: 23, cnn: 'MobileNet-V3', mfcc: 'MFCC MLP', lstm: 'Transformer-4L', cnnF1: 55.7, mfccF1: 51.5, lstmF1: 48.3, combinedF1: 48.8, auc: 0.562, isTop: false },
  { rank: 24, cnn: 'CNN-Custom', mfcc: 'Spec CNN-2D', lstm: 'S4 SSM', cnnF1: 52.3, mfccF1: 65.1, lstmF1: 72.1, combinedF1: 48.2, auc: 0.555, isTop: false },
  { rank: 25, cnn: 'ResNet-18', mfcc: 'MFCC CNN-1D', lstm: 'Transformer-4L', cnnF1: 58.9, mfccF1: 58.3, lstmF1: 48.3, combinedF1: 47.5, auc: 0.548, isTop: false },
  { rank: 26, cnn: 'DenseNet-121', mfcc: 'Raw Spec CNN', lstm: 'Transformer-4L', cnnF1: 60.5, mfccF1: 68.4, lstmF1: 48.3, combinedF1: 46.8, auc: 0.535, isTop: false },
  { rank: 27, cnn: 'InceptionNet', mfcc: 'MFCC MLP', lstm: 'GRU-2L', cnnF1: 57.4, mfccF1: 51.5, lstmF1: 59.7, combinedF1: 46.1, auc: 0.528, isTop: false },
  { rank: 28, cnn: 'InceptionNet', mfcc: 'MFCC CNN-1D', lstm: 'LSTM-2L', cnnF1: 57.4, mfccF1: 58.3, lstmF1: 61.3, combinedF1: 45.3, auc: 0.521, isTop: false },
  { rank: 29, cnn: 'InceptionNet', mfcc: 'Spec CNN-2D', lstm: 'Transformer-4L', cnnF1: 57.4, mfccF1: 65.1, lstmF1: 48.3, combinedF1: 44.6, auc: 0.512, isTop: false },
  { rank: 30, cnn: 'CNN-Custom', mfcc: 'MFCC MLP', lstm: 'LSTM-2L', cnnF1: 52.3, mfccF1: 51.5, lstmF1: 61.3, combinedF1: 43.8, auc: 0.505, isTop: false },
  { rank: 31, cnn: 'AlexNet', mfcc: 'MFCC MLP', lstm: 'LSTM-2L', cnnF1: 44.1, mfccF1: 51.5, lstmF1: 61.3, combinedF1: 42.2, auc: 0.492, isTop: false },
  { rank: 32, cnn: 'AlexNet', mfcc: 'MFCC CNN-1D', lstm: 'GRU-2L', cnnF1: 44.1, mfccF1: 58.3, lstmF1: 59.7, combinedF1: 41.5, auc: 0.485, isTop: false },
  { rank: 33, cnn: 'AlexNet', mfcc: 'MFCC MLP', lstm: 'Transformer-4L', cnnF1: 44.1, mfccF1: 51.5, lstmF1: 48.3, combinedF1: 38.9, auc: 0.458, isTop: false },
];

type SortKey = 'rank' | 'cnnF1' | 'mfccF1' | 'lstmF1' | 'combinedF1' | 'auc';

function BenchmarkTable(): React.ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterModality, setFilterModality] = useState<string>('all');

  const sorted = useMemo(() => {
    let data = [...benchmarkData];

    if (filterModality !== 'all') {
      data = data.filter((d) => {
        if (filterModality === 'vit') return d.cnn.includes('ViT');
        if (filterModality === 'mamba') return d.lstm.includes('Mamba');
        if (filterModality === 'transformer') return d.lstm.includes('Transformer');
        if (filterModality === 'rawspec') return d.mfcc.includes('Raw Spec');
        return true;
      });
    }

    data.sort((a, b) => {
      const mul = sortAsc ? 1 : -1;
      return (a[sortKey] - b[sortKey]) * mul;
    });
    return data;
  }, [sortKey, sortAsc, filterModality]);

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'rank');
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }): React.ReactElement => (
    <th
      className="py-3 px-3 text-left font-medium text-text-secondary cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? 'text-accent-green' : 'text-text-muted'}`} />
      </div>
    </th>
  );

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Model Benchmarks</h1>
        <p className="text-text-secondary text-sm mt-1">
          Full 11×11×11 architecture comparison — 33 top combinations shown
        </p>
      </div>

      {/* Key Findings */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Best Combination', value: 'ViT + Raw Spec CNN + Mamba SSM', metric: '79.5% F1', color: 'text-accent-green', bg: 'from-accent-green/10 to-transparent' },
          { label: 'Raw Spec vs CNN-1D', value: '+16.9 F1 improvement', metric: 'Voice modality', color: 'text-accent-cyan', bg: 'from-accent-cyan/10 to-transparent' },
          { label: 'Mamba vs Transformer', value: '+31.2 F1 improvement', metric: 'Temporal modality', color: 'text-accent-violet', bg: 'from-accent-violet/10 to-transparent' },
          { label: 'Standalone Transformer', value: '48.3% F1 on IEMOCAP', metric: 'Never use without pretrain', color: 'text-accent-red', bg: 'from-accent-red/10 to-transparent' },
        ].map((finding) => (
          <motion.div
            key={finding.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-4 bg-gradient-to-b ${finding.bg}`}
          >
            <p className="text-xs text-text-muted">{finding.label}</p>
            <p className={`text-sm font-semibold ${finding.color} mt-1`}>{finding.value}</p>
            <p className="text-xs text-text-muted mt-1">{finding.metric}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-text-muted" />
        <select
          value={filterModality}
          onChange={(e) => setFilterModality(e.target.value)}
          className="input-field py-1.5 text-sm w-48"
        >
          <option value="all">All Architectures</option>
          <option value="vit">ViT-based (Facial)</option>
          <option value="mamba">Mamba SSM (Temporal)</option>
          <option value="transformer">Transformer (Temporal)</option>
          <option value="rawspec">Raw Spectrogram (Voice)</option>
        </select>
        <span className="text-xs text-text-muted">{sorted.length} results</span>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg-secondary/50">
              <tr>
                <SortHeader label="#" field="rank" />
                <th className="py-3 px-3 text-left font-medium text-text-secondary">CNN (Facial)</th>
                <th className="py-3 px-3 text-left font-medium text-text-secondary">MFCC (Voice)</th>
                <th className="py-3 px-3 text-left font-medium text-text-secondary">Temporal</th>
                <SortHeader label="CNN F1" field="cnnF1" />
                <SortHeader label="MFCC F1" field="mfccF1" />
                <SortHeader label="LSTM F1" field="lstmF1" />
                <SortHeader label="Combined" field="combinedF1" />
                <SortHeader label="AUC" field="auc" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <motion.tr
                  key={row.rank}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`border-b border-border/50 transition-colors ${
                    row.isTop ? 'bg-accent-green/5 hover:bg-accent-green/10' : 'hover:bg-bg-hover/50'
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      {row.rank <= 3 && <Trophy className={`w-3.5 h-3.5 ${row.rank === 1 ? 'text-accent-amber' : row.rank === 2 ? 'text-text-secondary' : 'text-accent-orange'}`} />}
                      <span className="font-mono text-xs">{row.rank}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs">{row.cnn}</td>
                  <td className="py-2.5 px-3 text-xs">{row.mfcc}</td>
                  <td className="py-2.5 px-3 text-xs">{row.lstm}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-accent-cyan">{row.cnnF1}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-accent-violet">{row.mfccF1}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-accent-amber">{row.lstmF1}</td>
                  <td className="py-2.5 px-3">
                    <span className={`font-mono text-xs font-bold ${row.combinedF1 >= 70 ? 'text-accent-green' : row.combinedF1 >= 50 ? 'text-accent-amber' : 'text-accent-red'}`}>
                      {row.combinedF1}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-text-secondary">{row.auc.toFixed(3)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default BenchmarkTable;
