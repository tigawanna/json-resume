const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const RESERVED = new Set([
  "app",
  "api",
  "auth",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

export type ResourceNames = {
  kebab: string;
  pascal: string;
  camel: string;
};

export function parseResourceName({ raw }: { raw: string }): ResourceNames {
  const kebab = raw.trim().toLowerCase();
  if (!KEBAB.test(kebab)) {
    throw new Error(`Name must be kebab-case (got ${JSON.stringify(raw)})`);
  }
  const pascal = kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  if (RESERVED.has(camel) || RESERVED.has(pascal)) {
    throw new Error(`Name ${JSON.stringify(kebab)} is a reserved identifier`);
  }
  return { kebab, pascal, camel };
}
