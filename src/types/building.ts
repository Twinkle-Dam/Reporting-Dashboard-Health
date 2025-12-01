export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  campus: string;
  floors: number;
  imageUrl?: string;
  contact: {
    phone: string;
    email: string;
    manager: string;
  };
  facilities: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface FloorPlan {
  buildingId: string;
  floor: number;
  svgUrl: string;
  zones: {
    id: string;
    name: string;
    rooms: string[];
  }[];
}

export interface Campus {
  id: string;
  name: string;
  city: string;
  buildings: string[];
  imageUrl?: string;
  description?: string;
}

export interface City {
  id: string;
  name: string;
  campuses: string[];
  imageUrl?: string;
  description?: string;
}
