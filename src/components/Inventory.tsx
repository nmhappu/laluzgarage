import { useInventory } from '../hooks/useInventory';
import { InventoryList } from './inventory/InventoryList';
import { PartFormModal } from './inventory/PartFormModal';
import { DeletePartModal } from './inventory/DeletePartModal';
import { useAuth } from '../contexts/AuthContext';
import { getUserRole } from '../types';

export function Inventory() {
  const { profile } = useAuth();
  const role = getUserRole(profile);
  const isAdmin = role === 'admin';
  const isTechnician = role === 'technician' || role === 'admin';
  const isAssistant = role === 'assistant';

  const {
    filteredParts,
    loading,
    showAddModal,
    setShowAddModal,
    showEditModal,
    setShowEditModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    newPart,
    setNewPart,
    editingPart,
    setEditingPart,
    partToDelete,
    setPartToDelete,
    addPart,
    updatePart,
    deletePart,
  } = useInventory();

  return (
    <>
      <InventoryList
        parts={filteredParts}
        loading={loading}
        onAddClick={isTechnician ? () => setShowAddModal(true) : undefined}
        onPartClick={(part) => {
          setEditingPart(part);
          setShowEditModal(true);
        }}
      />

      {/* Add Modal (Technicians & Admins) */}
      {isTechnician && (
        <PartFormModal
          isOpen={showAddModal}
          mode="add"
          partData={newPart}
          onChange={setNewPart}
          onSubmit={(e) => {
            e.preventDefault();
            addPart(newPart);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit / View Modal */}
      {editingPart && (
        <PartFormModal
          isOpen={showEditModal}
          mode="edit"
          readOnly={isAssistant}
          partData={editingPart}
          onChange={(updated) => setEditingPart(updated as typeof editingPart)}
          onSubmit={(e) => {
            e.preventDefault();
            if (isTechnician && editingPart?.id) {
              updatePart(editingPart.id, editingPart);
            }
          }}
          onClose={() => {
            setShowEditModal(false);
            setEditingPart(null);
          }}
          onDelete={
            isAdmin
              ? () => {
                  setPartToDelete(editingPart);
                  setShowEditModal(false);
                  setShowDeleteConfirm(true);
                }
              : undefined
          }
        />
      )}

      {/* Delete Confirmation Modal (Admin only) */}
      {isAdmin && (
        <DeletePartModal
          isOpen={showDeleteConfirm}
          part={partToDelete}
          onClose={() => {
            setShowDeleteConfirm(false);
            if (partToDelete) {
              setEditingPart(partToDelete);
              setShowEditModal(true);
            }
          }}
          onConfirm={deletePart}
        />
      )}
    </>
  );
}
export default Inventory;
