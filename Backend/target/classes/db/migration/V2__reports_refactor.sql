-- Report model consistency refactor
-- NOTE: Run manually if Flyway is not enabled in this project.

-- 1) Enum-like string value migration
UPDATE reports SET type = 'REQUEST' WHERE type = 'CONVERSATION';
UPDATE reports SET status = 'PENDING' WHERE status = 'OPEN';

-- 2) New long-form details column
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS details TEXT;

ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS evidence_snapshot TEXT;

-- 3) Keep target consistency at schema level as well
ALTER TABLE reports
    DROP CONSTRAINT IF EXISTS chk_reports_target_consistency;

ALTER TABLE reports
    ADD CONSTRAINT chk_reports_target_consistency
    CHECK (
        (type = 'LISTING' AND listing_id IS NOT NULL AND request_id IS NULL)
        OR
        (type = 'REQUEST' AND request_id IS NOT NULL AND listing_id IS NULL)
    );
