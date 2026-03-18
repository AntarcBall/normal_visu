import MathFormula from './MathFormula';

export default function SectionNav({ sections, active, onChange }) {
    const groups = [
        { key: 'playground', label: 'Playground', description: '실험적으로 만져보는 인터랙션 섹션' },
        { key: 'reference', label: 'Reference', description: '개념과 수식을 안정적으로 읽는 섹션' },
    ];

    return (
        <nav className="section-nav-shell card-glass">
            <div className="section-nav-header">
                <div>
                    <div className="section-nav-kicker">Study map</div>
                    <h2>탐색 패널</h2>
                </div>
                <p>주제를 건너뛰지 않고도 원하는 섹션으로 빠르게 이동할 수 있게 흐름을 재정리했습니다.</p>
            </div>
            {groups.map((group) => {
                const groupedSections = sections.filter((section) => section.group === group.key);
                if (groupedSections.length === 0) return null;

                return (
                    <div key={group.key} className="section-nav-group">
                        <div className="section-nav-group-meta">
                            <div className="section-nav-group-title">{group.label}</div>
                            <div className="section-nav-group-desc">{group.description}</div>
                        </div>
                        <div className="section-nav-list">
                            {groupedSections.map((s) => (
                                <button
                                    key={s.id}
                                    className={`section-nav-button ${active === s.id ? 'active' : ''}`}
                                    onClick={() => onChange(s.id)}
                                    aria-label={s.label}
                                >
                                    <div className="section-nav-button-main">
                                        <span className="section-nav-icon">{s.icon}</span>
                                        <div>
                                            <span className="section-nav-label">{s.label}</span>
                                            <div className="section-nav-meta">
                                                {s.formula ? (
                                                    <MathFormula
                                                        math={s.formula}
                                                        className="section-nav-formula"
                                                        style={{ fontSize: '0.78rem' }}
                                                    />
                                                ) : (
                                                    <span className="section-nav-desc">{s.desc}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="section-nav-arrow" aria-hidden="true">↗</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </nav>
    );
}
