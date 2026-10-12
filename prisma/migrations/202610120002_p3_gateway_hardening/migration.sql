BEGIN;
SET ROLE ghidai_owner;
-- INSERT must remain USER-only. Existing roles can manage their own password via the gateway;
-- column-level grants prevent gateway role assignment in both cases.
DROP POLICY credential_gateway ON "User";
CREATE POLICY credential_read ON "User" FOR SELECT TO ghidai_auth USING(true);
CREATE POLICY credential_register ON "User" FOR INSERT TO ghidai_auth WITH CHECK(role='USER');
CREATE POLICY credential_update ON "User" FOR UPDATE TO ghidai_auth USING(true) WITH CHECK(true);
ALTER TABLE "AuthMail" ADD CONSTRAINT mail_token_owner FOREIGN KEY("userId","tokenId") REFERENCES "AuthToken"("userId",id);
ALTER TABLE "Profile" ADD CHECK(jsonb_typeof(preferences)='object');
RESET ROLE;
COMMIT;
