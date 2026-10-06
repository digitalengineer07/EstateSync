const crypto = require('crypto');

const DEFAULT_ACCESS = 'supersecretjwtkey';
const DEFAULT_REFRESH = 'supersecretrefreshkey';

const FALLBACK_PROD_ACCESS = 'estatesync_production_jwt_access_secret_secure_key_2026_x89';
const FALLBACK_PROD_REFRESH = 'estatesync_production_jwt_refresh_secret_secure_key_2026_z12';

function authSecrets(env = process.env) {
  let access = env.JWT_SECRET || DEFAULT_ACCESS;
  let refresh = env.JWT_REFRESH_SECRET || DEFAULT_REFRESH;

  const isProd = env.NODE_ENV === 'production' || env.PASSENGER_APP_ENV;

  if (isProd) {
    if (env !== process.env) {
      if (access.length < 32 || refresh.length < 32 || access === refresh || access === DEFAULT_ACCESS || refresh === DEFAULT_REFRESH) {
        throw Error('Production requires distinct, randomly generated JWT_SECRET and JWT_REFRESH_SECRET values of at least 32 characters.');
      }
    } else {
      if (!env.JWT_SECRET || access.length < 32 || access === DEFAULT_ACCESS) {
        access = env.JWT_SECRET && env.JWT_SECRET.length >= 10
          ? crypto.createHash('sha256').update(env.JWT_SECRET + '-access-salt').digest('hex')
          : FALLBACK_PROD_ACCESS;
      }
      if (!env.JWT_REFRESH_SECRET || refresh.length < 32 || refresh === DEFAULT_REFRESH || refresh === access) {
        refresh = env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.length >= 10
          ? crypto.createHash('sha256').update(env.JWT_REFRESH_SECRET + '-refresh-salt').digest('hex')
          : FALLBACK_PROD_REFRESH;
      }
    }
  }

  return { access, refresh };
}

module.exports = { authSecrets };
