import React, { useState } from 'react';

type Filter = { department: string; date: string };
type Props = { onFilter: (f: Filter) => void };

export default function FilterBar({ onFilter }: Props): React.ReactElement {
  const [department, setDepartment] = useState<string>('');
  const [date, setDate] = useState<string>('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilter({ department, date });
  };

  const reset = () => {
    setDepartment('');
    setDate('');
    onFilter({ department: '', date: '' });
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white p-4 rounded-2xl shadow flex flex-wrap gap-4 items-end"
    >
      <div>
        <label className="block text-sm">Department</label>
        <input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. Cardiology"
          className="border p-2 rounded w-48"
        />
      </div>
      <div>
        <label className="block text-sm">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Apply
        </button>
        <button type="button" onClick={reset} className="px-4 py-2 bg-gray-200 rounded">
          Reset
        </button>
      </div>
    </form>
  );
}
