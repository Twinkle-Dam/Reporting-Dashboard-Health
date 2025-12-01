import React from 'react';

export type DoctorSlot = {
  day: string;
  buildingId: string;
  buildingName: string;
  floor: number;
  room: string;
  start: string;
  end: string;
};

export type DoctorPopupData = {
  id?: string;
  name: string;
  department?: string;
  slots: DoctorSlot[];
};

type DoctorSlotsPopupProps = {
  popup: DoctorPopupData | null;
  onClose: () => void;
};

export const DoctorSlotsPopup: React.FC<DoctorSlotsPopupProps> = ({ popup, onClose }) => {
  if (!popup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}></div>
      <div className="relative z-10 w-[96vw] max-w-4xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl overflow-auto">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <div className="text-slate-900 text-lg font-semibold">{popup.name}</div>
              <div className="text-slate-600 text-sm">
                {popup.department ? `${popup.department} • ` : ''}
                All schedules (Mon–Fri)
              </div>
            </div>
          </div>
        </div>
        {popup.slots.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Day</th>
                  <th className="px-3 py-2 text-left font-semibold">Building</th>
                  <th className="px-3 py-2 text-left font-semibold">Floor</th>
                  <th className="px-3 py-2 text-left font-semibold">Room</th>
                  <th className="px-3 py-2 text-left font-semibold">Start</th>
                  <th className="px-3 py-2 text-left font-semibold">End</th>
                  <th className="px-3 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {popup.slots.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-800">{s.day}</td>
                    <td className="px-3 py-2 text-slate-800">{s.buildingName}</td>
                    <td className="px-3 py-2 text-slate-800">Floor {s.floor}</td>
                    <td className="px-3 py-2 text-slate-800">{s.room || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{s.start}</td>
                    <td className="px-3 py-2 text-slate-600">{s.end}</td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={`#/doctor-schedule?doctorId=${encodeURIComponent(popup.id || '')}`}
                        onClick={(e) => {
                          e.preventDefault();
                          const params = new URLSearchParams();
                          params.set('doctorId', String(popup.id || ''));
                          params.set('edit', '1');
                          params.set('doctorName', String(popup.name || ''));
                          params.set('day', String(s.day));
                          params.set('buildingId', String(s.buildingId));
                          params.set('floor', String(s.floor));
                          params.set('room', String(s.room));
                          params.set('start', String(s.start));
                          params.set('end', String(s.end));
                          window.location.hash = `#/doctor-schedule?${params.toString()}`;
                        }}
                        className="inline-flex rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 hover:bg-slate-50"
                      >
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 p-3 text-sm text-slate-600 rounded-md border border-slate-200">
            No schedules found for this doctor.
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <a
            href={`#/doctor-schedule?doctorId=${encodeURIComponent(popup.id || '')}&new=1`}
            onClick={(e) => {
              e.preventDefault();
              const params = new URLSearchParams();
              params.set('doctorId', String(popup.id || popup.name.toLowerCase().replace(/\s+/g, '-')));
              params.set('doctorName', String(popup.name || ''));
              params.set('new', '1');
              window.location.hash = `#/doctor-schedule?${params.toString()}`;
            }}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add New Schedule
          </a>
        </div>
      </div>
    </div>
  );
};

export default DoctorSlotsPopup;


