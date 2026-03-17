import MathFormula from './MathFormula';

export default function SectionNav({ sections, active, onChange }) {
    const groups = [
        { key: 'playground', label: 'Playground' },
        { key: 'reference', label: 'Reference' },
    ];

    return (
        <nav style={{ display: 'grid', gap: 'var(--space-md)' }}>
            {groups.map((group) => {
                const groupedSections = sections.filter((section) => section.group === group.key);
                if (groupedSections.length === 0) return null;

                return (
                    <div key={group.key} style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                        <div style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            fontWeight: 700,
                        }}>
                            {group.label}
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: 'var(--space-sm)',
                            flexWrap: 'wrap',
                        }}>
                            {groupedSections.map((s) => (
                                <button
                                    key={s.id}
                                    className={`btn ${active === s.id ? 'active' : ''}`}
                                    onClick={() => onChange(s.id)}
                                    aria-label={s.label}
                                    style={{
                                        borderRadius: 24,
                                        padding: '8px 18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        ...(active === s.id
                                            ? {
                                                background: 'rgba(96, 165, 250, 0.13)',
                                                borderColor: 'var(--accent-input)',
                                                boxShadow: '0 0 16px rgba(96,165,250,0.1)',
                                            }
                                            : {}),
                                    }}
                                >
                                    <span>{s.icon}</span>
                                    <span style={{ fontWeight: 600 }}>{s.label}</span>
                                    {s.formula ? (
                                        <MathFormula
                                            math={s.formula}
                                            className="section-nav-formula"
                                            style={{
                                                fontSize: '0.78rem',
                                                color: active === s.id ? 'var(--accent-intermediate)' : 'var(--text-muted)',
                                            }}
                                        />
                                    ) : (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            color: active === s.id ? 'var(--accent-intermediate)' : 'var(--text-muted)',
                                            fontFamily: 'var(--font-mono)',
                                        }}>
                                            {s.desc}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </nav>
    );
}
