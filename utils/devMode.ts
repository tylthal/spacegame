const DEV_FLAG_PREFIX = 'spacegame_dev_';

const parseBoolean = (value: string | null) => {
  if (value === null) return null;
  const normalized = value.toLowerCase();
  return normalized === '1' || normalized === 'true';
};

export const isDevFeatureEnabled = (feature: string, defaultValue = false) => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has(feature)) {
      const paramValue = params.get(feature);
      const parsedParam = parseBoolean(paramValue);
      return parsedParam ?? true;
    }

    const storedValue = window.localStorage.getItem(`${DEV_FLAG_PREFIX}${feature}`);
    const parsedStored = parseBoolean(storedValue);
    if (parsedStored !== null) return parsedStored;
  } catch (error) {
    console.warn('Unable to read dev feature flag', feature, error);
  }

  return defaultValue;
};
