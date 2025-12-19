import { API_BASE, ROOM_UTILIZATION_SUMMARY_ENDPOINT } from './config';
import { ROOM_UTILIZATION_DUMMY } from '../data/roomUtilizationDummy';

export type RoomUtilizationParams = {
  locationId: string;
  startDate: string;
  endDate: string;
  roomId?: string | null;
};

export async function fetchRoomUtilizationSummary({
  locationId,
  startDate,
  endDate,
  roomId,
}: RoomUtilizationParams): Promise<any[]> {
  try {
    if (!API_BASE) return [];
    const params = new URLSearchParams({
      locationId,
      startDate,
      endDate,
    });
    if (roomId && roomId.trim()) {
      params.set('roomId', roomId);
    } else {
      params.set('roomId', 'null');
    }
    const url = `${ROOM_UTILIZATION_SUMMARY_ENDPOINT}?${params.toString()}`;
    const res = await fetch(url);
    // console.log(res, 'res');
    if (!res.ok) return filterFallback(roomId);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return filterFallback(roomId);
    }
    return data;
  } catch {
    console.error('Failed to fetch room utilization summary');
    return filterFallback(roomId);
  }
}

function filterFallback(roomId?: string | null): any[] {
  const trimmed = roomId?.trim();
  if (trimmed) {
    return ROOM_UTILIZATION_DUMMY.filter(
      (row) =>
        row.RoomId.toLowerCase() === trimmed.toLowerCase() ||
        row.RoomName.toLowerCase() === trimmed.toLowerCase()
    );
  }
  return ROOM_UTILIZATION_DUMMY;
}
