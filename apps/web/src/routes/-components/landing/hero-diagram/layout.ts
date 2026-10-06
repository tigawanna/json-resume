export type DiagramPoint = { x: number; y: number };

export const RESUME_AT: DiagramPoint = { x: 54, y: 48 };

export const PARTS = [
  { id: "experience", label: "Experience", x: 26, y: 20 },
  { id: "education", label: "Education", x: 58, y: 13 },
  { id: "summary", label: "Summary", x: 78, y: 24 },
  { id: "project", label: "Project", x: 22, y: 52 },
  { id: "skills", label: "Skills", x: 80, y: 50 },
  { id: "talk", label: "Talk", x: 36, y: 80 },
] as const;

export type PartId = (typeof PARTS)[number]["id"];

export const BRACES: DiagramPoint[] = [
  { x: 44, y: 20 },
  { x: 84, y: 74 },
];

export const CUBE_AT: DiagramPoint = { x: 30, y: 66 };

export const LINKS: { id: PartId; to: DiagramPoint; bend: number }[] = [
  { id: "experience", to: { x: 46, y: 38 }, bend: -8 },
  { id: "education", to: { x: 54, y: 34 }, bend: 6 },
  { id: "summary", to: { x: 64, y: 38 }, bend: 7 },
  { id: "project", to: { x: 42, y: 48 }, bend: -5 },
  { id: "skills", to: { x: 66, y: 48 }, bend: 4 },
  { id: "talk", to: { x: 50, y: 62 }, bend: -7 },
];
