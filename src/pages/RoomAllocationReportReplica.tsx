import React, { useCallback, useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BUILDINGS, listRoomsForBuilding as listRoomsForBuildingBase } from '../data/buildings';
import { API_BASE, UTILIZATION_ENDPOINT } from '../api/config';
import { fetchRoomsByLocation } from '../api/rooms';
import { loadSchedules, upsertDoctorSchedule } from '../modules/scheduling/scheduleStore';

type UtilRow = {
  room: string;
  month: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  [key: string]: string | number;
};

const DAYS: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

function seededPercent(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.max(1, Math.min(98, Math.floor((x - Math.floor(x)) * 100)));
}

function startOfWeekMonday(isoDate?: string): Date {
  const d = isoDate ? new Date(isoDate) : new Date();
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day === 0 ? -6 : 1 - day); // move to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateWeekData(rooms: Array<string | number>, from?: string, to?: string): UtilRow[] {
  const monday = startOfWeekMonday(from);
  const weekDays: Date[] = Array.from({ length: 5 }).map((_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
  const weekLabel = `Week of ${formatDate(monday)}`;
  return rooms.map((room) => {
    const rn = Number(room);
    const [mon, tue, wed, thu, fri] = weekDays.map((d, idx) => {
      const key = parseInt(formatDate(d).split('-').join(''), 10);
      return seededPercent(rn * 17 + (idx + 1) * 13 + key);
    });
    return {
      room: String(room),
      month: weekLabel,
      monday: mon,
      tuesday: tue,
      wednesday: wed,
      thursday: thu,
      friday: fri,
    };
  });
}

function getUtilizationClass(value: number): string {
  if (value >= 80) return 'bg-red-100 text-red-800';    // High - Red
  if (value >= 60) return 'bg-yellow-100 text-yellow-800'; // Medium - Yellow
  if (value >= 40) return 'bg-blue-100 text-blue-800';  // Moderate - Blue
  return 'bg-green-100 text-green-800';                 // Low - Green
}

function getInlineColors(value: number): { bg: string; text: string } {
  if (value >= 80) return { bg: '#FEE2E2', text: '#991B1B' };    // Red
  if (value >= 60) return { bg: '#FEF3C7', text: '#92400E' };    // Yellow
  if (value >= 40) return { bg: '#DBEAFE', text: '#1E40AF' };    // Blue
  return { bg: '#DCFCE7', text: '#065F46' };                     // Green
}
const CompactUtilizationCell = ({ value }: { value: number }) => (
  <td className="p-1 border-b">
    <div className={`
      mx-auto w-12 h-8 rounded flex items-center justify-center text-xs font-medium
      ${value >= 80 ? 'bg-red-100 text-red-700' : 
        value >= 60 ? 'bg-orange-100 text-orange-700' : 
        value >= 40 ? 'bg-yellow-100 text-yellow-700' : 
        value >= 20 ? 'bg-blue-100 text-blue-700' : 
        'bg-green-100 text-green-700'}
    `}>
      {value}%
    </div>
  </td>
);

// Helper function to calculate weekly average
const calculateWeeklyAvg = (row: any) => {
  const days = DAYS.map(day => row[day] as number);
  return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
};

// Helper function to format month
const formatMonth = (month: string) => {
  return month.replace('Week of ', '');
};
const RoomAllocationReport: React.FC = () => {
  const [data, setData] = useState<UtilRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<string | null>(null);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [crumbs, setCrumbs] = useState<{ city?: string; campus?: string; buildingId?: string; buildingName?: string; floor?: number }>({});
  const [scope, setScope] = useState<'city' | 'campus' | 'building' | 'floor'>('floor');
  const [drillFloor, setDrillFloor] = useState<number | null>(null);
  const [useMock, setUseMock] = useState<boolean>(true);
  // Remote rooms per building (overrides generated rooms when available)
  const [remoteRoomsByBuilding, setRemoteRoomsByBuilding] = useState<Record<string, string[]>>({});

  // Local wrapper: prefer remote rooms when present
  function listRoomsForBuilding(buildingId: string, floor: number): Array<string | number> {
    const remote = remoteRoomsByBuilding[buildingId];
    if (remote && remote.length > 0) return remote;
    return listRoomsForBuildingBase(buildingId, floor);
  }

  const handlePrint = useCallback(() => window.print(), []);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  const [doctorPopup, setDoctorPopup] = useState<{
    id?: string;
    name: string;
    department?: string;
    slots: Array<{ day: string; buildingId: string; buildingName: string; floor: number; room: string; start: string; end: string }>;
  } | null>(null);

  const openDoctorPopup = React.useCallback((doctorName: string) => {
    try {
      const all = loadSchedules() as Record<string, any>;
      // try find by exact name; else try normalized name
      const normalize = (s?: string) => String(s || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
      let match = Object.values(all || {}).find((s: any) => (s as any)?.doctorName === doctorName) as any;
      if (!match) {
        const target = normalize(doctorName);
        match = Object.values(all || {}).find((s: any) => normalize((s as any)?.doctorName) === target) as any;
      }
      let department = (match as any)?.doctorDepartment || '';
      let doctorId = (match as any)?.doctorId || '';
      let week = (match as any)?.week || {};

      // If no schedule exists, synthesize a minimal Mon–Fri week and persist so subsequent views have data
      const ensureWeek = () => {
        const defaultBuilding = (typeof (crumbs?.buildingId) === 'string' && crumbs.buildingId) || (resolvedBuilding as any)?.id || 'uh-cleveland-medical-center';
        const floors = [1, 2, 3, 1, 2];
        const rooms = floors.map((f, i) => String(f * 100 + (i === 0 ? 1 : (i === 1 ? 2 : (i === 2 ? 3 : (i === 3 ? 4 : 5))))));
        const labels = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
        const gen: any = {};
        for (let i = 0; i < labels.length; i++) {
          gen[labels[i]] = { slots: [{ buildingId: defaultBuilding, floor: floors[i], room: rooms[i], start: '09:00', end: '12:00' }] };
        }
        return gen;
      };

      if (!match) {
        doctorId = doctorName.toLowerCase().replace(/\s+/g, '-');
        week = ensureWeek();
        try {
          upsertDoctorSchedule(doctorId, { doctorId, doctorName, doctorDepartment: department || '', week });
        } catch { /* ignore persist errors */ }
      } else {
        const hasAny = Object.values(week || {}).some((d: any) => (d?.slots || []).length > 0);
        if (!hasAny) {
          week = ensureWeek();
          try {
            upsertDoctorSchedule((match as any)?.doctorId || (doctorName.toLowerCase().replace(/\s+/g, '-')), { doctorId: (match as any)?.doctorId || doctorId || doctorName.toLowerCase().replace(/\s+/g, '-'), doctorName, doctorDepartment: department || '', week });
          } catch { /* ignore persist errors */ }
        }
      }

      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
      const slots: Array<{ day: string; buildingId: string; buildingName: string; floor: number; room: string; start: string; end: string }> = [];
      for (const day of days) {
        const list: any[] = (week?.[day]?.slots) || [];
        for (const s of list) {
          const b = (BUILDINGS as any[]).find((x) => String((x as any).id) === String(s.buildingId));
          slots.push({
            day,
            buildingId: String(s.buildingId || ''),
            buildingName: (b as any)?.name || String(s.buildingId || ''),
            floor: Number(s.floor) || 1,
            room: String(s.room || ''),
            start: String(s.start || ''),
            end: String(s.end || ''),
          });
        }
      }
      setDoctorPopup({ id: doctorId, name: doctorName, department, slots });
    } catch {
      setDoctorPopup({ id: '', name: doctorName, department: '', slots: [] });
    }
  }, []);

  const buildCsv = useCallback(() => {
    const headerRow1 = ['ROOMS', 'MONTH', 'UTILIZATION PERCENTAGE', '', '', '', ''];
    const headerRow2 = ['', '', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const rows = data.map((row) => [row.room, row.month, ...DAYS.map((d) => `${(row[d] as number).toFixed(2)}%`)]);
    const escapeCell = (val: unknown) => `"${String(val).replace(/"/g, '""')}"`;
    return [headerRow1, headerRow2, ...rows]
      .map((r) => r.map(escapeCell).join(','))
      .join('\r\n');
  }, [data]);

  // Fallback generator if a building has no predefined room list
  const syntheticRoomsForFloor = React.useCallback((floor: number, count: number = 6): number[] => {
    return Array.from({ length: count }).map((_, i) => floor * 100 + (i + 1));
  }, []);

  const handleExportCSV = useCallback(() => {
    const csv = buildCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'room_utilization.csv');
  }, [buildCsv]);

  const handleExportExcel = useCallback(() => {
    const border = '#9CA3AF';
    const header1Bg = '#FDE047';
    const header1Text = '#111827';
    const header2Bg = '#FEF2F2';
    const header2Text = '#B91C1C';

    const headerRow1 = `
      <tr>
        <th style="border:1px solid ${border};padding:6px;background:${header1Bg};color:${header1Text};text-align:center">ROOMS</th>
        <th style="border:1px solid ${border};padding:6px;background:${header1Bg};color:${header1Text};text-align:center">MONTH</th>
        <th colspan="5" style="border:1px solid ${border};padding:6px;background:${header1Bg};color:${header1Text};text-align:center">UTILIZATION PERCENTAGE</th>
      </tr>`;

    const headerRow2 = `
      <tr>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center"></th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center"></th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">MONDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">TUESDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">WEDNESDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">THURSDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">FRIDAY</th>
      </tr>`;

    const bodyRows = data
      .map((row) => {
        const dayCells = DAYS.map((d) => {
          const v = row[d] as number;
          const c = getInlineColors(v);
          return `<td style="border:1px solid #9CA3AF;padding:6px;text-align:center;background-color:${c.bg};color:${c.text}">${v.toFixed(2)}%</td>`;
        }).join('');
        return (
          `<tr>` +
          `<td style="border:1px solid #9CA3AF;padding:6px;font-weight:600">${row.room}</td>` +
          `<td style="border:1px solid #9CA3AF;padding:6px;font-weight:600">${row.month}</td>` +
          dayCells +
          `</tr>`
        );
      })
      .join('');

    const html =
      '<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>' +
      `<table style="border-collapse:collapse;font-family:Arial, sans-serif;font-size:12px">` +
      `<thead>${headerRow1}${headerRow2}</thead>` +
      `<tbody>${bodyRows}</tbody>` +
      `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    saveAs(blob, 'room_utilization.xls');
  }, [data]);

  useEffect(() => {
    // Read hash query params: #/room-allocation?room=101&from=YYYY-MM-DD&to=YYYY-MM-DD
    try {
      const hash = window.location.hash || '';
      const qIndex = hash.indexOf('?');
      if (qIndex >= 0) {
        const query = hash.slice(qIndex + 1);
        const params = new URLSearchParams(query);
        const room = params.get('room');
        const from = params.get('from') || undefined;
        const to = params.get('to') || undefined;
        const cityParam = params.get('city') || undefined;
        const campusParam = params.get('campus') || undefined;
        const buildingIdParam = params.get('buildingId') || undefined;
        const buildingNameParam = params.get('buildingName') || undefined;
        const floorParam = params.get('floor');
        const mockParam = params.get('mock');
        if (room) setRoomFilter(room);
        setRange({ from, to });
        if (from) setFromDate(from);
        if (to) setToDate(to);
        if (mockParam === '0' || mockParam === 'false') setUseMock(false);
        if (mockParam === '1' || mockParam === 'true') setUseMock(true);
        if (cityParam) {
          setCrumbs((c) => ({ ...c, city: cityParam }));
        }
        if (campusParam) {
          setCrumbs((c) => ({ ...c, campus: campusParam }));
        }
        if (buildingIdParam || buildingNameParam) {
          setCrumbs((c) => ({
            ...c,
            buildingId: buildingIdParam || c.buildingId,
            buildingName: buildingNameParam || c.buildingName,
            floor: floorParam ? Number(floorParam) : undefined,
          }));
        }
        // If a room is provided but no explicit floor, infer floor from room number (e.g., 205 -> 2)
        if (room && !floorParam) {
          const inferred = parseInt(room, 10);
          if (!Number.isNaN(inferred) && inferred >= 100) {
            const f = Math.floor(inferred / 100);
            setCrumbs((c) => ({ ...c, floor: f }));
          }
        }
        // When a room is targeted, ensure scope is floor
        if (room) {
          setScope('floor');
        }
        if ((buildingIdParam || buildingNameParam) && !floorParam && !room) {
          setScope('building');
        } else if (campusParam && !buildingIdParam && !buildingNameParam && !room) {
          setScope('campus');
        } else if (cityParam && !campusParam && !buildingIdParam && !buildingNameParam && !room) {
          setScope('city');
        }
      }
      // Also read dashboard state for breadcrumbs/context (and fallback dates if hash didn't include them)
      try {
        const raw = sessionStorage.getItem('dash_state');
        if (raw) {
          const s = JSON.parse(raw || '{}') as { city?: string; campus?: string; buildingId?: string; floor?: number; from?: string; to?: string };
          const building = s.buildingId ? (BUILDINGS as any[]).find((b) => b.id === s.buildingId) : null;
          setCrumbs((prev) => ({
            city: typeof prev.city !== 'undefined' ? prev.city : s.city,
            campus: typeof prev.campus !== 'undefined' ? prev.campus : s.campus,
            buildingId: typeof prev.buildingId !== 'undefined' ? prev.buildingId : s.buildingId,
            buildingName: typeof prev.buildingName !== 'undefined' ? prev.buildingName : (building?.name || s.buildingId || undefined),
            floor: (typeof prev.floor === 'number') ? prev.floor : (typeof s.floor === 'number' ? s.floor : undefined),
          }));
          if (!fromDate && s.from) setFromDate(s.from);
          if (!toDate && s.to) setToDate(s.to);
          if (!range.from || !range.to) {
            setRange((r) => ({ from: r.from || s.from, to: r.to || s.to }));
          }
          setScope((prev) => {
            if (roomFilter) return 'floor';
            if (typeof s.floor === 'number') return 'floor';
            if (s.buildingId) return 'building';
            if (s.campus) return 'campus';
            if (s.city) return 'city';
            return prev;
          });
        }
      } catch { /* ignore */ }
    } catch {}
  }, []);

  // Compute a small set of example rooms based on the current breadcrumb scope
  const scopedRooms = React.useMemo((): Array<string | number> => {
    try {
      if (roomFilter) return [roomFilter];
      const MAX = 6;
      const out: Array<string | number> = [];
      if ((scope === 'floor' || (resolvedBuilding && typeof crumbs.floor === 'number')) && resolvedBuilding && typeof crumbs.floor === 'number') {
        let list: Array<string | number> = (listRoomsForBuilding((resolvedBuilding as any).id, crumbs.floor) || []) as Array<string | number>;
        if (!list || list.length === 0) {
          list = syntheticRoomsForFloor(crumbs.floor);
        }
        for (const r of list) { if (out.length < MAX) out.push(r); else break; }
      } else if ((resolvedBuilding || buildingMeta) && (scope === 'building' || crumbs.floor === undefined || crumbs.floor === null)) {
        // Gather rooms from all floors for the selected building
        const b = resolvedBuilding as any;
        const floors = Number((buildingMeta?.floors) || (b?.floors) || 5);
        for (let f = 1; f <= floors; f++) {
          let list: Array<string | number>;
          if (b?.id) {
            list = (listRoomsForBuilding(b.id, f) || []) as Array<string | number>;
            if (!list || list.length === 0) list = syntheticRoomsForFloor(f);
          } else {
            list = syntheticRoomsForFloor(f);
          }
          for (const r of list) { out.push(r); }
        }
      } else if (scope === 'campus' && crumbs.campus) {
        const bs = (BUILDINGS as any[]).filter(b => b.campus === crumbs.campus);
        for (const b of bs) {
          for (let f = 1; f <= 2 && out.length < MAX; f++) {
            const list = listRoomsForBuilding(b.id, f) || [];
            for (const r of list) { if (out.length < MAX) out.push(r); else break; }
          }
          if (out.length >= MAX) break;
        }
      } else if (scope === 'city' && crumbs.city) {
        const bs = (BUILDINGS as any[]).filter(b => b.city === crumbs.city);
        for (const b of bs) {
          const list = listRoomsForBuilding(b.id, 1) || [];
          for (const r of list) { if (out.length < MAX) out.push(r); else break; }
          if (out.length >= MAX) break;
        }
      }
      if (out.length > 0) return out;
    } catch { /* ignore */ }
    // Fallback to 1..6 if nothing matched
    return Array.from({ length: 6 }).map((_, i) => i + 1);
  }, [roomFilter, scope, crumbs.city, crumbs.campus, crumbs.buildingId, crumbs.floor]);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchUtilization = async () => {
      try {
        if (useMock) {
          const demo = generateWeekData(scopedRooms as any[], range.from, range.to);
          console.log("demo",demo);
          
          setData(demo);
          return;
        }
        const params = new URLSearchParams();
        if (crumbs.city) params.set('city', String(crumbs.city));
        if (crumbs.campus) params.set('campus', String(crumbs.campus));
        if (crumbs.buildingId) params.set('buildingId', String(crumbs.buildingId));
        if (crumbs.buildingName) params.set('buildingName', String(crumbs.buildingName));
        if (typeof crumbs.floor === 'number') params.set('floor', String(crumbs.floor));
        if (roomFilter) params.set('room', String(roomFilter));
        if (range.from) params.set('from', String(range.from));
        if (range.to) params.set('to', String(range.to));
        const res = await fetch(`${UTILIZATION_ENDPOINT}?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch utilization data');
        let result = (await res.json()) as UtilRow[];
        if (roomFilter) {
          result = result.filter((r) => String(r.room) === String(roomFilter));
        } else if (scopedRooms && scopedRooms.length > 0) {
          const allow = new Set(scopedRooms.map((x) => String(x)));
          result = result.filter((r) => allow.has(String(r.room)));
        }
        if (!result || result.length === 0) {
          const demo = generateWeekData(scopedRooms as any[], range.from, range.to);
          setData(demo);
        } else {
          setData(result);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // Build demo fallback on error
          const demo = generateWeekData(scopedRooms as any[], range.from, range.to);
          setData(demo);
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUtilization();
    
    return () => controller.abort();
  }, [roomFilter, range.from, range.to, scopedRooms, useMock]);

  // Resolve building from crumbs: prefer id; fallback to name
  const resolvedBuilding = React.useMemo(() => {
    try {
      if (crumbs.buildingId) {
        const byId = (BUILDINGS as any[]).find((bb) => bb.id === crumbs.buildingId);
        if (byId) return byId;
      }
      if (crumbs.buildingName) {
        const target = String(crumbs.buildingName).toLowerCase().trim();
        // exact match first
        let found = (BUILDINGS as any[]).find((bb) => String(bb.name).toLowerCase().trim() === target);
        if (found) return found;
        // fallback: contains match
        found = (BUILDINGS as any[]).find((bb) => String(bb.name).toLowerCase().includes(target));
        if (found) return found;
        // fallback: target contains dataset name (handles extra suffixes)
        found = (BUILDINGS as any[]).find((bb) => target.includes(String(bb.name).toLowerCase()));
        if (found) return found;
      }
    } catch { /* ignore */ }
    return null;
  }, [crumbs.buildingId, crumbs.buildingName]);

  const buildingMeta = React.useMemo(() => {
    try {
      const b = resolvedBuilding as any;
      // If building can't be resolved by id/name, still default to 5 floors when a building name exists
      if (!b) {
        if (crumbs.buildingName) {
          return { floors: 5 };
        }
        return null;
      }
      const floors = Number((b?.floors) || 5);
      return { floors };
    } catch {
      return null;
    }
  }, [resolvedBuilding, crumbs.buildingName]);

  // When the user selects Floor 1 on UH Ahuja Medical Center, fetch real rooms via Rooms_GetRooms
  useEffect(() => {
    (async () => {
      try {
        if (!API_BASE) return; // backend not configured
        const b = resolvedBuilding as any;
        if (!b) return;
        const byName = String(b?.name || '');
        if (byName !== 'UH Ahuja Medical Center') return;
        if (!(scope === 'floor' && Number(crumbs.floor) === 1)) return;
        const locationId = 'BABEEF54-C88A-400E-926E-5317260E5EA2';
        const rooms = await fetchRoomsByLocation(locationId, undefined); // isAdmin nullable
        if (rooms && rooms.length > 0) {
          setRemoteRoomsByBuilding((prev) => ({ ...prev, [String(b.id || 'uh-ahuja-medical-center')]: rooms }));
        }
      } catch {
        // ignore and keep synthetic rooms
      }
    })();
  }, [resolvedBuilding, scope, crumbs.floor]);

  const floorsCount = React.useMemo(() => {
    if (buildingMeta?.floors && Number(buildingMeta.floors) > 0) return Number(buildingMeta.floors);
    if (crumbs.buildingName || resolvedBuilding) return 5;
    return undefined;
  }, [buildingMeta?.floors, crumbs.buildingName, resolvedBuilding]);

  // Campus helpers
  const campusBuildings = React.useMemo(() => {
    if (!crumbs.campus) return [];
    const target = String(crumbs.campus).toLowerCase().trim();
    return (BUILDINGS as any[]).filter((b) => String(b.campus).toLowerCase().trim() === target);
  }, [crumbs.campus]);

  // City helpers
  const cityCampuses = React.useMemo(() => {
    if (!crumbs.city) return [];
    const target = String(crumbs.city).toLowerCase().trim();
    const set = new Set<string>();
    for (const b of (BUILDINGS as any[])) {
      if (String(b.city).toLowerCase().trim() === target) set.add(String(b.campus));
    }
    return Array.from(set);
  }, [crumbs.city]);

  const cityCampusTable = React.useMemo(() => {
    if (!crumbs.city || cityCampuses.length === 0 || !(scope === 'city')) return [];
    const rows: UtilRow[] = [];
    const weekLabel = `Week of ${formatDate(startOfWeekMonday(range.from))}`;
    const avg = (vals: number[]) => (vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0);
    for (const campus of cityCampuses) {
      const buildings = (BUILDINGS as any[]).filter((b) => String(b.city) === String(crumbs.city) && String(b.campus) === String(campus));
      let allRooms: string[] = [];
      for (const b of buildings) {
        const floors = Number((b as any)?.floors || 5);
        for (let f = 1; f <= floors; f++) {
          const list = (listRoomsForBuilding((b as any).id, f) || []).map(String);
          if (list && list.length > 0) allRooms.push(...list);
          else allRooms.push(...syntheticRoomsForFloor(f).map(String));
        }
      }
      let dataRows = (data || []).filter((r) => allRooms.includes(String(r.room)));
      if (!dataRows || dataRows.length === 0) {
        dataRows = generateWeekData(allRooms.slice(0, 20) as any[], range.from, range.to);
      }
      const mondays = dataRows.map((r) => Number(r.monday as number));
      const tuesdays = dataRows.map((r) => Number(r.tuesday as number));
      const wednesdays = dataRows.map((r) => Number(r.wednesday as number));
      const thursdays = dataRows.map((r) => Number(r.thursday as number));
      const fridays = dataRows.map((r) => Number(r.friday as number));
      rows.push({
        room: String(campus),
        month: weekLabel,
        monday: Math.round(avg(mondays) * 100) / 100,
        tuesday: Math.round(avg(tuesdays) * 100) / 100,
        wednesday: Math.round(avg(wednesdays) * 100) / 100,
        thursday: Math.round(avg(thursdays) * 100) / 100,
        friday: Math.round(avg(fridays) * 100) / 100,
      } as UtilRow);
    }
    return rows;
  }, [crumbs.city, cityCampuses, scope, data, range.from, syntheticRoomsForFloor]);

  const cityCampusSeries = React.useMemo(() => {
    if (!crumbs.city || cityCampuses.length === 0 || scope !== 'city') return [];
    const series: Array<{ campus: string; util: number }> = [];
    const dayAvg = (row: UtilRow) => {
      const vals = DAYS.map(d => Number(row[d] as number || 0));
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    for (const campus of cityCampuses) {
      const buildings = (BUILDINGS as any[]).filter((b) => String(b.city) === String(crumbs.city) && String(b.campus) === String(campus));
      let rooms: string[] = [];
      for (const b of buildings) {
        const floors = Number((b as any)?.floors || 5);
        for (let f = 1; f <= floors; f++) {
          const list = (listRoomsForBuilding((b as any).id, f) || []).map(String);
          if (list && list.length > 0) rooms.push(...list);
          else rooms.push(...syntheticRoomsForFloor(f).map(String));
        }
      }
      let dataRows = (data || []).filter((r) => rooms.includes(String(r.room)));
      if (!dataRows || dataRows.length === 0) {
        dataRows = generateWeekData(rooms.slice(0, 20) as any[], range.from, range.to);
      }
      const util = dataRows.length ? dataRows.reduce((s, r) => s + dayAvg(r), 0) / dataRows.length : 0;
      series.push({ campus: String(campus), util: Math.round(util * 100) / 100 });
    }
    return series;
  }, [crumbs.city, cityCampuses, scope, data, range.from, syntheticRoomsForFloor]);
  const campusDailyTable = React.useMemo(() => {
    if (!crumbs.campus || campusBuildings.length === 0 || !(scope === 'campus' || (!resolvedBuilding && (crumbs.floor === undefined || crumbs.floor === null)))) return [];
    const result: UtilRow[] = [];
    const weekLabel = `Week of ${formatDate(startOfWeekMonday(range.from))}`;
    const avg = (vals: number[]) => (vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0);
    for (const b of campusBuildings) {
      const floors = Number((b as any)?.floors || 5);
      let rooms: string[] = [];
      for (let f = 1; f <= floors; f++) {
        const list = (listRoomsForBuilding((b as any).id, f) || []).map(String);
        if (list && list.length > 0) {
          rooms.push(...list);
        } else {
          rooms.push(...syntheticRoomsForFloor(f).map(String));
        }
      }
      const roomSet = new Set(rooms);
      let rows = (data || []).filter((row) => roomSet.has(String(row.room)));
      if (!rows || rows.length === 0) {
        const demo = generateWeekData(rooms.slice(0, 12) as any[], range.from, range.to);
        rows = demo;
      }
      const mondays = rows.map((r) => Number(r.monday as number));
      const tuesdays = rows.map((r) => Number(r.tuesday as number));
      const wednesdays = rows.map((r) => Number(r.wednesday as number));
      const thursdays = rows.map((r) => Number(r.thursday as number));
      const fridays = rows.map((r) => Number(r.friday as number));
      result.push({
        room: String((b as any).name),
        month: weekLabel,
        monday: Math.round(avg(mondays) * 100) / 100,
        tuesday: Math.round(avg(tuesdays) * 100) / 100,
        wednesday: Math.round(avg(wednesdays) * 100) / 100,
        thursday: Math.round(avg(thursdays) * 100) / 100,
        friday: Math.round(avg(fridays) * 100) / 100,
      } as UtilRow);
    }
    return result;
  }, [crumbs.campus, campusBuildings, scope, resolvedBuilding, range.from, data, syntheticRoomsForFloor]);

  const campusSeries = React.useMemo(() => {
    if (!crumbs.campus || campusBuildings.length === 0 || !(scope === 'campus' || (!resolvedBuilding && (crumbs.floor === undefined || crumbs.floor === null)))) return [];
    const series: Array<{ name: string; util: number }> = [];
    const dayAvg = (row: UtilRow) => {
      const vals = DAYS.map(d => Number(row[d] as number || 0));
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    for (const b of campusBuildings) {
      const floors = Number((b as any)?.floors || 5);
      let rooms: string[] = [];
      for (let f = 1; f <= floors; f++) {
        const list = (listRoomsForBuilding((b as any).id, f) || []).map(String);
        if (list && list.length > 0) rooms.push(...list);
        else rooms.push(...syntheticRoomsForFloor(f).map(String));
      }
      let rows = (data || []).filter((row) => rooms.includes(String(row.room)));
      if (!rows || rows.length === 0) {
        rows = generateWeekData(rooms.slice(0, 12) as any[], range.from, range.to);
      }
      const util = rows.length ? rows.reduce((s, r) => s + dayAvg(r), 0) / rows.length : 0;
      series.push({ name: String((b as any).name), util: Math.round(util * 100) / 100 });
    }
    return series;
  }, [crumbs.campus, campusBuildings, scope, resolvedBuilding, range.from, data, syntheticRoomsForFloor]);
  // If a building is selected without a specific floor/room, default to building view
  useEffect(() => {
    try {
      if ((resolvedBuilding || crumbs.buildingName) && !roomFilter && (crumbs.floor === undefined || crumbs.floor === null)) {
        if (scope !== 'building') {
          setScope('building');
        }
      }
    } catch { /* ignore */ }
  }, [resolvedBuilding, crumbs.buildingName, roomFilter, crumbs.floor, scope]);

  // Group dataset by floor when viewing a whole building
  const groupedByFloor = React.useMemo(() => {
    if (scope !== 'building' || !resolvedBuilding) return null;
    try {
      const b = resolvedBuilding as any;
      const floors = Number((b as any)?.floors || 5);
      const groups: Array<{ floor: number; data: UtilRow[] }> = [];
      for (let f = 1; f <= floors; f++) {
        const rooms = new Set((listRoomsForBuilding(b.id, f) || []).map((r: any) => String(r)));
        const rows = (data || []).filter((row) => rooms.has(String(row.room)));
        if (rows.length > 0) {
          groups.push({ floor: f, data: rows });
        }
      }
      return groups;
    } catch {
      return null;
    }
  }, [scope, resolvedBuilding, data]);

  // Building-scope: table summarized by floor with per-day utilization averages
  const floorDailyTable = React.useMemo(() => {
    if ((scope !== 'building' && !(crumbs.floor === undefined || crumbs.floor === null)) || !floorsCount) return [];
    const result: UtilRow[] = [];
    const weekLabel = `Week of ${formatDate(startOfWeekMonday(range.from))}`;
    const avg = (vals: number[]) => (vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0);
    for (let f = 1; f <= floorsCount; f++) {
      let rooms: string[];
      if (resolvedBuilding?.id) {
        rooms = (listRoomsForBuilding((resolvedBuilding as any).id, f) || []).map((r: any) => String(r));
        if (!rooms || rooms.length === 0) rooms = syntheticRoomsForFloor(f).map(String);
      } else {
        rooms = syntheticRoomsForFloor(f).map(String);
      }
      const roomSet = new Set(rooms);
      let rows = (data || []).filter((row) => roomSet.has(String(row.room)));
      if (!rows || rows.length === 0) {
        // fallback demo rows for this floor
        const demo = generateWeekData((rooms.slice(0, 6) as any[]), range.from, range.to);
        rows = demo;
      }
      const mondays = rows.map((r) => Number(r.monday as number));
      const tuesdays = rows.map((r) => Number(r.tuesday as number));
      const wednesdays = rows.map((r) => Number(r.wednesday as number));
      const thursdays = rows.map((r) => Number(r.thursday as number));
      const fridays = rows.map((r) => Number(r.friday as number));
      result.push({
        room: `Floor ${f}`,
        month: weekLabel,
        monday: Math.round(avg(mondays) * 100) / 100,
        tuesday: Math.round(avg(tuesdays) * 100) / 100,
        wednesday: Math.round(avg(wednesdays) * 100) / 100,
        thursday: Math.round(avg(thursdays) * 100) / 100,
        friday: Math.round(avg(fridays) * 100) / 100,
      } as UtilRow);
    }
    return result;
  }, [scope, resolvedBuilding, buildingMeta?.floors, data, range.from, range.to]);

  // Build a per-floor utilization series for building scope (average across rooms and days)
  const floorSeries = React.useMemo(() => {
    if ((scope !== 'building' && !(crumbs.floor === undefined || crumbs.floor === null)) || !floorsCount) return [];
    const series: Array<{ floor: number; floorLabel: string; util: number }> = [];
    for (let f = 1; f <= floorsCount; f++) {
      let roomList: string[];
      if (resolvedBuilding?.id) {
        roomList = (listRoomsForBuilding((resolvedBuilding as any).id, f) || []).map((r: any) => String(r));
        if (!roomList || roomList.length === 0) roomList = syntheticRoomsForFloor(f).map(String);
      } else {
        roomList = syntheticRoomsForFloor(f).map(String);
      }
      const rooms = new Set(roomList);
      const rows = (data || []).filter(r => rooms.has(String(r.room)));
      let util = 0;
      if (rows.length > 0) {
        // average of averages across days
        const dayAvg = (row: UtilRow) => {
          const vals = DAYS.map(d => Number(row[d] as number || 0));
          return vals.reduce((a, b) => a + b, 0) / vals.length;
        };
        util = rows.reduce((sum, r) => sum + dayAvg(r), 0) / rows.length;
      } else {
        // fallback: generate week data and compute avg
        const fallbackRooms = roomList.slice(0, 6);
        const demo = generateWeekData(fallbackRooms as any[], range.from, range.to);
        const dayAvg = (row: UtilRow) => {
          const vals = DAYS.map(d => Number(row[d] as number || 0));
          return vals.reduce((a, b) => a + b, 0) / vals.length;
        };
        util = demo.reduce((sum, r) => sum + dayAvg(r), 0) / (demo.length || 1);
      }
      series.push({ floor: f, floorLabel: `Floor ${f}`, util: Math.round(util * 100) / 100 });
    }
    return series;
  }, [scope, resolvedBuilding, buildingMeta?.floors, data, range.from, range.to]);

  // Selected floor summary row for the room-level utilization table
  const selectedFloorSummaryRow = React.useMemo((): UtilRow | null => {
    try {
      if (typeof crumbs.floor !== 'number') return null;
      if (roomFilter) return null; // when drilling to a specific room, skip floor summary row
      const weekLabel = `Week of ${formatDate(startOfWeekMonday(range.from))}`;
      // Build rows for the entire selected floor using the same logic as building-scope summary,
      // so the values align with the building view for this floor.
      let rows: UtilRow[] = [];
      if (resolvedBuilding?.id) {
        let rooms = (listRoomsForBuilding((resolvedBuilding as any).id, crumbs.floor) || []).map((r: any) => String(r));
        if (!rooms || rooms.length === 0) rooms = syntheticRoomsForFloor(crumbs.floor).map(String);
        const roomSet = new Set(rooms);
        rows = (data || []).filter((row) => roomSet.has(String(row.room)));
        if (!rows || rows.length === 0) {
          const demo = generateWeekData(rooms.slice(0, 20) as any[], range.from, range.to);
          rows = demo as any as UtilRow[];
        }
      } else {
        // No building context; synthesize set from floor number
        const rooms = syntheticRoomsForFloor(crumbs.floor).map(String);
        const demo = generateWeekData(rooms.slice(0, 20) as any[], range.from, range.to);
        rows = demo as any as UtilRow[];
      }
      if (!rows || rows.length === 0) return null;
      const avg = (vals: number[]) => (vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0);
      const mondays = rows.map((r) => Number(r.monday as number || 0));
      const tuesdays = rows.map((r) => Number(r.tuesday as number || 0));
      const wednesdays = rows.map((r) => Number(r.wednesday as number || 0));
      const thursdays = rows.map((r) => Number(r.thursday as number || 0));
      const fridays = rows.map((r) => Number(r.friday as number || 0));
      return {
        room: `Floor ${crumbs.floor}`,
        month: weekLabel,
        monday: Math.round(avg(mondays) * 100) / 100,
        tuesday: Math.round(avg(tuesdays) * 100) / 100,
        wednesday: Math.round(avg(wednesdays) * 100) / 100,
        thursday: Math.round(avg(thursdays) * 100) / 100,
        friday: Math.round(avg(fridays) * 100) / 100,
      };
    } catch {
      return null;
    }
  }, [crumbs.floor, roomFilter, resolvedBuilding, data, range.from, range.to]);

  // Derive department summary for the current selection (building/floor/room)
  const departments = React.useMemo(() => {
    try {
      const schedules = loadSchedules() as Record<string, any>;
      const deptSet = new Set<string>();
      const bId = (resolvedBuilding as any)?.id || crumbs.buildingId || '';
      const wantFloor = typeof crumbs.floor === 'number' ? Number(crumbs.floor) : null;
      const wantRoom = roomFilter ? String(roomFilter) : null;
      if (!bId) return [];
      for (const sched of Object.values(schedules || {})) {
        const dept = (sched as any)?.doctorDepartment || '';
        const week: any = (sched as any)?.week || {};
        for (const key of Object.keys(week)) {
          const slots: any[] = (week[key]?.slots) || [];
          for (const s of slots) {
            if (String(s.buildingId) !== String(bId)) continue;
            if (wantFloor !== null && Number(s.floor) !== wantFloor) continue;
            if (wantRoom && String(s.room) !== wantRoom) continue;
            if (dept) deptSet.add(String(dept));
          }
        }
      }
      return Array.from(deptSet);
    } catch { return []; }
  }, [resolvedBuilding, crumbs.buildingId, crumbs.floor, roomFilter]);

  // For a selected room, show who occupies it based on schedules (share of matching slots)
  const roomDoctorBreakdown = React.useMemo(() => {
    try {
      const schedules = loadSchedules() as Record<string, any>;
      const bId = (resolvedBuilding as any)?.id || crumbs.buildingId || '';
      const wantFloor = typeof crumbs.floor === 'number' ? Number(crumbs.floor) : null;
      const wantRoom = roomFilter ? String(roomFilter) : null;
      if (!wantRoom) return [];
      // days within selected range (Mon–Fri only)
      const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const inRangeDays = (() => {
        if (!fromDate || !toDate) return ['Monday','Tuesday','Wednesday','Thursday','Friday'];
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const set = new Set<string>();
        const cur = new Date(start);
        while (cur <= end) {
          const dn = dayNames[cur.getDay()];
          if (['Monday','Tuesday','Wednesday','Thursday','Friday'].includes(dn)) set.add(dn);
          cur.setDate(cur.getDate() + 1);
        }
        return ['Monday','Tuesday','Wednesday','Thursday','Friday'].filter(d => set.has(d));
      })();
      const contrib = new Map<string, number>();
      let totalOcc = 0;
      const row = (data || []).find(r => String(r.room) === String(wantRoom));
      for (const day of inRangeDays) {
        let occPct = 0;
        if (row) {
          const v = (row as any)?.[day.toLowerCase()];
          if (typeof v === 'number') occPct = Math.max(0, Math.min(100, Number(v)));
        }
        if (occPct <= 0) continue;
        const nameToCount = new Map<string, number>();
        let totalSlots = 0;
        for (const sched of Object.values(schedules || {})) {
          const name = String((sched as any)?.doctorName || (sched as any)?.doctorId || 'Doctor');
          const slots: any[] = ((sched as any)?.week?.[day]?.slots) || [];
          for (const s of slots) {
            if (bId && String(s.buildingId) !== String(bId)) continue;
            if (wantFloor !== null && Number(s.floor) !== wantFloor) continue;
            if (String(s.room) !== String(wantRoom)) continue;
            nameToCount.set(name, (nameToCount.get(name) || 0) + 1);
            totalSlots += 1;
          }
        }
        if (totalSlots === 0) continue;
        for (const [name, cnt] of nameToCount.entries()) {
          const add = (cnt / totalSlots) * occPct;
          contrib.set(name, (contrib.get(name) || 0) + add);
        }
        totalOcc += occPct;
      }
      if (totalOcc === 0) {
        if (!useMock) return [];
        const seeds = ['Dr. Patel', 'Dr. Rivera', 'Dr. Chen'];
        const base = (Number(wantRoom) || 101) + (wantFloor || 1) * 7;
        const vals = seeds.map((_, i) => (Math.abs(Math.sin(base + i * 3)) * 100) + 1);
        const sum = vals.reduce((a, b) => a + b, 0);
        return seeds.map((n, i) => ({ name: n, percent: Math.max(1, Math.round((vals[i] / sum) * 100)) }));
      }
      // Return values summing to totalOcc (range total utilization)
      const list = Array.from(contrib.entries()).map(([name, val]) => ({
        name,
        percent: Math.round(val),
      }));
      const diff = Math.round(totalOcc - list.reduce((a, b) => a + b.percent, 0));
      if (diff !== 0 && list.length > 0) {
        list.sort((a, b) => b.percent - a.percent);
        list[0].percent = Math.max(0, list[0].percent + diff);
      }
      return list;
    } catch {
      return [];
    }
  }, [resolvedBuilding, crumbs.buildingId, crumbs.floor, roomFilter, useMock, fromDate, toDate, data]);

  // For a single-day selection, compute per-day breakdown scaled to that day's occupancy %
  const roomDoctorSingleDay = React.useMemo(() => {
    try {
      const isSingleDay = fromDate && toDate && fromDate === toDate;
      if (!isSingleDay) return [];
      const schedules = loadSchedules() as Record<string, any>;
      const bId = (resolvedBuilding as any)?.id || crumbs.buildingId || '';
      const wantFloor = typeof crumbs.floor === 'number' ? Number(crumbs.floor) : null;
      const wantRoom = roomFilter ? String(roomFilter) : null;
      if (!bId || !wantRoom) return [];
      // Determine weekday label from fromDate (Mon..Sun)
      const d = new Date(fromDate!);
      const weekdayIdx = d.getDay(); // 0..6 (Sun..Sat)
      const dayMap = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const dayLabel = dayMap[weekdayIdx] || 'Monday';
      const nameToCount = new Map<string, number>();
      let total = 0;
      for (const sched of Object.values(schedules || {})) {
        const name = String((sched as any)?.doctorName || (sched as any)?.doctorId || 'Doctor');
        const list: any[] = ((sched as any)?.week?.[dayLabel]?.slots) || [];
        for (const s of list) {
          if (String(s.buildingId) !== String(bId)) continue;
          if (wantFloor !== null && Number(s.floor) !== wantFloor) continue;
          if (String(s.room) !== String(wantRoom)) continue;
          nameToCount.set(name, (nameToCount.get(name) || 0) + 1);
          total += 1;
        }
      }
      // Determine occupied percent for that day from table data (single room expected)
      let occPct = 0;
      const row = (data || []).find(r => String(r.room) === String(wantRoom));
      if (row) {
        const key = dayLabel.toLowerCase() as keyof typeof row;
        const v = (row as any)?.[key];
        if (typeof v === 'number') occPct = Math.max(0, Math.min(100, Math.round(v)));
      }
      if (total === 0) {
        if (!useMock || occPct <= 0) return [];
        // synthesize split of occPct across a few doctors
        const seeds = ['Dr. Patel', 'Dr. Rivera', 'Dr. Chen'];
        const base = (Number(wantRoom) || 101) + (wantFloor || 1) * 7 + weekdayIdx * 13;
        const vals = seeds.map((_, i) => (Math.abs(Math.sin(base + i * 7)) * 100) + 1);
        const sum = vals.length ? vals.reduce((a, b) => a + b, 0) : 1;
        return seeds.map((n, i) => ({ name: n, percent: Math.round((vals[i] / sum) * occPct) }));
      }
      const list = Array.from(nameToCount.entries()).map(([name, count]) => ({
        name,
        percent: Math.round((count / total) * occPct),
      }));
      // Optionally normalize to exactly occPct by adjusting the largest bucket
      const diff = occPct - list.reduce((a, b) => a + b.percent, 0);
      if (diff !== 0 && list.length > 0) {
        list.sort((a, b) => b.percent - a.percent);
        list[0].percent = Math.max(0, list[0].percent + diff);
      }
      return list;
    } catch {
      return [];
    }
  }, [fromDate, toDate, resolvedBuilding, crumbs.buildingId, crumbs.floor, roomFilter, data, useMock]);

  // Per-day breakdown for selected room: list doctors scheduled each weekday, scaled to that day's occupancy %
  const roomDayBreakdown = React.useMemo(() => {
    try {
      const schedules = loadSchedules() as Record<string, any>;
      const bId = (resolvedBuilding as any)?.id || crumbs.buildingId || '';
      const wantFloor = typeof crumbs.floor === 'number' ? Number(crumbs.floor) : null;
      const wantRoom = roomFilter ? String(roomFilter) : null;
      if (!wantRoom) return [];
      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
      const result: Array<{ day: string; items: Array<{ name: string; percent: number; department?: string }> }> = [];
      // lookup occ% per day from table for this room
      const row = (data || []).find(r => String(r.room) === String(wantRoom));
      const occForDay = (day: string) => {
        const key = String(day || '').toLowerCase();
        const v = row ? (row as any)?.[key] : 0;
        return typeof v === 'number' ? Math.max(0, Math.min(100, Math.round(v))) : 0;
      };
      for (const day of days) {
        const nameToCount = new Map<string, number>();
        const nameToDept = new Map<string, string>();
        let total = 0;
        for (const sched of Object.values(schedules || {})) {
          const name = String((sched as any)?.doctorName || (sched as any)?.doctorId || 'Doctor');
          const slots: any[] = ((sched as any)?.week?.[day]?.slots) || [];
          for (const s of slots) {
            if (bId && String(s.buildingId) !== String(bId)) continue;
            if (wantFloor !== null && Number(s.floor) !== wantFloor) continue;
            if (String(s.room) !== String(wantRoom)) continue;
            nameToCount.set(name, (nameToCount.get(name) || 0) + 1);
            if (!nameToDept.has(name)) {
              nameToDept.set(name, String((sched as any)?.doctorDepartment || ''));
            }
            total += 1;
          }
        }
        if (total > 0) {
          const dayOcc = occForDay(day);
          let items = Array.from(nameToCount.entries()).map(([name, count]) => ({
            name,
            department: nameToDept.get(name) || '',
            percent: Math.round((count / total) * dayOcc),
          }));
          // normalize rounding error to exactly dayOcc
          const sum = items.reduce((a, b) => a + b.percent, 0);
          const diff = dayOcc - sum;
          if (diff !== 0 && items.length > 0) {
            items.sort((a, b) => b.percent - a.percent);
            items[0].percent = Math.max(0, items[0].percent + diff);
          }
          result.push({ day, items });
        } else if (useMock) {
          const seeds = ['Dr. Patel', 'Dr. Rivera', 'Dr. Chen'];
          const base = (Number(wantRoom) || 101) + (wantFloor || 1) * 7 + days.indexOf(day) * 11;
          const vals = seeds.map((_, i) => (Math.abs(Math.cos(base + i * 5)) * 100) + 1);
          const sum = vals.reduce((a, b) => a + b, 0);
          const dayOcc = occForDay(day);
          const deptLookup = new Map<string, string>();
          for (const sched of Object.values(schedules || {})) {
            if ((sched as any)?.doctorName) {
              deptLookup.set(String((sched as any).doctorName), String((sched as any).doctorDepartment || ''));
            }
          }
          const items = seeds.map((n, i) => ({
            name: n,
            department: deptLookup.get(n) || (n === 'Dr. Patel' ? 'Cardiology' : n === 'Dr. Rivera' ? 'Gastroenterology' : n === 'Dr. Chen' ? 'Urology' : ''),
            percent: Math.max(0, Math.round((vals[i] / sum) * dayOcc))
          }));
          // normalize to dayOcc
          const s2 = items.reduce((a, b) => a + b.percent, 0);
          const d2 = dayOcc - s2;
          if (d2 !== 0 && items.length > 0) {
            items.sort((a, b) => b.percent - a.percent);
            items[0].percent = Math.max(0, items[0].percent + d2);
          }
          result.push({ day, items });
        }
      }
      return result;
    } catch {
      return [];
    }
  }, [resolvedBuilding, crumbs.buildingId, crumbs.floor, roomFilter, useMock, data]);

  // Scope-wide per-day breakdown (city/campus/building/floor/room) using schedules; scaled to displayed utilization
  const scopeDayBreakdown = React.useMemo(() => {
    try {
      // Determine allowed buildingIds for the current scope
      const allowed = new Set<string>();
      if (scope === 'city' && crumbs.city) {
        for (const b of (BUILDINGS as any[])) {
          if (String(b.city) === String(crumbs.city)) allowed.add(String(b.id));
        }
      } else if (scope === 'campus' && crumbs.campus) {
        for (const b of (BUILDINGS as any[])) {
          if (String(b.campus) === String(crumbs.campus)) allowed.add(String(b.id));
        }
      } else if ((resolvedBuilding as any)?.id || crumbs.buildingId) {
        const id = (resolvedBuilding as any)?.id || crumbs.buildingId;
        if (id) allowed.add(String(id));
      }
      if (allowed.size === 0) {
        for (const b of (BUILDINGS as any[])) allowed.add(String((b as any).id));
      }
      const wantFloor = (scope === 'floor' && typeof crumbs.floor === 'number') ? Number(crumbs.floor) : null;
      const wantRoom = roomFilter ? String(roomFilter) : null;
      const schedules = loadSchedules() as Record<string, any>;
      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
      const result: Array<{ day: string; items: Array<{ name: string; percent: number; department?: string }> }> = [];
      const occForDay = (day: string) => {
        const key = day.toLowerCase() as keyof UtilRow;
        // Prefer the exact row that the user is looking at in the main table for this scope
        if (scope === 'floor' && !wantRoom && typeof crumbs.floor === 'number' && selectedFloorSummaryRow) {
          const v = Number((selectedFloorSummaryRow as any)?.[key] || 0);
          return Math.max(0, Math.min(100, Math.round(v)));
        }
        if (scope === 'building' && (floorDailyTable?.length || 0) > 0) {
          const vals = floorDailyTable.map((r) => Number((r as any)?.[key] || 0));
          const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
          return Math.max(0, Math.min(100, Math.round(avg)));
        }
        if (scope === 'campus' && (campusDailyTable?.length || 0) > 0) {
          const vals = campusDailyTable.map((r) => Number((r as any)?.[key] || 0));
          const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
          return Math.max(0, Math.min(100, Math.round(avg)));
        }
        if (scope === 'city' && (cityCampusTable?.length || 0) > 0) {
          const vals = cityCampusTable.map((r) => Number((r as any)?.[key] || 0));
          const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
          return Math.max(0, Math.min(100, Math.round(avg)));
        }
        // Fallback: average of the current dataset rows
        const vals = (data || []).map((r) => Number((r as any)?.[key] || 0)).filter((v) => Number.isFinite(v));
        const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
        return Math.max(0, Math.min(100, Math.round(avg)));
      };
      for (const day of days) {
        const nameToCount = new Map<string, number>();
        const nameToDept = new Map<string, string>();
        let total = 0;
        for (const sched of Object.values(schedules || {})) {
          const name = String((sched as any)?.doctorName || (sched as any)?.doctorId || 'Doctor');
          const dept = String((sched as any)?.doctorDepartment || '');
          const slots: any[] = ((sched as any)?.week?.[day]?.slots) || [];
          for (const s of slots) {
            if (!allowed.has(String(s.buildingId))) continue;
            if (wantFloor !== null && Number(s.floor) !== wantFloor) continue;
            if (wantRoom && String(s.room) !== String(wantRoom)) continue;
            nameToCount.set(name, (nameToCount.get(name) || 0) + 1);
            if (!nameToDept.has(name)) nameToDept.set(name, dept);
            total += 1;
          }
        }
        if (total > 0) {
          const dayOcc = occForDay(day);
          let items = Array.from(nameToCount.entries()).map(([name, count]) => ({
            name,
            department: nameToDept.get(name) || '',
            percent: Math.round(((count / total) * dayOcc)),
          }));
          const sum = items.reduce((a, b) => a + b.percent, 0);
          const diff = dayOcc - sum;
          if (diff !== 0 && items.length > 0) {
            items.sort((a, b) => b.percent - a.percent);
            items[0].percent = Math.max(0, items[0].percent + diff);
          }
          result.push({ day, items });
        } else if (useMock) {
          const seeds = ['Dr. Patel', 'Dr. Rivera', 'Dr. Chen'];
          const deptByName: Record<string, string> = { 'Dr. Patel': 'Cardiology', 'Dr. Rivera': 'Gastroenterology', 'Dr. Chen': 'Urology' };
          const base = (typeof crumbs.floor === 'number' ? crumbs.floor : 0) * 17 + days.indexOf(day) * 11;
          const vals = seeds.map((_, i) => (Math.abs(Math.cos(base + i * 7)) * 100) + 1);
          const sum = vals.reduce((a, b) => a + b, 0);
          const dayOcc = occForDay(day);
          let items = seeds.map((n, i) => ({
            name: n,
            department: deptByName[n] || '',
            percent: Math.max(0, Math.round(((vals[i] / sum) * dayOcc))),
          }));
          const s2 = items.reduce((a, b) => a + b.percent, 0);
          const d2 = dayOcc - s2;
          if (d2 !== 0 && items.length > 0) {
            items.sort((a, b) => b.percent - a.percent);
            items[0].percent = Math.max(0, items[0].percent + d2);
          }
          result.push({ day, items });
        } else {
          result.push({ day, items: [] });
        }
      }
      return result;
    } catch {
      return [];
    }
  }, [scope, crumbs.city, crumbs.campus, resolvedBuilding, crumbs.buildingId, crumbs.floor, roomFilter, data, useMock, selectedFloorSummaryRow, floorDailyTable, campusDailyTable, cityCampusTable]);

  // All departments for pivot table headers (show even if empty in current selection)
  const allDeptList = React.useMemo(() => {
    try {
      const schedules = loadSchedules() as Record<string, any>;
      const fromSchedules = new Set<string>();
      for (const sched of Object.values(schedules || {})) {
        const dep = String((sched as any)?.doctorDepartment || '').trim();
        if (dep) fromSchedules.add(dep);
      }
      const baseFallback = ['Cardiology', 'Gastroenterology', 'Urology', 'Primary Care', 'Neurology', 'Orthopedics', 'Oncology', 'Pediatrics', 'Dermatology'];
      const merged = new Set<string>([...baseFallback, ...fromSchedules]);
      // Ensure 'Other' column exists last
      const arr = Array.from(merged).filter(Boolean).sort((a, b) => a.localeCompare(b));
      if (!arr.includes('Other')) arr.push('Other');
      return arr;
    } catch {
      return ['Cardiology', 'Gastroenterology', 'Urology', 'Primary Care', 'Neurology', 'Orthopedics', 'Oncology', 'Pediatrics', 'Dermatology', 'Other'];
    }
  }, [scopeDayBreakdown]);

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center text-red-500 py-10">{error}</div>;
const UtilizationCell = ({ value }: { value: number }) => {
  const getColor = (val: number) => {
    if (val >= 80) return { bg: '#FEE2E2', bar: '#EF4444', text: '#991B1B' }; // Red for high
    if (val >= 60) return { bg: '#FEF3C7', bar: '#F59E0B', text: '#92400E' }; // Yellow for medium
    if (val >= 40) return { bg: '#DBEAFE', bar: '#3B82F6', text: '#1E40AF' }; // Blue for moderate
    return { bg: '#DCFCE7', bar: '#22C55E', text: '#065F46' }; // Green for low
  };

  const colors = getColor(value);
  
// Compact Utilization Cell Component



  return (
    <td className="border p-3 align-middle">
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[60px]">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${value}%`,
              backgroundColor: colors.bar
            }}
          />
        </div>
        <span 
          className="text-sm font-semibold min-w-12 px-2 py-1 rounded-full border"
          style={{ 
            backgroundColor: colors.bg,
            color: colors.text,
            borderColor: colors.bar
          }}
        >
          {value}%
        </span>
      </div>
    </td>
  );
};
  return (
    <div className="p-4 m-4 bg-white rounded-2xl shadow">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
         <div className="text-center mb-6 mr-36" >
  <h1 className="text-3xl font-bold text-slate-800 mb-2">Room Utilization Report</h1>
  <p className="text-slate-600">Weekly occupancy analysis and scheduling insights</p>
</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"  />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                 className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"  />
            </div>
            <button
              type="button"
              onClick={() => {
                setRange({ from: fromDate, to: toDate });
                // Update hash to persist/allow deep link back to this range
                const base = '#/room-allocation';
                const params = new URLSearchParams();
                if (roomFilter) params.set('room', roomFilter);
                if (crumbs.city) params.set('city', String(crumbs.city));
                if (crumbs.campus) params.set('campus', String(crumbs.campus));
                if (crumbs.buildingId) params.set('buildingId', String(crumbs.buildingId));
                if (crumbs.buildingName) params.set('buildingName', String(crumbs.buildingName));
                if (typeof crumbs.floor === 'number') params.set('floor', String(crumbs.floor));
                if (fromDate) params.set('from', fromDate);
                if (toDate) params.set('to', toDate);
                window.history.replaceState(null, '', `${base}?${params.toString()}`);
              }}
              className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-500" >
              Apply
            </button>
          </div>
        </div>
        {/* Breadcrumbs from dashboard selection (clickable to change scope) */}
        <div className="mb-3 flex items-center justify-center text-sm gap-1">
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${scope === 'city' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:border-rose-300'}`}
            onClick={() => {
              setScope('city');
              setRoomFilter(null);
              setDrillFloor(null);
              setCrumbs((c) => ({ ...c, campus: undefined, buildingId: undefined, buildingName: undefined, floor: undefined }));
              try {
                const base = '#/room-allocation';
                const params = new URLSearchParams();
                if (crumbs.city) params.set('city', String(crumbs.city));
                if (fromDate) params.set('from', fromDate);
                if (toDate) params.set('to', toDate);
                window.history.replaceState(null, '', `${base}?${params.toString()}`);
              } catch { /* ignore */ }
            }}
            disabled={!crumbs.city}
            title={crumbs.city ? 'View city scope' : 'No city context'}
          >
            City
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${scope === 'city' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:border-rose-300'}`}
            onClick={() => {
              setScope('city');
              setRoomFilter(null);
              setDrillFloor(null);
              setCrumbs((c) => ({ ...c, campus: undefined, buildingId: undefined, buildingName: undefined, floor: undefined }));
              try {
                const base = '#/room-allocation';
                const params = new URLSearchParams();
                if (crumbs.city) params.set('city', String(crumbs.city));
                if (fromDate) params.set('from', fromDate);
                if (toDate) params.set('to', toDate);
                window.history.replaceState(null, '', `${base}?${params.toString()}`);
              } catch { /* ignore */ }
            }}
            disabled={!crumbs.city}
            title={crumbs.city || '—'}
          >
            {crumbs.city || '—'}
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${scope === 'campus' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:border-rose-300'}`}
            onClick={() => {
              setScope('campus');
              setRoomFilter(null);
              setDrillFloor(null);
              setCrumbs((c) => ({ ...c, buildingId: undefined, buildingName: undefined, floor: undefined }));
              try {
                const base = '#/room-allocation';
                const params = new URLSearchParams();
                if (crumbs.campus) params.set('campus', String(crumbs.campus));
                if (fromDate) params.set('from', fromDate);
                if (toDate) params.set('to', toDate);
                window.history.replaceState(null, '', `${base}?${params.toString()}`);
              } catch { /* ignore */ }
            }}
            disabled={!crumbs.campus}
            title={crumbs.campus || '—'}
          >
            {crumbs.campus || '—'}
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${scope === 'building' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:border-rose-300'}`}
            onClick={() => {
              setScope('building');
              setRoomFilter(null);
              setDrillFloor(null);
              // Ensure crumbs has a valid buildingId and clear floor selection
              setCrumbs((c) => {
                const id = (resolvedBuilding as any)?.id || c.buildingId;
                return { ...c, buildingId: id, floor: undefined };
              });
              // Reflect selection in URL to stabilize state restoration
              try {
                const base = '#/room-allocation';
                const params = new URLSearchParams();
                if ((resolvedBuilding as any)?.id) params.set('buildingId', String((resolvedBuilding as any).id));
                if (crumbs.buildingName) params.set('buildingName', String(crumbs.buildingName));
                if (fromDate) params.set('from', fromDate);
                if (toDate) params.set('to', toDate);
                window.history.replaceState(null, '', `${base}?${params.toString()}`);
              } catch { /* ignore */ }
            }}
            disabled={!(resolvedBuilding || crumbs.buildingName)}
            title={crumbs.buildingName || '—'}
          >
            {crumbs.buildingName || '—'}
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${scope === 'floor' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:border-rose-300'}`}
            onClick={() => {
              setScope('floor');
              // ensure a floor is selected; prefer existing, else infer from room, else default to 1
              setCrumbs((c) => {
                let nextFloor = c.floor;
                if (typeof nextFloor !== 'number') {
                  const inferred = roomFilter ? Math.floor((parseInt(roomFilter, 10) || 0) / 100) : NaN;
                  if (!Number.isNaN(inferred) && inferred > 0) nextFloor = inferred;
                  else if (buildingMeta?.floors && buildingMeta.floors > 0) nextFloor = 1;
                }
                return { ...c, floor: nextFloor };
              });
            }}
            disabled={!(buildingMeta?.floors && buildingMeta.floors > 0)}
            title={
              (buildingMeta?.floors && (scope === 'building' || crumbs.floor === undefined || crumbs.floor === null))
                ? `Floors 1–${buildingMeta.floors}`
                : (typeof crumbs.floor === 'number' ? `Floor ${crumbs.floor}` : 'Floor —')
            }
          >
            {(buildingMeta?.floors && (scope === 'building' || crumbs.floor === undefined || crumbs.floor === null))
              ? `Floors 1–${buildingMeta.floors}`
              : (typeof crumbs.floor === 'number' ? `Floor ${crumbs.floor}` : 'Floor —')}
          </button>
        </div>
        {/* Omit duplicate selection summary and department list to save space */}
        
        
        {/* Campus building selector (dropdown) */}
        {(crumbs.campus && campusBuildings.length > 0 && (scope === 'campus' || (!resolvedBuilding && (crumbs.floor === undefined || crumbs.floor === null)))) ? (
          <div className="mb-3 flex items-center justify-center gap-2">
            <label className="text-sm text-slate-600">Building</label>
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm"
              value={String(crumbs.buildingId || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setScope('campus');
                  setCrumbs((c) => ({ ...c, buildingId: undefined, buildingName: undefined, floor: undefined }));
                  setRoomFilter(null);
                  setDrillFloor(null);
                } else {
                  const b = (campusBuildings as any[]).find(x => String((x as any).id) === String(val));
                  setScope('building');
                  setCrumbs((c) => ({ ...c, buildingId: String(val), buildingName: String((b as any)?.name || ''), floor: undefined }));
                  setRoomFilter(null);
                  setDrillFloor(null);
                }
              }}
            >
              <option value="">All Buildings</option>
              {(campusBuildings as any[]).map((b) => (
                <option key={(b as any).id} value={(b as any).id}>{String((b as any).name)}</option>
              ))}
            </select>
          </div>
        ) : null}
        {/* Floor selector (dropdown) + Room selector inline when on a floor */}
        {(floorsCount) ? (
          <div className="mb-3 flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Floor</label>
              <select
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm"
                value={typeof crumbs.floor === 'number' ? String(crumbs.floor) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setScope('building');
                    setCrumbs((c) => ({ ...c, floor: undefined }));
                    setRoomFilter(null);
                    setDrillFloor(null);
                  } else {
                    const f = Number(val);
                    setScope('floor');
                    setCrumbs((c) => ({ ...c, floor: f }));
                    setRoomFilter(null);
                    setDrillFloor(null);
                  }
                }}
              >
                <option value="">All Floors</option>
                {Array.from({ length: floorsCount }).map((_, idx) => {
                  const f = idx + 1;
                  return <option key={f} value={String(f)}>Floor {f}</option>;
                })}
              </select>
            </div>
            {scope === 'floor' && resolvedBuilding && typeof crumbs.floor === 'number' ? (
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Room</label>
                <select
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm"
                  value={roomFilter || ''}
                  onChange={(e) => setRoomFilter(e.target.value || null)}
                >
                  <option value="">All Rooms</option>
                  {((() => {
                    let list: Array<string | number> = [];
                    try {
                      list = listRoomsForBuilding((resolvedBuilding as any).id, crumbs.floor) || [];
                    } catch { list = []; }
                    if (!list || (list as any[]).length === 0) list = syntheticRoomsForFloor(crumbs.floor);
                    return list.slice(0, 30);
                  })()).map((r: any) => (
                    <option key={String(r)} value={String(r)}>Room {String(r)}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : null}
        
        {/* City campus selector (dropdown) */}
        {(crumbs.city && cityCampuses.length > 0 && scope === 'city') ? (
          <div className="mb-3 flex items-center justify-center gap-2">
            <label className="text-sm text-slate-600">Campus</label>
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm"
              value={String(crumbs.campus || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setScope('city');
                  setCrumbs((c) => ({ ...c, campus: undefined, buildingId: undefined, buildingName: undefined, floor: undefined }));
                } else {
                  setScope('campus');
                  setCrumbs((c) => ({ ...c, campus: val, buildingId: undefined, buildingName: undefined, floor: undefined }));
                }
                setRoomFilter(null);
                setDrillFloor(null);
              }}
            >
              <option value="">All Campuses</option>
              {cityCampuses.map((camp) => (
                <option key={camp} value={camp}>{camp}</option>
              ))}
            </select>
          </div>
        ) : null}
        {/* Room selector moved inline with Floor selector above */}
      </div>
      {/* Date range moved to header */}
      <div>
        {/* Table Section */}
        {(crumbs.city && cityCampusTable.length > 0 && scope === 'city') ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border border-gray-400 text-sm text-center">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
              </colgroup>
       <thead className="bg-slate-50 border-b-2 border-slate-300">
  <tr>
    <th className="border border-slate-200 p-3 font-semibold text-slate-800">ROOMS</th>
    <th className="border border-slate-200 p-3 font-semibold text-slate-800">MONTH</th>
    <th className="border border-slate-200 p-3 font-semibold text-slate-800" colSpan={5}>
      UTILIZATION PERCENTAGE
    </th>
  </tr>
  <tr className="bg-white text-slate-800 font-semibold">
    <th colSpan={2} className="border border-slate-200 p-3 bg-white"></th>
    <th className="border border-slate-200 p-3 bg-white">MONDAY</th>
    <th className="border border-slate-200 p-3 bg-white">TUESDAY</th>
    <th className="border border-slate-200 p-3 bg-white">WEDNESDAY</th>
    <th className="border border-slate-200 p-3 bg-white">THURSDAYtfdhd</th>
    <th className="border border-slate-200 p-3 bg-white">FRIDAY</th>
  </tr>
</thead>
              <tbody>
                {cityCampusTable.map((row) => (
                  <tr
                    key={`${row.room}-${row.month}`}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      try {
                        const campus = String(row.room);
                        setScope('campus');
                        setCrumbs((c) => ({ ...c, campus, buildingId: undefined, buildingName: undefined, floor: undefined }));
                        setRoomFilter(null);
                        setDrillFloor(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } catch { /* noop */ }
                    }}
                  >
                    <td className="border p-2 font-semibold">{row.room}</td>
                    <td className="border p-2 font-semibold">{row.month}</td>
                    {DAYS.map((day) => (
                       <UtilizationCell key={day} value={row[day] as number} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : (crumbs.campus && campusDailyTable.length > 0 && (scope === 'campus' || (!resolvedBuilding && (crumbs.floor === undefined || crumbs.floor === null)))) ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border border-gray-400 text-sm text-center">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
              </colgroup>
         <thead className="bg-teal-50 border-b-2 border-teal-200">
<tr className="bg-white text-slate-800 font-semibold border-b border-slate-200">
                      <th className="border border-gray-400 p-2">BUILDING</th>
                  <th className="border border-gray-400 p-2">MONTH</th>
                  <th className="border border-gray-400 p-2" colSpan={5}>
                    UTILIZATION PERCENTAGE
                  </th>
                </tr>
                <tr className="bg-slate-700 text-white font-semibold border">
                  <th colSpan={2}></th>
                  <th className="border p-2">MONDAY</th>
                  <th className="border p-2">TUESDAY</th>
                  <th className="border p-2">WEDNESDAY</th>
                  <th className="border p-2">THURSDAY</th>
                  <th className="border p-2">FRIDAY</th>
                </tr>
              </thead>
              <tbody>
                {campusDailyTable.map((row) => (
                  <tr
                    key={`${row.room}-${row.month}`}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      try {
                        const b = (campusBuildings as any[]).find(x => String(x.name) === String(row.room));
                        if (b) {
                          setScope('building');
                          setCrumbs((c) => ({ ...c, buildingId: (b as any).id, buildingName: (b as any).name, floor: undefined }));
                          setRoomFilter(null);
                          setDrillFloor(null);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      } catch { /* noop */ }
                    }}
                  >
                    <td className="border p-2 font-semibold">{row.room}</td>
                    <td className="border p-2 font-semibold">{row.month}</td>
                    {DAYS.map((day) => (
                      <UtilizationCell key={day} value={row[day] as number} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {(floorsCount && (!roomFilter) && (scope === 'building' || crumbs.floor === undefined || crumbs.floor === null)) && floorDailyTable.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border border-gray-400 text-sm text-center">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
              </colgroup>
         <thead className="bg-teal-50 border-b-2 border-teal-200">
<tr className="bg-white text-slate-800 font-semibold border-b border-slate-200">
                  <th className="border border-gray-400 p-2">FLOOR</th>
                  <th className="border border-gray-400 p-2">MONTH</th>
                  <th className="border border-gray-400 p-2" colSpan={5}>
                    UTILIZATION PERCENTAGE
                  </th>
                </tr>
                <tr className="bg-slate-700 text-white font-semibold border">
                  <th colSpan={2}></th>
                  <th className="border p-2">MONDAY</th>
                  <th className="border p-2">TUESDAY</th>
                  <th className="border p-2">WEDNESDAY</th>
                  <th className="border p-2">THURSDAY</th>
                  <th className="border p-2">FRIDAY</th>
                </tr>
              </thead>
              <tbody>
                {floorDailyTable.map((row) => (
                  <tr
                    key={`${row.room}-${row.month}`}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      try {
                        const m = String(row.room || '').match(/(\d+)/);
                        const f = m ? Number(m[1]) : NaN;
                        if (!Number.isNaN(f)) {
                          setScope('floor');
                          setCrumbs((c) => ({ ...c, floor: f }));
                          setRoomFilter(null);
                          setDrillFloor(null);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      } catch { /* noop */ }
                    }}
                  >
                    <td className="border p-2 font-semibold">{row.room}</td>
                    <td className="border p-2 font-semibold">{row.month}</td>
                    {DAYS.map((day) => (
                       <UtilizationCell key={day} value={row[day] as number} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (scope === 'floor' && !roomFilter && selectedFloorSummaryRow) ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border border-gray-400 text-sm text-center">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
                <col className="w-[12.8%]" />
              </colgroup>
       <thead className="bg-teal-50 border-b-2 border-teal-200">
<tr className="bg-white text-slate-800 font-semibold border-b border-slate-200">
                  <th className="border border-gray-400 p-2">FLOOR</th>
                  <th className="border border-gray-400 p-2">MONTH</th>
                  <th className="border border-gray-400 p-2" colSpan={5}>
                    UTILIZATION PERCENTAGE
                  </th>
                </tr>
                <tr className="bg-slate-700 text-white font-semibold border">
                  <th colSpan={2}></th>
                  <th className="border p-2">MONDAY</th>
                  <th className="border p-2">TUESDAY</th>
                  <th className="border p-2">WEDNESDAY</th>
                  <th className="border p-2">THURSDAYvds </th>
                  <th className="border p-2">FRIDAY</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-50">
                  <td className="border p-2 font-semibold">{selectedFloorSummaryRow.room}</td>
                  <td className="border p-2 font-semibold">{selectedFloorSummaryRow.month}</td>
                  {DAYS.map((day) => (
                     <UtilizationCell key={`only-${day}`} value={selectedFloorSummaryRow[day] as number} />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : ((scope === 'floor' || scope === 'building') ? (


       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
  {data.map((row) => {
    const weeklyData = DAYS.map(day => row[day] as number);
    const avgUtilization = Math.round(weeklyData.reduce((a, b) => a + b) / weeklyData.length);
    const maxUtilization = Math.max(...weeklyData);

    return (
      <div key={row.room} className="text-center p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
        {/* Radial Progress */}
        <div className="relative w-16 h-16 mx-auto mb-3">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e6e6e6"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={avgUtilization > 80 ? "#ef4444" : avgUtilization > 60 ? "#f59e0b" : "#10b981"}
              strokeWidth="3"
              strokeDasharray={`${avgUtilization}, 100`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {avgUtilization}%
          </div>
        </div>
        
        <div className="font-semibold text-gray-800 mb-1">Room {row.room}</div>
        <div className="text-xs text-gray-500 mb-2">{row.month}</div>
        
        {/* Peak indicator */}
        <div className="text-xs text-orange-600 font-medium">
          Peak: {maxUtilization}%
        </div>
      </div>
    );
  })}
</div>

        ) : null)}

   {scopeDayBreakdown.length > 0 && (
  <div className="mt-6">
    <div className="text-sm font-semibold text-slate-900 mb-3 text-center">
      Provider Occupancy Schedule & Summary
    </div>

    {/* Scheduled Providers Section */}
  {/* Scheduled Providers Section - Now Shows ALL Departments */}
<div className="mb-6">
  <h3 className="text-sm font-medium text-slate-700 mb-3">Department Utilization</h3>
  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-3 py-2 text-left font-semibold text-slate-700">Department</th>
          <th className="px-3 py-2 text-left font-semibold text-slate-700">Provider</th>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
            <th key={`head-${day}`} className="px-3 py-2 text-center font-semibold text-slate-700">
              {day}
            </th>
          ))}
          <th className="px-3 py-2 text-center font-semibold text-slate-700 border-l border-slate-200">
            Avg. Occupancy
          </th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700 border-l border-slate-200">
            Capacity
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {allDeptList.map((dept) => {
          // Group providers by name for this department - INCLUDES DEPARTMENTS WITH NO SCHEDULES
          const providersMap = new Map();
          
          ['Monday','Tuesday','Wednesday','Thursday','Friday'].forEach((day) => {
            const dayRow = scopeDayBreakdown.find(r => r.day === day);
            const items = (dayRow?.items || [])
              .filter((it: any) => (String(it.department || '').trim() || 'Other') === dept);
            
            items.forEach(item => {
              if (!providersMap.has(item.name)) {
                providersMap.set(item.name, {
                  name: item.name,
                  days: {},
                  totalPercent: 0,
                  dayCount: 0
                });
              }
              const provider = providersMap.get(item.name);
              provider.days[day] = item.percent;
              provider.totalPercent += item.percent;
              provider.dayCount++;
            });
          });

          const providers = Array.from(providersMap.values());

          // If no providers found for this department, create a "No Schedule" entry
          if (providers.length === 0) {
            return (
              <tr key={`${dept}-no-schedule`} className="hover:bg-slate-50 bg-slate-50/30">
                <td className="px-3 py-2 text-slate-600">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {dept}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500 italic">
                  No scheduled providers
                </td>
                {['Monday','Tuesday','Wednesday','Thursday','Friday'].map((day) => (
                  <td key={`${dept}-${day}`} className="px-3 py-2 text-center">
                    <span className="text-slate-300">0%</span>
                  </td>
                ))}
                <td className="px-3 py-2 text-center border-l border-slate-200">
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-400">
                    0%
                  </span>
                </td>
                <td className="px-3 py-2 text-center border-l border-slate-200">
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold border bg-slate-100 text-slate-400 border-slate-200">
                    Zero
                  </span>
                </td>
              </tr>
            );
          }

          // Render providers for departments that have schedules
          return providers.map((provider) => {
            const weeklyAvg = provider.dayCount > 0 ? 
              Number((provider.totalPercent / provider.dayCount).toFixed(1)) : 0;
            
            // Determine status based on weekly average
            let status = "Low";
            let statusColor = "bg-green-100 text-green-800 border-green-200";
            if (weeklyAvg >= 15) {
              status = "High";
              statusColor = "bg-red-100 text-red-800 border-red-200";
            } else if (weeklyAvg >= 10) {
              status = "Medium";
              statusColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
            }

            return (
              <tr key={`${dept}-${provider.name}`} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-800">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    {dept}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-800 font-medium">
                  <button 
                    type="button" 
                    onClick={() => openDoctorPopup(provider.name)}
                    className="text-blue-600 hover:underline hover:text-blue-800"
                  >
                    {provider.name}
                  </button>
                </td>
                {['Monday','Tuesday','Wednesday','Thursday','Friday'].map((day) => (
                  <td key={`${dept}-${provider.name}-${day}`} className="px-3 py-2 text-center">
                    {provider.days[day] ? (
                      <span className={`
                        inline-flex items-center justify-center w-10 h-6 rounded text-xs font-medium
                        ${provider.days[day] >= 15 ? 'bg-red-100 text-red-700' : 
                          provider.days[day] >= 10 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-green-100 text-green-700'
                        }
                      `}>
                        {provider.days[day]}%
                      </span>
                    ) : (
                      <span className="text-slate-300">0%</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-center border-l border-slate-200">
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
                    {weeklyAvg}%
                  </span>
                </td>
                <td className="px-3 py-2 text-center border-l border-slate-200">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold border ${statusColor}`}>
                    {status}
                  </span>
                </td>
              </tr>
            );
          });
        })}
      </tbody>
    </table>
  </div>
</div>
  </div>
)}

        {/* Doctor schedules popup */}
        {doctorPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setDoctorPopup(null)}></div>
            <div className="relative z-10 w-[96vw] max-w-4xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl overflow-auto">
              <button
                onClick={() => setDoctorPopup(null)}
                aria-label="Close"
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setDoctorPopup(null)}
                    aria-label="Back"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <div>
                    <div className="text-slate-900 text-lg font-semibold">{doctorPopup.name}</div>
                    <div className="text-slate-600 text-sm">{doctorPopup.department ? `${doctorPopup.department} • ` : ''}All schedules (Mon–Fri)</div>
                  </div>
                </div>
              </div>
              {doctorPopup.slots.length > 0 ? (
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
                      {doctorPopup.slots.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-800">{s.day}</td>
                          <td className="px-3 py-2 text-slate-800">{s.buildingName}</td>
                          <td className="px-3 py-2 text-slate-800">Floor {s.floor}</td>
                          <td className="px-3 py-2 text-slate-800">{s.room || '-'}</td>
                          <td className="px-3 py-2 text-slate-600">{s.start}</td>
                          <td className="px-3 py-2 text-slate-600">{s.end}</td>
                          <td className="px-3 py-2 text-right">
                            <a
                              href={`#/doctor-schedule?doctorId=${encodeURIComponent(doctorPopup.id || '')}`}
                              onClick={(e) => {
                                e.preventDefault();
                                const params = new URLSearchParams();
                                params.set('doctorId', String(doctorPopup.id || ''));
                                params.set('edit', '1');
                                params.set('doctorName', String(doctorPopup.name || ''));
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
                  href={`#/doctor-schedule?doctorId=${encodeURIComponent(doctorPopup.id || '')}&new=1`}
                  onClick={(e) => {
                    e.preventDefault();
                    const params = new URLSearchParams();
                    params.set('doctorId', String(doctorPopup.id || doctorPopup.name.toLowerCase().replace(/\s+/g, '-')));
                    params.set('doctorName', String(doctorPopup.name || ''));
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
        )}

        

        {/* Chart Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
  {/* <div className="text-center mb-6">
    <h3 className="text-xl font-semibold text-slate-800 mb-2">Daily Utilization</h3>
    <p className="text-slate-600">Week of November 24, 2025</p>
  </div> */}
  
 
    <div className="text-center mb-6">
  <h3 className="text-xl font-semibold text-slate-800 mb-2">Daily Utilization</h3>
  <p className="text-slate-600">Week of November 24, 2025</p>
  <p className="text-sm text-slate-500 mt-1">By Department</p> {/* ← Clear context */}
</div>

 <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <XAxis dataKey="name" /> {/* ← Shows department names on X-axis */}
  <YAxis label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }} />
  <Tooltip />
  <Legend />
      <Bar dataKey="monday" fill="#3b82f6" name="Monday" />
      <Bar dataKey="tuesday" fill="#ef4444" name="Tuesday" />
      <Bar dataKey="wednesday" fill="#10b981" name="Wednesday" />
      <Bar dataKey="thursday" fill="#f59e0b" name="Thursday" />
      <Bar dataKey="friday" fill="#8b5cf6" name="Friday" />
    </BarChart>
  </ResponsiveContainer>
</div>


        {/* City-scope campus utilization chart */}
        {(crumbs.city && cityCampusSeries.length > 0 && scope === 'city') && (
          <div className="mt-10">
            <h3 className="text-xl font-semibold mb-4 text-center">Utilization by Campus</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cityCampusSeries} onClick={(e: any) => {
                try {
                  const name = e?.activeLabel || e?.activePayload?.[0]?.payload?.campus;
                  if (!name) return;
                  setScope('campus');
                  setCrumbs((c) => ({ ...c, campus: String(name), buildingId: undefined, buildingName: undefined, floor: undefined }));
                  setRoomFilter(null);
                  setDrillFloor(null);
                } catch { /* noop */ }
              }}>
                <XAxis dataKey="campus" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="util" fill="#22c55e" name="Avg Utilization (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Campus-scope building utilization chart */}
        {(crumbs.campus && campusSeries.length > 0 && (scope === 'campus' || (!resolvedBuilding && (crumbs.floor === undefined || crumbs.floor === null)))) && (
          <div className="mt-10">
            <h3 className="text-xl font-semibold mb-4 text-center">Utilization by Building</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={campusSeries} onClick={(e: any) => {
                try {
                  const name = e?.activeLabel || e?.activePayload?.[0]?.payload?.name;
                  if (!name) return;
                  const b = (campusBuildings as any[]).find(x => String(x.name) === String(name));
                  if (b) {
                    setScope('building');
                    setCrumbs((c) => ({ ...c, buildingId: (b as any).id, buildingName: (b as any).name, floor: undefined }));
                    setRoomFilter(null);
                    setDrillFloor(null);
                  }
                } catch { /* noop */ }
              }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="util" fill="#0ea5e9" name="Avg Utilization (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Building-scope floor utilization chart + drilldown room options */}
        {scope === 'building' && floorSeries.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xl font-semibold mb-4 text-center">Utilization by Floor</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={floorSeries} onClick={(e: any) => {
                try {
                  const f = Number(e?.activeLabel?.replace('Floor ', '') || e?.activePayload?.[0]?.payload?.floor);
                  if (f) setDrillFloor(f);
                } catch { /* noop */ }
              }}>
                <XAxis dataKey="floorLabel" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="util" fill="#6366f1" name="Avg Utilization (%)" />
              </BarChart>
            </ResponsiveContainer>
            {drillFloor ? (
              <div className="mt-4">
                <div className="mb-2 text-center text-sm text-slate-700">Select a room on {crumbs.buildingName || 'Building'} — Floor {drillFloor}</div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {(listRoomsForBuilding(((resolvedBuilding as any)?.id) || '', drillFloor) || []).slice(0, 6).map((r) => (
                    <button
                      key={String(r)}
                      type="button"
                      onClick={() => {
                        setScope('floor');
                        setCrumbs((c) => ({ ...c, floor: drillFloor || c.floor }));
                        setRoomFilter(String(r));
                      }}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
                    >
                      Room {String(r)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex justify-end mt-6 gap-2">
          <button type="button" onClick={handlePrint} className="px-3 py-2 border rounded hover:bg-gray-50">
            Export PDF
          </button>
          <button type="button" onClick={handleExportCSV} className="px-3 py-2 border rounded hover:bg-gray-50">
            Export CSV
          </button>
          <button type="button" onClick={handleExportExcel} className="px-3 py-2 border rounded hover:bg-gray-50">
            Export Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomAllocationReport;


