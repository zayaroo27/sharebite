package com.sharebite.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ReportSchemaRepair {

    private static final Logger logger = LoggerFactory.getLogger(ReportSchemaRepair.class);

    private final JdbcTemplate jdbcTemplate;

    public ReportSchemaRepair(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void repairReportSchema() {
        if (!tableExists("reports")) {
            logger.info("Skipping report schema repair because the reports table does not exist yet.");
        } else {
            repairReportsTable();
        }

        repairLifecycleStatusConstraints();
    }

    private void repairReportsTable() {
        runStatement(
                "UPDATE reports SET type = 'REQUEST' WHERE type = 'CONVERSATION'",
                "Updated legacy report type values."
        );
        runStatement(
                "UPDATE reports SET status = 'PENDING' WHERE status = 'OPEN'",
                "Updated legacy report status values."
        );
        runStatement(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS details TEXT",
                "Ensured reports.details column exists."
        );
        runStatement(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_snapshot TEXT",
                "Ensured reports.evidence_snapshot column exists."
        );
        runStatement(
                "ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_target_consistency",
                "Dropped legacy report target consistency constraint if present."
        );
        runStatement(
                "ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check",
                "Dropped legacy reports_status_check constraint if present."
        );
        runStatement(
                "ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_type_check",
                "Dropped legacy reports_type_check constraint if present."
        );
        runStatement(
                """
                ALTER TABLE reports
                    ADD CONSTRAINT reports_status_check
                    CHECK (status IN ('PENDING', 'RESOLVED', 'DISMISSED'))
                """,
                "Applied report status constraint."
        );
        runStatement(
                """
                ALTER TABLE reports
                    ADD CONSTRAINT reports_type_check
                    CHECK (type IN ('LISTING', 'REQUEST'))
                """,
                "Applied report type constraint."
        );
        runStatement(
                """
                ALTER TABLE reports
                    ADD CONSTRAINT chk_reports_target_consistency
                    CHECK (
                        (type = 'LISTING' AND listing_id IS NOT NULL AND request_id IS NULL)
                        OR
                        (type = 'REQUEST' AND request_id IS NOT NULL AND listing_id IS NULL)
                    )
                """,
                "Applied report target consistency constraint."
        );
    }

    private void repairLifecycleStatusConstraints() {
        if (tableExists("food_listings")) {
            runStatement(
                    """
                    DO $$
                    DECLARE constraint_name text;
                    BEGIN
                        SELECT con.conname INTO constraint_name
                        FROM pg_constraint con
                        JOIN pg_class rel ON rel.oid = con.conrelid
                        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                        WHERE rel.relname = 'food_listings'
                          AND nsp.nspname = current_schema()
                          AND con.contype = 'c'
                          AND pg_get_constraintdef(con.oid) ILIKE '%status%'
                        LIMIT 1;

                        IF constraint_name IS NOT NULL THEN
                            EXECUTE format('ALTER TABLE food_listings DROP CONSTRAINT %I', constraint_name);
                        END IF;
                    END $$;
                    """,
                    "Dropped legacy food_listings status constraint if present."
            );
            runStatement(
                    """
                    ALTER TABLE food_listings
                        ADD CONSTRAINT food_listings_status_check
                        CHECK (status IN ('AVAILABLE', 'RESERVED', 'COMPLETED', 'EXPIRED'))
                    """,
                    "Applied food_listings status constraint."
            );
        }

        if (tableExists("listing_requests")) {
            runStatement(
                    """
                    DO $$
                    DECLARE constraint_name text;
                    BEGIN
                        SELECT con.conname INTO constraint_name
                        FROM pg_constraint con
                        JOIN pg_class rel ON rel.oid = con.conrelid
                        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                        WHERE rel.relname = 'listing_requests'
                          AND nsp.nspname = current_schema()
                          AND con.contype = 'c'
                          AND pg_get_constraintdef(con.oid) ILIKE '%status%'
                        LIMIT 1;

                        IF constraint_name IS NOT NULL THEN
                            EXECUTE format('ALTER TABLE listing_requests DROP CONSTRAINT %I', constraint_name);
                        END IF;
                    END $$;
                    """,
                    "Dropped legacy listing_requests status constraint if present."
            );
            runStatement(
                    """
                    ALTER TABLE listing_requests
                        ADD CONSTRAINT listing_requests_status_check
                        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'COMPLETED'))
                    """,
                    "Applied listing_requests status constraint."
            );
        }
    }

    private boolean tableExists(String tableName) {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema()
                      AND table_name = ?
                )
                """,
                Boolean.class,
                tableName
        );
        return Boolean.TRUE.equals(exists);
    }

    private void runStatement(String sql, String successMessage) {
        try {
            jdbcTemplate.execute(sql);
            logger.info(successMessage);
        } catch (Exception exception) {
            logger.warn("Report schema repair statement failed: {}", successMessage, exception);
        }
    }
}
