BEGIN;
SET ROLE ghidai_owner;
ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'USER';
ALTER TABLE "AuthToken" DROP CONSTRAINT "AuthToken_kind_check";
ALTER TABLE "AuthToken" ADD CHECK(kind IN ('VERIFY','RESET','EMAIL_CHANGE'));
ALTER TABLE "AuthToken" ADD COLUMN "candidateEmail" varchar(254);
ALTER TABLE "AuthToken" ADD CHECK((kind='EMAIL_CHANGE')=("candidateEmail" IS NOT NULL));
ALTER TABLE "Profile" ADD COLUMN preferences jsonb NOT NULL DEFAULT '{"reducedMotion":false}';
ALTER TABLE "MfaCredential" ADD COLUMN "lastStep" bigint NOT NULL DEFAULT -1;
ALTER TABLE "MfaCredential" ADD COLUMN "setupExpiresAt" timestamptz;
CREATE TABLE "AuthChallenge" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL REFERENCES "User"(id),
 "tokenHash" text NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5), "usedAt" timestamptz
);
CREATE TABLE "AuthMail" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL REFERENCES "User"(id),
 "tokenId" uuid NOT NULL REFERENCES "AuthToken"(id), "payloadEncrypted" bytea NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "sentAt" timestamptz,
 attempts integer NOT NULL DEFAULT 0, "expiresAt" timestamptz NOT NULL
);
ALTER TABLE "AuthChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthChallenge" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuthMail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthMail" FORCE ROW LEVEL SECURITY;
CREATE INDEX challenge_user_idx ON "AuthChallenge"("userId");
CREATE INDEX mail_pending_idx ON "AuthMail"("createdAt") WHERE "sentAt" IS NULL;
-- The credential gateway has no privileges on health/program/goal tables and cannot assign roles.
CREATE POLICY credential_gateway ON "User" TO ghidai_auth USING(true) WITH CHECK(role='USER');
CREATE POLICY credential_gateway ON "Session" TO ghidai_auth USING(true) WITH CHECK(true);
CREATE POLICY credential_gateway ON "AuthToken" TO ghidai_auth USING(true) WITH CHECK(true);
CREATE POLICY credential_gateway ON "MfaCredential" TO ghidai_auth USING(true) WITH CHECK(true);
CREATE POLICY credential_gateway ON "AuthChallenge" TO ghidai_auth USING(true) WITH CHECK(true);
CREATE POLICY credential_gateway ON "AuthMail" TO ghidai_auth USING(true) WITH CHECK(true);
CREATE POLICY credential_rate ON "RateLimitBucket" TO ghidai_auth USING(true) WITH CHECK(true);
CREATE POLICY credential_audit ON "AuditLog" FOR INSERT TO ghidai_auth WITH CHECK(true);
CREATE POLICY registration_profile ON "Profile" FOR INSERT TO ghidai_auth WITH CHECK(true);
CREATE POLICY registration_consent ON "Consent" FOR INSERT TO ghidai_auth WITH CHECK(kind='PRIVACY');
CREATE POLICY self_insert ON "Consent" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY self_update ON "Consent" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY self_delete ON "UserGoal" FOR DELETE TO ghidai_app USING(active_actor() AND "userId"=actor_id() AND "effectiveDate">current_date);
REVOKE ALL ON "AuthChallenge","AuthMail" FROM PUBLIC;
RESET ROLE;
GRANT USAGE ON SCHEMA public TO ghidai_auth;
GRANT SELECT ON "User" TO ghidai_auth;
GRANT INSERT(id,"emailNormalized","passwordHash",status) ON "User" TO ghidai_auth;
GRANT UPDATE("emailNormalized","passwordHash",status,"verifiedAt",revision,"updatedAt") ON "User" TO ghidai_auth;
GRANT SELECT,INSERT,UPDATE ON "Session","AuthToken","MfaCredential","AuthChallenge","AuthMail","RateLimitBucket" TO ghidai_auth;
GRANT DELETE ON "MfaCredential" TO ghidai_auth;
GRANT INSERT ON "Profile","Consent","AuditLog" TO ghidai_auth;
GRANT EXECUTE ON FUNCTION actor_id() TO ghidai_auth;
GRANT INSERT,UPDATE ON "Consent" TO ghidai_app;
GRANT DELETE ON "UserGoal" TO ghidai_app;
COMMIT;
