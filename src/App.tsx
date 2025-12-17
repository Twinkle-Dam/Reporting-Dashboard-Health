import React, { useEffect, useMemo, useState } from 'react';

import RoomAllocationReport from './pages/RoomAllocationReport';
import DoctorSchedule from './pages/DoctorSchedule';
import DashboardShell from './pages/dashboard/DashboardShell';

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
    return DashboardShell;
  }, [route]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-[1200] border-b bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
        <div className="px-3 py-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <a
                  href="/"
                  onClick={(evt) => {
                    evt?.preventDefault?.();
                    try {
                      sessionStorage.removeItem('dash_state');
                      sessionStorage.removeItem('dash_restore');
                      sessionStorage.removeItem('vm_floor_rooms_cache');
                    } catch {
                      /* ignore storage errors */
                    }
                    window.location.href = '/';
                  }}
                  className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  aria-label="Go to home"
                >
                  <img src="/UHLOGO.jpg" alt="UH logo" className="h-11 w-[230px] object-contain" />
                </a>
                <div className="h-12 w-px bg-slate-200" />
                <div className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600">
                   Real-Time Space Utilization
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
              DashboardShell
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
      <main className="px-3 py-0.5 pt-4 md:pt-6">
        <CurrentPage />
      </main>
    </div>
    
  );
}



