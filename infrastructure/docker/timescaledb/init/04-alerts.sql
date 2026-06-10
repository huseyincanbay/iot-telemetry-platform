CREATE TABLE IF NOT EXISTS alerts (
  id           BIGSERIAL PRIMARY KEY,
  rule_id      TEXT NOT NULL,
  device_id    TEXT NOT NULL,
  severity     TEXT NOT NULL,
  metric       TEXT NOT NULL,
  value        DOUBLE PRECISION NOT NULL,
  threshold    DOUBLE PRECISION NOT NULL,
  message      TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts (triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_device_time ON alerts (device_id, triggered_at DESC);
