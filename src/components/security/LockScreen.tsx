import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Delete, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { securityService } from '../../services/securityService';
import { Button } from '../Button';
import { Modal } from '../Modal';

export const LockScreen: React.FC = () => {
  const { isLocked, pinLength, isLockedOut, getLockoutRemainingSeconds } = useAuthStore();
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [remainingSecs, setRemainingSecs] = useState<number>(0);
  const [showWipeModal, setShowWipeModal] = useState<boolean>(false);
  const [wipeConfirmText, setWipeConfirmText] = useState<string>('');

  // Lockout countdown timer
  useEffect(() => {
    if (!isLocked) return;

    const interval = setInterval(() => {
      const remaining = getLockoutRemainingSeconds();
      setRemainingSecs(remaining);
    }, 1000);

    setRemainingSecs(getLockoutRemainingSeconds());
    return () => clearInterval(interval);
  }, [isLocked, getLockoutRemainingSeconds]);

  const handleKeyPress = useCallback(
    async (digit: string) => {
      if (isLockedOut() || isVerifying) return;
      if (pinInput.length >= pinLength) return;

      const updated = pinInput + digit;
      setPinInput(updated);
      setErrorMsg(null);

      if (updated.length === pinLength) {
        setIsVerifying(true);
        try {
          await securityService.verifyPin(updated);
          setPinInput('');
          setErrorMsg(null);
        } catch (err: any) {
          setErrorMsg(err.message || 'رمز عبور اشتباه است.');
          setPinInput('');
        } finally {
          setIsVerifying(false);
        }
      }
    },
    [pinInput, pinLength, isLockedOut, isVerifying]
  );

  const handleBackspace = useCallback(() => {
    if (isLockedOut() || isVerifying) return;
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  }, [isLockedOut, isVerifying]);

  const handleClear = useCallback(() => {
    if (isLockedOut() || isVerifying) return;
    setPinInput('');
    setErrorMsg(null);
  }, [isLockedOut, isVerifying]);

  // Global keydown handler for mechanical keyboard input
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, handleKeyPress, handleBackspace, handleClear]);

  if (!isLocked) return null;

  const lockedOut = isLockedOut() || remainingSecs > 0;

  const handleEmergencyReset = async () => {
    if (wipeConfirmText !== 'RESET') {
      alert('لطفاً عبارت RESET را دقیقاً وارد کنید.');
      return;
    }
    try {
      await securityService.emergencyReset();
      setShowWipeModal(false);
      alert('پایگاه داده با موفقیت بازنشانی شد.');
    } catch (err: any) {
      alert(`خطا در بازنشانی داده‌ها: ${err.message || err}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f3f3f3]/95 dark:bg-[#181818]/95 backdrop-blur-xl transition-all select-none p-4">
      {/* Brand Header */}
      <div className="flex flex-col items-center space-y-3 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[#0078d4] text-white flex items-center justify-center shadow-lg shadow-[#0078d4]/30 animate-in zoom-in-95">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-[#1f1f1f] dark:text-white">MY ASCEND</h1>
        <p className="text-xs text-[#8a8a8a]">برنامه قفل است — لطفاً رمز عبور (PIN) خود را وارد کنید</p>
      </div>

      {/* Lockout Banner */}
      {lockedOut ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold mb-6 animate-pulse">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>تعداد تلاش‌های ناموفق بیش از حد مجاز. لطفاً {remainingSecs} ثانیه دیگر شکیبا باشید.</span>
        </div>
      ) : (
        /* PIN Masked Input Dots */
        <div className="flex items-center gap-4 mb-6">
          {Array.from({ length: pinLength }).map((_, i) => {
            const isFilled = i < pinInput.length;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  isFilled
                    ? 'bg-[#0078d4] border-[#0078d4] scale-110 shadow-sm shadow-[#0078d4]/50'
                    : 'border-black/20 dark:border-white/20 bg-transparent'
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && !lockedOut && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold mb-4 animate-bounce">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* On-Screen Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-8">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            disabled={lockedOut || isVerifying}
            className="h-14 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#252526]/70 hover:bg-[#0078d4] hover:text-white dark:hover:bg-[#0078d4] dark:hover:text-white text-lg font-bold text-[#1f1f1f] dark:text-white shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {num}
          </button>
        ))}

        <button
          onClick={handleClear}
          disabled={lockedOut || isVerifying || pinInput.length === 0}
          className="h-14 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-[#8a8a8a] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          پاک‌کردن
        </button>

        <button
          onClick={() => handleKeyPress('0')}
          disabled={lockedOut || isVerifying}
          className="h-14 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#252526]/70 hover:bg-[#0078d4] hover:text-white dark:hover:bg-[#0078d4] dark:hover:text-white text-lg font-bold text-[#1f1f1f] dark:text-white shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          0
        </button>

        <button
          onClick={handleBackspace}
          disabled={lockedOut || isVerifying || pinInput.length === 0}
          className="h-14 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#616161] dark:text-[#adadad] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Emergency Wipe Action Trigger */}
      <button
        onClick={() => setShowWipeModal(true)}
        className="flex items-center gap-1.5 text-xs text-[#8a8a8a] hover:text-red-500 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>رمز عبور را فراموش کرده‌اید؟ (بازنشانی اضطراری)</span>
      </button>

      {/* Emergency Data Reset Modal */}
      <Modal
        isOpen={showWipeModal}
        onClose={() => setShowWipeModal(false)}
        title="بازنشانی اضطراری پایگاه داده"
        size="sm"
      >
        <div className="space-y-4 text-start">
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <p>
              هشدار بسیار مهم: این عمل تمامی اطلاعات برنامه (تسک‌ها، ژورنال‌ها، مباحث و تنظیمات) را به طور کامل پاک خواهد کرد.
            </p>
          </div>

          <p className="text-xs text-[#616161] dark:text-[#adadad]">
            جهت تایید نهایی، عبارت <span className="font-mono font-bold text-red-500">RESET</span> را در کادر زیر تایپ کنید:
          </p>

          <input
            type="text"
            value={wipeConfirmText}
            onChange={(e) => setWipeConfirmText(e.target.value)}
            placeholder="عبارت RESET را وارد کنید"
            className="w-full px-3 py-2 border border-black/10 dark:border-white/10 rounded-md font-mono text-sm bg-black/5 dark:bg-white/5 focus:outline-none focus:border-red-500"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="subtle" size="sm" onClick={() => setShowWipeModal(false)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleEmergencyReset}
              disabled={wipeConfirmText !== 'RESET'}
            >
              پاک‌سازی و بازنشانی کامل
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
