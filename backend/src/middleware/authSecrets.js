const DEFAULT_ACCESS = 'supersecretjwtkey';
const DEFAULT_REFRESH = 'supersecretrefreshkey';

function authSecrets(env = process.env) {
  const access = env.JWT_SECRET || DEFAULT_ACCESS;
  const refresh = env.JWT_REFRESH_SECRET || DEFAULT_REFRESH;
  if (env.NODE_ENV === 'production' || env.PASSENGER_APP_ENV) {
    if (access.length < 32 || refresh.length < 32 || access === refresh || access === DEFAULT_ACCESS || refresh === DEFAULT_REFRESH) {
      throw Error('Production requires distinct, randomly generated JWT_SECRET and JWT_REFRESH_SECRET values of at least 32 characters.');
    }
  }
  return { access, refresh };
}

module.exports = { authSecrets };
