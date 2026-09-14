import React, { useState, useEffect } from 'react';
import { School, Award, Calendar as CalendarIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Institution, InstitutionType } from '../types/database';
import { institutionService } from '../services/institutionService';

export interface InstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutionToEdit?: Institution | null;
  onSaved?: () => void;
}

const TYPE_OPTIONS: { value: InstitutionType; label: string }[] = [
  { value: 'university', label: 'دانشگاه دولتی / آزاد' },
  { value: 'institute', label: 'موسسه آموزش عالی / آکادمی تخصصی' },
  { value: 'school', label: 'مدرسه / دبیرستان' },
  { value: 'self_study', label: 'خودآموزی / یادگیری آزاد' },
];

export const InstitutionModal: React.FC<InstitutionModalProps> = ({
  isOpen,
  onClose,
  institutionToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<InstitutionType>('university');
  const [degreeOrProgram, setDegreeOrProgram] = useState('');
  const [currentTerm, setCurrentTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (institutionToEdit) {
        setName(institutionToEdit.name);
        setType(institutionToEdit.type);
        setDegreeOrProgram(institutionToEdit.degree_or_program || '');
        setCurrentTerm(institutionToEdit.current_term || '');
      } else {
        setName('');
        setType('university');
        setDegreeOrProgram('');
        setCurrentTerm('');
      }
    }
  }, [isOpen, institutionToEdit]);

  const handleSave = async () => {
    if (!name.trim() || isSaving) {
      setError('نام نهاد آموزشی الزامی است.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (institutionToEdit) {
        await institutionService.updateInstitution(institutionToEdit.id, {
          name: name.trim(),
          type,
          degreeOrProgram: degreeOrProgram.trim() || null,
          currentTerm: currentTerm.trim() || null,
        });
      } else {
        await institutionService.createInstitution({
          name: name.trim(),
          type,
          degreeOrProgram: degreeOrProgram.trim() || null,
          currentTerm: currentTerm.trim() || null,
        });
      }
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره‌سازی نهاد آموزشی');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={institutionToEdit ? 'ویرایش نهاد آموزشی' : 'افزودن نهاد آموزشی جدید'}
      size="md"
    >
      <div className="space-y-4 text-start">
        {error && (
          <div className="p-2.5 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Institution Name */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            نام دانشگاه یا موسسه آموزشی <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="مثال: دانشگاه تهران، دانشگاه صنعتی شریف..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            prefixIcon={<School className="w-4 h-4" />}
            autoFocus
          />
        </div>

        {/* Type Select */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            نوع نهاد آموزشی
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as InstitutionType)}
            className="w-full h-9 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Degree or Program */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            مقطع، گرایش یا دوره آموزشی
          </label>
          <Input
            placeholder="مثال: کارشناسی ارشد هوش مصنوعی، دوره تخصصی..."
            value={degreeOrProgram}
            onChange={(e) => setDegreeOrProgram(e.target.value)}
            prefixIcon={<Award className="w-4 h-4" />}
          />
        </div>

        {/* Current Term / Semester */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            نیمسال یا ترم تحصیلی جاری
          </label>
          <Input
            placeholder="مثال: نیمسال دوم ۱۴۰۴-۱۴۰۵ / ترم ۴"
            value={currentTerm}
            onChange={(e) => setCurrentTerm(e.target.value)}
            prefixIcon={<CalendarIcon className="w-4 h-4" />}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            انصراف
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            isLoading={isSaving}
          >
            {institutionToEdit ? 'بروزرسانی نهاد' : 'افزودن نهاد'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
