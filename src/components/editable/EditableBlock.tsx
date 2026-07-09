/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditMode } from '../../features/cms/useEditMode';
import { Edit3, RotateCcw, Shield } from 'lucide-react';
import EditModal from './EditModal';

interface EditableBlockProps {
  pageKey: string;
  blockKey: string;
  title: string;
  defaultData: any;
  overrideData: any;
  onSave: (blockKey: string, data: any) => Promise<void>;
  onReset: (blockKey: string) => Promise<void>;
  children: React.ReactNode;
}

export default function EditableBlock({
  pageKey,
  blockKey,
  title,
  defaultData,
  overrideData,
  onSave,
  onReset,
  children,
}: EditableBlockProps) {
  const { editMode } = useEditMode();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const hasOverride = !!overrideData && overrideData.is_enabled !== false;

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc chắn muốn khôi phục khối "${title}" về giá trị mặc định của hệ thống?`)) {
      setIsResetting(true);
      try {
        await onReset(blockKey);
      } catch (err) {
        console.error('Failed to reset block overrides:', err);
      } finally {
        setIsResetting(false);
      }
    }
  };

  if (!editMode) {
    return <>{children}</>;
  }

  return (
    <div className="relative group/block border-2 border-dashed border-indigo-500/40 hover:border-indigo-600/80 rounded-[2.2rem] transition-all duration-300 p-1.5 my-2">
      {/* Floating Control Badges */}
      <div className="absolute top-4 right-4 z-40 flex items-center space-x-2 opacity-100 md:opacity-0 md:group-hover/block:opacity-100 transition-all duration-200">
        {/* Info Label */}
        <div className="flex items-center space-x-1.5 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md uppercase tracking-wider">
          <Shield className="h-3 w-3" />
          <span>{title}</span>
        </div>

        {/* Restore Defaults Button */}
        {hasOverride && (
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-md active:scale-[0.98] transition-all duration-150 cursor-pointer"
            title="Khôi phục về mặc định"
          >
            <RotateCcw className={`h-3 w-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Mặc định</span>
          </button>
        )}

        {/* Edit Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-md active:scale-[0.98] transition-all duration-150 cursor-pointer"
        >
          <Edit3 className="h-3 w-3" />
          <span>Sửa khối</span>
        </button>
      </div>

      {children}

      {/* Editing Modal */}
      {isModalOpen && (
        <EditModal
          title={`Chỉnh sửa: ${title}`}
          pageKey={pageKey}
          blockKey={blockKey}
          defaultData={defaultData}
          overrideData={overrideData?.data}
          onClose={() => setIsModalOpen(false)}
          onSave={async (data) => {
            await onSave(blockKey, data);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
