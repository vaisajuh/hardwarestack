-- Merge GPU rows whose names differ only in letter case ("RTX 4070 Super" / "RTX 4070 SUPER").
-- Keeps NVIDIA's official "SUPER" spelling (the scraped row with PassMark scores), then the oldest row.
-- Empty specs on the kept row are filled from the duplicate, retail links move over, duplicates are deleted.
CREATE TEMP TABLE gpu_merge AS
SELECT id AS drop_id, first_value(id) OVER w AS keep_id
FROM "Gpu"
WINDOW w AS (PARTITION BY lower("modelName") ORDER BY ("modelName" LIKE '% SUPER%') DESC, "createdAt", id);

DELETE FROM gpu_merge WHERE drop_id = keep_id;

UPDATE "Gpu" AS k
SET "memoryBandwidthGbs" = COALESCE(k."memoryBandwidthGbs", d."memoryBandwidthGbs"),
    "memoryType"         = COALESCE(k."memoryType", d."memoryType"),
    "architecture"       = COALESCE(k."architecture", d."architecture"),
    "rasterScore"        = COALESCE(k."rasterScore", d."rasterScore")
FROM gpu_merge AS m
JOIN "Gpu" AS d ON d.id = m.drop_id
WHERE k.id = m.keep_id;

UPDATE "RetailLink" AS r
SET "gpuId" = m.keep_id
FROM gpu_merge AS m
WHERE r."gpuId" = m.drop_id;

DELETE FROM "Gpu" WHERE id IN (SELECT drop_id FROM gpu_merge);

DROP TABLE gpu_merge;
