import React, { useState, useEffect } from 'react';
import { BookOpen, Hash, User, Palette } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Subject, Institution } from '../types/database';
import { subjectService } from '../services/subjectService';
import { institutionService } from '../services/institutionService';

export interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectToEdit?: Subject | null;
  defaultInstitutionId?: string | null;
  onSaved?: () => void;
}

const COLOR_PRESETS = [
  '#0078d4', // Fluent Blue
  '#107c41', // Emerald Green
  '#8764b8', // Purple
  '#d83b01', // Orange / Brick
  '#008272', // Teal
  '#e3008c', // Pink / Magenta
  '#ffb900', // Amber
  '#4f52b2', // Indigo
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  subjectToEdit,
  defaultInstitutionId,
  onSaved,
}) => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionId] = useState<string>('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState<number | ''>(3);
  const [instructor, setInstructor] = useState('');
  const [color, setColor] = useState('#0078d4');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      institutionService.getInstitutions().then((list) => {
        setInstitutions(list);
        if (!subjectToEdit) {
          if (defaultInstitutionId) {
            setInstitutionId(defaultInstitutionId);
          } else if (list.length > 0) {
            setInstitutionId(list[0].id);
          }
        }
      }).catch(console.error);

      if (subjectToEdit) {
        setInstitutionId(subjectToEdit.institution_id);
        setName(subjectToEdit.name);
        setCode(subjectToEdit.code || '');
        setCredits(subjectToEdit.credits ?? 3);
        setInstructor(subjectToEdit.instructor || '');
        setColor(subjectToEdit.color || '#0078d4');
      } else {
        setName('');
        setCode('');
        setCredits(3);
        setInstructor('');
        setColor('#0078d4');
      }
    }
  }, [isOpen, subjectToEdit, defaultInstitutionId]);

  const handleSave = async () => {
    if (!name.trim() || isSaving) {
      setError('نام درس الزامی است.');
      return;
    }
    if (!institutionId) {
      setError('انتخاب دانشگاه یا موسسه آموزشی الزامی است.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (subjectToEdit) {
        await subjectService.updateSubject(subjectToEdit.id, {
          name: name.trim(),
          code: code.trim() || null,
          credits: credits === '' ? null : Number(credits),
          instructor: instructor.trim() || null,
          color,
        });
      } else {
        await subjectService.createSubject({
          institutionId,
          name: name.trim(),
          code: code.trim() || null,
          credits: credits === '' ? null : Number(credits),
          instructor: instructor.trim() || null,
          color,
        });
      }
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره‌سازی درس');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={subjectToEdit ? 'ویرایش درس آکادمیک' : 'افزودن درس جدید'}
      size="md"
    >
      <div className="space-y-4 text-start">
        {error && (
          <div className="p-2.5 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Institution Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            دانشگاه یا موسسه آموزشی <span className="text-red-500">*</span>
          </label>
          {institutions.length === 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ابتدا یک دانشگاه یا موسسه آموزشی ایجاد کنید.
            </p>
          ) : (
            <select
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              disabled={!!subjectToEdit} // Can't move subject between institutions
              className="w-full h-9 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.degree_or_program || inst.type})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Subject Name */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            نام درس / دوره آموزشی <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="مثال: ریاضیات مهندسی، مدارهای الکتریکی، بیوشیمی..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            prefixIcon={<BookOpen className="w-4 h-4" />}
            autoFocus
          />
        </div>

        {/* Course Code & Credits */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
              کد درس
            </label>
            <Input
              placeholder="مثال: MATH-102"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              prefixIcon={<Hash className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
              تعداد واحد
            </label>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="مثال: 3"
              value={credits}
              onChange={(e) => setCredits(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        {/* Instructor */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            استاد / مدرس دوره
          </label>
          <Input
            placeholder="مثال: دکتر احمدی، استاد رضایی..."
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            prefixIcon={<User className="w-4 h-4" />}
          />
        </div>

        {/* Color Palette */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            <span>رنگ تم درس</span>
          </label>
          <div className="flex items-center gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  color === preset ? 'scale-125 ring-2 ring-offset-2 ring-black dark:ring-white' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: preset }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              title="رنگ سفارشی"
            />
          </div>
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
            disabled={!name.trim() || !institutionId || isSaving}
            isLoading={isSaving}
          >
            {subjectToEdit ? 'بروزرسانی درس' : 'افزودن درس'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
