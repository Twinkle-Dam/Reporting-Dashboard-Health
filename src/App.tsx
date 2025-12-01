import React, { useEffect, useMemo, useState } from 'react';

import Dashboard from './pages/Dashboardorg';
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
        <div className="px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-semibold shadow-sm">
                UH
              </div>
              <div className="leading-tight">
                <div className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600">
                  UH Space Utilization Dashboard
                </div>
                <div className="text-xs text-slate-600">University Hospitals Real-Time Space Management</div>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-2">
              <a
                href="#/dashboard"
                className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/dashboard') ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700 hover:bg-rose-50'}`}
              >
                Dashboard
              </a>
              <a
                href="#/room-allocation"
                className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/room-allocation') ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700 hover:bg-rose-50'}`}
              >
                Report Summary
              </a>
              <a
                href="#/doctor-schedule"
                className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/doctor-schedule') ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700 hover:bg-rose-50'}`}
              >
                Doctor Schedule
              </a>
            </nav>
          </div>
          {/* mobile nav */}
          <nav className="mt-2 flex md:hidden items-center gap-2">
            <a
              href="#/dashboard"
              className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/dashboard') ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700 hover:bg-rose-50'}`}
            >
              Dashboard
            </a>
            <a
              href="#/room-allocation"
              className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/room-allocation') ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700 hover:bg-rose-50'}`}
            >
              Report Summary
            </a>
            <a
              href="#/doctor-schedule"
              className={`px-3 py-1.5 text-sm rounded-md ${isActive('#/doctor-schedule') ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700 hover:bg-rose-50'}`}
            >
              Doctor Schedule
            </a>
          </nav>
        </div>
        <div className="h-[2px] w-full bg-gradient-to-r from-violet-500/60 via-fuchsia-500/60 to-rose-500/60" />
      </header>
      <main className="px-3 py-2">
        <CurrentPage />
      </main>
    </div>
  );
}



