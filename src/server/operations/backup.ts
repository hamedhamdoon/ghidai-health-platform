import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const magic = Buffer.from('GHIDAI-BACKUP-v1\0');
export function encryptBackup(plain: Buffer, key: Buffer): Buffer {
  if (key.length !== 32 || !plain.length) throw new Error('BACKUP_INPUT_REJECTED');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(magic);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
}
export function decryptBackup(archive: Buffer, key: Buffer): Buffer {
  if (key.length !== 32 || archive.length <= magic.length + 28 || !archive.subarray(0, magic.length).equals(magic)) throw new Error('BACKUP_FORMAT_REJECTED');
  const decipher = createDecipheriv('aes-256-gcm', key, archive.subarray(magic.length, magic.length + 12));
  decipher.setAAD(magic);
  decipher.setAuthTag(archive.subarray(magic.length + 12, magic.length + 28));
  return Buffer.concat([decipher.update(archive.subarray(magic.length + 28)), decipher.final()]);
}
export function backupDigest(archive: Buffer): string { return createHash('sha256').update(archive).digest('hex'); }
export function restoreDatabaseName(value: string): string {
  if (!/^ghidai_p11_restore_[0-9]{13}_[a-f0-9]{8}$/.test(value)) throw new Error('ISOLATED_RESTORE_REQUIRED');
  return value;
}
