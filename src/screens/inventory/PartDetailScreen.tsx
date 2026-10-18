import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isLowStock } from '../../core/catalog';
import { formatInrWhole } from '../../core/format';
import { deletePart, errorText } from '../../data/repository';
import { useData } from '../../data/store';
import { useBack } from '../../app/shellContext';
import { DeleteEditBar, DetailField, DetailRow, SectionCard, StatusChip } from '../../ui/components';
import { DetailTopBar } from '../../ui/chrome';
import { ConfirmDialog } from '../../ui/overlays';
import { EmptyText } from '../../ui/listChrome';
import { PartFormSheet } from './PartFormSheet';

export function PartDetailScreen() {
  const { partId = '' } = useParams();
  const { parts, isLoading, showMessage } = useData();
  const back = useBack('/inventory');
  const navigate = useNavigate();
  const part = parts.find((p) => p.id === partId) ?? null;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!part) {
    return (
      <div className="flex h-full flex-col bg-surface">
        <DetailTopBar title="Part" backLabel="Back to inventory" onBack={back} />
        <EmptyText>{isLoading ? 'Loading part…' : 'This part is no longer in inventory.'}</EmptyText>
      </div>
    );
  }
  const low = isLowStock(part);

  const remove = async () => {
    setConfirmDelete(false);
    try {
      await deletePart(part.id);
      showMessage('Part deleted');
      navigate('/inventory', { replace: true });
    } catch (e) {
      showMessage(`Couldn't delete the part. ${errorText(e)}`);
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <DetailTopBar title="Part" backLabel="Back to inventory" onBack={back} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[640px]">
          <div className="flex flex-col gap-2 px-6 pt-2 pb-6">
            <h2 className="m-0 text-on-surface t-headline-md">{part.name}</h2>
            {part.category.trim() && <p className="m-0 text-on-surface-variant t-body-lg">{part.category}</p>}
            {low && (
              <div className="pt-1">
                <StatusChip text="Low stock" tone="pending" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 px-4 pb-6">
            <SectionCard title="Stock">
              <DetailRow>
                <StockFigure label="In stock" value={String(part.stockQuantity)} warning={low} />
                <StockFigure label="Minimum stock" value={String(part.minStockLevel)} />
              </DetailRow>
              {low && <p className="m-0 rounded-md bg-warning-container px-4 py-3 text-on-warning-container t-label-lg">Stock is at or below the minimum of {part.minStockLevel}.</p>}
            </SectionCard>
            <SectionCard title="Pricing">
              <DetailRow>
                <DetailField label="Unit price" value={formatInrWhole(part.price)} />
                <DetailField label="Stock value" value={formatInrWhole(part.price * part.stockQuantity)} />
              </DetailRow>
            </SectionCard>
            <SectionCard title="Storage">
              <DetailRow>
                <DetailField label="Category" value={part.category.trim() || '—'} />
                <DetailField label="Location" value={part.location.trim() || 'Not set'} valueClassName={part.location.trim() ? undefined : 'text-on-surface-variant'} />
              </DetailRow>
            </SectionCard>
          </div>
        </div>
      </div>
      <DeleteEditBar deleteLabel="Delete part" editLabel="Edit part" onDelete={() => setConfirmDelete(true)} onEdit={() => setEditing(true)} />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete part?"
        body={`${part.name} is removed from inventory. Job cards that used it keep their bill lines.`}
        confirmText="Delete"
        dismissText="Cancel"
        onConfirm={() => void remove()}
        onDismiss={() => setConfirmDelete(false)}
      />
      <PartFormSheet
        open={editing}
        part={part}
        onDismiss={() => setEditing(false)}
        onDelete={() => {
          setEditing(false);
          setConfirmDelete(true);
        }}
      />
    </div>
  );
}

function StockFigure({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-on-surface-variant t-body-sm">{label}</span>
      <span className={warning ? 'text-warning t-display-sm' : 'text-on-surface t-display-sm'}>{value}</span>
    </div>
  );
}
