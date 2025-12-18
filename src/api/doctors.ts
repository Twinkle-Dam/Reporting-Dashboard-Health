import { API_BASE, DOCTORS_BY_RESOURCEID_ENDPOINT } from './config';

export async function fetchDoctorByResourceId(
    resourceId: string
): Promise<any> {
    try {
        if (!API_BASE) return null;

        const params = new URLSearchParams({
            resourceId
        });
        const url = `${DOCTORS_BY_RESOURCEID_ENDPOINT}?${params.toString()}`;
        const res = await fetch(url);
        // console.log('DOCTOR in DoctorModals.tsx:', url, res);

        if (!res.ok) return null;
        let json = await res.json();
        console.log('JSON:', json);
        return json;
    } catch {
        return null;
    }
}