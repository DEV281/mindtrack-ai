import { motion } from 'framer-motion';
import { Database, ExternalLink, Download, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface Dataset {
  name: string;
  fullName: string;
  description: string;
  source: string;
  paper: string;
  downloadUrl: string;
  samples: string;
  classes: number;
  size: string;
  distribution: Array<{ name: string; value: number; color: string }>;
  preprocessing: string[];
  trainsModel: string;
  isPresent: boolean;
}

const datasets: Dataset[] = [
  {
    name: 'FER2013',
    fullName: 'Facial Expression Recognition 2013',
    description: 'Kaggle dataset of 35,887 grayscale 48×48 face images labeled with 7 emotions. Originally used in the ICML 2013 workshop competition.',
    source: 'Goodfellow et al., 2013',
    paper: 'https://arxiv.org/abs/1307.0414',
    downloadUrl: 'https://www.kaggle.com/datasets/msambare/fer2013',
    samples: '35,887',
    classes: 7,
    size: '~96 MB',
    distribution: [
      { name: 'Happy', value: 8989, color: '#00e5a0' },
      { name: 'Neutral', value: 6198, color: '#8a94a6' },
      { name: 'Sad', value: 6077, color: '#00d4ff' },
      { name: 'Fear', value: 5121, color: '#ff4f7b' },
      { name: 'Angry', value: 4953, color: '#ff7a45' },
      { name: 'Surprise', value: 4002, color: '#9d6fff' },
      { name: 'Disgust', value: 547, color: '#ffb020' },
    ],
    preprocessing: ['Grayscale → RGB conversion', 'Resize to 224×224', 'Normalization (ImageNet stats)', 'RandomHorizontalFlip', 'ColorJitter', 'RandomRotation(10°)'],
    trainsModel: 'ViT (google/vit-base-patch16-224)',
    isPresent: false,
  },
  {
    name: 'AffectNet',
    fullName: 'AffectNet Facial Expression Database',
    description: 'Large-scale database of over 450,000 facial images with 8 emotion labels, collected from the internet via search queries.',
    source: 'Mollahosseini et al., 2019',
    paper: 'https://ieeexplore.ieee.org/document/8013713',
    downloadUrl: 'http://mohammadmahoor.com/affectnet/',
    samples: '~450,000',
    classes: 8,
    size: '~120 GB',
    distribution: [
      { name: 'Happy', value: 134415, color: '#00e5a0' },
      { name: 'Neutral', value: 74874, color: '#8a94a6' },
      { name: 'Sad', value: 25459, color: '#00d4ff' },
      { name: 'Surprise', value: 14090, color: '#9d6fff' },
      { name: 'Fear', value: 6378, color: '#ff4f7b' },
      { name: 'Disgust', value: 3803, color: '#ffb020' },
      { name: 'Angry', value: 24882, color: '#ff7a45' },
      { name: 'Contempt', value: 3750, color: '#1e2d45' },
    ],
    preprocessing: ['Face alignment using MTCNN', 'Resize to 224×224', 'Class-balanced sampling', 'MixUp augmentation'],
    trainsModel: 'ViT fine-tuning (improved facial)',
    isPresent: false,
  },
  {
    name: 'DAIC-WOZ',
    fullName: 'Distress Analysis Interview Corpus - Wizard of Oz',
    description: '189 clinical interviews conducted by an animated virtual interviewer. Includes audio, video, transcript, and PHQ-8 depression scores.',
    source: 'USC ICT, Gratch et al., 2014',
    paper: 'https://dcapswoz.ict.usc.edu/',
    downloadUrl: 'https://dcapswoz.ict.usc.edu/',
    samples: '189 interviews',
    classes: 2,
    size: '~35 GB',
    distribution: [
      { name: 'Not Depressed', value: 126, color: '#00e5a0' },
      { name: 'Depressed', value: 63, color: '#ff4f7b' },
    ],
    preprocessing: ['Audio extraction (16kHz mono)', 'MFCC (40 coefficients)', 'Mel spectrogram', 'Voice Activity Detection', 'Segment normalization'],
    trainsModel: 'Voice CNN (depression detection)',
    isPresent: false,
  },
  {
    name: 'RAVDESS',
    fullName: 'Ryerson Audio-Visual Database of Emotional Speech and Song',
    description: '7,356 files from 24 professional actors, speaking and singing with 8 emotions at 2 intensity levels.',
    source: 'Livingstone & Russo, 2018',
    paper: 'https://doi.org/10.1371/journal.pone.0196391',
    downloadUrl: 'https://zenodo.org/record/1188976',
    samples: '7,356',
    classes: 8,
    size: '~24 GB',
    distribution: [
      { name: 'Neutral', value: 96, color: '#8a94a6' },
      { name: 'Calm', value: 192, color: '#00d4ff' },
      { name: 'Happy', value: 192, color: '#00e5a0' },
      { name: 'Sad', value: 192, color: '#9d6fff' },
      { name: 'Angry', value: 192, color: '#ff7a45' },
      { name: 'Fearful', value: 192, color: '#ff4f7b' },
      { name: 'Disgust', value: 192, color: '#ffb020' },
      { name: 'Surprised', value: 192, color: '#00e5a0' },
    ],
    preprocessing: ['Audio resampling to 16kHz', 'MFCC extraction (40 coeff, hop=512)', 'Mel spectrogram generation', 'Delta + Delta-delta features', 'Z-score normalization'],
    trainsModel: 'Voice CNN (emotion recognition)',
    isPresent: false,
  },
  {
    name: 'IEMOCAP',
    fullName: 'Interactive Emotional Dyadic Motion Capture',
    description: '12 hours of audiovisual data from 10 actors in 5 sessions. Includes scripted and improvised scenarios with multimodal annotations.',
    source: 'USC SAIL Lab, Busso et al., 2008',
    paper: 'https://doi.org/10.1007/s10579-008-9076-6',
    downloadUrl: 'https://sail.usc.edu/iemocap/',
    samples: '~10,039 utterances',
    classes: 4,
    size: '~32 GB',
    distribution: [
      { name: 'Happy', value: 1636, color: '#00e5a0' },
      { name: 'Sad', value: 1084, color: '#00d4ff' },
      { name: 'Angry', value: 1103, color: '#ff7a45' },
      { name: 'Neutral', value: 1708, color: '#8a94a6' },
    ],
    preprocessing: ['5-frame temporal window extraction', 'Feature vector concatenation (facial + voice)', 'Sequence padding/truncation', 'Train/val/test: 3:1:1 by session'],
    trainsModel: 'Mamba SSM (temporal patterns)',
    isPresent: false,
  },
];

function DatasetBrowser(): React.ReactElement {
  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Dataset Browser</h1>
        <p className="text-text-secondary text-sm mt-1">
          Research datasets used for model training and evaluation
        </p>
      </div>

      <div className="space-y-6">
        {datasets.map((ds, i) => (
          <motion.div
            key={ds.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center">
                    <Database className="w-5 h-5 text-accent-cyan" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{ds.name}</h2>
                    <p className="text-sm text-text-secondary">{ds.fullName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    {ds.isPresent ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-accent-green" />
                        <span className="text-accent-green">Downloaded</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-text-muted" />
                        <span className="text-text-muted">Not downloaded</span>
                      </>
                    )}
                  </div>
                  <a
                    href={ds.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm py-1.5 px-3"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Source
                  </a>
                </div>
              </div>

              <p className="text-sm text-text-secondary mt-3 leading-relaxed">{ds.description}</p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 mt-3">
                <span className="text-xs text-text-muted">
                  Samples: <span className="font-mono text-accent-green">{ds.samples}</span>
                </span>
                <span className="text-xs text-text-muted">
                  Classes: <span className="font-mono text-accent-cyan">{ds.classes}</span>
                </span>
                <span className="text-xs text-text-muted">
                  Size: <span className="font-mono text-accent-amber">{ds.size}</span>
                </span>
                <span className="text-xs text-text-muted">
                  Source: <span className="text-accent-violet">{ds.source}</span>
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Distribution Chart */}
              <div className="p-5">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  Class Distribution
                </h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ds.distribution}>
                      <XAxis dataKey="name" tick={{ fill: '#5a6478', fontSize: 8 }} tickLine={false} interval={0} angle={-30} textAnchor="end" height={40} />
                      <YAxis tick={{ fill: '#5a6478', fontSize: 8 }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#0d1a2d', border: '1px solid #1e2d45', borderRadius: '8px', fontSize: '11px', color: '#e8edf5' }}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]} barSize={16}>
                        {ds.distribution.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Preprocessing */}
              <div className="p-5">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  Preprocessing Pipeline
                </h3>
                <ul className="space-y-1.5">
                  {ds.preprocessing.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary">
                      <span className="w-4 h-4 rounded-full bg-accent-green/10 text-accent-green flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Model Info */}
              <div className="p-5">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  Trains Model
                </h3>
                <div className="p-3 rounded-lg bg-accent-cyan/5 border border-accent-cyan/20">
                  <p className="text-sm font-medium text-accent-cyan">{ds.trainsModel}</p>
                </div>
                <div className="mt-3 text-xs text-text-muted">
                  <p>Paper: <a href={ds.paper} target="_blank" rel="noopener noreferrer" className="text-accent-violet hover:underline">{ds.source}</a></p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default DatasetBrowser;
