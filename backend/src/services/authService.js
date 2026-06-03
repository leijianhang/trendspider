import crypto from 'crypto';
import { getHunterDbPool } from './hunterDb.js';

const HUNTER_USER_TABLE = 'hunter_user';
const PASSWORD_SALT = 'popper_hunter';
const PASSWORD_DIGEST_COUNT = 3;

const sha1Bytes = bytes =>
  crypto
    .createHash('sha1')
    .update(bytes)
    .digest();

const hashPassword = password => {
  let digest = Buffer.from(String(password || ''), 'utf8');
  const salt = Buffer.from(PASSWORD_SALT, 'utf8');

  for (let index = 0; index < PASSWORD_DIGEST_COUNT; index += 1) {
    digest = index === 0
      ? sha1Bytes(Buffer.concat([salt, digest]))
      : sha1Bytes(digest);
  }

  return digest.toString('hex');
};

export const authenticateHunterUser = async ({ username, password }) => {
  const account = String(username || '').trim();
  const rawPassword = String(password || '');

  if (!account || !rawPassword) return null;

  const passwordHash = hashPassword(rawPassword);
  const [rows] = await getHunterDbPool().query(
    `SELECT id, account, phone
     FROM ${HUNTER_USER_TABLE}
     WHERE account = ? AND LOWER(password) = ?
     LIMIT 1`,
    [account, passwordHash]
  );

  const user = rows[0];
  if (!user) return null;

  return {
    id: user.id,
    account: user.account,
    phone: user.phone || ''
  };
};
