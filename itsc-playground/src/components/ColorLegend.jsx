export default function ColorLegend() {
    const items = [
        { color: 'var(--accent-phase-a)', label: 'Phase A 전류' },
        { color: 'var(--accent-phase-b)', label: 'Phase B 전류' },
        { color: 'var(--accent-phase-c)', label: 'Phase C 전류' },
        { color: 'var(--accent-normal)', label: '정상 (Class 0)' },
        { color: 'var(--accent-fault)', label: '고장 (Class 1-6)' },
        { color: 'var(--accent-highlight)', label: '윈도우/활성 영역' },
        { color: 'var(--accent-key)', label: '중요 파라미터' },
    ];

    return (
        <div style={{
            maxWidth: 1400,
            margin: '0 auto',
            width: '100%',
            padding: '0 var(--space-lg) var(--space-md)',
        }}>
            <div className="legend">
                {items.map((item, i) => (
                    <div className="legend-item" key={i}>
                        <div className="legend-dot" style={{ background: item.color }} />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
