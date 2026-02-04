import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';
import { MapView } from './views/MapView';
import { ScheduleView } from './views/ScheduleView';
import { LogisticsView } from './views/LogisticsView';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardView />} />
          <Route path="map" element={<MapView />} />
          <Route path="schedule" element={<ScheduleView />} />
          <Route path="logistics" element={<LogisticsView />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
