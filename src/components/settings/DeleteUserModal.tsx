import { Trash2 } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

export interface DeleteUserModalProps {
  userToDelete: { id: string; name: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  error: string | null;
}

export function DeleteUserModal({
  userToDelete,
  onCancel,
  onConfirm,
  isDeleting,
  error,
}: DeleteUserModalProps) {
  return (
    <ConfirmModal
      isOpen={Boolean(userToDelete)}
      onClose={onCancel}
      onConfirm={onConfirm}
      icon={Trash2}
      title="Delete Advisor?"
      description={
        userToDelete ? (
          <>
            Are you sure you want to permanently delete advisor{' '}
            <span className="font-semibold text-workshop-text">&quot;{userToDelete.name}&quot;</span>? This action cannot be undone.
          </>
        ) : (
          ''
        )
      }
      confirmLabel="Delete"
      loadingLabel="Deleting..."
      isLoading={isDeleting}
      confirmVariant="danger"
      backHandlerPriority={85}
      preview={
        error ? (
          <div className="p-3 bg-status-urgent/10 border border-status-urgent/20 rounded-lg text-status-urgent text-xs font-semibold text-left">
            {error}
          </div>
        ) : null
      }
    />
  );
}
