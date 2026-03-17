import { Fragment, useMemo } from 'react';
import MathFormula from '../components/MathFormula';

const TOTAL_FILES = 2618;
const FREQUENCIES = [30, 35, 40, 45, 50, 55, 60];
const LOADS = [
    { value: 0, label: '0% Rated load', short: 'L0', color: 'var(--accent-intermediate)' },
    { value: 50, label: '50% Rated load', short: 'L50', color: 'var(--accent-key)' },
    { value: 100, label: '100% Rated load', short: 'L100', color: 'var(--accent-fault)' },
];
const CLASSES = [
    { id: 0, label: 'Normal', family: 'Normal', color: 'var(--accent-output)' },
    { id: 1, label: 'High Impedance 1', family: 'High Impedance', color: 'var(--accent-input)' },
    { id: 2, label: 'High Impedance 2', family: 'High Impedance', color: 'var(--accent-input)' },
    { id: 3, label: 'High Impedance 3', family: 'High Impedance', color: 'var(--accent-input)' },
    { id: 4, label: 'Low Impedance 1', family: 'Low Impedance', color: 'var(--accent-fault)' },
    { id: 5, label: 'Low Impedance 2', family: 'Low Impedance', color: 'var(--accent-fault)' },
    { id: 6, label: 'Low Impedance 3', family: 'Low Impedance', color: 'var(--accent-fault)' },
];

const MINIMUM_COMBINATIONS = CLASSES.length * FREQUENCIES.length * LOADS.length;
const AVG_FILES_PER_COMBO = (TOTAL_FILES / MINIMUM_COMBINATIONS).toFixed(1);
const LAB_TITLES = {
    'lab-01': 'Cycle count → window length',
    'lab-02': 'Fixed sample vs cycle window',
    'lab-03': 'Frequency shift intuition',
    'lab-04': 'Per-channel vs pooled ruler',
    'lab-05': 'No norm vs center only',
    'lab-06': 'z-score scale compression',
    'lab-07': 'Robust vs z-score on outlier',
    'lab-08': 'Max-abs behavior',
    'lab-09': 'Unit-norm loses size',
    'lab-10': 'Global vs run-wise block',
    'lab-11': 'Condition-cluster idea',
    'lab-12': 'Overlap reweighting',
    'lab-13': 'Window-wise aggressiveness',
    'lab-14': 'Position-wise assumption',
    'lab-15': 'Frequency-bin-wise branch',
};

function SummaryCard({ title, value, caption, color }) {
    return (
        <div className="card" style={{ padding: 'var(--space-md)', minHeight: 120 }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color, fontWeight: 700, marginBottom: 8 }}>
                {title}
            </div>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 6 }}>{caption}</div>
        </div>
    );
}

function cellBackground(classId, active) {
    if (active) return 'linear-gradient(135deg, rgba(167,139,250,0.42), rgba(96,165,250,0.18))';
    if (classId === 0) return 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(52,211,153,0.05))';
    if (classId <= 3) return 'linear-gradient(135deg, rgba(96,165,250,0.18), rgba(96,165,250,0.05))';
    return 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(248,113,113,0.05))';
}

export default function DataMapSection({ studyState, onStudyChange }) {
    const selectedClass = studyState?.selectedClass ?? 0;
    const selectedFreq = studyState?.selectedFreq ?? 45;
    const selectedLoad = studyState?.selectedLoad ?? 100;
    const activeLabTitle = LAB_TITLES[studyState?.activeLabId];

    const activeClass = useMemo(
        () => CLASSES.find((item) => item.id === selectedClass) ?? CLASSES[0],
        [selectedClass],
    );
    const fileStem = `${selectedClass}_cSampleIdx_c${selectedFreq}_c${selectedLoad}`;

    return (
        <div>
            <div className="section-title">🗂️ 데이터 구조 (class × sampleIdx × driving freq × load)</div>
            <div className="section-subtitle">
                <code>data.md</code> 기준으로 보면 파일 구조는 예전처럼 단순히 <strong>freq × load × severity</strong>가 아닙니다.
                실제 파일명은 <strong>class</strong>, <strong>sampleIdx</strong>, <strong>driving frequency</strong>, <strong>load</strong> 네 축으로 정의되며,
                그래서 coarse combination보다 훨씬 많은 파일이 존재합니다.
            </div>

            <div className="formula-display" style={{ marginBottom: 'var(--space-lg)' }}>
                <MathFormula math={String.raw`\text{file name}=\text{Class}_c\text{SampleIdx}_c\text{DrivingFreq}_c\text{Load}`} displayMode />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    즉 <MathFormula math={String.raw`\mathrm{class}\times \mathrm{sampleIdx}\times f\times \mathrm{load}`} /> 구조입니다.
                </span>
            </div>

            {activeLabTitle && (
                <div className="callout success" style={{ marginBottom: 'var(--space-lg)' }}>
                    <strong>현재 랩에서 넘어온 컨텍스트</strong><br />
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeLabTitle}</span> 랩에서 선택한
                    <MathFormula math={String.raw`\ \mathrm{class}`} /> / <MathFormula math={String.raw`f`} /> / <MathFormula math={String.raw`\mathrm{load}`} />
                    값이 지금 이 데이터 뷰에 반영되어 있습니다.
                </div>
            )}

            <div className="section-grid cols-3" style={{ marginBottom: 'var(--space-lg)' }}>
                <SummaryCard
                    title="Total files"
                    value={TOTAL_FILES}
                    caption="data.md가 명시한 실제 파일 총량"
                    color="var(--accent-input)"
                />
                <SummaryCard
                    title="Coarse combos"
                    value={MINIMUM_COMBINATIONS}
                    caption={`${CLASSES.length} classes × ${FREQUENCIES.length} freqs × ${LOADS.length} loads`}
                    color="var(--accent-highlight)"
                />
                <SummaryCard
                    title="Sample multiplicity"
                    value={AVG_FILES_PER_COMBO}
                    caption="sampleIdx 축이 추가되며 combo당 평균 파일 수가 늘어남"
                    color="var(--accent-key)"
                />
            </div>

            <div className="control-panel" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="control-group">
                    <label className="control-label">Class</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {CLASSES.map((item) => (
                            <button
                                key={item.id}
                                className={`btn ${selectedClass === item.id ? 'active' : ''}`}
                                onClick={() => onStudyChange((prev) => ({ ...prev, selectedClass: item.id }))}
                                style={selectedClass === item.id ? { borderColor: item.color, color: item.color } : undefined}
                            >
                                {`Class ${item.id}`}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-group">
                    <label className="control-label">Driving frequency</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {FREQUENCIES.map((freq) => (
                            <button
                                key={freq}
                                className={`btn ${selectedFreq === freq ? 'active' : ''}`}
                                onClick={() => onStudyChange((prev) => ({ ...prev, selectedFreq: freq }))}
                                style={{ minWidth: 58, justifyContent: 'center', fontFamily: 'var(--font-mono)' }}
                            >
                                {freq}Hz
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-group">
                    <label className="control-label">Load</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {LOADS.map((load) => (
                            <button
                                key={load.value}
                                className={`btn ${selectedLoad === load.value ? 'active' : ''}`}
                                onClick={() => onStudyChange((prev) => ({ ...prev, selectedLoad: load.value }))}
                                style={selectedLoad === load.value ? { borderColor: load.color, color: load.color } : undefined}
                            >
                                {load.value}%
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-group">
                    <label className="control-label">SampleIdx axis</label>
                    <div className="step-badge">
                        <MathFormula math={String.raw`\text{many files per }(class,f,load)`} />
                    </div>
                </div>
            </div>

            <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="card">
                    <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 10 }}>Class dictionary from data.md</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {CLASSES.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '84px 1fr',
                                    gap: 12,
                                    alignItems: 'center',
                                    padding: '10px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg-deep)',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                <span className="step-badge" style={{ justifyContent: 'center', color: item.color }}>
                                    {`C${item.id}`}
                                </span>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card stage-active">
                    <div style={{ color: activeClass.color, fontWeight: 700, marginBottom: 10 }}>Selected file anatomy</div>
                    <div className="formula-display" style={{ padding: '12px 16px', marginBottom: 12 }}>
                        <MathFormula math={String.raw`\text{Class}_c\text{SampleIdx}_c\text{DrivingFreq}_c\text{Load}`} displayMode />
                    </div>
                    <div style={{ display: 'grid', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div><strong>Class:</strong> {selectedClass} → {activeClass.label}</div>
                        <div><strong>SampleIdx:</strong> 실제 값은 디렉터리 listing이 있어야 확정되며, <code>data.md</code>는 패턴만 알려줍니다.</div>
                        <div><strong>DrivingFreq:</strong> {selectedFreq}Hz</div>
                        <div><strong>Load:</strong> {selectedLoad}% rated load</div>
                    </div>
                    <div className="callout success" style={{ marginTop: 12 }}>
                        <strong>Filename preview</strong><br />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{fileStem}</span>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-lg)', overflow: 'hidden', padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>Load slice explorer</div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                            아래 매트릭스는 <strong>선택한 load</strong>에 대한 class × frequency slice 입니다.
                            각 셀 안에는 실제로 <strong>sampleIdx 차원</strong> 때문에 여러 파일이 매달리지만,
                            그 정확한 인덱스 범위는 <code>data.md</code>만으로는 고정할 수 없습니다.
                        </div>
                    </div>
                    <div className="step-badge">
                        <MathFormula math={String.raw`\mathrm{load}=` + String(selectedLoad) + String.raw`\%`} />
                    </div>
                </div>

                <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
                    <div style={{ minWidth: 860, display: 'grid', gridTemplateColumns: '180px repeat(7, minmax(74px, 1fr))', gap: 8 }}>
                        <div />
                        {FREQUENCIES.map((freq) => (
                            <div
                                key={freq}
                                style={{
                                    textAlign: 'center',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.78rem',
                                    color: freq === selectedFreq ? 'var(--accent-highlight)' : 'var(--text-secondary)',
                                    fontWeight: freq === selectedFreq ? 700 : 500,
                                }}
                            >
                                {freq}Hz
                            </div>
                        ))}

                        {CLASSES.map((classItem) => (
                            <Fragment key={`row-${classItem.id}`}>
                                <div
                                    key={`label-${classItem.id}`}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <span style={{ color: classItem.color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{`Class ${classItem.id}`}</span>
                                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{classItem.label}</span>
                                </div>
                                {FREQUENCIES.map((freq) => {
                                    const active = classItem.id === selectedClass && freq === selectedFreq;
                                    return (
                                        <button
                                            key={`cell-${classItem.id}-${freq}`}
                                            type="button"
                                            className="matrix-cell"
                                            onClick={() => {
                                                onStudyChange((prev) => ({ ...prev, selectedClass: classItem.id, selectedFreq: freq }));
                                            }}
                                            style={{
                                                height: 76,
                                                border: active ? '1px solid var(--accent-highlight)' : '1px solid var(--border)',
                                                background: cellBackground(classItem.id, active),
                                                boxShadow: active ? '0 0 0 1px rgba(167,139,250,0.45), inset 0 0 24px rgba(167,139,250,0.12)' : 'none',
                                                flexDirection: 'column',
                                                gap: 4,
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            <span style={{ fontWeight: 700, color: active ? 'var(--accent-highlight)' : classItem.color }}>
                                                {`C${classItem.id}`}
                                            </span>
                                            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{`${freq}Hz`}</span>
                                            <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>sampleIdx × many</span>
                                        </button>
                                    );
                                })}
                            </Fragment>
                        ))}
                    </div>
                </div>
            </div>

            <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="comparison-panel right">
                    <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 10 }}>What data.md changed in our mental model</div>
                    <div className="callout success">
                        이전 페이지처럼 <strong>freq × load × severity</strong>만으로는 실제 파일 수를 설명할 수 없습니다.
                        <strong> sampleIdx</strong> 축이 추가되어 <MathFormula math={String.raw`147`} />개의 coarse combination이 <MathFormula math={String.raw`2618`} />개 파일로 늘어납니다.
                    </div>
                </div>

                <div className="comparison-panel left">
                    <div style={{ color: 'var(--accent-error)', fontWeight: 700, marginBottom: 10 }}>Important protocol distinction</div>
                    <div className="callout warn">
                        <code>data.md</code>는 <strong>파일 레이아웃</strong>을 설명합니다. 반면 train-normal-only / fault-test-only는
                        <strong>실험 프로토콜</strong>입니다. 즉 split은 파일명 안에 박힌 고정 축이 아니라, 이 데이터 위에 나중에 얹는 연구 규칙입니다.
                    </div>
                </div>
            </div>
        </div>
    );
}
