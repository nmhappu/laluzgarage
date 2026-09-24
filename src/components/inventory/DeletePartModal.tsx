import { Trash2 } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { Part } from '../../types';

export interface DeletePartModalProps {
  isOpen: boolean;
  part: Part | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeletePartModal({ isOpen, part, onClose, onConfirm }: DeletePartModalProps) {
  if (!part) return null;

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      icon={Trash2}
      title="Liquidate Asset?"
      description={
        <>
          Are you sure you want to permanently delete{' '}
          <span className="font-bold text-workshop-text underline">{part.name}</span> from the inventory log?
        </>
      }
      confirmLabel="Confirm Delete"
      confirmVariant="danger"
    />
  );
}
