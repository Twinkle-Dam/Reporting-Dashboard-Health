import React, { useState, useMemo, useEffect } from 'react';
import { BUILDINGS } from '../../data/buildings';
import { listRoomsForBuilding } from '../../data/mockRoomData';
import { DaySchedule, Slot } from '../../types/schedule';

interface DayEditorProps {
  value: DaySchedule;
  onChange: (v: DaySchedule) => void;
}

export function DayEditor({ value, onChange }: DayEditorProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const rooms = useMemo(
    () => (selectedBuilding ? listRoomsForBuilding(selectedBuilding, selectedFloor) : []),
    [selectedBuilding, selectedFloor]
  );
  const [justAddedCount, setJustAddedCount] = useState<number>(0);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('12:00');

  // Ensure selected room stays valid for chosen building/floor
  useEffect(() => {
    if (rooms.length === 0) {
      setSelectedRoom('');
    } else if (!selectedRoom || !rooms.includes(selectedRoom)) {
      setSelectedRoom(rooms[0]);
    }
  }, [rooms, selectedRoom]);

  const addSlot = () => {
    if (!selectedBuilding) return;
    const next: Slot[] = [
      ...(value.slots || []),
      {
        buildingId: selectedBuilding,
        floor: selectedFloor,
        room: selectedRoom || rooms[0] || '',
        start: startTime || '09:00',
        end: endTime || '12:00',
      },
    ];
    onChange({ ...value, slots: next });
    setJustAddedCount((c) => c + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Building</label>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">Select building</option>
            {BUILDINGS.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Floor</label>
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(Number(e.target.value))}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            disabled={!selectedBuilding}
          >
            {[1, 2, 3, 4, 5].map((f) => (
              <option key={f} value={f}>
                Floor {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Room</label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            disabled={!selectedBuilding}
          >
            {rooms.map((rm: string) => (
              <option key={rm} value={rm}>
                {rm}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Start</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            disabled={!selectedBuilding}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">End</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            disabled={!selectedBuilding}
          />
        </div>
        <button
          onClick={addSlot}
          className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow hover:bg-slate-800"
          disabled={
            !selectedBuilding ||
            !selectedRoom ||
            !startTime ||
            !endTime ||
            (startTime && endTime && startTime >= endTime)
          }
          title={
            !selectedBuilding
              ? 'Select a building to enable'
              : startTime && endTime && startTime >= endTime
                ? 'End time must be after start time'
                : 'Add slot'
          }
        >
          Add slot
        </button>
      </div>

      {/* Feedback without showing slot details */}
      {(value.slots || []).length > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {justAddedCount > 0 ? (
            <span>
              {justAddedCount} slot{justAddedCount > 1 ? 's' : ''} added (unsaved). Click Save to
              persist.
            </span>
          ) : (
            <span>
              {(value.slots || []).length} slot{(value.slots || []).length > 1 ? 's' : ''} pending
              for this day (unsaved). Click Save to persist.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
