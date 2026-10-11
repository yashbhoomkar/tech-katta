/**
 * Read primary database content when MongoDB is connected.
 *
 * Local fallback data is only used when the database is known to be disconnected.
 * A successful empty database result is authoritative, and query errors propagate
 * to the route so callers can return an explicit service error instead of masking
 * the failure with stale fallback content.
 */
export async function readPrimaryOrFallback({
  databaseConnected,
  readDatabase,
  readFallback,
}) {
  if (!databaseConnected) {
    return readFallback();
  }

  return readDatabase();
}
