import React, { useEffect, useMemo, useState } from 'react';

import { DashboardShell as Dashboard } from './pages/dashboard/DashboardShell';
import RoomAllocationReport from './pages/RoomAllocationReport';
import DoctorSchedule from './pages/DoctorSchedule';

// import DoctorSchedule from './pages/DoctorScheduleReplica';
// import Dashboard from './pages/Dashboard';
// import RoomAllocationReport from './pages/RoomAllocationReportReplica';


type RouteHash = '#/dashboard' | '#/room-allocation' | '#/doctor-schedule';

function getBaseHash(): RouteHash {
  const raw = window.location.hash || '#/dashboard';
  const base = raw.split('?')[0] as RouteHash;
  if (base === '#/dashboard' || base === '#/room-allocation' || base === '#/doctor-schedule') {
    return base;
  }
  return '#/dashboard';
}

export default function App(): React.ReactElement {
  const [route, setRoute] = useState<RouteHash>(getBaseHash());

  useEffect(() => {
    const onHashChange = () => setRoute(getBaseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const isActive = (href: RouteHash) => route === href;
  const CurrentPage: React.ComponentType = useMemo(() => {
    if (route === '#/room-allocation') return RoomAllocationReport;
    if (route === '#/doctor-schedule') return DoctorSchedule;
    return Dashboard;
  }, [route]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="px-3 py-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <img src="/UHLOGO.jpg" alt="UH logo" className="h-11 w-[230px] object-contain" />
                <div className="h-12 w-px bg-slate-200" />
                <div className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600">
                   Real-Time Space Management
                </div>
              </div>
            <nav className="hidden md:flex items-center gap-2">
              <a
                href="#/dashboard"
                className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/dashboard') ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-700 hover:bg-violet-50'}`}
              >
                Dashboard
              </a>
              <a
                href="#/room-allocation"
                className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/room-allocation') ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-700 hover:bg-violet-50'}`}
              >
                Utilization Insights
              </a>
              <a
                href="#/doctor-schedule"
                className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/doctor-schedule') ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-700 hover:bg-violet-50'}`}
              >
                Doctor Schedule
              </a>
            </nav>
          </div>
          {/* mobile nav */}
          <nav className="mt-2 flex md:hidden items-center gap-2">
            <a
              href="#/dashboard"
              className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/dashboard') ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-700 hover:bg-violet-50'}`}
            >
              Dashboard
            </a>
            <a
              href="#/room-allocation"
              className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/room-allocation') ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-700 hover:bg-violet-50'}`}
            >
              Utilization Insights
            </a>
            <a
              href="#/doctor-schedule"
              className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/doctor-schedule') ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-700 hover:bg-violet-50'}`}
            >
              Doctor Schedule
            </a>
          </nav>
        </div>
        <div className="h-[2px] w-full bg-gradient-to-r from-violet-500/60 via-fuchsia-500/60 to-rose-500/60" />
      </header>
      <main className="px-3 py-0.5">
        <CurrentPage />
      </main>
    </div>
    
  );
}



