import { useState } from 'react';
import type { Part } from '../../types';
import { formatInrWhole } from '../../core/format';
import { errorText, savePart } from '../../data/repository';
import { useData } from '../../data/store';
import { PillButton } from '../../ui/components';
import { FilledField } from '../../ui/fields';
import { Icon } from '../../ui/icons';
import { BottomSheet } from '../../ui/overlays';

const EMPTY: Part = { id: '', name: '', category: '', stockQuantity: 0, price: 0, minStockLevel: 5, location: '' };
const digits = (raw: string) => raw.replace(/\D/g, '').slice(0, 7);
const MAX_COUNT = 9_999_999;

/** Create / edit part sheet (PartFormSheet in PartDetailScreen.kt). No [part] creates a new one; [onDelete] shows Delete when editing. */
export function PartFormSheet({ open, part, onDismiss, onDelete }: { open: boolean; part: Part | null; onDismiss: () => void; onDelete?: () => void }) {
  return open ? <PartForm part={part} onDismiss={onDismiss} onDelete={onDelete} /> : null;
}

function PartForm({ part, onDismiss, onDelete }: { part: Part | null; onDismiss: () => void; onDelete?: () => void }) {
  const { showMessage } = useData();
  const source = part ?? EMPTY;
  const [name, setName] = useState(source.name);
  const [category, setCategory] = useState(source.category);
  const [price, setPrice] = useState(part ? String(Math.trunc(source.price)) : '');
  const [stock, setStock] = useState(source.stockQuantity);
  const [minimum, setMinimum] = useState(source.minStockLevel);
  const [location, setLocation] = useState(source.location);
  const [saving, setSaving] = useState(false);
  const valid = name.trim() !== '' && price !== '';
  const changes = part
    ? [
        name.trim() !== source.name,
        category.trim() !== source.category,
        price !== String(Math.trunc(source.price)),
        stock !== source.stockQuantity,
        minimum !== source.minStockLevel,
        location.trim() !== source.location,
      ].filter(Boolean).length
    : 0;

  const save = async () => {
    setSaving(true);
    try {
      await savePart({
        ...source,
        name: name.trim(),
        category: category.trim(),
        price: Number(price || 0),
        stockQuantity: stock,
        minStockLevel: minimum,
        location: location.trim(),
      });
      showMessage('Part saved');
      onDismiss();
    } catch (e) {
      setSaving(false);
      showMessage(`Couldn't save the part. ${errorText(e)}`);
    }
  };

  const title = part ? 'Edit part' : 'Create part';
  return (
    <BottomSheet open onDismiss={onDismiss} title={title}>
      <div className="flex flex-col gap-4 px-6 pb-6">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="m-0 text-on-surface t-title-lg">{title}</h3>
            {part && <p className="m-0 text-on-surface-variant t-body-sm">{changes === 0 ? 'No changes yet' : `${changes} unsaved ${changes === 1 ? 'change' : 'changes'}`}</p>}
          </div>
          {part && onDelete && (
            <button type="button" onClick={onDelete} className="h-10 cursor-pointer rounded-full border-0 bg-transparent px-4 text-error t-label-lg">
              Delete
            </button>
          )}
        </div>
        <FilledField label="Part name" placeholder="e.g. Oil filter · Hyundai" value={name} onValue={setName} />
        <FilledField label="Category" placeholder="e.g. Filters" value={category} onValue={setCategory} />
        <div className="grid grid-cols-2 gap-2">
          <StepperField label="In stock" value={stock} onValue={setStock} />
          <StepperField label="Minimum stock" value={minimum} onValue={setMinimum} />
        </div>
        <FilledField
          label="Unit price"
          placeholder="e.g. 420"
          inputMode="numeric"
          value={price}
          onValue={(v) => setPrice(digits(v))}
          trailing={<span className="pr-3 text-on-surface-variant t-body-md">₹</span>}
        />
        <FilledField label="Location" placeholder="e.g. Cabinet B, Shelf 2" value={location} onValue={setLocation} />
        <div className="flex items-baseline justify-between px-1">
          <span className="text-on-surface-variant t-body-md">Stock value</span>
          <span className="text-on-surface t-title-sm">{formatInrWhole(Number(price || 0) * stock)}</span>
        </div>
        <PillButton text={part ? 'Save changes' : 'Create part'} disabled={!valid} loading={saving} onClick={() => void save()} className="w-full bg-primary text-on-primary" />
      </div>
    </BottomSheet>
  );
}

/** Filled-field look with the count, then + and -, inside the box (StepperField in PartDetailScreen.kt). */
function StepperField({ label, value, onValue }: { label: string; value: number; onValue: (v: number) => void }) {
  const lower = label.toLowerCase();
  const button = 'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-on-surface hover:bg-surface-container-highest';
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="text-on-surface-variant t-label-lg">{label}</span>
      <div className="flex h-14 items-center rounded-lg bg-surface-container-high pl-4 pr-1">
        <output aria-live="polite" className="min-w-0 flex-1 text-on-surface t-body-lg">
          {value}
        </output>
        <button type="button" aria-label={`Increase ${lower}`} className={button} onClick={() => onValue(Math.min(MAX_COUNT, value + 1))}>
          <Icon name="plus" size={22} />
        </button>
        <button type="button" aria-label={`Decrease ${lower}`} className={button} onClick={() => onValue(Math.max(0, value - 1))}>
          <Icon name="minus" size={22} />
        </button>
      </div>
    </div>
  );
}
