const STORAGE_PREFIX = 'leftover_radar_draft_';

export const saveDraftPortions = (
  serviceDate: string,
  servicePeriod: string,
  portionsMap: Record<string, number>
) => {
  try {
    const key = `${STORAGE_PREFIX}${serviceDate}_${servicePeriod.toLowerCase()}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        portions: portionsMap,
      })
    );
  } catch (err) {
    console.warn('Failed to cache draft portions to localStorage:', err);
  }
};

export const loadDraftPortions = (
  serviceDate: string,
  servicePeriod: string
): Record<string, number> | null => {
  try {
    const key = `${STORAGE_PREFIX}${serviceDate}_${servicePeriod.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.portions || null;
  } catch (err) {
    console.warn('Failed to load draft portions from localStorage:', err);
    return null;
  }
};

export const clearDraftPortions = (serviceDate: string, servicePeriod: string) => {
  try {
    const key = `${STORAGE_PREFIX}${serviceDate}_${servicePeriod.toLowerCase()}`;
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('Failed to clear draft portions from localStorage:', err);
  }
};
