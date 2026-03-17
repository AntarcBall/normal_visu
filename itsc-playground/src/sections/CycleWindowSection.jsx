import { useState, useMemo } from 'react';
import MathFormula from '../components/MathFormula';

/* ── Helpers ── */
const generateWaveform = (fs, fe, cycles, channels = 3, addFault = false) => {
    const L = Math.round(cycles * fs / fe);
    const points = [];
    for (let ch = 0; ch < channels; ch++) {
        const chPoints = [];
        const phaseOffset = (ch * 2 * Math.PI) / 3; // 120° phase shift for 3-phase
        for (let i = 0; i < L; i++) {
            const t = i / fs;
            let val = Math.sin(2 * Math.PI * fe * t + phaseOffset);
            // Add fault harmonics for demonstration
            if (addFault && ch === 0) {
                val += 0.15 * Math.sin(2 * Math.PI * 3 * fe * t); // 3rd harmonic
                val += 0.08 * Math.sin(2 * Math.PI * 5 * fe * t); // 5th harmonic
            }
            chPoints.push(val);
        }
        points.push(chPoints);
    }
    return { points, L };
};

const PHASE_COLORS = ['var(--accent-phase-a)', 'var(--accent-phase-b)', 'var(--accent-phase-c)'];
const PHASE_LABELS = ['Phase A', 'Phase B', 'Phase C'];

/* ── Waveform SVG ── */
function WaveformSVG({ data, width = 700, height = 180, windowStart = null, windowEnd = null, label = '' }) {
    const paths = useMemo(() => {
        return data.map((ch, ci) => {
            const xStep = width / ch.length;
            const d = ch.map((v, i) => {
                const x = i * xStep;
                const y = height / 2 - v * (height * 0.38);
                return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');
            return { d, color: PHASE_COLORS[ci] };
        });
    }, [data, width, height]);

    const windowX1 = windowStart !== null ? (windowStart / data[0].length) * width : null;
    const windowX2 = windowEnd !== null ? (windowEnd / data[0].length) * width : null;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
            {/* Grid lines */}
            <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--border)" strokeWidth="0.5" />
            {[0.25, 0.75].map(pct => (
                <line key={pct} x1="0" y1={height * pct} x2={width} y2={height * pct}
                    stroke="var(--border)" strokeWidth="0.3" strokeDasharray="4,4" />
            ))}
            {/* Window highlight */}
            {windowX1 !== null && windowX2 !== null && (
                <rect x={windowX1} y={0} width={windowX2 - windowX1} height={height}
                    fill="rgba(167, 139, 250, 0.08)" stroke="var(--accent-highlight)"
                    strokeWidth="1.5" strokeDasharray="6,3" rx="4" />
            )}
            {/* Waveform paths */}
            {paths.map((p, i) => (
                <path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth="1.8"
                    className="wave-path" style={{ animationDelay: `${i * 0.15}s` }} opacity="0.85" />
            ))}
            {/* Labels */}
            {label && (
                <text x="8" y="16" fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-mono)">{label}</text>
            )}
        </svg>
    );
}

/* ── Frequency Comparison Cards ── */
function FreqCompare({ fs, cycles, freqs, activeFreq }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${freqs.length}, 1fr)`,
            gap: 'var(--space-sm)',
        }}>
            {freqs.map(fe => {
                const L = Math.round(cycles * fs / fe);
                const isActive = fe === activeFreq;
                return (
                    <div key={fe} className={`card ${isActive ? 'stage-active' : ''}`}
                        style={{
                            padding: 'var(--space-md)',
                            textAlign: 'center',
                            cursor: 'default',
                            transition: 'all 0.3s',
                        }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-input)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                            <MathFormula math={`f_e = ${fe}\\,\\mathrm{Hz}`} />
                        </div>
                        <div className="stat-value" style={{ color: isActive ? 'var(--accent-highlight)' : 'var(--text-primary)' }}>
                            {L}
                        </div>
                        <div className="stat-label">samples / window</div>
                        <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            <MathFormula math={`${cycles} \\cdot ${fs} / ${fe}`} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Main Section ── */
export default function CycleWindowSection() {
    const [fs, setFs] = useState(25600);     // sampling rate 
    const [fe, setFe] = useState(60);        // electrical frequency
    const [cycles, setCycles] = useState(16); // number of cycles
    const [showFault, setShowFault] = useState(false);

    const L = Math.round(cycles * fs / fe);
    const freqs = [30, 40, 50, 60, 70, 80];

    // Generate waveform data
    const waveData = useMemo(() => {
        return generateWaveform(fs, fe, cycles + 6, 3, showFault);
    }, [fs, fe, cycles, showFault]);

    const windowSamples = Math.round(cycles * fs / fe);
    const totalSamples = waveData.points[0].length;
    const windowStart = Math.round(totalSamples * 0.15);
    const windowEnd = windowStart + windowSamples;

    // For fixed-window comparison
    const fixedWindowSize = 4096;
    return (
        <div>
            <div className="section-title">🔄 사이클 기반 윈도우 (Cycle-Based Windowing)</div>
            <div className="section-subtitle">
                주파수가 다른 데이터를 동일한 <strong>전기적 사이클 수</strong>로 맞추어, 모델이 주파수 차이가 아닌 fault 패턴을 학습하도록 합니다.
            </div>

            {/* Formula */}
            <div className="formula-display" style={{ marginBottom: 'var(--space-lg)' }}>
                <MathFormula
                    math={'L = \\operatorname{round}\\!\\left(C \\cdot \\frac{f_s}{f_e}\\right)'}
                    displayMode
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    <MathFormula math={'L'} /> = 윈도우 길이,&nbsp;
                    <MathFormula math={'C'} /> = 사이클 수,&nbsp;
                    <MathFormula math={'f_s'} /> = 샘플링 레이트,&nbsp;
                    <MathFormula math={'f_e'} /> = 전기적 주파수
                </span>
            </div>

            {/* Controls */}
            <div className="control-panel" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="control-group">
                    <label className="control-label">Sampling Rate (<MathFormula math={'f_s'} />)</label>
                    <select className="input-field" value={fs} onChange={e => setFs(+e.target.value)}
                        style={{ width: 130, fontFamily: 'var(--font-mono)' }}>
                        {[8000, 12800, 25600, 51200].map(v => (
                            <option key={v} value={v}>{v.toLocaleString()} Hz</option>
                        ))}
                    </select>
                </div>
                <div className="control-group">
                    <label className="control-label">Electrical Freq (<MathFormula math={'f_e'} />)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="range" min={10} max={120} step={5} value={fe}
                            onChange={e => setFe(+e.target.value)} style={{ width: 120 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-phase-a)', fontWeight: 600, minWidth: 55 }}>
                            <MathFormula math={`${fe}\\,\\mathrm{Hz}`} />
                        </span>
                    </div>
                </div>
                <div className="control-group">
                    <label className="control-label">Cycles (C)</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {[8, 16, 32].map(c => (
                            <button key={c} className={`btn ${cycles === c ? 'active' : ''}`}
                                onClick={() => setCycles(c)}
                                style={{ minWidth: 44, justifyContent: 'center', fontFamily: 'var(--font-mono)' }}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="control-group">
                    <label className="control-label">고장 하모닉</label>
                    <button className={`btn ${showFault ? 'active' : ''}`}
                        onClick={() => setShowFault(!showFault)}
                        style={{
                            background: showFault ? 'rgba(248,113,113,0.15)' : undefined,
                            borderColor: showFault ? 'var(--accent-fault)' : undefined,
                            color: showFault ? 'var(--accent-fault)' : undefined,
                        }}>
                        {showFault ? '⚠ Fault ON' : '정상 파형'}
                    </button>
                </div>
                <div className="control-group" style={{ marginLeft: 'auto' }}>
                    <label className="control-label" style={{ color: 'var(--accent-highlight)' }}>결과: 윈도우 크기</label>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-highlight)' }}>
                        <MathFormula math={`L = ${L}`} /> <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>samples</span>
                    </div>
                </div>
            </div>

            {/* Waveform Visualization */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="waveform-container" style={{ padding: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            3상 전류 파형 — {showFault ? '고장 (3rd, 5th harmonic 추가)' : '정상 모터'}
                        </span>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {PHASE_LABELS.map((l, i) => (
                                <span key={i} style={{ fontSize: '0.7rem', color: PHASE_COLORS[i], fontWeight: 600 }}>{l}</span>
                            ))}
                        </div>
                    </div>
                    <WaveformSVG
                        data={waveData.points}
                        width={900}
                        height={200}
                        windowStart={windowStart}
                        windowEnd={Math.min(windowEnd, totalSamples)}
                        label={`${cycles} cycles window (L=${windowSamples})`}
                    />
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <span>t = 0</span>
                        <span>━━ 보라색 영역: {cycles}-cycle 윈도우 ━━</span>
                        <span>t = {(totalSamples / fs * 1000).toFixed(1)} ms</span>
                    </div>
                </div>
            </div>

            {/* Frequency comparison grid */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--accent-key)' }}>💡</span>
                    주파수별 윈도우 크기 비교 — <MathFormula math={`C = ${cycles}`} />, <MathFormula math={`f_s = ${fs}\\,\\mathrm{Hz}`} />
                </h3>
                <FreqCompare fs={fs} cycles={cycles} freqs={freqs} activeFreq={fe} />
            </div>

            {/* Aha Moment: fixed vs cycle-based */}
            <div className="section-grid cols-2">
                <div className="comparison-panel left">
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-error)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        ❌ 고정 샘플 수 윈도우 (예: <MathFormula math={'4096\\ \\mathrm{samples}'} />)
                    </div>
                    <div className="callout danger" style={{ marginBottom: 12 }}>
                        같은 <MathFormula math={'4096'} /> 포인트라도 주파수마다 포함 사이클 수가 달라져, 모델이 <strong>fault보다 주파수 차이</strong>를 먼저 학습할 수 있습니다.
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                        {freqs.map(f => {
                            const containedCycles = (fixedWindowSize * f / fs);
                            return (
                                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-muted)', width: 60 }}><MathFormula math={`${f}\\,\\mathrm{Hz}`} /> →</span>
                                    <div style={{ flex: 1, height: 12, background: 'var(--bg-deep)', borderRadius: 6, overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${Math.min(containedCycles / 20 * 100, 100)}%`,
                                            height: '100%',
                                            background: `linear-gradient(90deg, var(--accent-error), rgba(248,113,113,0.3))`,
                                            borderRadius: 6,
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                    <span style={{ color: 'var(--accent-error)', fontWeight: 600, width: 70 }}>
                                        <MathFormula math={`${containedCycles.toFixed(1)}\\ \\mathrm{cyc}`} />
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        ⚠ 주파수마다 포함 사이클 수가 다름 → 불일치
                    </div>
                </div>

                <div className="comparison-panel right">
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-output)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        ✅ 사이클 기반 윈도우 (<MathFormula math={`C = ${cycles}`} />)
                    </div>
                    <div className="callout success" style={{ marginBottom: 12 }}>
                        모든 주파수에서 동일한 전기적 사이클 수(<MathFormula math={`C = ${cycles}`} />)를 포함하여, 모델이 <strong>shape와 amplitude 차이</strong>에 집중합니다.
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                        {freqs.map(f => {
                            const windowSize = Math.round(cycles * fs / f);
                            return (
                                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-muted)', width: 60 }}><MathFormula math={`${f}\\,\\mathrm{Hz}`} /> →</span>
                                    <div style={{ flex: 1, height: 12, background: 'var(--bg-deep)', borderRadius: 6, overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${Math.min(cycles / 20 * 100, 100)}%`,
                                            height: '100%',
                                            background: `linear-gradient(90deg, var(--accent-output), rgba(52,211,153,0.3))`,
                                            borderRadius: 6,
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                    <span style={{ color: 'var(--accent-output)', fontWeight: 600, width: 95 }}>
                                        <MathFormula math={`${cycles}\\ \\mathrm{cyc}\\ \\left(${windowSize}\\right)`} />
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        ✓ 모든 주파수에서 동일 사이클 수 → 일관된 입력
                    </div>
                </div>
            </div>

            {/* Why it matters */}
            <div className="callout warn" style={{ marginTop: 'var(--space-lg)' }}>
                <strong>💡 왜 중요한가?</strong><br />
                ITSC 진단에서 harmonic/imbalance 패턴을 보려면 너무 짧은 윈도우도, 너무 긴 윈도우도 안 됩니다.
                <MathFormula math={'16\\ \\mathrm{cycles}'} />가 권장 시작점이며, <MathFormula math={'C \\in \\{8,16,32\\}'} /> 로 grid search 하는 것이 실무적 접근입니다.
                PatchTST 계열의 patching 역시 local semantics를 보존하면서 긴 history를 다루기 위해 contiguous patch를 사용합니다.
            </div>
        </div>
    );
}
