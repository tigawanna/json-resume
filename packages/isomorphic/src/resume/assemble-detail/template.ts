import { TEMPLATE_IDS, type TemplateId } from "../schema/constants.ts";

function isTemplateId(value: string): value is TemplateId {
  return TEMPLATE_IDS.some((templateId) => templateId === value);
}

export function asTemplateId(value: string): TemplateId {
  return isTemplateId(value) ? value : "classic";
}
