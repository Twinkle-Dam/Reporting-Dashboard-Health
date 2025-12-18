import { useState } from 'react';

export type Scope = 'city' | 'campus' | 'building' | 'floor';

export type Crumbs = {
  city?: string;
  campus?: string;
  buildingId?: string;
  buildingName?: string;
  floor?: number;
};

export function useAllocationFilters(initial?: {
  roomFilter?: string | null;
  roomKey?: string | null;
}) {
  const [roomFilter, setRoomFilter] = useState<string | null>(initial?.roomFilter || null);
  const [roomKey, setRoomKey] = useState<string | null>(initial?.roomKey || null);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [crumbs, setCrumbs] = useState<Crumbs>({});
  const [scope, setScope] = useState<Scope>('floor');
  const [drillFloor, setDrillFloor] = useState<number | null>(null);

  const envPrefersMock = String(process.env.REACT_APP_USE_MOCK_DATA || '').toLowerCase() === 'true';
  const [useMock, setUseMock] = useState<boolean>(envPrefersMock);

  // Initialize dates
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  const todayIso = today.toISOString().slice(0, 10);
  const startIso = start.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState<string>(startIso);
  const [toDate, setToDate] = useState<string>(todayIso);

  return {
    roomFilter,
    setRoomFilter,
    roomKey,
    setRoomKey,
    range,
    setRange,
    crumbs,
    setCrumbs,
    scope,
    setScope,
    drillFloor,
    setDrillFloor,
    useMock,
    setUseMock,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
  };
}
