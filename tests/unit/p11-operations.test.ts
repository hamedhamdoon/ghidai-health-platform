import { describe,it,expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import {encryptBackup,decryptBackup,backupDigest,restoreDatabaseName} from '../../src/server/operations/backup';
import {operationalAlerts} from '../../src/server/operations/monitor';
describe('P11 backup boundaries',()=>{
 it('authenticates round-trip and detects corruption and wrong keys',()=>{const key=randomBytes(32),source=Buffer.from('synthetic logical PostgreSQL dump'),a=encryptBackup(source,key);expect(decryptBackup(a,key)).toEqual(source);expect(a.includes(source)).toBe(false);expect(backupDigest(a)).toHaveLength(64);const bad=Buffer.from(a);bad[bad.length-1]^=1;expect(()=>decryptBackup(bad,key)).toThrow();expect(()=>decryptBackup(a,randomBytes(32))).toThrow();expect(()=>decryptBackup(Buffer.from('invalid'),key)).toThrow();expect(()=>encryptBackup(source,Buffer.alloc(1))).toThrow();});
 it('rejects every existing project DB and SQL identifiers',()=>{for(const name of ['ghidai_test','ghidai_development','postgres','ghidai_p11_restore_x','ghidai_p11_restore_1234567890123_12345678;DROP'])expect(()=>restoreDatabaseName(name)).toThrow();expect(restoreDatabaseName('ghidai_p11_restore_1234567890123_1234abcd')).toContain('restore');});
});
describe('P11 monitoring',()=>{
 const healthy={databaseAvailable:true,failedJobs:0,overdueJobs:0,failedMail:0,backupAgeHours:1,diskFreeRatio:0.5,errorRate:0};
 it('reports no alerts only with measured healthy input',()=>expect(operationalAlerts(healthy)).toEqual([]));
 it('exposes failures, unmeasured telemetry, stale backup and storage thresholds',()=>{expect(operationalAlerts({...healthy,databaseAvailable:false,failedJobs:1,overdueJobs:1,failedMail:1,backupAgeHours:25,diskFreeRatio:0.1,errorRate:0.1})).toHaveLength(7);expect(operationalAlerts({...healthy,backupAgeHours:null,errorRate:null})).toEqual(['BACKUP_NOT_VERIFIED','ERROR_RATE_NOT_MEASURED']);});
 it('rejects invalid resource observations',()=>{expect(()=>operationalAlerts({...healthy,diskFreeRatio:-1})).toThrow();expect(()=>operationalAlerts({...healthy,failedMail:NaN})).toThrow();});
});
