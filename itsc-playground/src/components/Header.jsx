export default function Header({ activeSection, quickFacts = [] }) {
    return (
        <header className="hero-header">
            <div className="hero-grid">
                <div className="hero-copy card-glass">
                    <div className="hero-badge">Interactive learning workspace</div>
                    <div className="hero-title-row">
                        <span className="hero-icon" aria-hidden="true">⚡</span>
                        <div>
                            <h1>ITSC 이상탐지 학습 플레이그라운드</h1>
                            <p>
                                유도 전동기 권선 단락(Inter-Turn Short Circuit) 진단을 위한 데이터 전처리 핵심 개념을
                                인터랙티브하게 탐구하세요.
                            </p>
                        </div>
                    </div>
                    <div className="hero-chip-row">
                        <span className="hero-chip hero-chip-primary">콘텐츠 폐기 없이 디자인 개선</span>
                        <span className="hero-chip">수식 · 구조 · 인터랙션 유지</span>
                        <span className="hero-chip">학습 동선만 더 자연스럽게</span>
                    </div>
                </div>
                <div className="hero-aside card">
                    <div className="hero-aside-label">Active section</div>
                    <div className="hero-active-card">
                        <span className="hero-active-icon" aria-hidden="true">{activeSection?.icon ?? '📘'}</span>
                        <div>
                            <strong>{activeSection?.label ?? '데이터 계층'}</strong>
                            <p>현재 보고 있는 주제를 기준으로 좌측 탐색과 하단 범례가 함께 동기화됩니다.</p>
                        </div>
                    </div>
                    <div className="hero-facts">
                        {quickFacts.map((fact) => (
                            <div key={fact.label} className="hero-fact-item">
                                <span>{fact.label}</span>
                                <strong>{fact.value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </header>
    );
}
