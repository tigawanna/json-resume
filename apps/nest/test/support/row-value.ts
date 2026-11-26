/** libSQL row values are a union; narrow to a scalar before using one as text. */
export function textValue({ value }: { value: unknown }): string {
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  )
    return String(value);
  throw new Error('Expected a scalar SQL value');
}
