import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SystemPage from './pages/SystemPage';
import RunsPage from './pages/RunsPage';
import { RunDetailPage } from './pages/RunDetailPage';
import { ContractPage } from './pages/ContractPage';
import { CachePage } from './pages/CachePage';
import { IntegrityPage } from './pages/IntegrityPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<SystemPage />} />
        <Route path="runs" element={<RunsPage />} />
        <Route path="runs/:runId" element={<RunDetailPage />} />
        <Route path="contract" element={<ContractPage />} />
        <Route path="cache" element={<CachePage />} />
        <Route path="integrity" element={<IntegrityPage />} />
      </Route>
    </Routes>
  );
}

export default App;
