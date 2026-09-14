import { useSettingsStore } from '../store/useSettingsStore';

export function useDirection() {
  const direction = useSettingsStore((state) => state.settings.direction);
  const setDirection = useSettingsStore((state) => state.setDirection);

  const isRtl = direction === 'rtl';

  const toggleDirection = () => {
    setDirection(isRtl ? 'ltr' : 'rtl');
  };

  return {
    direction,
    isRtl,
    setDirection,
    toggleDirection,
  };
}
