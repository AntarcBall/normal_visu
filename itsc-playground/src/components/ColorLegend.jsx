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
        <div className="legend-shell card">
            <div className="legend-header">
                <div>
                    <div className="legend-kicker">Color language</div>
                    <strong>범례</strong>
                </div>
                <span className="legend-note">원래 의미 체계 유지</span>
            </div>
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
