// Type guard for narrowing unknown catch clause errors
// Usage: if (isErrorWithMessage(err) && err.message.includes('...'))
export function isErrorWithMessage(err: unknown): err is { message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  );
}