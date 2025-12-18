export interface Worksite {
  id: string;
  name: string;
  address?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAvailability {
  id: string;
  staffId: string;
  date: string;
  worksiteId?: string;
  worksite?: Worksite;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
