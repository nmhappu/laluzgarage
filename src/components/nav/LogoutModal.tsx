import { AlertTriangle } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

interface LogoutModalProps {
  isOpen: boolean;
  isLoggingOut: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutModal({
  isOpen,
  isLoggingOut,
  onClose,
  onConfirm,
}: LogoutModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      icon={AlertTriangle}
      title="End Session?"
      description="Are you sure you want to log out? You will need to sign in again to access the workshop dashboard."
      confirmLabel="Log Out"
      loadingLabel="Signing out..."
      isLoading={isLoggingOut}
      confirmVariant="danger"
      backHandlerPriority={80}
      confirmButtonId="confirm-logout-btn"
    />
  );
}
