// Expo reads EXPO_PUBLIC_* values while creating the Android bundle. Keeping
// the address in `extra` also makes it visible through expo-constants at run
// time, which is safer than relying on a development Metro address.
module.exports = ({ config }) => {
  const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const apiUrl =
    typeof rawApiUrl === 'string' && rawApiUrl.trim()
      ? rawApiUrl.trim()
      : null;

  return {
    ...config,
    platforms: ['android'],
    extra: {
      ...config.extra,
      apiUrl,
    },
    android: {
      ...config.android,
      permissions: ['android.permission.CAMERA', 'android.permission.INTERNET'],
    },
  };
};
