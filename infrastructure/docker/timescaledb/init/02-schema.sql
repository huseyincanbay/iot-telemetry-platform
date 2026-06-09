CREATE TABLE IF NOT EXISTS devices (
  device_id   TEXT PRIMARY KEY,
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL,
  last_lat    DOUBLE PRECISION,
  last_lon    DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS telemetry (
  time        TIMESTAMPTZ NOT NULL,
  device_id   TEXT NOT NULL,
  temp        DOUBLE PRECISION NOT NULL,
  humidity    DOUBLE PRECISION NOT NULL,
  battery     DOUBLE PRECISION NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lon         DOUBLE PRECISION NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

SELECT create_hypertable('telemetry', by_range('time', INTERVAL '1 day'), if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry (device_id, time DESC);
