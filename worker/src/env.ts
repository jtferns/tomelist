export interface Env {
  SYNC_GROUP: DurableObjectNamespace;
  SYNC_CONNECTS: RateLimit;
  SYNC_WRITES: RateLimit;
}
