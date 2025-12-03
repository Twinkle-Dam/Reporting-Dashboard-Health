import { LOCATION_HIERARCHY_ENDPOINT } from './config';
import { LOCATION_ENTITIES, type LocationEntity } from '../data/locationHierarchy';

export type LocationHierarchyRow = {
  CityId: string;
  CityName: string;
  CampusId: string;
  CampusName: string;
  BuildingId: string;
  BuildingName: string;
  BuildingFloors: number;
  FloorId: string;
  FloorName: string;
  FloorNumber: number;
  // Allow backend to add extra fields without breaking the app
  [key: string]: unknown;
};

export type LocationHierarchyFilters = {
  cityName?: string | null;
  campusName?: string | null;
  buildingName?: string | null;
  /**
   * If provided, will be sent as onlyActive query param ("true"/"false").
   * All filters are optional; when omitted, the API should return the full hierarchy.
   */
  onlyActive?: boolean | null;
};

function parseFloorNumber(name: string): number {
  const match = name.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function parseFloorsAttribute(attrs: string | null | undefined): number | undefined {
  if (!attrs) return undefined;
  try {
    const parsed = JSON.parse(attrs);
    if (parsed && typeof parsed.floors === 'number') {
      return parsed.floors;
    }
  } catch {
    // ignore JSON parse errors
  }
  return undefined;
}

function buildRowsFromEntities(
  entities: LocationEntity[],
  opts: { onlyActive?: boolean } = {}
): LocationHierarchyRow[] {
  const eligibleEntities = opts.onlyActive
    ? entities.filter((entity) => entity.IsActive !== false)
    : entities;

  const entityById = new Map<string, LocationEntity>();
  const floorsByBuilding = new Map<string, LocationEntity[]>();

  for (const entity of eligibleEntities) {
    entityById.set(entity.Id, entity);
    if (entity.Type === 'Floor' && entity.ParentId) {
      if (!floorsByBuilding.has(entity.ParentId)) {
        floorsByBuilding.set(entity.ParentId, []);
      }
      floorsByBuilding.get(entity.ParentId)!.push(entity);
    }
  }

  return eligibleEntities
    .filter((entity) => entity.Type === 'Floor' && entity.ParentId)
    .map((floor) => {
      const building = floor.ParentId ? entityById.get(floor.ParentId) : null;
      if (!building || building.Type !== 'Building' || !building.ParentId) {
        return null;
      }
      const campus = entityById.get(building.ParentId);
      if (!campus || campus.Type !== 'Campus' || !campus.ParentId) {
        return null;
      }
      const city = entityById.get(campus.ParentId);
      if (!city || city.Type !== 'City') {
        return null;
      }
      const floorsFromAttr = parseFloorsAttribute(building.Attributes);
      const floorsFromChildren = floorsByBuilding.get(building.Id)?.length || 0;
      const buildingFloors = floorsFromAttr ?? floorsFromChildren ?? 0;
      return {
        CityId: city.Id,
        CityName: city.Name,
        CampusId: campus.Id,
        CampusName: campus.Name,
        BuildingId: building.Id,
        BuildingName: building.Name,
        BuildingFloors: buildingFloors,
        FloorId: floor.Id,
        FloorName: floor.Name,
        FloorNumber: parseFloorNumber(floor.Name),
      } as LocationHierarchyRow;
    })
    .filter(Boolean) as LocationHierarchyRow[];
}

const FALLBACK_LOCATION_ROWS: LocationHierarchyRow[] = buildRowsFromEntities(LOCATION_ENTITIES);

function isLocationHierarchyRowArray(value: unknown): value is LocationHierarchyRow[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const sample = value[0] as Record<string, unknown>;
  const candidate = sample as Record<string, unknown>;
  return (
    candidate != null &&
    typeof candidate['CityId'] === 'string' &&
    typeof candidate['CampusId'] === 'string' &&
    typeof candidate['BuildingId'] === 'string' &&
    typeof candidate['FloorId'] === 'string'
  );
}

function isLocationEntityArray(value: unknown): value is LocationEntity[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const sample = value[0] as Record<string, unknown>;
  const candidate = sample as Record<string, unknown>;
  return (
    candidate != null &&
    typeof candidate['Id'] === 'string' &&
    typeof candidate['Name'] === 'string' &&
    typeof candidate['Type'] === 'string'
  );
}

function filterRowsBy(filters: LocationHierarchyFilters, rows: LocationHierarchyRow[]): LocationHierarchyRow[] {
  const { cityName, campusName, buildingName } = filters;
  return rows.filter((r) => {
    if (cityName && r.CityName !== cityName) return false;
    if (campusName && r.CampusName !== campusName) return false;
    if (buildingName && r.BuildingName !== buildingName) return false;
    return true;
  });
}

/**
 * Fetches the location hierarchy from VM_GetLocationHierarchy.
 * All filters are optional and map directly to the nullable query parameters:
 *   cityName, campusName, buildingName, onlyActive.
 * Falls back to a stored snapshot in locationHierarchy.ts if the backend is unreachable.
 */
export async function fetchLocationHierarchy(
  filters: LocationHierarchyFilters = {}
): Promise<LocationHierarchyRow[]> {
  if (!LOCATION_HIERARCHY_ENDPOINT) {
    return filterRowsBy(filters, FALLBACK_LOCATION_ROWS);
  }

  try {
    const params = new URLSearchParams();
    const { cityName, campusName, buildingName, onlyActive } = filters;

    if (cityName) params.set('cityName', cityName);
    if (campusName) params.set('campusName', campusName);
    if (buildingName) params.set('buildingName', buildingName);
    if (typeof onlyActive === 'boolean') params.set('onlyActive', String(onlyActive));

    const qs = params.toString();
    const url = qs ? `${LOCATION_HIERARCHY_ENDPOINT}?${qs}` : LOCATION_HIERARCHY_ENDPOINT;

    const res = await fetch(url);
    if (!res.ok) {
      return filterRowsBy(filters, FALLBACK_LOCATION_ROWS);
    }
    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) {
      return filterRowsBy(filters, FALLBACK_LOCATION_ROWS);
    }

    if (isLocationHierarchyRowArray(json)) {
      return filterRowsBy(filters, json);
    }

    if (isLocationEntityArray(json)) {
      const enforceOnlyActive = filters.onlyActive === true;
      const rows = buildRowsFromEntities(json, { onlyActive: enforceOnlyActive });
      if (rows.length > 0) {
        return filterRowsBy(filters, rows);
      }
    }

    return filterRowsBy(filters, FALLBACK_LOCATION_ROWS);
  } catch {
    return filterRowsBy(filters, FALLBACK_LOCATION_ROWS);
  }
}

