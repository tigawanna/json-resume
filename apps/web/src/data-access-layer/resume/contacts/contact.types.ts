export interface ContactListItemDTO {
  id: string;
  resumeId: string;
  resumeName: string;
  resumeIds: string[];
  resumeNames: string[];
  usageCount: number;
  type: string;
  value: string;
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
