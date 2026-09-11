-- Subject-line A/B testing + follow-up sequence for outreach emails.
-- See AI/DECISIONS.md D42.
alter table outreach_sites add column if not exists email_variant text;
alter table outreach_sites add column if not exists clicked_at timestamptz;
alter table outreach_sites add column if not exists follow_up_sent_at timestamptz;
alter table outreach_sites add column if not exists follow_up_variant text;
