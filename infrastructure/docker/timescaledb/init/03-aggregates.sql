CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1m
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', time) AS bucket,
  device_id,
  avg(temp) AS avg_temp,
  min(temp) AS min_temp,
  max(temp) AS max_temp,
  avg(humidity) AS avg_humidity,
  min(humidity) AS min_humidity,
  max(humidity) AS max_humidity,
  avg(battery) AS avg_battery,
  min(battery) AS min_battery,
  max(battery) AS max_battery
FROM telemetry
GROUP BY bucket, device_id
WITH NO DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1h
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  device_id,
  avg(temp) AS avg_temp,
  min(temp) AS min_temp,
  max(temp) AS max_temp,
  avg(humidity) AS avg_humidity,
  min(humidity) AS min_humidity,
  max(humidity) AS max_humidity,
  avg(battery) AS avg_battery,
  min(battery) AS min_battery,
  max(battery) AS max_battery
FROM telemetry
GROUP BY bucket, device_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('telemetry_1m',
  start_offset => INTERVAL '2 hours',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute');

SELECT add_continuous_aggregate_policy('telemetry_1h',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

SELECT add_retention_policy('telemetry', INTERVAL '24 hours');

SELECT add_retention_policy('telemetry_1m', INTERVAL '7 days');
