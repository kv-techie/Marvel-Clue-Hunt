export const useDeviceTier = () => {
  const cores = navigator.hardwareConcurrency || 2;
  const memory = navigator.deviceMemory || 2; // GB
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  if (isMobile && (cores <= 4 || memory <= 2)) return 'low';
  if (cores <= 4 || memory <= 4) return 'mid';
  return 'high';
};
