export const API_BASE = process.env.REACT_APP_API_BASE || 'https://cutlercenter.uhhospitals.org/apiv2';
export const REPORTS_ENDPOINT = `${API_BASE}/api/reports`;
export const ROOMS_GET_ROOMS_ENDPOINT = `${API_BASE}/Rooms_GetRooms`;
export const UTILIZATION_ENDPOINT = `${API_BASE}/utilization`;
// Location hierarchy (city → campus → building → floor) from VM_GetLocationHierarchy
// Example local URL: http://localhost:7072/apiV2/VM_GetLocationHierarchy
export const LOCATION_HIERARCHY_ENDPOINT = `${API_BASE}/VM_GetLocationHierarchy`;
export const ROOM_UTILIZATION_SUMMARY_ENDPOINT = `${API_BASE}/VM_GetRoomUtilizationSummary`;
// Rooms per location + floor from VM_GetRoomsByLocationAndFloor
export const ROOMS_BY_LOCATION_AND_FLOOR_ENDPOINT = `${API_BASE}/VM_GetRoomsByLocationAndFloor`;
// new one
export const ROOMS_OCCUPANCY_BY_PROVIDER_ENDPOINT = `${API_BASE}/VM_GetRoomOccupancyByProvider`;
export const DOCTORS_BY_RESOURCEID_ENDPOINT = `${API_BASE}/VM_ScheduleByResourceIdGet`;