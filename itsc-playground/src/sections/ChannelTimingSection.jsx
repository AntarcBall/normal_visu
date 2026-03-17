import { useMemo, useState } from 'react';
import MathFormula from '../components/MathFormula';

const OVERLAP_LEVELS = {
  low: { label: 'Low overlap', multiplier: [1, 1, 1, 1, 1, 1] },
  medium: { label: 'Medium overlap', multiplier: [1, 2, 3, 3, 2, 1] },
  high: { label: 'High overlap', multiplier: [1, 3, 5, 5, 3, 1] },
};

const CANDIDATES = [
  {
    key: 'no-norm',
    title: 'No normalization',
    accent: 'var(--accent-highlight)',
    formula: String.raw`\tilde{X}=X`,
    intuition: '절대 amplitude와 imbalance를 최대한 보존합니다.',
    best: 'fault cue 자체가 진폭/하모닉 크기일 가능성이 높을 때',
    risk: 'optimizer 입장에서는 scale 차이를 그대로 떠안습니다.',
  },
  {
    key: 'center-only',
    title: 'Centering only',
    accent: 'var(--accent-input)',
    formula: String.raw`\tilde{X}_{c,t}=X_{c,t}-\mu_c`,
    intuition: 'DC offset만 제거하고 amplitude는 남기는 중간 후보입니다.',
    best: 'offset drift는 줄이되 magnitude cue는 지키고 싶을 때',
    risk: '분산 차이는 그대로 남습니다.',
  },
  {
    key: 'pre-window',
    title: 'Pre-window normalization',
    accent: 'var(--accent-output)',
    formula: String.raw`\mu_c^{raw}=\frac{\sum_{r,t} X^{(r)}_{c,t}}{\sum_r T_r}`,
    intuition: 'raw point를 한 번씩만 세는 point-level 기준입니다.',
    best: 'overlap에 통계가 휘둘리지 않게 하고 싶을 때',
    risk: 'run/window local drift는 더 많이 남습니다.',
  },
  {
    key: 'post-window',
    title: 'Post-window normalization',
    accent: 'var(--accent-error)',
    formula: String.raw`\mu_c^{win}=\frac{\sum_{r,w,\tau} X^{(r,w)}_{c,\tau}}{\sum_r N_rL_r}`,
    intuition: 'window sampler가 자주 보는 포인트를 더 많이 세는 기준입니다.',
    best: '모델 입력이 실제로 보는 분포에 맞춰 통계를 잡고 싶을 때',
    risk: 'overlap 설계가 normalization 통계를 오염시킬 수 있습니다.',
  },
];

function TimingIdea({ candidate }) {
  const stroke = candidate.accent;
  return (
    <svg viewBox="0 0 360 130" style={{ width: '100%', height: 'auto', background: 'rgba(18,20,28,0.75)', borderRadius: 14, border: '1px solid var(--border)' }}>
      <rect x="14" y="14" width="332" height="102" rx="16" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.05)" />
      {candidate.key === 'no-norm' && (
        <>
          {[0, 1, 2].map((row) => (
            <rect key={row} x="30" y={30 + row * 24} width="220" height="12" rx="6" fill={['var(--accent-phase-a)', 'var(--accent-phase-b)', 'var(--accent-phase-c)'][row]} opacity="0.25" />
          ))}
          <text x="278" y="65" fill={stroke} fontSize="13" fontWeight="700">keep raw scale</text>
        </>
      )}
      {candidate.key === 'center-only' && (
        <>
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <line x1="44" y1={34 + row * 24} x2="44" y2={46 + row * 24} stroke={stroke} strokeWidth="2" />
              <rect x="64" y={34 + row * 24} width="160" height="12" rx="6" fill={['var(--accent-phase-a)', 'var(--accent-phase-b)', 'var(--accent-phase-c)'][row]} opacity="0.25" />
            </g>
          ))}
          <text x="248" y="65" fill={stroke} fontSize="13" fontWeight="700">remove only μ</text>
        </>
      )}
      {candidate.key === 'pre-window' && (
        <>
          <rect x="28" y="36" width="220" height="20" rx="10" fill="rgba(96,165,250,0.12)" stroke="var(--accent-input)" />
          <circle cx="286" cy="46" r="18" fill="none" stroke={stroke} strokeWidth="2.5" />
          <line x1="248" y1="46" x2="268" y2="46" stroke={stroke} strokeWidth="2.5" />
          <text x="56" y="90" fill="var(--text-secondary)" fontSize="12">count each raw point once</text>
        </>
      )}
      {candidate.key === 'post-window' && (
        <>
          <rect x="26" y="56" width="220" height="14" rx="7" fill="rgba(248,113,113,0.09)" stroke="var(--accent-error)" />
          {[0, 1, 2].map((idx) => (
            <rect key={idx} x={40 + idx * 54} y="42" width="86" height="42" rx="10" fill="none" stroke={stroke} strokeDasharray="5 4" />
          ))}
          <text x="258" y="90" fill={stroke} fontSize="12">middle points are re-counted</text>
        </>
      )}
    </svg>
  );
}

function WeightBars({ weights }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, minHeight: 120 }}>
        {weights.map((value, index) => (
          <div key={`${index}-${value}`} style={{ display: 'grid', alignItems: 'end', justifyItems: 'center', gap: 8 }}>
            <div
              className="bar"
              style={{
                width: '100%',
                height: `${20 + value * 18}px`,
                background: 'linear-gradient(180deg, var(--accent-highlight), rgba(167,139,250,0.35))',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              p{index + 1}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        {weights.map((value, index) => (
          <div key={`w-${index}-${value}`} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--accent-highlight)' }}>
            ×{value}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChannelTimingSection() {
  const [overlapKey, setOverlapKey] = useState('medium');
  const [candidateKey, setCandidateKey] = useState('center-only');

  const overlap = OVERLAP_LEVELS[overlapKey];
  const candidate = useMemo(() => CANDIDATES.find((item) => item.key === candidateKey) ?? CANDIDATES[0], [candidateKey]);

  return (
    <div>
      <div className="section-title">⏱️ whole.md 재구성 4 — 정규화 시점과 무정규화 후보</div>
      <div className="section-subtitle">
        whole.md 6)-7)의 핵심은 <strong>언제 정규화 통계를 계산하느냐</strong>가 결과를 바꾸고,
        <strong> 정규화를 아예 하지 않는 것</strong>과 <strong>centering only</strong>도 정식 후보로 남겨야 한다는 점입니다.
      </div>

      <div className="formula-display" style={{ marginBottom: 'var(--space-lg)' }}>
        <MathFormula math={String.raw`\mu_c^{raw} \neq \mu_c^{win}\quad \text{when overlap reweights points}`} displayMode />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          overlap이 크면 <MathFormula math={String.raw`\mu_c^{win}`} /> 은 sampler-weighted statistic이 됩니다.
        </span>
      </div>

      <div className="control-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="control-group">
          <label className="control-label">Overlap scenario</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(OVERLAP_LEVELS).map(([key, item]) => (
              <button
                key={key}
                className={`btn ${overlapKey === key ? 'active' : ''}`}
                onClick={() => setOverlapKey(key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <label className="control-label">Candidate focus</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CANDIDATES.map((item) => (
              <button
                key={item.key}
                className={`btn ${candidateKey === item.key ? 'active' : ''}`}
                onClick={() => setCandidateKey(item.key)}
                style={candidateKey === item.key ? { borderColor: item.accent, color: item.accent } : undefined}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="comparison-panel right">
          <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 10 }}>Pre-window normalization</div>
          <MathFormula math={String.raw`\mu_c^{raw}=\frac{\sum_{r,t} X^{(r)}_{c,t}}{\sum_r T_r}`} displayMode />
          <div className="callout success" style={{ marginTop: 12 }}>
            <strong>직관</strong><br />
            모든 raw point를 한 번씩만 셉니다. overlap 여부와 무관하게 point-level weighting이 일정합니다.
          </div>
        </div>

        <div className="comparison-panel left">
          <div style={{ color: 'var(--accent-error)', fontWeight: 700, marginBottom: 10 }}>Post-window normalization</div>
          <MathFormula math={String.raw`\mu_c^{win}=\frac{\sum_{r,w,\tau} X^{(r,w)}_{c,\tau}}{\sum_r N_rL_r}=\frac{\sum_{r,t} m_{r,t}X^{(r)}_{c,t}}{\sum_{r,t} m_{r,t}}`} displayMode />
          <div className="callout danger" style={{ marginTop: 12 }}>
            <strong>직관</strong><br />
            overlap이 큰 구간은 <MathFormula math={String.raw`m_{r,t}`} /> 만큼 여러 번 세어집니다. 즉 normalization 통계가 window sampler의 영향을 받습니다.
          </div>
        </div>
      </div>

      <div className="card" data-testid="channel-timing-overlap-card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--accent-highlight)', fontWeight: 700 }}>Overlap weighting demo</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
              선택한 overlap 시나리오에서 중간 포인트가 얼마나 많이 다시 세어지는지 직관적으로 보여줍니다.
            </div>
          </div>
          <div className="step-badge">{overlap.label}</div>
        </div>
        <WeightBars weights={overlap.multiplier} />
      </div>

      <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card stage-active" style={{ display: 'grid', gap: 12 }}>
          <div style={{ color: candidate.accent, fontWeight: 700 }}>{candidate.title}</div>
          <TimingIdea candidate={candidate} />
          <MathFormula math={candidate.formula} displayMode />
          <div className="callout success"><strong>좋은 이유</strong><br />{candidate.best}</div>
          <div className="callout danger"><strong>조심할 점</strong><br />{candidate.risk}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>{candidate.intuition}</div>
        </div>

        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <div style={{ color: 'var(--accent-key)', fontWeight: 700 }}>Practical shortlist</div>
          <div className="formula-display" style={{ padding: '10px 14px' }}>
            <MathFormula math={String.raw`\{\text{no norm},\ \text{center only},\ \text{pre-window global},\ \text{post-window global}\}`} displayMode />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.8 }}>
            whole.md의 결론은 “정규화 적용 vs 미적용” 이분법이 아니라, <strong>timing choice + no-normalization candidates</strong>를 함께 실험 매트릭스로 넣으라는 것입니다.
          </div>
          <div className="section-grid cols-2">
            {CANDIDATES.map((item) => (
              <div key={item.key} className="card-glass" style={{ padding: 'var(--space-md)' }}>
                <div style={{ color: item.accent, fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.intuition}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" data-testid="channel-timing-all-candidates-card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 12 }}>All timing candidates, each with an idea</div>
        <div className="section-grid cols-2">
          {CANDIDATES.map((item) => (
            <div key={item.key} className="card-glass" style={{ padding: 'var(--space-md)', display: 'grid', gap: 10 }}>
              <div style={{ color: item.accent, fontWeight: 700 }}>{item.title}</div>
              <TimingIdea candidate={item} />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Idea:</strong> {item.intuition}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="callout warn">
        <strong>실험 설계 결론</strong><br />
        ITSC에서 amplitude / imbalance / harmonic magnitude가 cue일 수 있다면, baseline은 <MathFormula math={String.raw`\tilde{X}=X`} /> 와 <MathFormula math={String.raw`\tilde{X}_{c,t}=X_{c,t}-\mu_c`} /> 까지 포함해야 합니다.
        즉 정규화의 질문은 “무엇을 쓸까?”가 아니라 “<strong>언제 계산하고, 얼마나 보존할까?</strong>”입니다.
      </div>
    </div>
  );
}
