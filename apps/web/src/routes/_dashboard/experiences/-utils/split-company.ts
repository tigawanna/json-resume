export type CompanyParts = {
  name: string;
  hint: string;
};

/**
 * Splits a stored company string into its immutable base name and work-mode hints.
 *
 * Stored data often packs hints into `company` (e.g. `"CloudScale Systems (US - Remote)"`,
 * `"FlowState (Remote)"`, `"Acme - Remote"`). Grouping and headers use the base name so
 * `"Acme (Remote)"` and `"Acme"` share a period when dates match. Hints are shown as a
 * separate tag next to the name, never as part of the immutable identity.
 */
export function splitCompanyHint(company: string): CompanyParts {
  const trimmed = company.trim();
  if (!trimmed) return { name: "", hint: "" };

  const paren = trimmed.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    return { name: paren[1].trim(), hint: paren[2].trim() };
  }

  const dash = trimmed.match(/^(.*?)\s*[-—–|]\s*(.+)$/);
  if (dash) {
    const name = dash[1].trim();
    const hint = dash[2].trim();
    if (name && hint && isHintPhrase(hint)) {
      return { name, hint };
    }
  }

  const trailingKeyword = trimmed.match(/^(.*?)\s+(Remote|Volunteer|Hybrid)$/i);
  if (trailingKeyword) {
    return { name: trailingKeyword[1].trim(), hint: trailingKeyword[2].trim() };
  }

  return { name: trimmed, hint: "" };
}

function isHintPhrase(hint: string) {
  const normalized = hint.trim().toLowerCase();
  if (!normalized) return false;
  return /(^|\s)(remote|volunteer|hybrid|contract|part[- ]time|freelance|us|uk|eu|on[- ]?site)(\s|$)/.test(
    normalized,
  );
}

export function companyGroupKey(company: string, startDate: string, endDate: string) {
  return `${splitCompanyHint(company).name.trim().toLowerCase()}␟${startDate.trim()}␟${endDate.trim()}`;
}
