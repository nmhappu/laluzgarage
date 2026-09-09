import { useInventory } from '../hooks/useInventory';
import { InventoryList } from './inventory/InventoryList';
import { PartFormModal } from './inventory/PartFormModal';
import { DeletePartModal } from './inventory/DeletePartModal';

export function Inventory() {
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
        onAddClick={() => setShowAddModal(true)}
        onPartClick={(part) => {
          setEditingPart(part);
          setShowEditModal(true);
        }}
      />

      {/* Add Modal */}
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

      {/* Edit Modal */}
      {editingPart && (
        <PartFormModal
          isOpen={showEditModal}
          mode="edit"
          partData={editingPart}
          onChange={(updated) => setEditingPart(updated as typeof editingPart)}
          onSubmit={(e) => {
            e.preventDefault();
            if (editingPart?.id) {
              updatePart(editingPart.id, editingPart);
            }
          }}
          onClose={() => {
            setShowEditModal(false);
            setEditingPart(null);
          }}
          onDelete={() => {
            setPartToDelete(editingPart);
            setShowEditModal(false);
            setShowDeleteConfirm(true);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
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
    </>
  );
}
