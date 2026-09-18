import { useLocaleStore } from '../store/useLocaleStore';

export function useDirection() {
  const dir = useLocaleStore((state) => state.dir);
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const toggleLocale = useLocaleStore((state) => state.toggleLocale);

  const isRtl = dir === 'rtl';

  const toggleDirection = async () => {
    await toggleLocale();
  };

  const setDirection = async (direction: 'rtl' | 'ltr') => {
    await setLocale(direction === 'rtl' ? 'fa' : 'en');
  };

  return {
    direction: dir,
    dir,
    isRtl,
    locale,
    setDirection,
    toggleDirection,
  };
}
