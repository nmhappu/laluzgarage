import { AlertTriangle } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

export interface DiscardIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DiscardIntakeModal({
  isOpen,
  onClose,
  onConfirm,
}: DiscardIntakeModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      icon={AlertTriangle}
      title="Discard Intake Progress?"
      description="You have unsaved changes in this service intake. If you exit now, your current intake details will be discarded."
      cancelLabel="Keep Editing"
      confirmLabel="Discard & Exit"
      confirmVariant="danger"
    />
  );
}
