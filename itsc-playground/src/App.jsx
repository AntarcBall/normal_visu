import { Suspense, lazy, useEffect, useState } from 'react';
import Header from './components/Header';
import SectionNav from './components/SectionNav';
import ColorLegend from './components/ColorLegend';
import './App.css';

const CycleWindowSection = lazy(() => import('./sections/CycleWindowSection'));
const NormalizationSection = lazy(() => import('./sections/NormalizationSection'));
const DualViewSection = lazy(() => import('./sections/DualViewSection'));
const DataMapSection = lazy(() => import('./sections/DataMapSection'));
const InteractionLabsSection = lazy(() => import('./sections/InteractionLabsSection'));
const WholeStructureSection = lazy(() => import('./sections/WholeStructureSection'));
const NormalizationDesignSection = lazy(() => import('./sections/NormalizationDesignSection'));
const NormalizationBlocksSection = lazy(() => import('./sections/NormalizationBlocksSection'));
const ChannelTimingSection = lazy(() => import('./sections/ChannelTimingSection'));

const SECTIONS = [
  { id: 'cycle-window', label: '사이클 윈도우', icon: '🔄', formula: String.raw`L=\operatorname{round}\!\left(C\cdot\frac{f_s}{f_e}\right)`, group: 'playground' },
  { id: 'normalization', label: '채널별 정규화', icon: '📊', desc: '채널별 vs 공동 정규화', group: 'playground' },
  { id: 'dual-view', label: 'Dual-View', icon: '🔀', formula: String.raw`x_{\mathrm{amp}}\oplus x_{\mathrm{shape}}`, group: 'playground' },
  { id: 'data-map', label: '데이터 구조', icon: '🗂️', formula: String.raw`f\times \mathrm{load}\times \mathrm{class}`, group: 'playground' },
  { id: 'interaction-labs', label: '랩 15개', icon: '🧪', formula: String.raw`\mathrm{Lab}\ 01\ldots15`, group: 'playground' },
  { id: 'whole-structure', label: '데이터 계층', icon: '🧱', formula: String.raw`X^{(r)}\in\mathbb{R}^{C\times T_r}`, group: 'reference' },
  { id: 'normalization-design', label: '정규화 설계', icon: '🧮', formula: String.raw`\tilde{x}=\Psi(x;B,A)`, group: 'reference' },
  { id: 'normalization-blocks', label: '블록 후보', icon: '📚', formula: String.raw`\mu_c,s_c\leftarrow \text{train-normal}`, group: 'reference' },
  { id: 'channel-timing', label: '채널/시점', icon: '🧭', formula: String.raw`\tilde{X}_{c,\cdot},\ \mu_c^{\mathrm{raw}}`, group: 'reference' },
];

export default function App() {
  const [activeSection, setActiveSection] = useState('whole-structure');
  const [studyState, setStudyState] = useState({
    activeLabId: 'lab-01',
    selectedClass: 0,
    selectedFreq: 45,
    selectedLoad: 100,
    selectedCandidateKey: 'A',
  });

  useEffect(() => {
    const applyHash = () => {
      const id = window.location.hash.replace('#', '');
      if (SECTIONS.some((section) => section.id === id)) {
        setActiveSection(id);
      }
    };

    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', `#${activeSection}`);
  }, [activeSection]);

  const renderSection = () => {
    switch (activeSection) {
      case 'cycle-window': return <CycleWindowSection />;
      case 'normalization': return <NormalizationSection />;
      case 'dual-view': return <DualViewSection />;
      case 'data-map': return <DataMapSection studyState={studyState} onStudyChange={setStudyState} />;
      case 'interaction-labs': return <InteractionLabsSection studyState={studyState} onStudyChange={setStudyState} onNavigateSection={setActiveSection} />;
      case 'whole-structure': return <WholeStructureSection />;
      case 'normalization-design': return <NormalizationDesignSection />;
      case 'normalization-blocks': return <NormalizationBlocksSection studyState={studyState} onStudyChange={setStudyState} />;
      case 'channel-timing': return <ChannelTimingSection />;
      default: return <WholeStructureSection />;
    }
  };

  return (
    <div className="app-container">
      <Header />
      <div className="main-layout">
        <SectionNav
          sections={SECTIONS}
          active={activeSection}
          onChange={setActiveSection}
        />
        <main className="content-area">
          <div className="section-wrapper animate-fadeInUp" key={activeSection}>
            <Suspense fallback={<div className="card">Loading section…</div>}>
              {renderSection()}
            </Suspense>
          </div>
        </main>
      </div>
      <ColorLegend />
      <footer className="app-footer">
        <span>ITSC Anomaly Detection — Interactive Study Playground</span>
        <span style={{ color: 'var(--text-muted)' }}>Built with React + Vite</span>
      </footer>
    </div>
  );
}
