import { useState, useEffect, useCallback } from 'react';
import { fetchRoomsByLocationAndFloor } from '../../../api/rooms';
import { listRoomsForBuilding as listRoomsForBuildingBase } from '../../../data/mockRoomData';
import { LocationHierarchyRow } from '../../../api/locations';

export type RemoteRoom = { id: string; label: string };

export function useRoomList(
  resolvedBuilding: any,
  floor: number | undefined,
  hierarchyRows: LocationHierarchyRow[] | null,
  buildingIdFromCrumbs?: string
) {
  const [remoteRoomsByBuilding, setRemoteRoomsByBuilding] = useState<
    Record<string, Record<number, RemoteRoom[]>>
  >({});

  // Populate remote room labels/IDs from the cache
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('vm_floor_rooms_cache');
      if (!raw) return;
      const cached = JSON.parse(raw || '{}');
      if (!cached || !Array.isArray(cached.rooms) || !cached.buildingId) return;

      const currentBuildingId = resolvedBuilding?.id || buildingIdFromCrumbs || null;
      const currentFloor = typeof floor === 'number' ? floor : null;

      if (
        !currentBuildingId ||
        String(currentBuildingId) !== String(cached.buildingId) ||
        currentFloor === null ||
        typeof cached.floor !== 'number' ||
        Number(currentFloor) !== Number(cached.floor)
      ) {
        return;
      }

      const bKey = String(currentBuildingId);
      const floorNum = Number(currentFloor);

      const rooms: RemoteRoom[] = (cached.rooms as any[])
        .map((r: any) => {
          const rawName = String(r?.RoomName || '').trim();
          const rawAlias = String(r?.RoomAlias || '').trim();
          const label = rawName || rawAlias || String(r?.RoomId || '').trim();
          const id = String(r?.RoomId || '').trim();
          if (!label && !id) return null;
          return { id: id || label, label: label || id };
        })
        .filter(Boolean) as RemoteRoom[];

      if (!rooms.length) return;

      setRemoteRoomsByBuilding((prev) => ({
        ...prev,
        [bKey]: {
          ...(prev[bKey] || {}),
          [floorNum]: rooms,
        },
      }));
    } catch {
      // ignore cache errors
    }
  }, [resolvedBuilding, buildingIdFromCrumbs, floor]);

  // Fetch rooms from the API when a floor is selected
  useEffect(() => {
    let active = true;
    const loadRooms = async () => {
      // Only run if we have a resolved building and a floor number selected
      if (!resolvedBuilding || typeof floor !== 'number' || !hierarchyRows) {
        return;
      }

      const bId = String(resolvedBuilding.id);
      const fNum = floor;
      const bKey = String(bId);

      // Find the floor GUID from the hierarchy
      const row = hierarchyRows.find((r) => String(r.BuildingId) === bId && r.FloorNumber === fNum);

      if (!row || !row.FloorId) return;

      try {
        const result = await fetchRoomsByLocationAndFloor(bId, row.FloorId);
        if (active && result && result.length > 0) {
          const mapped: RemoteRoom[] = result
            .map((r) => {
              const label = r.RoomName || r.RoomAlias || r.RoomId;
              if (!label) return null;
              return { id: r.RoomId, label };
            })
            .filter(Boolean) as RemoteRoom[];

          if (mapped.length > 0) {
            setRemoteRoomsByBuilding((prev) => ({
              ...prev,
              [bKey]: {
                ...(prev[bKey] || {}),
                [fNum]: mapped,
              },
            }));
          }
        }
      } catch (err) {
        // Ignore API errors -> fallback to mock
      }
    };
    loadRooms();
    return () => {
      active = false;
    };
  }, [resolvedBuilding, floor, hierarchyRows]);

  const listRoomsForBuilding = useCallback(
    (buildingId: string, f: number): Array<string | number> => {
      const byBuilding = remoteRoomsByBuilding[buildingId];
      const remote = byBuilding?.[f];
      if (remote && remote.length > 0) {
        return remote.map((r) => r.label);
      }
      return listRoomsForBuildingBase(buildingId, f);
    },
    [remoteRoomsByBuilding]
  );

  return { remoteRoomsByBuilding, listRoomsForBuilding };
}
