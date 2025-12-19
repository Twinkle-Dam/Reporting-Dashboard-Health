import {
  API_BASE,
  ROOMS_GET_ROOMS_ENDPOINT,
  ROOMS_BY_LOCATION_AND_FLOOR_ENDPOINT,
  ROOMS_OCCUPANCY_BY_PROVIDER_ENDPOINT,
} from './config';

// Calls Rooms_GetRooms with required locationId and optional nullable isAdmin
export async function fetchRoomsByLocation(
  locationId: string,
  isAdmin?: boolean | null
): Promise<string[]> {
  try {
    if (!API_BASE) return []; // backend not configured
    const params = new URLSearchParams({ locationId });
    if (typeof isAdmin !== 'undefined' && isAdmin !== null) params.set('isAdmin', String(isAdmin));
    const url = `${ROOMS_GET_ROOMS_ENDPOINT}?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const rows = await res.json();
    const set = new Set<string>();
    for (const r of rows || []) {
      const v = String(
        r?.RoomAliasName ?? r?.roomNumber ?? r?.RoomNumber ?? r?.Name ?? r?.room ?? r?.Room ?? ''
      ).trim();
      if (v) set.add(v);
    }
    return Array.from(set);
  } catch {
    return [];
  }
}

// NEW: Calls VM_GetRoomsByLocationAndFloor with temporary dummy IDs for location & floor.
// Once real IDs are available from the hierarchy, we can thread them through.
export type VmFloorRoom = {
  RoomId: string;
  RoomName: string;
  RoomAlias?: string | null;
  LocationId: string;
  FloorId: string;
  isOccupied?: boolean;
  doctor?: any;
};

export async function fetchRoomsByLocationAndFloor(
  locationIdOverride?: string,
  floorIdOverride?: string
): Promise<VmFloorRoom[]> {
  try {
    if (!API_BASE) return [];

    // TODO: replace these with real values from the selected building/floor.
    const defaultLocationId = 'BABEEF54-C88A-400E-926E-5317260E5EA2';
    // const defaultFloorId = 'DB793EAB-6230-4A38-A52B-6223666305F8';

    const locationId = locationIdOverride || defaultLocationId;
    const floorId = floorIdOverride || '';

    const params = new URLSearchParams({
      locationId,
    });
    if (floorId) params.set('floorId', floorId);
    const url = `${ROOMS_BY_LOCATION_AND_FLOOR_ENDPOINT}?${params.toString()}`;
    const res = await fetch(url);

    // Handle 204 explicitly (success but no content) or 404 (not found)
    if (res.status === 204 || res.status === 404) {
      return [];
    }

    if (!res.ok) {
      // Any other error – let caller fall back to mock data.
      return [];
    }

    const data = (await res.json()) as VmFloorRoom[] | any;
    if (!Array.isArray(data)) return [];

    // Filter out obviously empty rows (no room name/alias and no id).
    return data.filter((row: any) => {
      const name = String(row?.RoomName || '').trim();
      const alias = String(row?.RoomAlias || '').trim();
      const id = String(row?.RoomId || '').trim();
      return !!(name || alias || id);
    });
  } catch {
    return [];
  }
}

export type VmFloorRoomOccupancy = {
  DayOfWeek: Number;
  EndTime: string;
  ProviderId: string;
  ProviderName: string;
  RoomId: string;
  RoomName: string;
  StartTime: string;
  WeekOfMonth: string;
  Department: string;
};

export async function fetchRoomsOccupancyByFloorId(
  locationIdOverride?: string,
  floorIdOverride?: string,
  startDate?: string,
  endDate?: string
): Promise<VmFloorRoomOccupancy[]> {
  try {
    if (!API_BASE) return [];

    // TODO: replace these with real values from the selected building/floor.
    const defaultLocationId = 'BABEEF54-C88A-400E-926E-5317260E5EA2';
    // const defaultFloorId = 'DB793EAB-6230-4A38-A52B-6223666305F8';

    const locationId = locationIdOverride || defaultLocationId;
    const floorId = floorIdOverride || '';

    const params = new URLSearchParams({
      locationId,
    });
    if (floorId) params.set('floorId', floorId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const url = `${ROOMS_OCCUPANCY_BY_PROVIDER_ENDPOINT}?${params.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
      // 404 or any other error – let caller fall back to mock data.
      return [];
    }

    const data = (await res.json()) as VmFloorRoom[] | any;
    if (!Array.isArray(data)) return [];

    // Filter out obviously empty rows (no room name/alias and no id).
    return data.filter((row: any) => {
      const name = String(row?.RoomName || '').trim();
      const alias = String(row?.RoomAlias || '').trim();
      const id = String(row?.RoomId || '').trim();
      return !!(name || alias || id);
    });
  } catch {
    return [];
  }
}
