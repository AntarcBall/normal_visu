import { useMemo, useState } from 'react';
import MathFormula from '../components/MathFormula';

const HIERARCHY_LEVELS = [
  {
    key: 'point',
    label: 'Point',
    accent: 'var(--accent-input)',
    formula: String.raw`t \in \{1,\dots,T_r\}`,
    detail: '가장 작은 단위는 원시 시점 하나입니다. 아직 채널/운전조건 정보와 결합되기 전의 index level 입니다.',
    why: '정규화나 window overlap은 결국 point가 몇 번 세어지느냐의 문제로 귀결됩니다.',
  },
  {
    key: 'channel',
    label: 'Channel',
    accent: 'var(--accent-phase-a)',
    formula: String.raw`c \in \{1,2,3\}`,
    detail: 'A/B/C 3상은 단순히 세 숫자가 아니라 물리적으로 구분되는 상입니다.',
    why: 'per-channel normalization이 의미 있는 이유도 바로 이 채널 identity 때문입니다.',
  },
  {
    key: 'run',
    label: 'Run',
    accent: 'var(--accent-highlight)',
    formula: String.raw`X^{(r)} \in \mathbb{R}^{C \times T_r}`,
    detail: 'CSV 하나가 run 하나이며, 현재 시점에서 가장 자연스러운 raw data container 입니다.',
    why: 'raw-run 기준 통계를 잡으면 모든 point를 정확히 한 번씩 센다는 장점이 생깁니다.',
  },
  {
    key: 'cluster',
    label: 'Cluster',
    accent: 'var(--accent-key)',
    formula: String.raw`g(r)=(f_r,\ell_r)`,
    detail: '같은 주파수·부하 조합으로 run을 묶으면 “운전조건 cluster”가 됩니다.',
    why: 'condition-aware normalization은 여기서 통계를 뽑는 선택입니다.',
  },
  {
    key: 'split',
    label: 'Split',
    accent: 'var(--accent-output)',
    formula: String.raw`\mathrm{train}/\mathrm{val}/\mathrm{test}`,
    detail: '실험 프로토콜의 마지막 축입니다. 특히 train-normal-only fit 규칙이 여기서 결정됩니다.',
    why: 'split을 넘나들며 통계를 섞는 순간 leakage가 됩니다.',
  },
];

const SYMBOLS = [
  { math: String.raw`r`, desc: 'run index' },
  { math: String.raw`c`, desc: 'channel index' },
  { math: String.raw`t`, desc: 'raw time index' },
  { math: String.raw`w`, desc: 'window index' },
  { math: String.raw`s_{r,w}`, desc: 'run r 에서 w번째 window의 시작점' },
  { math: String.raw`L_r`, desc: 'run r 에 대해 사용한 window 길이' },
  { math: String.raw`\tau`, desc: 'window 내부의 상대 time index' },
];

const SAMPLE_CARDS = [
  {
    title: 'Raw run view',
    accent: 'var(--accent-highlight)',
    formula: String.raw`X^{(r)} \in \mathbb{R}^{C \times T_r}`,
    summary: '한 CSV를 통째로 보는 관점',
    takeaway: '“정규화 통계를 어디서 뽑느냐”를 이야기할 때 가장 먼저 기준이 되는 객체입니다.',
  },
  {
    title: 'Window view',
    accent: 'var(--accent-output)',
    formula: String.raw`X^{(r,w)} \in \mathbb{R}^{C \times L_r}`,
    summary: '모델이 실제로 받는 subsequence 관점',
    takeaway: 'window를 만든 뒤 통계를 잡으면 overlap 때문에 point weighting이 바뀔 수 있습니다.',
  },
];

const CONFUSION_CARDS = [
  {
    title: '“Run = sample” 착각',
    wrong: 'CSV 하나를 바로 모델 sample로 생각한다.',
    right: String.raw`실제로 모델 입력은 대개\ X^{(r,w)}\ \text{이다.}`,
    accent: 'var(--accent-error)',
  },
  {
    title: '“조건 cluster = split” 착각',
    wrong: String.raw`g(r)=(f_r,\ell_r)\ \text{와 train/val/test를 같은 축으로 본다.}`,
    right: 'cluster는 데이터의 물리 조건 축이고, split은 실험 프로토콜 축이다.',
    accent: 'var(--accent-key)',
  },
  {
    title: '“window overlap은 무해” 착각',
    wrong: 'window를 자르는 순서는 통계에 영향이 없다고 생각한다.',
    right: String.raw`m_{r,t}\ \text{가 달라지면}\ \mu_c^{win}\ \text{도 달라진다.}`,
    accent: 'var(--accent-highlight)',
  },
];

function HierarchyShape({ activeLevel }) {
  const ordered = ['point', 'channel', 'run', 'cluster', 'split'];
  return (
    <svg viewBox="0 0 520 140" style={{ width: '100%', height: 'auto' }}>
      {ordered.map((key, index) => {
        const level = HIERARCHY_LEVELS.find((item) => item.key === key);
        const active = activeLevel === key;
        const x = 20 + index * 100;
        const width = key === 'split' ? 90 : 82;
        return (
          <g key={key}>
            <rect
              x={x}
              y={40}
              width={width}
              height={56}
              rx={16}
              fill={active ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.02)'}
              stroke={active ? 'var(--accent-highlight)' : level.accent}
              strokeWidth={active ? 2.5 : 1.5}
            />
            <text x={x + width / 2} y={64} fill="var(--text-primary)" textAnchor="middle" fontSize="13" fontWeight="700">
              {level.label}
            </text>
            <text x={x + width / 2} y={82} fill={level.accent} textAnchor="middle" fontSize="11">
              {index + 1}
            </text>
            {index < ordered.length - 1 && (
              <line x1={x + width} y1={68} x2={x + width + 18} y2={68} stroke="var(--text-muted)" strokeWidth="2" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function WholeStructureSection() {
  const [activeLevel, setActiveLevel] = useState('run');

  const selectedLevel = useMemo(
    () => HIERARCHY_LEVELS.find((level) => level.key === activeLevel) ?? HIERARCHY_LEVELS[2],
    [activeLevel],
  );

  return (
    <div>
      <div className="section-title">🧱 whole.md 정리 ① 데이터 계층과 윈도우 샘플</div>
      <div className="section-subtitle">
        `whole.md` 1번을 <strong>데이터 계층</strong>, <strong>기호 해설</strong>, <strong>raw run vs window</strong>
        세 층으로 다시 정리했습니다. 목표는 수식이 촘촘해지면서도 “지금 어떤 단위를 말하는가”가 한눈에 보이게 만드는 것입니다.
      </div>

      <div className="formula-display" style={{ marginBottom: 'var(--space-lg)' }}>
        <MathFormula math={String.raw`X^{(r)} \in \mathbb{R}^{C \times T_r}, \qquad m(r)=(f_r,\ell_r,y_r), \qquad g(r)=(f_r,\ell_r)`} displayMode />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          run 하나는 <MathFormula math={String.raw`X^{(r)}`} />, 메타데이터는 <MathFormula math={String.raw`m(r)`} />, 운전조건 묶음은 <MathFormula math={String.raw`g(r)`} /> 로 읽으면 됩니다.
        </span>
      </div>

      <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card stage-active">
          <div style={{ color: 'var(--accent-input)', fontWeight: 700, marginBottom: 10 }}>Step 1. 기호를 먼저 고정</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {SYMBOLS.map((symbol) => (
              <div key={symbol.math} style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 12, alignItems: 'center' }}>
                <div className="step-badge" style={{ justifyContent: 'center' }}>
                  <MathFormula math={symbol.math} />
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{symbol.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--accent-key)', fontWeight: 700, marginBottom: 10 }}>Step 2. mental model</div>
          <div className="callout success" style={{ marginBottom: 12 }}>
            <strong>한 줄 요약</strong><br />
            point → channel → run → condition cluster → split 순으로 계층이 올라갑니다.
          </div>
          <div className="callout warn">
            <strong>중요</strong><br />
            이후 windowing이 들어오면 raw 기준 객체 <MathFormula math={String.raw`X^{(r)}`} /> 와 model input 객체
            <MathFormula math={String.raw`X^{(r,w)}`} /> 가 달라집니다.
          </div>
        </div>
      </div>

      <div className="card" data-testid="whole-structure-hierarchy-card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ color: 'var(--accent-highlight)', fontWeight: 700 }}>Hierarchy drill-down</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {HIERARCHY_LEVELS.map((level) => (
              <button
                key={level.key}
                className={`btn ${activeLevel === level.key ? 'active' : ''}`}
                onClick={() => setActiveLevel(level.key)}
                style={activeLevel === level.key ? { borderColor: level.accent, color: level.accent } : undefined}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <HierarchyShape activeLevel={activeLevel} />

        <div className="section-grid cols-2">
          <div className="card-glass" style={{ padding: 'var(--space-md)' }}>
            <div style={{ color: selectedLevel.accent, fontWeight: 700, marginBottom: 10 }}>{selectedLevel.label} level</div>
            <div className="formula-display" style={{ padding: '10px 14px', marginBottom: 10 }}>
              <MathFormula math={selectedLevel.formula} displayMode />
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.8 }}>{selectedLevel.detail}</div>
          </div>
          <div className="card-glass" style={{ padding: 'var(--space-md)' }}>
            <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 10 }}>Why this level matters</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.8 }}>{selectedLevel.why}</div>
            <div className="callout" style={{ marginTop: 12 }}>
              계층을 헷갈리면 “run-local normalization”과 “window-local normalization” 같은 후보들이 왜 다른지 설명할 수 없게 됩니다.
            </div>
          </div>
        </div>
      </div>

      <div className="card" data-testid="whole-structure-confusions-card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ color: 'var(--accent-key)', fontWeight: 700, marginBottom: 12 }}>Common confusions to kill early</div>
        <div className="section-grid cols-3">
          {CONFUSION_CARDS.map((card) => (
            <div key={card.title} className="card-glass" style={{ padding: 'var(--space-md)' }}>
              <div style={{ color: card.accent, fontWeight: 700, marginBottom: 8 }}>{card.title}</div>
              <div className="callout danger" style={{ marginBottom: 10 }}>
                <strong>Wrong</strong><br />
                {card.wrong}
              </div>
              <div className="callout success">
                <strong>Right</strong><br />
                {card.right.includes('\\') ? <MathFormula math={card.right} displayMode /> : card.right}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
        {SAMPLE_CARDS.map((item) => (
          <div key={item.title} className="comparison-panel right" style={{ borderColor: 'var(--border)' }}>
            <div style={{ color: item.accent, fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
            <div className="formula-display" style={{ padding: '10px 14px', marginBottom: 10 }}>
              <MathFormula math={item.formula} displayMode />
            </div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>{item.summary}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{item.takeaway}</div>
          </div>
        ))}
      </div>

      <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="comparison-panel right">
          <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 8 }}>Window definition</div>
          <div className="formula-display" style={{ padding: '10px 14px', marginBottom: 10 }}>
            <MathFormula math={String.raw`X_{c,\tau}^{(r,w)} = X_{c,\,s_{r,w}+\tau}^{(r)},\qquad \tau = 0,\ldots,L_r-1`} displayMode />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.8 }}>
            <MathFormula math={String.raw`s_{r,w}`} /> 는 시작점, <MathFormula math={String.raw`\tau`} /> 는 window 내부 상대 위치,
            <MathFormula math={String.raw`L_r`} /> 는 길이입니다. 즉 같은 run 안에서도 <MathFormula math={String.raw`w`} /> 에 따라 서로 다른 샘플들이 생깁니다.
          </div>
        </div>

        <div className="comparison-panel left">
          <div style={{ color: 'var(--accent-error)', fontWeight: 700, marginBottom: 8 }}>Overlap consequence</div>
          <div className="formula-display" style={{ padding: '10px 14px', marginBottom: 10 }}>
            <MathFormula math={String.raw`\mu_c^{\mathrm{win}} = \frac{\sum_{r,t} m_{r,t} X_{c,t}^{(r)}}{\sum_{r,t} m_{r,t}}`} displayMode />
          </div>
          <div className="callout danger">
            <strong>핵심 직관</strong><br />
            <MathFormula math={String.raw`m_{r,t}`} /> 는 raw point 가 몇 개의 window에 포함되는지를 나타냅니다. overlap이 크면 어떤 point는 여러 번 세어지고,
            따라서 “window 뒤에 통계 계산”은 “raw point를 한 번씩 세는 계산”과 달라집니다.
          </div>
        </div>
      </div>

      <div className="callout success">
        <strong>이 페이지에서 가져갈 핵심</strong><br />
        `whole.md` 1번은 단순한 데이터 설명이 아니라, 이후 모든 normalization 논의를 위한 좌표계 정의입니다.
        <MathFormula math={String.raw`X^{(r)}`} /> 와 <MathFormula math={String.raw`X^{(r,w)}`} /> 를 분리해서 생각해야 leakage, overlap, sampling bias 를 정확히 말할 수 있습니다.
      </div>
    </div>
  );
}
