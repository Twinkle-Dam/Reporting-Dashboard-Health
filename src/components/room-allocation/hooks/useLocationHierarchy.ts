import { useState, useEffect, useMemo } from 'react';
import { fetchLocationHierarchy, type LocationHierarchyRow } from '../../../api/locations';
import { BUILDINGS } from '../../../data/buildings';
import { Crumbs } from './useAllocationFilters';

export function useLocationHierarchy(crumbs: Crumbs) {
  const [locationHierarchyRows, setLocationHierarchyRows] = useState<LocationHierarchyRow[] | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchLocationHierarchy({ onlyActive: true });
        if (!cancelled && Array.isArray(rows) && rows.length > 0) {
          setLocationHierarchyRows(rows);
        }
      } catch {
        // Fallback handled by API or consumers
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedBuilding = useMemo(() => {
    try {
      if (crumbs.buildingId) {
        const byId = (BUILDINGS as any[]).find((bb) => bb.id === crumbs.buildingId);
        if (byId) return byId;
      }
      if (crumbs.buildingName) {
        const target = String(crumbs.buildingName).toLowerCase().trim();
        let found = (BUILDINGS as any[]).find(
          (bb) => String(bb.name).toLowerCase().trim() === target
        );
        if (found) return found;
        found = (BUILDINGS as any[]).find((bb) => String(bb.name).toLowerCase().includes(target));
        if (found) return found;
        found = (BUILDINGS as any[]).find((bb) => target.includes(String(bb.name).toLowerCase()));
        if (found) return found;
      }
    } catch {
      /* ignore */
    }
    return null;
  }, [crumbs.buildingId, crumbs.buildingName]);

  const resolvedLocationId = useMemo(() => {
    const buildingName =
      crumbs.buildingName || String((resolvedBuilding as any)?.name || '').trim();
    if (!buildingName || !locationHierarchyRows || locationHierarchyRows.length === 0) {
      return null;
    }
    const target = buildingName.toLowerCase().trim();
    const match = locationHierarchyRows.find(
      (row) => String(row.BuildingName).toLowerCase().trim() === target
    );
    return match?.BuildingId ? String(match.BuildingId) : null;
  }, [crumbs.buildingName, locationHierarchyRows, resolvedBuilding]);

  const buildingFloorsFromHierarchy = useMemo(() => {
    try {
      if (!locationHierarchyRows || (!crumbs.buildingName && !resolvedBuilding)) {
        return undefined;
      }
      const buildingName =
        crumbs.buildingName || String((resolvedBuilding as any)?.name || '').trim();
      if (!buildingName) return undefined;
      const target = buildingName.toLowerCase().trim();
      const matches = locationHierarchyRows.filter(
        (row) => String(row.BuildingName).toLowerCase().trim() === target
      );
      if (!matches.length) return undefined;
      const floorsFromAttr = Math.max(
        ...matches.map((r) =>
          typeof r.BuildingFloors === 'number' && r.BuildingFloors > 0
            ? Number(r.BuildingFloors)
            : 0
        )
      );
      if (floorsFromAttr > 0) return floorsFromAttr;
      const maxFloor = Math.max(...matches.map((r) => Number(r.FloorNumber || 0)));
      return maxFloor > 0 ? maxFloor : undefined;
    } catch {
      return undefined;
    }
  }, [locationHierarchyRows, crumbs.buildingName, resolvedBuilding]);

  const buildingMeta = useMemo(() => {
    try {
      const b = resolvedBuilding as any;
      const floorsFromHierarchy =
        typeof buildingFloorsFromHierarchy === 'number' && buildingFloorsFromHierarchy > 0
          ? Number(buildingFloorsFromHierarchy)
          : undefined;
      if (!b && !floorsFromHierarchy) {
        if (crumbs.buildingName) {
          return { floors: 5 };
        }
        return null;
      }
      const floors = floorsFromHierarchy ?? Number(b?.floors || 5);
      return { floors };
    } catch {
      return null;
    }
  }, [resolvedBuilding, crumbs.buildingName, buildingFloorsFromHierarchy]);

  return {
    locationHierarchyRows,
    resolvedBuilding,
    resolvedLocationId,
    buildingMeta,
  };
}
