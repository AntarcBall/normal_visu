import { useMemo, useState } from 'react';
import MathFormula from '../components/MathFormula';

const LABS = [
  { id: 'lab-01', title: 'Cycle count → window length', desc: '사이클 수가 늘어나면 window 길이 L이 어떻게 커지는지 직접 본다.', level: '기초', candidates: ['A', 'B'], dataAxis: 'freq' },
  { id: 'lab-02', title: 'Fixed sample vs cycle window', desc: '고정 샘플 window와 cycle-based window의 차이를 비교한다.', level: '기초', candidates: ['A', 'G'], dataAxis: 'freq' },
  { id: 'lab-03', title: 'Frequency shift intuition', desc: '같은 길이의 시계열이라도 주파수에 따라 담기는 전기적 정보가 달라진다.', level: '기초', candidates: ['C', 'D'], dataAxis: 'freq' },
  { id: 'lab-04', title: 'Per-channel vs pooled ruler', desc: '채널마다 다른 자를 쓰는 것과 공통 자를 쓰는 것의 차이를 본다.', level: '기초', candidates: ['A', 'B'], dataAxis: 'class' },
  { id: 'lab-05', title: 'No norm vs center only', desc: '아예 안 건드리는 것과 mean만 제거하는 것의 차이를 본다.', level: '기초', candidates: ['none', 'center-only'], dataAxis: 'class' },
  { id: 'lab-06', title: 'z-score scale compression', desc: 'z-score가 amplitude 차이를 얼마나 눌러버리는지 체감한다.', level: '중급', candidates: ['A', 'C'], dataAxis: 'class' },
  { id: 'lab-07', title: 'Robust vs z-score on outlier', desc: 'outlier가 있을 때 robust scaling이 왜 필요한지 본다.', level: '중급', candidates: ['robust'], dataAxis: 'sampleIdx' },
  { id: 'lab-08', title: 'Max-abs behavior', desc: '0 중심 AC 신호에서 max-abs scaling이 어떤 느낌인지 본다.', level: '중급', candidates: ['max-abs'], dataAxis: 'class' },
  { id: 'lab-09', title: 'Unit-norm loses size', desc: '벡터 길이를 1로 맞추면 무엇이 사라지는지 본다.', level: '중급', candidates: ['unit-norm', 'I'], dataAxis: 'sampleIdx' },
  { id: 'lab-10', title: 'Global vs run-wise block', desc: '전역 기준 통계와 run-wise 통계의 철학 차이를 본다.', level: '중급', candidates: ['A', 'E', 'F'], dataAxis: 'sampleIdx' },
  { id: 'lab-11', title: 'Condition-cluster idea', desc: '운전조건 cluster별 정규화가 어떤 문제를 해결하려는지 본다.', level: '고급', candidates: ['C', 'D'], dataAxis: 'load' },
  { id: 'lab-12', title: 'Overlap reweighting', desc: 'post-window 통계가 왜 overlap에 따라 달라지는지 본다.', level: '고급', candidates: ['G'], dataAxis: 'freq' },
  { id: 'lab-13', title: 'Window-wise aggressiveness', desc: 'window-wise normalization이 왜 공격적인지 본다.', level: '고급', candidates: ['H', 'I'], dataAxis: 'sampleIdx' },
  { id: 'lab-14', title: 'Position-wise assumption', desc: '상대 위치별 normalization이 어떤 강한 가정을 쓰는지 본다.', level: '고급', candidates: ['J'], dataAxis: 'freq' },
  { id: 'lab-15', title: 'Frequency-bin-wise branch', desc: 'frequency-bin-wise normalization이 raw branch와 어떻게 다른지 본다.', level: '고급', candidates: ['K', 'L'], dataAxis: 'freq' },
];

const LAB_PATHS = {
  'lab-01': { next: 'lab-02', theory: 'cycle-window', reference: 'whole-structure' },
  'lab-02': { next: 'lab-03', theory: 'cycle-window', reference: 'normalization-blocks' },
  'lab-03': { next: 'lab-04', theory: 'cycle-window', reference: 'data-map' },
  'lab-04': { next: 'lab-05', theory: 'normalization', reference: 'normalization-blocks' },
  'lab-05': { next: 'lab-06', theory: 'normalization', reference: 'channel-timing' },
  'lab-06': { next: 'lab-07', theory: 'normalization-design', reference: 'normalization-design' },
  'lab-07': { next: 'lab-08', theory: 'normalization-design', reference: 'normalization-design' },
  'lab-08': { next: 'lab-09', theory: 'normalization-design', reference: 'normalization-design' },
  'lab-09': { next: 'lab-10', theory: 'normalization-design', reference: 'channel-timing' },
  'lab-10': { next: 'lab-11', theory: 'normalization-blocks', reference: 'normalization-blocks' },
  'lab-11': { next: 'lab-12', theory: 'normalization-blocks', reference: 'data-map' },
  'lab-12': { next: 'lab-13', theory: 'channel-timing', reference: 'channel-timing' },
  'lab-13': { next: 'lab-14', theory: 'channel-timing', reference: 'normalization-blocks' },
  'lab-14': { next: 'lab-15', theory: 'normalization-blocks', reference: 'whole-structure' },
  'lab-15': { next: 'lab-10', theory: 'dual-view', reference: 'normalization-blocks' },
};

function MetricBar({ label, value, color = 'var(--accent-input)' }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color }}>{value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-deep)', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function Bars({ values, color = 'var(--accent-input)' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${values.length}, 1fr)`, gap: 8, alignItems: 'end', minHeight: 140 }}>
      {values.map((value, index) => (
        <div key={index} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <div style={{ width: '100%', height: `${Math.max(10, Math.abs(value) * 24)}px`, background: value >= 0 ? color : 'var(--accent-error)', borderRadius: '8px 8px 0 0', opacity: 0.85 }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{value.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}

function HeatRow({ values, accent = 'var(--accent-highlight)' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${values.length}, 1fr)`, gap: 6 }}>
      {values.map((value, index) => (
        <div key={index} style={{ padding: '10px 0', borderRadius: 8, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)', background: `linear-gradient(180deg, ${accent}, rgba(255,255,255,0.03))`, opacity: 0.18 + value / 10, fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
          {value}
        </div>
      ))}
    </div>
  );
}

function LabCanvas({ labId, state }) {
  const { fs, fe, cycles, outlier, amplitude, overlap, normStrength } = state;
  const L = Math.round(cycles * fs / fe);

  switch (labId) {
    case 'lab-01':
      return (
        <div className="section-grid cols-2">
          <div className="card">
            <MathFormula math={String.raw`L=\operatorname{round}\!\left(C\cdot\frac{f_s}{f_e}\right)`} displayMode />
            <div className="callout success" style={{ marginTop: 12 }}>
              <strong>직관</strong><br />
              <MathFormula math={String.raw`C`} />를 키우면 같은 주파수에서도 더 많은 전기적 cycle을 담기 위해 <MathFormula math={String.raw`L`} /> 이 커집니다.
            </div>
          </div>
          <div className="card">
            <Bars values={[8, 16, cycles, 32].map((c) => Math.round(c * fs / fe) / 100)} color="var(--accent-highlight)" />
          </div>
        </div>
      );
    case 'lab-02':
      return (
        <div className="section-grid cols-2">
          <div className="comparison-panel left">
            <div style={{ color: 'var(--accent-error)', fontWeight: 700, marginBottom: 8 }}>Fixed sample</div>
            <Bars values={[4096 * 30 / fs, 4096 * 45 / fs, 4096 * 60 / fs]} color="var(--accent-error)" />
          </div>
          <div className="comparison-panel right">
            <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 8 }}>Cycle-based</div>
            <Bars values={[cycles, cycles, cycles]} color="var(--accent-output)" />
          </div>
        </div>
      );
    case 'lab-03':
      return (
        <div className="card">
          <HeatRow values={[30, 35, 40, 45, 50, 55, 60].map((f) => Math.round(cycles * fs / f / 100))} accent="var(--accent-input)" />
          <div className="callout" style={{ marginTop: 12 }}>주파수가 낮아질수록 같은 cycle 수를 담기 위해 더 긴 sample 수가 필요합니다.</div>
        </div>
      );
    case 'lab-04':
      return (
        <div className="section-grid cols-2">
          <div className="card">
            <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 8 }}>Per-channel</div>
            <Bars values={[1.4, 1.0, 0.7]} color="var(--accent-output)" />
          </div>
          <div className="card">
            <div style={{ color: 'var(--accent-error)', fontWeight: 700, marginBottom: 8 }}>Pooled</div>
            <Bars values={[1.15, 0.82, 0.57]} color="var(--accent-error)" />
          </div>
        </div>
      );
    case 'lab-05':
      return (
        <div className="section-grid cols-2">
          <div className="card"><Bars values={[3.2, 2.7, 2.9, 3.4]} color="var(--accent-highlight)" /></div>
          <div className="card"><Bars values={[0.3, -0.2, 0.0, 0.5]} color="var(--accent-input)" /></div>
        </div>
      );
    case 'lab-06':
      return <div className="card"><Bars values={[3.5, 1.5, 0.6, -0.2, -1.0].map((v) => v * (1 - normStrength / 100))} color="var(--accent-input)" /></div>;
    case 'lab-07':
      return <div className="card"><Bars values={[1.1, 1.0, 0.9, outlier, 1.0]} color="var(--accent-key)" /></div>;
    case 'lab-08':
      return <div className="card"><Bars values={[amplitude, -amplitude * 0.6, amplitude * 0.35, -amplitude * 0.2]} color="var(--accent-phase-b)" /></div>;
    case 'lab-09':
      return <div className="card"><Bars values={[1, 0.6, 0.3, 0.15]} color="var(--accent-fault)" /></div>;
    case 'lab-10':
      return <div className="card"><HeatRow values={[1, 1, 1, 2, 2, 3, 3]} accent="var(--accent-intermediate)" /></div>;
    case 'lab-11':
      return <div className="card"><HeatRow values={[30, 30, 45, 45, 60, 60]} accent="var(--accent-key)" /></div>;
    case 'lab-12':
      return <div className="card"><Bars values={overlap === 'high' ? [1, 3, 5, 5, 3, 1] : overlap === 'medium' ? [1, 2, 3, 3, 2, 1] : [1, 1, 1, 1, 1, 1]} color="var(--accent-highlight)" /></div>;
    case 'lab-13':
      return <div className="card"><Bars values={[0.22, 0.14, 0.08, 0.02]} color="var(--accent-error)" /></div>;
    case 'lab-14':
      return <div className="card"><HeatRow values={[1, 2, 3, 4, 5, 6]} accent="var(--accent-highlight)" /></div>;
    case 'lab-15':
      return <div className="card"><Bars values={[0.2, 0.8, 1.6, 0.9, 0.4, 0.2]} color="var(--accent-key)" /></div>;
    default:
      return null;
  }
}

function LabExplanation({ labId, state }) {
  const L = Math.round(state.cycles * state.fs / state.fe);
  const explanations = {
    'lab-01': {
      formula: String.raw`L=${L}`,
      why: '같은 전기적 의미를 가지는 입력 길이를 맞추는 것이 핵심입니다.',
      intuition: '사이클 수를 키우면 모델은 더 긴 전기적 문맥을 봅니다.',
    },
    'lab-02': {
      formula: String.raw`\text{fixed samples}\neq \text{fixed cycles}`,
      why: '4096 sample이 항상 같은 cycle 수를 의미하지 않습니다.',
      intuition: '주파수가 달라지면 sample 길이와 전기적 길이는 분리됩니다.',
    },
    'lab-03': {
      formula: String.raw`f_e \downarrow \Rightarrow L \uparrow`,
      why: '저주파일수록 같은 cycle을 담기 위한 시간 길이가 늘어납니다.',
      intuition: '같은 16 cycles라도 30Hz와 60Hz는 sample 수가 다릅니다.',
    },
    'lab-04': {
      formula: String.raw`\tilde{X}_{c,\cdot}\neq \tilde{X}_{\mathrm{pooled}}`,
      why: '채널 identity를 남길지, 공통 scale로 묶을지 결정하는 실험입니다.',
      intuition: 'A/B/C가 다른 상인지, 그냥 숫자 3개인지의 차이입니다.',
    },
    'lab-05': {
      formula: String.raw`\tilde{x}=x\quad \text{vs}\quad \tilde{x}=x-\mu`,
      why: 'DC offset만 지우는 것과 scale까지 바꾸는 것은 전혀 다른 결정입니다.',
      intuition: 'center only는 amplitude를 지키는 마지막 방어선입니다.',
    },
    'lab-06': {
      formula: String.raw`\tilde{x}=\frac{x-\mu}{\sigma+\varepsilon}`,
      why: 'z-score는 최적화에는 좋지만 amplitude cue를 압축합니다.',
      intuition: '큰 값과 작은 값이 같은 ruler 위에서 재표현됩니다.',
    },
    'lab-07': {
      formula: String.raw`\text{outlier}\Rightarrow \sigma\ \text{unstable}`,
      why: 'outlier 하나가 mean/std 기반 scaling을 흔들 수 있습니다.',
      intuition: 'robust scaling은 median/IQR로 이 흔들림을 줄입니다.',
    },
    'lab-08': {
      formula: String.raw`\tilde{x}=\frac{x}{\max |x|+\varepsilon}`,
      why: '0 중심 AC signal에서 mean은 덜 건드리고 크기만 줄입니다.',
      intuition: 'peak 하나를 1로 맞추는 scaling입니다.',
    },
    'lab-09': {
      formula: String.raw`\tilde{X}=\frac{X}{\lVert X\rVert+\varepsilon}`,
      why: '벡터 길이 자체를 1로 맞추면 전체 크기 정보가 사라집니다.',
      intuition: '방향만 남기고 size는 버리는 normalization입니다.',
    },
    'lab-10': {
      formula: String.raw`\mu_c\ \text{vs}\ \mu_{r,c}`,
      why: 'global 기준은 공통 benchmark, run-wise는 자기 기준 좌표계입니다.',
      intuition: '전역 ruler를 쓸지, run마다 ruler를 새로 만들지의 차이입니다.',
    },
    'lab-11': {
      formula: String.raw`g(r)=(f_r,\ell_r)`,
      why: '운전조건 차이를 normalization 단계에서 먼저 흡수할 수 있습니다.',
      intuition: '같은 조건끼리만 자를 공유하는 방식입니다.',
    },
    'lab-12': {
      formula: String.raw`\mu_c^{win}=\frac{\sum m_{r,t}X_{c,t}^{(r)}}{\sum m_{r,t}}`,
      why: 'overlap이 크면 중앙 point가 더 많이 세어집니다.',
      intuition: 'window sampler가 통계를 바꿔버릴 수 있다는 뜻입니다.',
    },
    'lab-13': {
      formula: String.raw`\mu_{r,w,c}`,
      why: 'window마다 자를 만들면 local shape는 커지고 amplitude cue는 줄어듭니다.',
      intuition: 'instance-wise normalization은 가장 공격적인 후보입니다.',
    },
    'lab-14': {
      formula: String.raw`\mu_{c,\tau}`,
      why: '상대 위치마다 자를 둔다는 건 시작 위상이 맞아떨어진다는 강한 가정입니다.',
      intuition: 'template-like, phase-aligned 세계에서만 자연스럽습니다.',
    },
    'lab-15': {
      formula: String.raw`\tilde{S}_{c,k}`,
      why: 'time-domain이 아니라 harmonic/bin마다 따로 scaling하는 branch입니다.',
      intuition: '3배 주파수 bin, 5배 주파수 bin을 각자 다른 ruler로 보는 것입니다.',
    },
  };

  const current = explanations[labId];
  return (
    <div className="card stage-active" style={{ display: 'grid', gap: 12 }}>
      <div style={{ color: 'var(--accent-output)', fontWeight: 700 }}>Why this lab matters</div>
      <div className="formula-display" style={{ padding: '10px 14px' }}>
        <MathFormula math={current.formula} displayMode />
      </div>
      <div className="callout success"><strong>핵심 이유</strong><br />{current.why}</div>
      <div className="callout"><strong>직관</strong><br />{current.intuition}</div>
    </div>
  );
}

export default function InteractionLabsSection({ studyState, onStudyChange, onNavigateSection }) {
  const activeLabId = studyState?.activeLabId ?? LABS[0].id;
  const [fs] = useState(25600);
  const fe = studyState?.selectedFreq ?? 45;
  const [cycles, setCycles] = useState(16);
  const [outlier, setOutlier] = useState(4.8);
  const [amplitude, setAmplitude] = useState(1.8);
  const [overlap, setOverlap] = useState('medium');
  const [normStrength, setNormStrength] = useState(40);
  const selectedClass = studyState?.selectedClass ?? 0;
  const selectedLoad = studyState?.selectedLoad ?? 100;

  const activeIndex = LABS.findIndex((lab) => lab.id === activeLabId);
  const activeLab = LABS[activeIndex] ?? LABS[0];
  const state = { fs, fe, cycles, outlier, amplitude, overlap, normStrength };
  const groupedLabs = useMemo(() => ({
    기초: LABS.filter((lab) => lab.level === '기초'),
    중급: LABS.filter((lab) => lab.level === '중급'),
    고급: LABS.filter((lab) => lab.level === '고급'),
  }), []);
  const dataAxisLabel = {
    freq: 'driving frequency',
    load: 'load',
    class: 'class',
    sampleIdx: 'sampleIdx',
  }[activeLab.dataAxis];
  const pathInfo = LAB_PATHS[activeLabId];
  const nextLab = LABS.find((lab) => lab.id === pathInfo?.next);

  const jumpToSection = (id) => {
    onNavigateSection(id);
  };

  const syncLabSelection = (labId) => {
    const nextLab = LABS.find((lab) => lab.id === labId) ?? LABS[0];
    const nextCandidate = nextLab.candidates.find((candidate) => /^[A-L]$/.test(candidate)) ?? studyState?.selectedCandidateKey ?? 'A';
    onStudyChange((prev) => ({
      ...prev,
      activeLabId: labId,
      selectedCandidateKey: nextCandidate,
    }));
  };

  return (
    <div>
      <div className="section-title">🧪 상호작용 랩 15개</div>
      <div className="section-subtitle">
        이제 이 페이지는 단순 설명이 아니라 <strong>15개의 관련된 interaction lab</strong>으로 구성됩니다.
        각 랩은 normalization, windowing, overlap, frequency-domain, channel identity 같은 현재 주제 안에서만 움직이고,
        반드시 <strong>왜 중요한지</strong>와 <strong>직관</strong>을 함께 설명합니다.
      </div>

      <div className="section-grid cols-3" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card stage-active">
          <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 8 }}>Current lab</div>
          <div className="stat-value" style={{ color: 'var(--accent-output)' }}>{activeIndex + 1}<span style={{ fontSize: '1rem' }}>/15</span></div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{activeLab.title}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--accent-key)', fontWeight: 700, marginBottom: 8 }}>Coverage</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
            cycle windowing, channel normalization, scaling families, block selection, overlap timing, frequency-bin ideas
          </div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--accent-highlight)', fontWeight: 700, marginBottom: 8 }}>How to use</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
            랩 번호를 누르고, 슬라이더/버튼을 바꿔 보고, 오른쪽 “왜 중요한가” 카드를 꼭 같이 읽으세요.
          </div>
        </div>
      </div>

      <div className="control-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="control-group">
          <label className="control-label">Lab selector</label>
          <div style={{ display: 'grid', gap: 10 }}>
            {Object.entries(groupedLabs).map(([level, labs]) => (
              <div key={level} style={{ display: 'grid', gap: 6 }}>
                <div className="step-badge" style={{ width: 'fit-content' }}>{level}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {labs.map((lab) => {
                    const index = LABS.findIndex((item) => item.id === lab.id);
                    return (
                      <button
                        key={lab.id}
                        className={`btn ${activeLabId === lab.id ? 'active' : ''}`}
                        onClick={() => syncLabSelection(lab.id)}
                        style={{ minWidth: 60 }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card">
          <div style={{ color: 'var(--accent-input)', fontWeight: 700, marginBottom: 8 }}>{activeLab.title}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: 12 }}>{activeLab.desc}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className="step-badge">{activeLab.level}</span>
            {activeLab.candidates.map((candidate) => (
              <span key={candidate} className="step-badge">{candidate}</span>
            ))}
            <span className="step-badge">{dataAxisLabel}</span>
            <span className="step-badge">{`C${selectedClass}`}</span>
            <span className="step-badge">{`${selectedLoad}% load`}</span>
          </div>
          <LabCanvas labId={activeLabId} state={state} />
        </div>
        <LabExplanation labId={activeLabId} state={state} />
      </div>

      <div className="section-grid cols-3" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card stage-active">
          <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 8 }}>Next recommended lab</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
            {nextLab ? nextLab.title : '—'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 12 }}>
            {nextLab ? nextLab.desc : '다음 추천 랩이 없습니다.'}
          </div>
          {nextLab && (
            <button className="btn active" onClick={() => syncLabSelection(nextLab.id)}>다음 랩으로</button>
          )}
        </div>
        <div className="card">
          <div style={{ color: 'var(--accent-key)', fontWeight: 700, marginBottom: 8 }}>Related theory page</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 12 }}>
            지금 랩의 개념을 더 깊게 읽고 싶다면 관련 이론 페이지로 넘어가세요.
          </div>
          <button className="btn" onClick={() => jumpToSection(pathInfo.theory)}>관련 이론 보기</button>
        </div>
        <div className="card">
          <div style={{ color: 'var(--accent-highlight)', fontWeight: 700, marginBottom: 8 }}>Related data / block page</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 12 }}>
            이 개념이 실제 후보 A~L이나 데이터 축에 어떻게 닿는지 바로 연결합니다.
          </div>
          <button className="btn" onClick={() => jumpToSection(pathInfo.reference)}>관련 참조 보기</button>
        </div>
      </div>

      <div className="control-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="control-group">
          <label className="control-label">Electrical frequency</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="range" min={30} max={60} step={5} value={fe} onChange={(e) => onStudyChange((prev) => ({ ...prev, selectedFreq: Number(e.target.value) }))} style={{ width: 140 }} />
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-input)', fontWeight: 700 }}>{fe}Hz</span>
          </div>
        </div>
        <div className="control-group">
          <label className="control-label">Class</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[0,1,2,3,4,5,6].map((value) => (
              <button key={value} className={`btn ${selectedClass === value ? 'active' : ''}`} onClick={() => onStudyChange((prev) => ({ ...prev, selectedClass: value }))}>
                {`C${value}`}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <label className="control-label">Load</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0,50,100].map((value) => (
              <button key={value} className={`btn ${selectedLoad === value ? 'active' : ''}`} onClick={() => onStudyChange((prev) => ({ ...prev, selectedLoad: value }))}>
                {`${value}%`}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <label className="control-label">Cycles</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[8, 16, 32].map((c) => (
              <button key={c} className={`btn ${cycles === c ? 'active' : ''}`} onClick={() => setCycles(c)}>{c}</button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <label className="control-label">Outlier</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="range" min={1} max={8} step={0.2} value={outlier} onChange={(e) => setOutlier(Number(e.target.value))} style={{ width: 140 }} />
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-key)', fontWeight: 700 }}>{outlier.toFixed(1)}</span>
          </div>
        </div>
        <div className="control-group">
          <label className="control-label">Amplitude</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="range" min={0.5} max={3} step={0.1} value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value))} style={{ width: 140 }} />
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-phase-b)', fontWeight: 700 }}>{amplitude.toFixed(1)}</span>
          </div>
        </div>
        <div className="control-group">
          <label className="control-label">Overlap</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['low', 'medium', 'high'].map((value) => (
              <button key={value} className={`btn ${overlap === value ? 'active' : ''}`} onClick={() => setOverlap(value)}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <label className="control-label">Norm strength</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="range" min={0} max={100} step={5} value={normStrength} onChange={(e) => setNormStrength(Number(e.target.value))} style={{ width: 140 }} />
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-highlight)', fontWeight: 700 }}>{normStrength}</span>
          </div>
        </div>
        <div className="control-group">
          <label className="control-label">Related pages</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => jumpToSection('normalization-blocks')}>A~L 후보 보기</button>
            <button className="btn" onClick={() => jumpToSection('data-map')}>데이터 축 보기</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 12 }}>All 15 labs at a glance</div>
        <div className="section-grid cols-3">
          {LABS.map((lab, index) => (
            <button
              key={lab.id}
              type="button"
              className={`card-glass ${activeLabId === lab.id ? 'stage-active' : ''}`}
              onClick={() => syncLabSelection(lab.id)}
              style={{ padding: 'var(--space-md)', display: 'grid', gap: 8, textAlign: 'left' }}
            >
              <div style={{ color: 'var(--accent-highlight)', fontWeight: 700 }}>{String(index + 1).padStart(2, '0')} / 15</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{lab.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{lab.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
