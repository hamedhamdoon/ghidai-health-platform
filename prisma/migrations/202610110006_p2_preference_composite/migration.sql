BEGIN;
SET ROLE ghidai_owner;
ALTER TABLE "NotificationPreference" ADD UNIQUE("userId","consentId");
RESET ROLE;
COMMIT;
