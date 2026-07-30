export default ({ config }) => {
  const isLocal = process.env.APP_ENV === "local";

  return {
    ...config,
    plugins: [...(config.plugins ?? []), "expo-secure-store"],
    name: isLocal ? "VoteRight Local" : "VoteRight",
    android: {
      ...config.android,
      package: isLocal ? "com.dpimatrix.voteright.mobile.local" : "com.dpimatrix.voteright.mobile",
    },
    ios: {
      ...config.ios,
      bundleIdentifier: isLocal ? "com.dpimatrix.voteright.local" : "com.dpimatrix.voteright",
    },
    extra: {
      ...config.extra,
      apiUrl: isLocal ? "http://192.168.86.205:3000" : "https://voteright.dpimatrix.com",
      webUrl: isLocal ? "http://192.168.86.205:3000" : "https://voteright.dpimatrix.com",
    },
  };
};
