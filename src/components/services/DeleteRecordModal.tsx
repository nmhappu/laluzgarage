import { AlertTriangle } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { ServiceRecord } from '../../types';

export interface DeleteRecordModalProps {
  recordToDelete: ServiceRecord | null;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export function DeleteRecordModal({
  recordToDelete,
  onClose,
  onConfirmDelete,
}: DeleteRecordModalProps) {
  return (
    <ConfirmModal
      isOpen={Boolean(recordToDelete)}
      onClose={onClose}
      onConfirm={onConfirmDelete}
      icon={AlertTriangle}
      title="Purge Record?"
      description="Are you certain you want to delete this job card? This action will permanently remove the record and revert used parts to inventory."
      confirmLabel="Purge"
      confirmVariant="danger"
    />
  );
}
