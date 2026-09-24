import { Trash2, Car } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { Vehicle } from '../../types';

export interface DeleteVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleToDelete: Vehicle | null;
  onConfirm: () => void;
}

export function DeleteVehicleModal({
  isOpen,
  onClose,
  vehicleToDelete,
  onConfirm,
}: DeleteVehicleModalProps) {
  if (!vehicleToDelete) return null;

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      icon={Trash2}
      title="Delete Vehicle?"
      description="Are you sure you want to delete this vehicle?"
      confirmLabel="Delete"
      confirmVariant="danger"
      preview={
        <div className="bg-workshop-surface/40 p-4 rounded-xl flex flex-col items-center gap-2 border border-workshop-border/30">
          <div className="w-10 h-10 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center text-[#3B82F6]">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-workshop-text text-base uppercase tracking-tight">
              {vehicleToDelete.make} {vehicleToDelete.model}
            </h4>
            {vehicleToDelete.plateNumber && (
              <span className="block mt-1 text-sm text-[#3B82F6] font-black uppercase tracking-widest font-sans">
                {vehicleToDelete.plateNumber}
              </span>
            )}
          </div>
        </div>
      }
    />
  );
}
