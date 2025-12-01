# React Reporting Demo

## Features
- API-driven reporting (fetches from `/api/reports`)
- Multiple charts (Bar, Line, Pie) using Recharts
- Export all data to CSV and PDF
- Tailwind styling (ShadCN-style components suggested)

## Quick start
1. npm install
2. Set environment variable REACT_APP_API_BASE if your API is on a different host
3. npm start

## Notes
- The project expects a GET `/api/reports` endpoint that returns an array of objects:
  [{ id, department, date, visits, revenue }, ...]
- For testing without an API you can serve mock data from your backend or adapt the code to import `src/data/mockData.js`.
