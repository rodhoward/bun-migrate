

--  postgres-migrations disable-transaction
CREATE INDEX CONCURRENTLY idx_concurrently ON accounting_sessions(started_at, hotspot_id);