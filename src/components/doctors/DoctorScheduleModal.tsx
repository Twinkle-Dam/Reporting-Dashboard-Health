import React, { useState, useEffect } from 'react';
import { DoctorInfo, DoctorSchedule } from '../../types/doctor';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type DoctorScheduleModalProps = {
  doctor: DoctorInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (doctorId: string, schedule: DoctorSchedule) => void;
};

export const DoctorScheduleModal: React.FC<DoctorScheduleModalProps> = ({
  doctor,
  isOpen,
  onClose,
  onSave,
}) => {
  const [schedule, setSchedule] = useState<DoctorSchedule>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (doctor?.schedule) {
      setSchedule(doctor.schedule);
    } else {
      // Initialize with default schedule
      setSchedule({
        monday: { available: false, startTime: '09:00', endTime: '17:00' },
        tuesday: { available: false, startTime: '09:00', endTime: '17:00' },
        wednesday: { available: false, startTime: '09:00', endTime: '17:00' },
        thursday: { available: false, startTime: '09:00', endTime: '17:00' },
        friday: { available: false, startTime: '09:00', endTime: '17:00' },
        saturday: { available: false },
        sunday: { available: false },
      });
    }
  }, [doctor]);

  const handleSave = async () => {
    if (!doctor) return;
    
    setIsLoading(true);
    try {
      await onSave(doctor.id, schedule);
      onClose();
    } catch (error) {
      console.error('Failed to save schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available: !prev[day]?.available,
      },
    }));
  };

  const handleTimeChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  if (!doctor) return null;

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          Schedule for Dr. {doctor.name}
        </h2>
        
        <div className="space-y-4">
          {Object.entries(schedule).map(([day, daySchedule]) => (
            <div key={day} className="flex items-center space-x-4">
              <div className="w-24">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={daySchedule?.available || false}
                    onChange={() => handleDayToggle(day)}
                    className="rounded text-blue-500"
                  />
                  <span className="capitalize">{day}</span>
                </label>
              </div>
              
              {daySchedule?.available && (
                <div className="flex space-x-2">
                  <input
                    type="time"
                    value={daySchedule.startTime || '09:00'}
                    onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={daySchedule.endTime || '17:00'}
                    onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DoctorScheduleModal;
