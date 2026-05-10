export interface LinkListItemDTO {
  id: string;
  resumeId: string;
  resumeName: string;
  resumeIds: string[];
  resumeNames: string[];
  usageCount: number;
  label: string;
  url: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
