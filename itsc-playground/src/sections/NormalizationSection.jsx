import { useState, useMemo } from 'react';
import MathFormula from '../components/MathFormula';

const PHASE_COLORS = ['var(--accent-phase-a)', 'var(--accent-phase-b)', 'var(--accent-phase-c)'];
const PHASE_LABELS = ['Phase A', 'Phase B', 'Phase C'];
const SCALER_INFO = {
    standard: { name: 'StandardScaler', desc: '평균=0, 표준편차=1로 정규화', formula: "x' = \\frac{x - \\mu}{\\sigma}", pro: '가장 일반적, 분포 균형', con: 'outlier에 취약' },
    maxabs: { name: 'MaxAbsScaler', desc: '[-1, 1] 범위로 정규화, zero-centered 데이터에 적합', formula: "x' = \\frac{x}{\\max\\left(|x|\\right)}", pro: 'zero-centered 보존, sparse 데이터에 좋음', con: 'outlier spike에 매우 민감' },
    robust: { name: 'RobustScaler', desc: 'IQR 기반, 이상치에 강건', formula: "x' = \\frac{x - \\mathrm{median}}{\\mathrm{IQR}}", pro: 'outlier에 강건', con: '분포 가정이 다를 수 있음' },
};

/* ── Generate synthetic data ── */
function deterministicNoise(index, channelSeed) {
    const base = Math.sin(index * 12.9898 + channelSeed * 78.233) * 43758.5453;
    return (base - Math.floor(base) - 0.5) * 0.1;
}

function generateData(n = 100, fault = false) {
    const data = { a: [], b: [], c: [] };
    for (let i = 0; i < n; i++) {
        const t = i / n * 2 * Math.PI * 4;
        data.a.push(Math.sin(t) * (fault ? 1.3 : 1.0) + deterministicNoise(i, 1));
        data.b.push(Math.sin(t + 2.094) * 1.0 + deterministicNoise(i, 2));
        data.c.push(Math.sin(t + 4.189) * (fault ? 0.7 : 1.0) + deterministicNoise(i, 3));
    }
    return data;
}

function applyScaler(values, scalerType, stats) {
    switch (scalerType) {
        case 'standard': return values.map(v => (v - stats.mean) / (stats.std || 1));
        case 'maxabs': return values.map(v => v / (stats.maxAbs || 1));
        case 'robust': return values.map(v => (v - stats.median) / (stats.iqr || 1));
        default: return values;
    }
}

function calcStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    const maxAbs = Math.max(...values.map(Math.abs));
    const median = sorted[Math.floor(n / 2)];
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    return { mean, std, maxAbs, median, iqr, min: sorted[0], max: sorted[n - 1] };
}

/* ── Mini Waveform ── */
function MiniWave({ data, color, height = 80, width = 280, label, stats }) {
    const [hovered, setHovered] = useState(null);
    const xStep = width / data.length;
    const yScale = height * 0.4;
    const path = data.map((v, i) => {
        const x = i * xStep;
        const y = height / 2 - v * yScale;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return (
        <div style={{ position: 'relative' }}
            onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const idx = Math.floor(x / (rect.width / data.length));
                setHovered(idx >= 0 && idx < data.length ? idx : null);
            }}
            onMouseLeave={() => setHovered(null)}>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
                <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--border)" strokeWidth="0.5" />
                <path d={path} fill="none" stroke={color} strokeWidth="1.5" opacity="0.85" className="wave-path" />
                {hovered !== null && (
                    <>
                        <line x1={hovered * xStep} y1={0} x2={hovered * xStep} y2={height}
                            stroke="var(--text-muted)" strokeWidth="0.5" strokeDasharray="3,3" />
                        <circle cx={hovered * xStep} cy={height / 2 - data[hovered] * yScale} r="3"
                            fill={color} stroke="var(--bg-primary)" strokeWidth="1.5" />
                    </>
                )}
                {label && (
                    <text x="4" y="12" fill={color} fontSize="10" fontWeight="600" fontFamily="var(--font-mono)">{label}</text>
                )}
            </svg>
            {hovered !== null && (
                <div className="tooltip" style={{ left: `${(hovered / data.length) * 100}%`, bottom: '100%', transform: 'translateX(-50%)' }}>
                    <span style={{ color, fontWeight: 600 }}>{data[hovered].toFixed(4)}</span>
                </div>
            )}
            {stats && (
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    <span><MathFormula math={`\\mu=${stats.mean.toFixed(3)}`} /></span>
                    <span><MathFormula math={`\\sigma=${stats.std.toFixed(3)}`} /></span>
                    <span><MathFormula math={`\\max\\lvert x \\rvert=${stats.maxAbs.toFixed(3)}`} /></span>
                </div>
            )}
        </div>
    );
}

/* ── Stats Display ── */
function StatsCard({ stats, color, label }) {
    return (
        <div style={{
            background: 'var(--bg-deep)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 16px',
        }}>
            <span style={{ gridColumn: '1 / -1', color, fontWeight: 600, marginBottom: 4 }}>{label}</span>
            <span><MathFormula math={'\\mu'} /> = <span style={{ color: 'var(--text-primary)' }}>{stats.mean.toFixed(4)}</span></span>
            <span><MathFormula math={'\\sigma'} /> = <span style={{ color: 'var(--text-primary)' }}>{stats.std.toFixed(4)}</span></span>
            <span>med = <span style={{ color: 'var(--text-primary)' }}>{stats.median.toFixed(4)}</span></span>
            <span><MathFormula math={'\\mathrm{IQR}'} /> = <span style={{ color: 'var(--text-primary)' }}>{stats.iqr.toFixed(4)}</span></span>
            <span><MathFormula math={'\\max\\lvert x \\rvert'} /> = <span style={{ color: 'var(--text-primary)' }}>{stats.maxAbs.toFixed(4)}</span></span>
            <span>range = <span style={{ color: 'var(--text-primary)' }}>[{stats.min.toFixed(2)}, {stats.max.toFixed(2)}]</span></span>
        </div>
    );
}

/* ── Main Section ── */
export default function NormalizationSection() {
    const [scalerType, setScalerType] = useState('standard');
    const [mode, setMode] = useState('channel'); // 'channel' or 'joint'
    const [showFault, setShowFault] = useState(false);

    const rawData = useMemo(() => generateData(120, showFault), [showFault]);

    // Channel-wise stats (from train normal only)
    const channelStats = useMemo(() => ({
        a: calcStats(rawData.a),
        b: calcStats(rawData.b),
        c: calcStats(rawData.c),
    }), [rawData]);

    // Joint stats (all channels combined)
    const jointStats = useMemo(() => {
        const all = [...rawData.a, ...rawData.b, ...rawData.c];
        return calcStats(all);
    }, [rawData]);

    // Normalized data
    const normalizedData = useMemo(() => {
        if (mode === 'channel') {
            return {
                a: applyScaler(rawData.a, scalerType, channelStats.a),
                b: applyScaler(rawData.b, scalerType, channelStats.b),
                c: applyScaler(rawData.c, scalerType, channelStats.c),
            };
        } else {
            return {
                a: applyScaler(rawData.a, scalerType, jointStats),
                b: applyScaler(rawData.b, scalerType, jointStats),
                c: applyScaler(rawData.c, scalerType, jointStats),
            };
        }
    }, [rawData, mode, scalerType, channelStats, jointStats]);

    const normStats = useMemo(() => ({
        a: calcStats(normalizedData.a),
        b: calcStats(normalizedData.b),
        c: calcStats(normalizedData.c),
    }), [normalizedData]);

    const scaler = SCALER_INFO[scalerType];

    return (
        <div>
            <div className="section-title">📊 채널별 정규화 (Channel-wise Normalization)</div>
            <div className="section-subtitle">
                3상 모터의 A/B/C 채널은 의미가 다른 상이므로, 정규화 통계는 채널별로 분리하는 것이 안전합니다.
            </div>

            {/* Key Principle */}
            <div className="formula-display" style={{ marginBottom: 'var(--space-lg)' }}>
                <MathFormula
                    math={'\\mathrm{scaler}[c] = \\mathrm{fit}(\\mathrm{train\\_normal\\ channel}\\ c)'}
                    displayMode
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    → val/test에는 transform만 적용
                </span>
            </div>

            {/* Controls */}
            <div className="control-panel" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="control-group">
                    <label className="control-label">Scaler 종류</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {Object.entries(SCALER_INFO).map(([key, info]) => (
                            <button key={key} className={`btn ${scalerType === key ? 'active' : ''}`}
                                onClick={() => setScalerType(key)}
                                style={{ fontSize: '0.78rem' }}>
                                {info.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="control-group">
                    <label className="control-label">정규화 모드</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className={`btn ${mode === 'channel' ? 'active' : ''}`}
                            onClick={() => setMode('channel')}
                            style={{
                                background: mode === 'channel' ? 'rgba(52,211,153,0.15)' : undefined,
                                borderColor: mode === 'channel' ? 'var(--accent-output)' : undefined,
                                color: mode === 'channel' ? 'var(--accent-output)' : undefined,
                            }}>
                            ✅ 채널별
                        </button>
                        <button className={`btn ${mode === 'joint' ? 'active' : ''}`}
                            onClick={() => setMode('joint')}
                            style={{
                                background: mode === 'joint' ? 'rgba(248,113,113,0.15)' : undefined,
                                borderColor: mode === 'joint' ? 'var(--accent-error)' : undefined,
                                color: mode === 'joint' ? 'var(--accent-error)' : undefined,
                            }}>
                            ❌ 공동 (Joint)
                        </button>
                    </div>
                </div>
                <div className="control-group">
                    <label className="control-label">데이터 상태</label>
                    <button className={`btn ${showFault ? 'active' : ''}`}
                        onClick={() => setShowFault(!showFault)}
                        style={{
                            background: showFault ? 'rgba(248,113,113,0.15)' : undefined,
                            borderColor: showFault ? 'var(--accent-fault)' : undefined,
                            color: showFault ? 'var(--accent-fault)' : undefined,
                        }}>
                        {showFault ? '⚠ Fault (A↑, C↓)' : '정상 파형'}
                    </button>
                </div>
            </div>

            {/* Scaler info */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-input)', fontSize: '1rem' }}>{scaler.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{scaler.desc}</div>
                    </div>
                    <div className="formula-display" style={{ flex: 1, minWidth: 200, padding: '8px 16px' }}>
                        <MathFormula math={scaler.formula} displayMode />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-output)', fontWeight: 600 }}>👍 장점</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{scaler.pro}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-error)', fontWeight: 600 }}>👎 단점</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{scaler.con}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Before / After comparison */}
            <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
                {/* Raw */}
                <div className="card">
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                        📈 Raw (원본 데이터)
                    </h3>
                    {['a', 'b', 'c'].map((ch, i) => (
                        <div key={ch} style={{ marginBottom: 'var(--space-md)' }}>
                            <MiniWave data={rawData[ch]} color={PHASE_COLORS[i]} label={PHASE_LABELS[i]} stats={channelStats[ch]} />
                        </div>
                    ))}
                </div>

                {/* Normalized */}
                <div className={`card ${mode === 'channel' ? 'stage-active' : ''}`}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 'var(--space-md)', color: mode === 'channel' ? 'var(--accent-output)' : 'var(--accent-error)' }}>
                        📉 {mode === 'channel' ? '채널별' : '공동'} {scaler.name} 적용 후
                    </h3>
                    {['a', 'b', 'c'].map((ch, i) => (
                        <div key={ch} style={{ marginBottom: 'var(--space-md)' }}>
                            <MiniWave data={normalizedData[ch]} color={PHASE_COLORS[i]} label={PHASE_LABELS[i]} stats={normStats[ch]} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats comparison */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
                    정규화 후 채널별 통계 비교
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                    {['a', 'b', 'c'].map((ch, i) => (
                        <StatsCard key={ch} stats={normStats[ch]} color={PHASE_COLORS[i]} label={`${PHASE_LABELS[i]} (정규화 후)`} />
                    ))}
                </div>
            </div>

            {/* Why callouts */}
            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                <div className="callout danger">
                    <strong>⚠ <MathFormula math={'\\mathrm{per\\text{-}window\\ z\\text{-}score}'} />를 기본값으로 두지 마세요</strong><br />
                    ITSC에서는 absolute amplitude, imbalance, harmonic magnitude 자체가 fault 단서입니다.
                    Stator current fault harmonics 증가, <MathFormula math={'2\\times \\mathrm{supply\\ frequency}'} /> 성분, <MathFormula math={'\\mathrm{3rd\\ harmonic\\ ratio}'} /> 등이 fault indicator로 사용되는데,
                    <MathFormula math={'\\mathrm{per\\text{-}window\\ z\\text{-}score}'} />는 이러한 절대 크기 정보를 약화시킵니다.
                </div>
                <div className="callout success">
                    <strong>✅ 권장: 채널별, train-normal-only 정규화</strong><br />
                    <MathFormula math={'\\mathrm{scaler}[c] = \\mathrm{fit}(\\mathrm{train\\_normal\\ windows\\ of\\ channel}\\ c)'} /> → <MathFormula math={'\\mathrm{val/test}'} />에는 <MathFormula math={'\\mathrm{transform}'} />만.
                    채널 간 상호작용(phase imbalance 등)을 보존하면서 각 채널의 identity를 유지합니다.
                </div>
            </div>
        </div>
    );
}
