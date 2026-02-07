/**
 * Cursor-based pagination utilities (Relay Connection spec)
 *
 * Cursors are opaque strings that encode the position of an item in a sorted list.
 * They allow stable pagination even when the underlying data changes between requests.
 *
 * Our cursor encodes: { sortDate, _id } to handle items with identical timestamps
 */

export interface CursorPayload {
  d: string; // sortDate as ISO string (primary sort key)
  i: string; // _id as hex string (tiebreaker for identical timestamps)
}

/**
 * Encodes a cursor from sort values
 * @param sortDate - The date used for sorting (e.g., latestMessage.createdAt or chat.createdAt)
 * @param id - The document _id (ensures uniqueness when timestamps match)
 * @returns Base64-encoded cursor string (opaque to clients)
 */
export function encodeCursor(sortDate: Date, id: string): string {
  const payload: CursorPayload = {
    d: sortDate.toISOString(),
    i: id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Decodes a cursor back to its sort values
 * @param cursor - Base64-encoded cursor from client
 * @returns The decoded sort values for use in MongoDB $match
 */
export function decodeCursor(cursor: string): CursorPayload {
  const json = Buffer.from(cursor, 'base64').toString('utf-8');
  return JSON.parse(json);
}
