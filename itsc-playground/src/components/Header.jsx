export default function Header() {
    return (
        <header style={{
            padding: 'var(--space-lg) var(--space-xl)',
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(180deg, rgba(96,165,250,0.04) 0%, transparent 100%)',
        }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xs)' }}>
                    <span style={{ fontSize: '1.6rem' }}>⚡</span>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, var(--accent-input), var(--accent-intermediate))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        ITSC 이상탐지 학습 플레이그라운드
                    </h1>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 700 }}>
                    유도 전동기 권선 단락(Inter-Turn Short Circuit) 진단을 위한 데이터 전처리 핵심 개념을 인터랙티브하게 탐구하세요.
                </p>
            </div>
        </header>
    );
}
