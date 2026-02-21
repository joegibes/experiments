import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MapView } from './views/MapView';
import { ScheduleView } from './views/ScheduleView';
import { LogisticsView } from './views/LogisticsView';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MapView />} />
          <Route path="schedule" element={<ScheduleView />} />
          <Route path="results" element={<LogisticsView />} /> {/* Reusing Logistics as "Results" for now */}
          <Route path="profile" element={<div className="p-10 text-center text-white">Profile Coming Soon</div>} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
