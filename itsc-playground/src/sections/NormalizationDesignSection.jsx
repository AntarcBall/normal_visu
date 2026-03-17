import { useMemo, useState } from 'react';
import MathFormula from '../components/MathFormula';

const FAMILY_ORDER = ['none', 'center', 'zscore', 'robust', 'minmax', 'maxabs', 'unitnorm'];

const FAMILIES = {
    none: {
        label: 'No normalization',
        formula: String.raw`\tilde{x}=x`,
        intuition: '원신호를 그대로 본다.',
        keeps: '절대 진폭, imbalance, harmonic magnitude를 모두 남긴다.',
        risk: 'optimizer는 scale 차이를 그대로 감당해야 한다.',
        accent: 'var(--accent-output)',
    },
    center: {
        label: 'Center only',
        formula: String.raw`\tilde{x}=x-\mu`,
        intuition: 'DC offset만 제거한다.',
        keeps: 'amplitude 정보는 거의 유지하고 평균 위치만 맞춘다.',
        risk: '분산 차이와 큰 스케일 차이는 그대로 남는다.',
        accent: 'var(--accent-intermediate)',
    },
    zscore: {
        label: 'z-score',
        formula: String.raw`\tilde{x}=\frac{x-\mu}{\sigma+\varepsilon}`,
        intuition: '평균 0, 분산 1의 공통 ruler로 다시 잰다.',
        keeps: 'shape 비교와 optimizer 안정화에 유리하다.',
        risk: 'absolute amplitude cue를 약하게 만든다.',
        accent: 'var(--accent-input)',
    },
    robust: {
        label: 'Robust z-score',
        formula: String.raw`\tilde{x}=\frac{x-\operatorname{med}}{\operatorname{IQR}+\varepsilon}`,
        intuition: 'median / IQR 기반이라 spike에 덜 흔들린다.',
        keeps: 'outlier가 섞여도 비교적 안정적인 척도를 유지한다.',
        risk: 'mean/std 기반 해석보다 덜 익숙할 수 있다.',
        accent: 'var(--accent-key)',
    },
    minmax: {
        label: 'Min-max',
        formula: String.raw`\tilde{x}=a+(b-a)\frac{x-x_{\min}}{x_{\max}-x_{\min}+\varepsilon}`,
        intuition: '값 범위를 지정 구간으로 압축한다.',
        keeps: 'bounded input이 필요한 모델에 편하다.',
        risk: 'extrema 하나에 전체 scale이 크게 좌우된다.',
        accent: 'var(--accent-highlight)',
    },
    maxabs: {
        label: 'Max-abs',
        formula: String.raw`\tilde{x}=\frac{x}{\max |x|+\varepsilon}`,
        intuition: '부호는 살리고 peak scale만 줄인다.',
        keeps: '0 중심 AC 신호의 형태를 비교적 자연스럽게 유지한다.',
        risk: 'spike 하나가 분모를 과도하게 키울 수 있다.',
        accent: 'var(--accent-phase-b)',
    },
    unitnorm: {
        label: 'Unit-norm',
        formula: String.raw`\tilde{X}=\frac{X}{\lVert X\rVert+\varepsilon}`,
        intuition: '벡터 길이를 1로 맞춘다.',
        keeps: '방향 정보와 상대 패턴은 남긴다.',
        risk: '전체 크기 정보는 사실상 사라진다.',
        accent: 'var(--accent-fault)',
    },
};

const BLOCK_OPTIONS = [
    {
        key: 'train-global',
        label: 'Global train-normal',
        formula: String.raw`B=\mathcal{R}_{tr,0}`,
        desc: 'class 0의 train 샘플 전체에서 통계를 뽑는 표준 시작점',
    },
    {
        key: 'condition-cluster',
        label: 'Condition cluster',
        formula: String.raw`B=\{r:g(r)=(f,\ell)\}`,
        desc: '같은 운전조건 클러스터 안에서만 통계를 추정',
    },
    {
        key: 'window-local',
        label: 'Window-local',
        formula: String.raw`B=(r,w)`,
        desc: 'window 하나만 보고 통계를 잡는 가장 지역적 선택',
    },
];

const AXIS_OPTIONS = [
    {
        key: 'feature',
        label: 'Feature-wise',
        formula: String.raw`A=\{j\}`,
        desc: '각 feature / position 별로 따로 normalize',
    },
    {
        key: 'sample',
        label: 'Sample-wise',
        formula: String.raw`A=\{i\}`,
        desc: '샘플 단위로 self-contained normalization',
    },
    {
        key: 'pooled',
        label: 'Pooled',
        formula: String.raw`A=\mathrm{all}`,
        desc: '전체를 한 덩어리로 보고 공통 ruler를 공유',
    },
];

const BASE_VECTOR = [3.2, -0.8, 1.4, 4.6, -2.5, 0.2];
const BASE_MATRIX = [
    [3.1, 2.7, 3.5, 4.1, 4.7, 3.8],
    [1.4, 0.6, 0.2, -0.2, -0.4, 0.3],
    [-2.1, -1.7, -0.9, 0.1, 0.8, 1.6],
    [4.8, 3.9, 3.1, 2.4, 1.7, 0.9],
];
const BASE_TENSOR = [
    [
        [2.8, 3.2, 3.4, 4.0, 4.3, 3.9],
        [0.4, 0.1, -0.2, -0.8, -0.6, -0.1],
        [-2.3, -1.8, -1.0, -0.1, 0.8, 1.2],
    ],
    [
        [3.1, 3.5, 3.7, 4.4, 4.9, 4.2],
        [0.8, 0.5, -0.1, -0.5, -0.2, 0.4],
        [-1.8, -1.5, -0.7, 0.2, 1.0, 1.7],
    ],
    [
        [2.5, 2.9, 3.0, 3.6, 4.0, 3.4],
        [0.1, -0.2, -0.4, -0.9, -0.7, -0.3],
        [-2.6, -2.1, -1.4, -0.3, 0.4, 1.0],
    ],
];

function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values, avg = mean(values)) {
    return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length) || 1;
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function iqr(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)];
    const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)];
    return (q3 - q1) || 1;
}

function maxAbs(values) {
    return Math.max(...values.map((value) => Math.abs(value))) || 1;
}

function l2norm(values) {
    return Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0)) || 1;
}

function flattenMatrix(matrix) {
    return matrix.flatMap((row) => row);
}

function flattenTensor(tensor) {
    return tensor.flatMap((matrix) => flattenMatrix(matrix));
}

function reshape(flat, rows, cols) {
    return Array.from({ length: rows }, (_, rowIndex) =>
        flat.slice(rowIndex * cols, (rowIndex + 1) * cols),
    );
}

function stats(values) {
    return {
        mean: mean(values),
        std: std(values),
        median: median(values),
        iqr: iqr(values),
        min: Math.min(...values),
        max: Math.max(...values),
        maxAbs: maxAbs(values),
        norm: l2norm(values),
    };
}

function applyFamily1d(values, familyKey) {
    const s = stats(values);
    switch (familyKey) {
        case 'none':
            return values;
        case 'center':
            return values.map((value) => value - s.mean);
        case 'zscore':
            return values.map((value) => (value - s.mean) / s.std);
        case 'robust':
            return values.map((value) => (value - s.median) / s.iqr);
        case 'minmax':
            return values.map((value) => -1 + (2 * (value - s.min)) / ((s.max - s.min) || 1));
        case 'maxabs':
            return values.map((value) => value / s.maxAbs);
        case 'unitnorm':
            return values.map((value) => value / s.norm);
        default:
            return values;
    }
}

function mapByColumns(matrix, mapper) {
    return matrix[0].map((_, columnIndex) => mapper(matrix.map((row) => row[columnIndex]), columnIndex));
}

function applyMatrix(matrix, familyKey, axisKey) {
    if (axisKey === 'sample') {
        return matrix.map((row) => applyFamily1d(row, familyKey));
    }

    if (axisKey === 'pooled') {
        return reshape(applyFamily1d(flattenMatrix(matrix), familyKey), matrix.length, matrix[0].length);
    }

    const columns = mapByColumns(matrix, (column) => applyFamily1d(column, familyKey));
    return matrix.map((row, rowIndex) => row.map((_, columnIndex) => columns[columnIndex][rowIndex]));
}

function applyTensor(tensor, familyKey, axisKey) {
    if (axisKey === 'sample') {
        return tensor.map((matrix) => reshape(applyFamily1d(flattenMatrix(matrix), familyKey), matrix.length, matrix[0].length));
    }

    if (axisKey === 'pooled') {
        const rows = tensor[0].length;
        const cols = tensor[0][0].length;
        const normalized = applyFamily1d(flattenTensor(tensor), familyKey);
        return Array.from({ length: tensor.length }, (_, sliceIndex) =>
            reshape(
                normalized.slice(sliceIndex * rows * cols, (sliceIndex + 1) * rows * cols),
                rows,
                cols,
            ),
        );
    }

    return tensor.map((matrix) => matrix.map((row) => applyFamily1d(row, familyKey)));
}

function valueColor(value, magnitude = 3.5) {
    const normalized = Math.max(-1, Math.min(1, value / magnitude));
    if (normalized >= 0) {
        return `rgba(52, 211, 153, ${0.15 + normalized * 0.65})`;
    }
    return `rgba(248, 113, 113, ${0.15 + Math.abs(normalized) * 0.65})`;
}

function StatPill({ label, value }) {
    return (
        <div className="card-glass" style={{ padding: '8px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {value}
            </div>
        </div>
    );
}

function VectorBars({ values, accent }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${values.length}, 1fr)`, gap: 8, alignItems: 'end', minHeight: 120 }}>
            {values.map((value, index) => (
                <div key={`${accent}-${index}`} style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
                    <div
                        style={{
                            width: '100%',
                            height: `${Math.max(Math.abs(value) * 22, 8)}px`,
                            borderRadius: '8px 8px 0 0',
                            background: value >= 0 ? accent : 'var(--accent-error)',
                            opacity: 0.85,
                        }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {value.toFixed(2)}
                    </span>
                </div>
            ))}
        </div>
    );
}

function Heatmap({ matrix }) {
    return (
        <div style={{ display: 'grid', gap: 4 }}>
            {matrix.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${row.length}, 1fr)`, gap: 4 }}>
                    {row.map((value, columnIndex) => (
                        <div
                            key={`cell-${rowIndex}-${columnIndex}`}
                            style={{
                                padding: '10px 0',
                                borderRadius: 'var(--radius-sm)',
                                background: valueColor(value),
                                border: '1px solid rgba(255,255,255,0.06)',
                                textAlign: 'center',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                            }}
                        >
                            {value.toFixed(1)}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function TensorSlices({ tensor }) {
    return (
        <div className="section-grid cols-3" style={{ gap: 'var(--space-sm)' }}>
            {tensor.map((matrix, index) => (
                <div key={`slice-${index}`} className="card-glass" style={{ padding: 'var(--space-sm)' }}>
                    <div style={{ marginBottom: 8, color: 'var(--accent-highlight)', fontWeight: 700, fontSize: '0.76rem' }}>
                        Slice {index + 1}
                    </div>
                    <Heatmap matrix={matrix} />
                </div>
            ))}
        </div>
    );
}

export default function NormalizationDesignSection() {
    const [familyKey, setFamilyKey] = useState('zscore');
    const [blockKey, setBlockKey] = useState('train-global');
    const [axisKey, setAxisKey] = useState('feature');

    const family = FAMILIES[familyKey];
    const block = BLOCK_OPTIONS.find((item) => item.key === blockKey) || BLOCK_OPTIONS[0];
    const axis = AXIS_OPTIONS.find((item) => item.key === axisKey) || AXIS_OPTIONS[0];

    const vectorBefore = BASE_VECTOR;
    const vectorAfter = useMemo(() => applyFamily1d(BASE_VECTOR, familyKey), [familyKey]);
    const matrixAfter = useMemo(() => applyMatrix(BASE_MATRIX, familyKey, axisKey), [familyKey, axisKey]);
    const tensorAfter = useMemo(() => applyTensor(BASE_TENSOR, familyKey, axisKey), [familyKey, axisKey]);

    const vectorStatsBefore = stats(vectorBefore);
    const vectorStatsAfter = stats(vectorAfter);

    return (
        <div>
            <div className="section-title">🧮 whole.md 정리 ② 정규화 설계와 방식 가족</div>
            <div className="section-subtitle">
                정규화는 단순히 scaler 하나를 고르는 일이 아닙니다. <strong>통계 블록</strong> <MathFormula math={String.raw`B`} />,
                <strong> 축 묶음</strong> <MathFormula math={String.raw`A`} />, <strong>변환 함수</strong> <MathFormula math={String.raw`\Psi`} />
                를 함께 설계해야 하고, 각 family는 <strong>벡터 · 행렬 · 텐서</strong>에서 다르게 보일 수 있습니다.
            </div>

            <div className="formula-display" style={{ marginBottom: 'var(--space-lg)' }}>
                <MathFormula math={String.raw`\tilde{x}=\Psi(x;\theta_{B,A})`} displayMode />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <MathFormula math={String.raw`B`} /> = statistics block,&nbsp;
                    <MathFormula math={String.raw`A`} /> = axis grouping,&nbsp;
                    <MathFormula math={String.raw`\Psi`} /> = normalization family
                </span>
            </div>

            <div className="section-grid cols-3" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="card stage-active">
                    <div style={{ color: 'var(--accent-input)', fontWeight: 700, marginBottom: 8 }}>현재 family</div>
                    <div className="stat-value" style={{ color: family.accent, fontSize: '1.3rem' }}>{family.label}</div>
                    <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{family.intuition}</div>
                </div>
                <div className="card">
                    <div style={{ color: 'var(--accent-key)', fontWeight: 700, marginBottom: 8 }}>선택한 block B</div>
                    <MathFormula math={block.formula} displayMode />
                    <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{block.desc}</div>
                </div>
                <div className="card">
                    <div style={{ color: 'var(--accent-highlight)', fontWeight: 700, marginBottom: 8 }}>선택한 axis A</div>
                    <MathFormula math={axis.formula} displayMode />
                    <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{axis.desc}</div>
                </div>
            </div>

            <div className="control-panel" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="control-group">
                    <label className="control-label">Normalization family Ψ</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {FAMILY_ORDER.map((key) => (
                            <button
                                key={key}
                                className={`btn ${familyKey === key ? 'active' : ''}`}
                                onClick={() => setFamilyKey(key)}
                                style={familyKey === key ? { borderColor: FAMILIES[key].accent, color: FAMILIES[key].accent } : undefined}
                            >
                                {FAMILIES[key].label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="control-group">
                    <label className="control-label">Statistics block B</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {BLOCK_OPTIONS.map((item) => (
                            <button
                                key={item.key}
                                className={`btn ${blockKey === item.key ? 'active' : ''}`}
                                onClick={() => setBlockKey(item.key)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="control-group">
                    <label className="control-label">Axis grouping A</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {AXIS_OPTIONS.map((item) => (
                            <button
                                key={item.key}
                                className={`btn ${axisKey === item.key ? 'active' : ''}`}
                                onClick={() => setAxisKey(item.key)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ color: family.accent, fontWeight: 700, marginBottom: 10 }}>{family.label} formula</div>
                <div className="formula-display" style={{ padding: '12px 16px', marginBottom: 12 }}>
                    <MathFormula math={family.formula} displayMode />
                </div>
                <div className="section-grid cols-3">
                    <div className="callout success"><strong>직관</strong><br />{family.intuition}</div>
                    <div className="callout"><strong>남기는 것</strong><br />{family.keeps}</div>
                    <div className="callout danger"><strong>리스크</strong><br />{family.risk}</div>
                </div>
            </div>

            <div className="section-grid cols-2" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="card">
                    <div style={{ color: 'var(--accent-phase-b)', fontWeight: 700, marginBottom: 8 }}>Vector abstraction</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 12 }}>
                        하나의 sample vector에서 normalization family가 숫자 척도를 어떻게 바꾸는지 바로 봅니다.
                    </div>
                    <div className="section-grid cols-2">
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Before</div>
                            <VectorBars values={vectorBefore} accent="var(--accent-input)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>After</div>
                            <VectorBars values={vectorAfter} accent={family.accent} />
                        </div>
                    </div>
                    <div className="section-grid cols-3" style={{ gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                        <StatPill label="μ before" value={vectorStatsBefore.mean.toFixed(2)} />
                        <StatPill label="σ before" value={vectorStatsBefore.std.toFixed(2)} />
                        <StatPill label="||x|| before" value={vectorStatsBefore.norm.toFixed(2)} />
                        <StatPill label="μ after" value={vectorStatsAfter.mean.toFixed(2)} />
                        <StatPill label="σ after" value={vectorStatsAfter.std.toFixed(2)} />
                        <StatPill label="||x|| after" value={vectorStatsAfter.norm.toFixed(2)} />
                    </div>
                </div>

                <div className="card">
                    <div style={{ color: 'var(--accent-highlight)', fontWeight: 700, marginBottom: 8 }}>Matrix abstraction</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 12 }}>
                        batch matrix에서는 <MathFormula math={axis.formula} /> 선택이 feature-wise / sample-wise / pooled interpretation을 바꿉니다.
                    </div>
                    <div className="section-grid cols-2">
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Before</div>
                            <Heatmap matrix={BASE_MATRIX} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>After</div>
                            <Heatmap matrix={matrixAfter} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ color: 'var(--accent-key)', fontWeight: 700, marginBottom: 8 }}>Tensor abstraction</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 12 }}>
                    run × channel × time tensor에서는 같은 family라도 <MathFormula math={block.formula} /> 와 <MathFormula math={axis.formula} />
                    해석에 따라 “train-global statistics”인지, “sample-local statistics”인지 감각이 달라집니다.
                </div>
                <div className="section-grid cols-2">
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Before</div>
                        <TensorSlices tensor={BASE_TENSOR} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>After</div>
                        <TensorSlices tensor={tensorAfter} />
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ color: 'var(--accent-output)', fontWeight: 700, marginBottom: 12 }}>Starter presets: easy mental model</div>
                <div className="section-grid cols-3">
                    <div className="callout success">
                        <strong>보존형 시작점</strong><br />
                        <MathFormula math={String.raw`B=\mathcal{R}_{tr,0},\ A=\mathrm{feature},\ \Psi=\text{center/maxabs}`} />
                        <br />
                        amplitude 단서를 많이 살리고 싶을 때.
                    </div>
                    <div className="callout">
                        <strong>안정형 시작점</strong><br />
                        <MathFormula math={String.raw`B=\mathcal{R}_{tr,0},\ A=\mathrm{feature},\ \Psi=\text{z-score}`} />
                        <br />
                        optimizer 안정성과 일반적인 baseline이 필요할 때.
                    </div>
                    <div className="callout warn">
                        <strong>shape 강조형</strong><br />
                        <MathFormula math={String.raw`B=(r,w),\ A=\mathrm{sample},\ \Psi=\text{z-score/unit-norm}`} />
                        <br />
                        subtle distortion을 크게 보고 싶지만 amplitude 정보는 약해짐.
                    </div>
                </div>
            </div>

            <div className="callout success">
                <strong>한 줄 결론</strong><br />
                이제 이 페이지에서는 <strong>모든 normalization family</strong>를 벡터 · 행렬 · 텐서 관점에서 동시에 볼 수 있습니다.
                즉 “수식이 맞는가?”와 “실제로 데이터 구조 위에서 어떻게 작동하는가?”를 한 화면에서 같이 학습할 수 있습니다.
            </div>
        </div>
    );
}
