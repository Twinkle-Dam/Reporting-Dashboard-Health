import React, { useCallback, useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BUILDINGS, listRoomsForBuilding as listRoomsForBuildingBase } from '../data/buildings';
import { MOCK_DOCTOR_DEPARTMENTS, MOCK_DOCTOR_NAMES } from '../data/mockData';
import { API_BASE, UTILIZATION_ENDPOINT } from '../api/config';
import { fetchRoomsByLocation } from '../api/rooms';
import { loadSchedules, upsertDoctorSchedule } from '../modules/scheduling/scheduleStore';
import ProviderOccupancySection from '../components/room-allocation/ProviderOccupancySection';
import DoctorSlotsPopup, { DoctorPopupData } from '../components/room-allocation/DoctorSlotsPopup';
import UtilizationSummaryCards from '../components/room-allocation/UtilizationSummaryCards';
import UtilizationCharts from '../components/room-allocation/UtilizationCharts';
import {
  DAYS,
  formatDate,
  generateWeekData,
  getInlineColors,
  startOfWeekMonday,
  type UtilRow,
} from '../components/room-allocation/roomAllocationUtils';

function getUtilizationClass(value: number): string {
  if (value >= 80) return 'bg-green-100 text-green-800';
  if (value >= 60) return 'bg-pink-100 text-pink-800';
  return 'bg-red-100 text-red-800';
}

function useDoctorPopup(
  crumbs: { buildingId?: string },
  resolvedBuilding: any,
  setDoctorPopup: React.Dispatch<React.SetStateAction<DoctorPopupData | null>>,
): {
  openDoctorPopup: (doctorName: string) => void;
  closeDoctorPopup: () => void;
} {
  const openDoctorPopup = React.useCallback(
    (doctorName: string) => {
      try {
        const all = loadSchedules() as Record<string, any>;
        // try find by exact name; else try normalized name
        const normalize = (s?: string) =>
          String(s || '')
            .toLowerCase()
            .replace(/\./g, '')
            .replace(/\s+/g, '');
        let match = Object.values(all || {}).find(
          (s: any) => (s as any)?.doctorName === doctorName,
        ) as any;
        if (!match) {
          const target = normalize(doctorName);
          match = Object.values(all || {}).find(
            (s: any) => normalize((s as any)?.doctorName) === target,
          ) as any;
        }
        let department = (match as any)?.doctorDepartment || '';
        let doctorId = (match as any)?.doctorId || '';
        let week = (match as any)?.week || {};

        // If no schedule exists, synthesize a minimal Mon–Fri week and persist so subsequent views have data
        const ensureWeek = () => {
          const defaultBuilding =
            (typeof crumbs?.buildingId === 'string' && crumbs.buildingId) ||
            (resolvedBuilding as any)?.id ||
            'uh-cleveland-medical-center';
          const floors = [1, 2, 3, 1, 2];
          const rooms = floors.map((f, i) =>
            String(
              f * 100 +
                (i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : i === 3 ? 4 : 5),
            ),
          );
          const labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          const gen: any = {};
          for (let i = 0; i < labels.length; i++) {
            gen[labels[i]] = {
              slots: [
                {
                  buildingId: defaultBuilding,
                  floor: floors[i],
                  room: rooms[i],
                  start: '09:00',
                  end: '12:00',
                },
              ],
            };
          }
          return gen;
        };

        if (!match) {
          doctorId = doctorName.toLowerCase().replace(/\s+/g, '-');
          week = ensureWeek();
          try {
            upsertDoctorSchedule(doctorId, {
              doctorId,
              doctorName,
              doctorDepartment: department || '',
              week,
            });
          } catch {
            /* ignore persist errors */
          }
        } else {
          const hasAny = Object.values(week || {}).some(
            (d: any) => (d?.slots || []).length > 0,
          );
          if (!hasAny) {
            week = ensureWeek();
            try {
              upsertDoctorSchedule(
                (match as any)?.doctorId ||
                  doctorName.toLowerCase().replace(/\s+/g, '-'),
                {
                  doctorId:
                    (match as any)?.doctorId ||
                    doctorId ||
                    doctorName.toLowerCase().replace(/\s+/g, '-'),
                  doctorName,
                  doctorDepartment: department || '',
                  week,
                },
              );
            } catch {
              /* ignore persist errors */
            }
          }
        }

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const slots: Array<{
          day: string;
          buildingId: string;
          buildingName: string;
          floor: number;
          room: string;
          start: string;
          end: string;
        }> = [];
        for (const day of days) {
          const list: any[] = (week?.[day]?.slots) || [];
          for (const s of list) {
            const b = (BUILDINGS as any[]).find(
              (x) => String((x as any).id) === String(s.buildingId),
            );
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
        setDoctorPopup({
          id: '',
          name: doctorName,
          department: '',
          slots: [],
        });
      }
    },
    [crumbs?.buildingId, resolvedBuilding],
  );

  const closeDoctorPopup = useCallback(() => setDoctorPopup(null), []);

  return { openDoctorPopup, closeDoctorPopup };
}

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
  const [providerView, setProviderView] = useState<'table' | 'donut' | 'ribbons'>('table');

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

  // Doctor schedule popup state & helper (resolvedBuilding is computed below and
  // then passed into the hook to keep concerns isolated)
  const [doctorPopup, setDoctorPopup] = useState<DoctorPopupData | null>(null);

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

  // Doctor popup helpers (depend on latest crumbs / resolvedBuilding)
  const { openDoctorPopup, closeDoctorPopup } = useDoctorPopup(
    crumbs,
    resolvedBuilding,
    setDoctorPopup,
  );

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
        const seeds = MOCK_DOCTOR_NAMES;
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
        const seeds = MOCK_DOCTOR_NAMES;
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
          const seeds = MOCK_DOCTOR_NAMES;
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
          const seeds = MOCK_DOCTOR_NAMES;
          const deptByName = MOCK_DOCTOR_DEPARTMENTS as Record<string, string>;
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

  const scopeLabel = (() => {
    if (scope === 'city' && crumbs.city) return `City • ${crumbs.city}`;
    if (scope === 'campus' && crumbs.campus) return `Campus • ${crumbs.campus}`;
    if (scope === 'building' && crumbs.buildingName) return `Building • ${crumbs.buildingName}`;
    if (scope === 'floor' && typeof crumbs.floor === 'number') return `Floor ${crumbs.floor}`;
    return 'Current selection';
  })();

  if (loading) return <div className="text-center py-10 text-slate-600">Loading room utilization…</div>;
  if (error) return <div className="text-center text-red-500 py-10">{error}</div>;

  return (
    <div className="m-4">
      <div className="mx-auto w-full max-w-[1400px] rounded-[32px] bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-[0_28px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80 p-5 md:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
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
            {/* Scope breadcrumbs beside back button */}
            <div className="flex flex-wrap items-center text-sm gap-1">
            <button
              type="button"
                className={`px-2 py-1 rounded-full border ${scope === 'city' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-violet-50 hover:border-violet-300'}`}
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
                className={`px-2 py-1 rounded-full border ${scope === 'city' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-violet-50 hover:border-violet-300'}`}
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
                className={`px-2 py-1 rounded-full border ${scope === 'campus' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-violet-50 hover:border-violet-300'}`}
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
                className={`px-2 py-1 rounded-full border ${scope === 'building' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-violet-50 hover:border-violet-300'}`}
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
                className={`px-2 py-1 rounded-full border ${scope === 'floor' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-violet-50 hover:border-violet-300'}`}
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

              {/* Inline heading for main insights */}
              <span className="ml-4 hidden md:inline-block text-base font-semibold text-slate-900">
                Utilization Insights
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
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
              className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow hover:bg-slate-800"
            >
              Apply
            </button>
          </div>
        </div>
        {/* Summary / filters on the left, insights on the right */}
        <div className="mt-2 grid grid-cols-1 lg:grid-cols-[minmax(320px,380px),minmax(0,1fr)] gap-8 items-start">
          <div className="space-y-4">
        {/* Campus building selector (dropdown) */}
        {(crumbs.campus && campusBuildings.length > 0 && (scope === 'campus' || (!resolvedBuilding && (crumbs.floor === undefined || crumbs.floor === null)))) ? (
              <div className="mt-3 flex items-center justify-center gap-2">
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
              <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
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
              <div className="mt-3 flex items-center justify-center gap-2">
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

            {/* High-level summary cards (stacked vertically) */}
            <UtilizationSummaryCards data={data} scopeLabel={scopeLabel} />
      </div>

          <div className="mt-2 xl:mt-0 space-y-6">
            {/* Utilization insights graph */}
            <UtilizationCharts data={data} />

            {/* Separate 3D card for Occupancy by providers */}
            <ProviderOccupancySection
              scopeDayBreakdown={scopeDayBreakdown as any}
              allDepartments={allDeptList}
              providerView={providerView}
              onChangeView={setProviderView}
              onDoctorClick={openDoctorPopup}
            />
              </div>
            </div>
          </div>
      {/* Date range moved to header */}
      <div className="mt-2 space-y-6">

        {/* Doctor schedules popup */}
        <DoctorSlotsPopup popup={doctorPopup} onClose={() => setDoctorPopup(null)} />

        {/* City-scope campus utilization chart */}
        {(crumbs.city && cityCampusSeries.length > 0 && scope === 'city') && (
          <div className="mt-10 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
            <h3 className="text-xl font-semibold mb-4 text-center">Utilization by Campus</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
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
          </div>
        )}

        {/* Campus-scope building utilization chart */}
        {(crumbs.campus && campusSeries.length > 0 && (scope === 'campus' || (!resolvedBuilding && (crumbs.floor === undefined || crumbs.floor === null)))) && (
          <div className="mt-10 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
            <h3 className="text-xl font-semibold mb-4 text-center">Utilization by Building</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
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
          </div>
        )}

        {/* Building-scope floor utilization chart + drilldown room options */}
        {scope === 'building' && floorSeries.length > 0 && (
          <div className="mt-10 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
            <h3 className="text-xl font-semibold mb-4 text-center">Utilization by Floor</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
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
            </div>
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


