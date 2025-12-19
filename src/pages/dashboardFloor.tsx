import { useEffect } from 'react';

export { useRooms } from '../components/dashboard/hooks/useRooms';
export { generateRoomLayout } from '../components/dashboard/floorLayout';
export { FloorPlan } from '../components/dashboard/FloorPlan';
export { RoomCardsGrid } from '../components/dashboard/RoomCardsGrid';

export function useSchedulesSeed() {
  // Legacy no-op: seeding is now centralized via MOCK_DASHBOARD_SCHEDULE_SEED.
  useEffect(() => {}, []);
}
