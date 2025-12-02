import { API_BASE, ROOMS_GET_ROOMS_ENDPOINT } from './config';

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
