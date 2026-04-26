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
        repairNotificationTypeConstraints();
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
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS policy_category VARCHAR(64)",
                "Ensured reports.policy_category column exists."
        );
        runStatement(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS severity VARCHAR(32)",
                "Ensured reports.severity column exists."
        );
        runStatement(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_captured_at TIMESTAMP",
                "Ensured reports.evidence_captured_at column exists."
        );
        runStatement(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_message_id UUID",
                "Ensured reports.reported_message_id column exists."
        );
        runStatement(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS decision_note TEXT",
                "Ensured reports.decision_note column exists."
        );
        runStatement(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS action_taken VARCHAR(64)",
                "Ensured reports.action_taken column exists."
        );
        runStatement(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS action_target_type VARCHAR(32)",
                "Ensured reports.action_target_type column exists."
        );
        runStatement(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS action_target_id UUID",
                "Ensured reports.action_target_id column exists."
        );
        runStatement(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS action_taken_at TIMESTAMP",
                "Ensured reports.action_taken_at column exists."
        );
        runStatement(
                "CREATE INDEX IF NOT EXISTS idx_reports_reported_message_id ON reports (reported_message_id)",
                "Ensured reports.reported_message_id index exists."
        );
        runStatement(
                "CREATE INDEX IF NOT EXISTS idx_reports_evidence_captured_at ON reports (evidence_captured_at)",
                "Ensured reports.evidence_captured_at index exists."
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
                "ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_policy_category_check",
                "Dropped legacy reports_policy_category_check constraint if present."
        );
        runStatement(
                "ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_severity_check",
                "Dropped legacy reports_severity_check constraint if present."
        );
        runStatement(
                "ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_action_taken_check",
                "Dropped legacy reports_action_taken_check constraint if present."
        );
        runStatement(
                "ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_action_target_type_check",
                "Dropped legacy reports_action_target_type_check constraint if present."
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
                    ADD CONSTRAINT reports_policy_category_check
                    CHECK (
                        policy_category IS NULL
                        OR policy_category IN ('ABUSE', 'HARASSMENT', 'SPAM', 'SCAM_FRAUD', 'MISLEADING_LISTING', 'SAFETY_RISK', 'OTHER')
                    )
                """,
                "Applied report policy category constraint."
        );
        runStatement(
                """
                ALTER TABLE reports
                    ADD CONSTRAINT reports_severity_check
                    CHECK (
                        severity IS NULL
                        OR severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
                    )
                """,
                "Applied report severity constraint."
        );
        runStatement(
                """
                ALTER TABLE reports
                    ADD CONSTRAINT reports_action_taken_check
                    CHECK (
                        action_taken IS NULL
                        OR action_taken IN ('NONE', 'WARN_USER', 'SUSPEND_USER', 'REMOVE_LISTING', 'MONITOR_ACCOUNT', 'ESCALATE')
                    )
                """,
                "Applied report action_taken constraint."
        );
        runStatement(
                """
                ALTER TABLE reports
                    ADD CONSTRAINT reports_action_target_type_check
                    CHECK (
                        action_target_type IS NULL
                        OR action_target_type IN ('USER', 'LISTING', 'REQUEST', 'MESSAGE')
                    )
                """,
                "Applied report action_target_type constraint."
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

    private void repairNotificationTypeConstraints() {
        if (!tableExists("notifications")) {
            return;
        }

        runStatement(
                """
                DO $$
                DECLARE constraint_name text;
                BEGIN
                    SELECT con.conname INTO constraint_name
                    FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                    WHERE rel.relname = 'notifications'
                      AND nsp.nspname = current_schema()
                      AND con.contype = 'c'
                      AND pg_get_constraintdef(con.oid) ILIKE '%type%'
                    LIMIT 1;

                    IF constraint_name IS NOT NULL THEN
                        EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', constraint_name);
                    END IF;
                END $$;
                """,
                "Dropped legacy notifications type constraint if present."
        );
        runStatement(
                """
                ALTER TABLE notifications
                    ADD CONSTRAINT notifications_type_check
                    CHECK (
                        type IN (
                            'REQUEST_CREATED',
                            'REQUEST_APPROVED',
                            'REQUEST_REJECTED',
                            'REQUEST_CANCELED',
                            'REQUEST_COMPLETED',
                            'NEW_MESSAGE',
                            'LISTING_EXPIRED',
                            'LISTING_REMOVED',
                            'MODERATION_WARNING',
                            'ACCOUNT_SUSPENDED',
                            'ACCOUNT_MONITORED',
                            'REPORT_ESCALATED'
                        )
                    )
                    """,
                "Applied notifications type constraint."
        );
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
