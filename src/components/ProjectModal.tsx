import React, { useState, useEffect } from 'react';
import { Folder, Calendar as CalendarIcon, Flag } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Project, TaskPriority } from '../types/database';
import { projectService } from '../services/projectService';

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
  onProjectSaved?: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
  onProjectSaved,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setTitle(projectToEdit.title);
        setDescription(projectToEdit.description || '');
        setDeadline(projectToEdit.deadline ? projectToEdit.deadline.split('T')[0] : '');
        setPriority(projectToEdit.priority);
      } else {
        setTitle('');
        setDescription('');
        setDeadline('');
        setPriority('medium');
      }
    }
  }, [isOpen, projectToEdit]);

  const handleSave = async () => {
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      if (projectToEdit) {
        await projectService.updateProject(projectToEdit.id, {
          title,
          description: description || null,
          deadline: deadline ? `${deadline}T23:59:59.000Z` : null,
          priority,
        });
      } else {
        await projectService.createProject({
          title,
          description: description || null,
          deadline: deadline ? `${deadline}T23:59:59.000Z` : null,
          priority,
        });
      }

      onProjectSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={projectToEdit ? 'ویرایش پروژه' : 'ایجاد پروژه جدید'}
      description="پروژه‌ها جریان‌های متمرکز کاری برای گروه‌بندی وظایف هستند"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={onClose}>
            انصراف
          </Button>
          <Button
            variant="primary"
            disabled={!title.trim() || isSaving}
            isLoading={isSaving}
            onClick={handleSave}
            icon={<Folder className="w-4 h-4" />}
          >
            {projectToEdit ? 'ذخیره پروژه' : 'ایجاد پروژه'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="عنوان پروژه *"
          placeholder="مثلاً راه‌اندازی وب‌سایت، انتشار مقاله..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-xs font-medium text-[#616161] dark:text-[#adadad]">
            هدف و شرح پروژه
          </label>
          <textarea
            rows={3}
            placeholder="دستاورد نهایی و خروجی‌های مورد انتظار این پروژه..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-[#2b2b2b] p-3 text-sm text-[#1f1f1f] dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 text-start">
            <label className="text-xs font-medium text-[#616161] dark:text-[#adadad] flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>مهلت پایان پروژه (Deadline)</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-white dark:bg-[#2b2b2b] text-sm text-[#1f1f1f] dark:text-white rounded-md border border-black/15 dark:border-white/15 p-1.5 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-start">
            <label className="text-xs font-medium text-[#616161] dark:text-[#adadad] flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>اولویت کلی</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full bg-white dark:bg-[#2b2b2b] text-sm text-[#1f1f1f] dark:text-white rounded-md border border-black/15 dark:border-white/15 p-2 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
            >
              <option value="urgent">بحرانی / Urgent</option>
              <option value="high">بالا / High</option>
              <option value="medium">متوسط / Medium</option>
              <option value="low">عادی / Low</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
};
