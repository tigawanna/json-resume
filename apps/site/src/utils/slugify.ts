/**
 * Converts a string into a URL-friendly slug
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes leading/trailing hyphens
 * - Removes consecutive hyphens
 *
 * @example
 * slugify("My Organization") // "my-organization"
 * slugify("Hello  World!") // "hello-world"
 * slugify("---test---") // "test"
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Replace spaces and special characters with hyphens
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      // Remove consecutive hyphens
      .replace(/-+/g, "-")
      // Remove leading and trailing hyphens
      .replace(/^-+|-+$/g, "")
  );
}
