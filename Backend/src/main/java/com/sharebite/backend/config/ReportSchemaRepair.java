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
        if (!reportsTableExists()) {
            logger.info("Skipping report schema repair because the reports table does not exist yet.");
            return;
        }

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

    private boolean reportsTableExists() {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema()
                      AND table_name = 'reports'
                )
                """,
                Boolean.class
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
