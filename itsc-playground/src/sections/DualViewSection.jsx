import { useMemo, useState } from 'react';
import MathFormula from '../components/MathFormula';

const PHASE_COLORS = ['var(--accent-phase-a)', 'var(--accent-phase-b)', 'var(--accent-phase-c)'];
const PHASE_LABELS = ['Phase A', 'Phase B', 'Phase C'];
const WINDOW_CYCLES = 12;
const SAMPLING_RATE = 2560;
const SEVERITY_OPTIONS = {
    healthy: {
        label: '정상',
        amps: [1.0, 1.0, 1.0],
        harmonic3: 0.04,
        harmonic5: 0.01,
        bias: 0.0,
        accent: 'var(--accent-normal)',
    },
    subtle: {
        label: 'Subtle fault',
        amps: [1.12, 1.0, 0.94],
        harmonic3: 0.11,
        harmonic5: 0.03,
        bias: 0.015,
        accent: 'var(--accent-key)',
    },
    medium: {
        label: 'Moderate fault',
        amps: [1.24, 1.0, 0.82],
        harmonic3: 0.18,
        harmonic5: 0.06,
        bias: 0.026,
        accent: 'var(--accent-highlight)',
    },
    severe: {
        label: 'Severe fault',
        amps: [1.38, 0.96, 0.7],
        harmonic3: 0.27,
        harmonic5: 0.09,
        bias: 0.04,
        accent: 'var(--accent-fault)',
    },
};
const LOAD_OPTIONS = [
    { key: 'light', label: 'Light load', factor: 0.82 },
    { key: 'nominal', label: 'Nominal load', factor: 1.0 },
    { key: 'heavy', label: 'Heavy load', factor: 1.18 },
];
const OPERATING_FREQS = [30, 45, 60, 90];

function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values, avg = mean(values)) {
    return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length);
}

function rms(values) {
    return Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0) / values.length);
}


function zScore(values) {
    const avg = mean(values);
    const sigma = std(values, avg) || 1;
    return values.map((value) => (value - avg) / sigma);
}

function harmonicAmplitude(signal, harmonic, cycles) {
    const total = signal.length;
    let cosSum = 0;
    let sinSum = 0;

    for (let index = 0; index < total; index += 1) {
        const theta = (2 * Math.PI * harmonic * cycles * index) / total;
        cosSum += signal[index] * Math.cos(theta);
        sinSum += signal[index] * Math.sin(theta);
    }

    return (2 / total) * Math.sqrt(cosSum ** 2 + sinSum ** 2);
}

function getMetrics(branch) {
    const channelRms = branch.map((channel) => rms(channel));
    const imbalance = (Math.max(...channelRms) - Math.min(...channelRms)) / mean(channelRms);
    const fundamental = harmonicAmplitude(branch[0], 1, WINDOW_CYCLES) || 1;
    const harmonic3 = harmonicAmplitude(branch[0], 3, WINDOW_CYCLES) / fundamental;

    return {
        channelRms,
        imbalance,
        harmonic3,
        peak: Math.max(...branch.flatMap((channel) => channel.map((value) => Math.abs(value)))),
    };
}

function generateSignals({ severityKey, loadFactor, electricalFreq }) {
    const severity = SEVERITY_OPTIONS[severityKey];
    const sampleCount = Math.round((WINDOW_CYCLES * SAMPLING_RATE) / electricalFreq);

    const buildBranch = (configKey) => {
        const config = SEVERITY_OPTIONS[configKey];
        return PHASE_LABELS.map((_, channelIndex) => {
            const phaseShift = (channelIndex * 2 * Math.PI) / 3;
            const amplitude = config.amps[channelIndex] * loadFactor;
            const harmonicBoost = channelIndex === 0 ? 1 : channelIndex === 1 ? 0.55 : 0.35;
            const envelope = channelIndex === 0 ? 1.02 : channelIndex === 2 ? 0.96 : 1.0;

            return Array.from({ length: sampleCount }, (_, index) => {
                const time = index / SAMPLING_RATE;
                const fundamental = amplitude * Math.sin(2 * Math.PI * electricalFreq * time + phaseShift);
                const third = config.harmonic3 * harmonicBoost * Math.sin(2 * Math.PI * 3 * electricalFreq * time + phaseShift * 0.45);
                const fifth = config.harmonic5 * Math.sin(2 * Math.PI * 5 * electricalFreq * time - phaseShift * 0.25);
                const ripple = 0.03 * loadFactor * Math.sin(2 * Math.PI * 0.5 * electricalFreq * time + channelIndex);
                return envelope * (fundamental + third + fifth + ripple + config.bias * (channelIndex === 0 ? 1 : -0.3));
            });
        });
    };

    const raw = buildBranch(severityKey);
    const healthyReference = buildBranch('healthy');
    const globalScale = healthyReference.flatMap((channel) => channel).reduce((current, value) => Math.max(current, Math.abs(value)), 0) || 1;

    return {
        raw,
        amplitudeBranch: raw.map((channel) => channel.map((value) => value / globalScale)),
        shapeBranch: raw.map((channel) => zScore(channel)),
        referenceScale: globalScale,
        severity,
    };
}

function toPath(values, width, height) {
    const centerY = height / 2;
    const scaleY = height * 0.34;
    const xStep = width / Math.max(values.length - 1, 1);
    return values.map((value, index) => {
        const x = index * xStep;
        const y = centerY - value * scaleY;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
}

function WaveformCard({ title, subtitle, signals, accent, badge, metrics }) {
    return (
        <div
            className="card"
            style={{
                display: 'grid',
                gap: 'var(--space-md)',
                background: 'linear-gradient(180deg, rgba(18,20,28,0.92), rgba(26,29,39,0.98))',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        {badge}
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{subtitle}</p>
                </div>
                <div style={{ display: 'grid', gap: 6, minWidth: 120 }}>
                    <div className="step-badge" style={{ justifyContent: 'center', borderColor: `${accent}`, color: accent }}>
                        peak {metrics.peak.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                        imbalance {(metrics.imbalance * 100).toFixed(1)}%
                    </div>
                </div>
            </div>

            <div className="waveform-container" style={{ padding: 'var(--space-md)' }}>
                <svg viewBox="0 0 760 230" style={{ width: '100%', height: 'auto' }}>
                    {[0.18, 0.5, 0.82].map((line) => (
                        <line
                            key={line}
                            x1="0"
                            y1={230 * line}
                            x2="760"
                            y2={230 * line}
                            stroke="var(--border)"
                            strokeDasharray="5,6"
                            strokeWidth="0.7"
                        />
                    ))}
                    {signals.map((channel, index) => (
                        <path
                            key={PHASE_LABELS[index]}
                            d={toPath(channel, 760, 230)}
                            fill="none"
                            stroke={PHASE_COLORS[index]}
                            strokeWidth="2"
                            opacity="0.92"
                            className="wave-path"
                            style={{ animationDelay: `${index * 0.12}s` }}
                        />
                    ))}
                </svg>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                    {PHASE_LABELS.map((label, index) => (
                        <span key={label} style={{ color: PHASE_COLORS[index], fontSize: '0.72rem', fontWeight: 700 }}>
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-md)' }}>
                <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Channel RMS
                    </div>
                    <div className="bar-group" style={{ minHeight: 110 }}>
                        {metrics.channelRms.map((value, index) => (
                            <div key={PHASE_LABELS[index]} style={{ flex: 1, display: 'grid', gap: 8, justifyItems: 'center' }}>
                                <div className="bar" style={{ height: `${Math.max(value * 82, 16)}px`, width: '100%', background: PHASE_COLORS[index] }} />
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    {value.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                    <div style={{ background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>3rd harmonic ratio</div>
                        <div className="stat-value" style={{ color: accent }}>{(metrics.harmonic3 * 100).toFixed(1)}%</div>
                    </div>
                    <div style={{ background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {badge === 'Amplitude branch'
                            ? 'Single global scale keeps phase-to-phase magnitude gaps visible.'
                            : 'Per-window z-score aligns scales so subtle waveform shape changes stand out.'}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricRow({ label, rawValue, ampValue, shapeValue, rawUnit = '', ampUnit = '', shapeUnit = '' }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 12, alignItems: 'center', fontSize: '0.82rem' }}>
            <div style={{ color: 'var(--text-secondary)' }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)' }}>{rawValue}{rawUnit}</div>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-output)' }}>{ampValue}{ampUnit}</div>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-highlight)' }}>{shapeValue}{shapeUnit}</div>
        </div>
    );
}

export default function DualViewSection() {
    const [severityKey, setSeverityKey] = useState('medium');
    const [loadKey, setLoadKey] = useState('nominal');
    const [electricalFreq, setElectricalFreq] = useState(60);

    const load = LOAD_OPTIONS.find((option) => option.key === loadKey) || LOAD_OPTIONS[1];

    const branches = useMemo(() => generateSignals({
        severityKey,
        loadFactor: load.factor,
        electricalFreq,
    }), [severityKey, load.factor, electricalFreq]);

    const rawMetrics = useMemo(() => getMetrics(branches.raw), [branches.raw]);
    const ampMetrics = useMemo(() => getMetrics(branches.amplitudeBranch), [branches.amplitudeBranch]);
    const shapeMetrics = useMemo(() => getMetrics(branches.shapeBranch), [branches.shapeBranch]);
    const severity = SEVERITY_OPTIONS[severityKey];

    return (
        <div>
            <div className="section-title">🔀 Dual-View 전처리 (Amplitude + Shape)</div>
            <div className="section-subtitle">
                단일 정규화만으로는 ITSC 단서를 모두 보존하기 어렵습니다. <strong>Amplitude-preserving branch</strong>는 절대 크기/imbalance를 유지하고,
                <strong> Shape branch</strong>는 <MathFormula math={'\\mathrm{per\\text{-}window}'} /> 표준화로 파형의 모양 변화만 분리합니다.
            </div>

            <div className="formula-display" style={{ marginBottom: 'var(--space-lg)' }}>
                <MathFormula math={'x_{\\mathrm{amp}} = \\frac{x}{s_{\\mathrm{global}}}'} displayMode />
                <span style={{ color: 'var(--text-muted)' }}>+</span>
                <MathFormula math={'x_{\\mathrm{shape}} = \\frac{x - \\mu_{\\mathrm{window}}}{\\sigma_{\\mathrm{window}}}'} displayMode />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>→ amplitude cue 와 waveform shape cue 를 분리 관찰</span>
            </div>

            <div className="control-panel" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="control-group">
                    <label className="control-label">Fault severity</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Object.entries(SEVERITY_OPTIONS).map(([key, option]) => (
                            <button
                                key={key}
                                className={`btn ${severityKey === key ? 'active' : ''}`}
                                onClick={() => setSeverityKey(key)}
                                style={severityKey === key ? { borderColor: option.accent, color: option.accent } : undefined}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="control-group">
                    <label className="control-label">Operating load</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {LOAD_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                className={`btn ${loadKey === option.key ? 'active' : ''}`}
                                onClick={() => setLoadKey(option.key)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="control-group">
                    <label className="control-label">Electrical frequency</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                            type="range"
                            min={30}
                            max={90}
                            step={15}
                            value={electricalFreq}
                            onChange={(event) => setElectricalFreq(Number(event.target.value))}
                            style={{ width: 140 }}
                            list="dual-view-freqs"
                        />
                        <span style={{ minWidth: 56, fontFamily: 'var(--font-mono)', color: 'var(--accent-input)', fontWeight: 700 }}>
                            <MathFormula math={`${electricalFreq}\\,\\mathrm{Hz}`} />
                        </span>
                        <datalist id="dual-view-freqs">
                            {OPERATING_FREQS.map((freq) => <option key={freq} value={freq} />)}
                        </datalist>
                    </div>
                </div>
                <div className="control-group" style={{ marginLeft: 'auto' }}>
                    <label className="control-label" style={{ color: severity.accent }}>Current scenario</label>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: severity.accent, fontWeight: 700 }}>
                        {severity.label} · {load.label}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        <MathFormula math={`s_{\\mathrm{ref}}=${branches.referenceScale.toFixed(2)}`} /> from healthy window
                    </div>
                </div>
            </div>

            <div className="section-grid cols-3" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="card">
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why branch 1?</div>
                    <div className="stat-value" style={{ color: 'var(--accent-output)', margin: '8px 0' }}>Amplitude cue</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>RMS level, phase imbalance, harmonic magnitude 같은 절대 크기 단서를 유지합니다.</div>
                </div>
                <div className="card">
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why branch 2?</div>
                    <div className="stat-value" style={{ color: 'var(--accent-highlight)', margin: '8px 0' }}>Shape cue</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}><MathFormula math={'\\mathrm{per\\text{-}window\\ z\\text{-}score}'} />로 크기를 제거하고 왜곡, 비대칭, harmonic shape만 상대적으로 드러냅니다.</div>
                </div>
                <div className="card stage-active">
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Window summary</div>
                    <div className="stat-value" style={{ margin: '8px 0', color: severity.accent }}>{Math.round((WINDOW_CYCLES * SAMPLING_RATE) / electricalFreq)}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}><MathFormula math={`${WINDOW_CYCLES}\\ \\mathrm{cycles}\\ @\\ ${electricalFreq}\\,\\mathrm{Hz}`} />, shared across both branches.</div>
                </div>
            </div>

            <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
                <WaveformCard
                    title="Amplitude-preserving branch"
                    subtitle="healthy reference로 한 번만 나눠서 phase-to-phase magnitude gap을 남겨둡니다."
                    signals={branches.amplitudeBranch}
                    accent="var(--accent-output)"
                    badge="Amplitude branch"
                    metrics={ampMetrics}
                />
                <WaveformCard
                    title="Shape branch"
                    subtitle="window 안에서 채널별 z-score를 적용해 waveform shape 차이를 더 크게 보이게 합니다."
                    signals={branches.shapeBranch}
                    accent="var(--accent-highlight)"
                    badge="Shape branch"
                    metrics={shapeMetrics}
                />
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 12, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        <div><MathFormula math={'\\mathrm{Metric}'} /></div>
                        <div>Raw window</div>
                        <div>Amplitude branch</div>
                        <div>Shape branch</div>
                    </div>
                    <MetricRow
                        label={<MathFormula math={'\\mathrm{Phase\\ A\\ RMS}'} />}
                        rawValue={rawMetrics.channelRms[0].toFixed(2)}
                        ampValue={ampMetrics.channelRms[0].toFixed(2)}
                        shapeValue={shapeMetrics.channelRms[0].toFixed(2)}
                    />
                    <MetricRow
                        label={<MathFormula math={'\\mathrm{RMS\\ imbalance}'} />}
                        rawValue={(rawMetrics.imbalance * 100).toFixed(1)}
                        ampValue={(ampMetrics.imbalance * 100).toFixed(1)}
                        shapeValue={(shapeMetrics.imbalance * 100).toFixed(1)}
                        rawUnit="%"
                        ampUnit="%"
                        shapeUnit="%"
                    />
                    <MetricRow
                        label={<MathFormula math={'\\mathrm{3rd\\ harmonic} / \\mathrm{fundamental}'} />}
                        rawValue={(rawMetrics.harmonic3 * 100).toFixed(1)}
                        ampValue={(ampMetrics.harmonic3 * 100).toFixed(1)}
                        shapeValue={(shapeMetrics.harmonic3 * 100).toFixed(1)}
                        rawUnit="%"
                        ampUnit="%"
                        shapeUnit="%"
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                <div className="callout success">
                    <strong>✅ Amplitude branch가 필요한 이유</strong><br />
                    shape branch만 쓰면 severity가 커져도 <MathFormula math={'\\mathrm{RMS\\ imbalance}'} />가 거의 <MathFormula math={'0\\%'} /> 근처로 눌립니다. 실제 ITSC에서 중요한 절대 진폭, phase imbalance, harmonic magnitude 단서를 이 branch가 보존합니다.
                </div>
                <div className="callout warn">
                    <strong>🧠 Shape branch가 필요한 이유</strong><br />
                    amplitude cue가 강할수록 작은 waveform 비틀림은 묻히기 쉽습니다. <MathFormula math={'\\mathrm{per\\text{-}window\\ z\\text{-}score}'} /> branch는 operating load 변화보다 shape distortion에 더 민감하도록 만들어 subtle fault를 분리하는 보조 view가 됩니다.
                </div>
            </div>
        </div>
    );
}
