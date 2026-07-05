/** Strip a leading `fullName - ` prefix from stored resume names for compact list cards. */
export function getResumeCardDisplayName(resume: { name: string; fullName: string }): string {
  const fullName = resume.fullName.trim();
  if (!fullName) return resume.name;

  const prefix = `${fullName} - `;
  if (resume.name.startsWith(prefix)) {
    const stripped = resume.name.slice(prefix.length).trim();
    return stripped || resume.name;
  }

  return resume.name;
}
