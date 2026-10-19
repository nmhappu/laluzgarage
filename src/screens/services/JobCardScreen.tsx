import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import type { Part, ServiceRecord } from '../../types';
import { parseRecordDate, relativeDayLabel, timestampDate, today, weekdayLabel } from '../../core/dates';
import { cn, formatGrouped, formatInrWhole } from '../../core/format';
import { displayName, dueFlag, formatPlate, jobChanges, jobStatusOf, modelLabel, parseTasks, securityOf, serializeTasks, tasksFromText } from '../../core/jobs';
import { isLowStock } from '../../core/catalog';
import { buildWhatsAppUrl, formatDeliveryMessage, telUrl } from '../../core/whatsapp';
import { deleteServiceRecord, errorText, updateServiceRecord } from '../../data/repository';
import { useData } from '../../data/store';
import { useBack } from '../../app/shellContext';
import { ConnectedSegments, ContactRow, DetailField, DetailRow, FilterChip, IconButton, OutlinedPillButton, PillButton, PinBadge, SectionCard, StatusChip, TextButton } from '../../ui/components';
import { TopBar } from '../../ui/chrome';
import { OutlinedField, SearchField } from '../../ui/fields';
import { Icon } from '../../ui/icons';
import { BottomSheet, ConfirmDialog } from '../../ui/overlays';
import { BatteryBadge, BatteryField } from '../../ui/battery';
import { shareCapture } from '../../ui/share';
import { EmptyText } from '../../ui/listChrome';
import { PartFormSheet } from '../inventory/PartFormSheet';

/** Status options on the job card. "Delivered" is the label for the stored `completed` status. */
const CARD_STATUSES = ['pending', 'in-progress', 'completed'] as const;
type CardStatus = (typeof CARD_STATUSES)[number];
const CARD_STATUS_LABEL: Record<CardStatus, string> = { pending: 'Pending', 'in-progress': 'In progress', completed: 'Delivered' };

const sameRecord = (a: ServiceRecord, b: ServiceRecord) => JSON.stringify({ ...a, createdAt: 0, updatedAt: 0 }) === JSON.stringify({ ...b, createdAt: 0, updatedAt: 0 });

export function JobCardScreen() {
  const { recordId = '' } = useParams();
  const { records, vehicles, customers, parts, presets, isLoading, showMessage } = useData();
  const back = useBack('/services');
  const navigate = useNavigate();
  const stored = records.find((r) => r.id === recordId) ?? null;

  const [original, setOriginal] = useState<ServiceRecord | null>(stored);
  const [record, setRecord] = useState<ServiceRecord | null>(stored);
  useEffect(() => {
    if (!original && stored) {
      setOriginal(stored);
      setRecord(stored);
    }
  }, [stored, original]);

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showParts, setShowParts] = useState(false);
  const [creatingPart, setCreatingPart] = useState(false);
  const leaving = useRef(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const isDirty = record !== null && original !== null && !sameRecord(record, original);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname);

  if (!record) {
    return (
      <div className="flex h-full flex-col bg-surface">
        <TopBar startPadding={4}>
          <IconButton icon="arrowBackShort" label="Back to services" onClick={back} className="text-on-surface" />
          <h1 className="m-0 flex-1 text-on-surface t-title-lg">Job card</h1>
        </TopBar>
        <EmptyText>{isLoading ? 'Loading job card…' : 'This job card no longer exists.'}</EmptyText>
      </div>
    );
  }

  const vehicle = vehicles.get(record.vehicleId) ?? null;
  const customer = customers.get(record.customerId) ?? null;
  const phone = customer?.phone ?? '';
  const status = jobStatusOf(record.status).value;
  const cardStatus: CardStatus = status === 'completed' ? 'completed' : status === 'in-progress' ? 'in-progress' : 'pending';
  const isDelivered = status === 'completed';
  const needsOdometer = isDelivered && !record.isDeadVehicle && !record.isUnknownMileage;
  const odometerValid = !needsOdometer || (record.completionMileage ?? -1) >= record.mileage;
  const todayDate = today();
  const due = dueFlag(record, todayDate);
  const security = securityOf(vehicle?.passwordOrPin);

  const edit = (fn: (r: ServiceRecord) => ServiceRecord) => {
    setRecord((r) => (r ? fn(r) : r));
    setJustSaved(false);
  };
  const withParts = (r: ServiceRecord, partsUsed: ServiceRecord['partsUsed']): ServiceRecord => {
    const partsTotal = partsUsed.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
    return { ...r, partsUsed, partsCost: partsTotal, totalCost: r.laborCost + partsTotal };
  };
  const addPart = (part: Part) =>
    edit((r) => {
      const i = r.partsUsed.findIndex((p) => p.partId === part.id);
      const next = [...r.partsUsed];
      if (i >= 0) next[i] = { ...next[i], quantity: next[i].quantity + 1 };
      else next.push({ partId: part.id, name: part.name, quantity: 1, unitPrice: part.price });
      return withParts(r, next);
    });
  const changeQuantity = (index: number, delta: number) =>
    edit((r) => {
      const next = [...r.partsUsed];
      const q = next[index].quantity + delta;
      if (q <= 0) next.splice(index, 1);
      else next[index] = { ...next[index], quantity: q };
      return withParts(r, next);
    });

  const close = () => {
    leaving.current = true;
    back();
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateServiceRecord(record.id, original ? jobChanges(original, record) : {});
      setOriginal(record);
      setJustSaved(true);
      setSaving(false);
      close();
    } catch (e) {
      setSaving(false);
      showMessage(`Couldn't save the job card. ${errorText(e)}`);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    try {
      await deleteServiceRecord(record.id);
      showMessage('Job card deleted');
      leaving.current = true;
      navigate('/services', { replace: true });
    } catch (e) {
      showMessage(`Couldn't delete the job card. ${errorText(e)}`);
    }
  };

  const wasDelivered = original ? jobStatusOf(original.status).value === 'completed' : false;
  const deliveredOn = !isDelivered ? null : wasDelivered ? timestampDate(record.updatedAt) ?? todayDate : todayDate;
  const plate = formatPlate(vehicle?.plateNumber);

  return (
    <div className="flex h-full flex-col bg-surface">
      <TopBar startPadding={4}>
        <IconButton icon="arrowBackShort" label="Back to services" onClick={back} className="text-on-surface" />
        <h1 className="m-0 flex-1 text-on-surface t-title-lg">Job card</h1>
        <IconButton
          icon="share"
          label="Share job card"
          className="text-on-surface"
          onClick={() => {
            if (captureRef.current) {
              void shareCapture(captureRef.current, 'jobcard-' + (vehicle?.plateNumber ?? '').replace(/[^A-Za-z0-9]/g, ''), 'Share job card').then((ok) => {
                if (!ok) showMessage("Couldn't capture the job card.");
              });
            }
          }}
        />
        <IconButton icon="trash" label="Delete job card" className="text-error" onClick={() => setConfirmDelete(true)} />
      </TopBar>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[640px]">
          {/* Plate down to the customer card is what the share button captures. */}
          <div ref={captureRef} className="bg-surface">
            <div className="flex flex-col gap-2 px-6 pt-2 pb-6">
              <span className="text-on-surface t-plate-lg">{plate}</span>
              <div className="flex flex-col gap-4 pt-1">
                <DetailRow>
                  <DetailField label="Model" value={modelLabel(vehicle)} />
                  <DetailField label="Colour" value={vehicle?.color?.trim() || '—'} />
                </DetailRow>
                <DetailRow>
                  <DetailField label="Security">
                    {security.kind === 'pin' ? <PinBadge pin={security.value} /> : <span className={cn('t-title-md', security.kind === 'key' ? 'text-on-surface' : 'text-on-surface-variant')}>{security.kind === 'key' ? 'Physical key' : 'Not recorded'}</span>}
                  </DetailField>
                  <DetailField label="Battery">
                    <BatteryBadge percent={record.battery ?? null} className="mt-0.5 self-start" />
                  </DetailField>
                </DetailRow>
              </div>
              <div className="flex gap-2 pt-1">
                <StatusChip text={CARD_STATUS_LABEL[cardStatus]} tone={cardStatus === 'pending' ? 'pending' : cardStatus === 'in-progress' ? 'in-progress' : 'delivered'} />
                {due && <StatusChip text={due.label} tone={due.isOverdue ? 'overdue' : 'neutral'} />}
              </div>
            </div>
            <div className="px-4 pb-2">
              <SectionCard padding="p-0" gap="gap-0">
                <ContactRow
                  label="Customer"
                  name={displayName(customer)}
                  phone={phone}
                  callHref={phone ? telUrl(phone) : null}
                  whatsAppHref={buildWhatsAppUrl(phone)}
                />
              </SectionCard>
            </div>
          </div>

          <div className="flex flex-col gap-2 px-4 pb-6">
            <SectionCard title="Dates, odometer & battery">
              <div className="flex flex-col gap-4">
                <DetailRow>
                  <DetailField label="Arrived" value={(() => { const d = parseRecordDate(record.date); return d ? weekdayLabel(d) : '—'; })()} />
                  <DetailField label="Estimated delivery" value={(() => { const d = parseRecordDate(record.expectedDeliveryDate); return d ? weekdayLabel(d) : 'Not set'; })()} />
                </DetailRow>
                <DetailRow>
                  <DetailField label="Odometer in" value={record.isDeadVehicle ? 'Dead vehicle' : record.isUnknownMileage ? 'Unknown' : `${formatGrouped(record.mileage)} km`} />
                  <DetailField label="Delivered" value={deliveredOn ? relativeDayLabel(deliveredOn, todayDate) : 'Not yet'} valueClassName={deliveredOn ? 'text-primary' : 'text-on-surface-variant'} />
                </DetailRow>
              </div>
              <BatteryField percent={record.battery ?? null} onChange={(b) => edit((r) => ({ ...r, battery: b }))} />
              {needsOdometer && <OdometerOut record={record} valid={odometerValid} onChange={(m) => edit((r) => ({ ...r, completionMileage: m }))} />}
            </SectionCard>

            <ProblemsSection description={record.description} onDescription={(d) => edit((r) => ({ ...r, description: d }))} />

            <SectionCard title="Parts & spares" gap="gap-2">
              <div className="flex flex-col gap-2 pt-1">
                {record.partsUsed.length === 0 && <p className="m-0 text-on-surface-variant t-body-md">No parts added yet.</p>}
                {record.partsUsed.map((p, i) => (
                  <div key={`${p.partId}-${i}`} className="flex flex-col">
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-on-surface t-title-md">{p.name}</span>
                        <span className="text-on-surface-variant t-body-md">
                          {formatInrWhole(p.unitPrice)} each · <span className="font-bold text-on-surface">{formatInrWhole(p.unitPrice * p.quantity)}</span>
                        </span>
                      </div>
                      <QuantityStepper quantity={p.quantity} name={p.name} onDecrement={() => changeQuantity(i, -1)} onIncrement={() => changeQuantity(i, 1)} />
                    </div>
                    <div className="h-px bg-outline-variant" />
                  </div>
                ))}
              </div>
              <OutlinedPillButton text="+ Add part" onClick={() => setShowParts(true)} className="mt-2 w-full text-primary" />
            </SectionCard>

            <SectionCard title="Remarks for the customer" gap="gap-2">
              <OutlinedField
                label="Remarks for the customer"
                value={record.finalRemarks ?? ''}
                onValue={(v) => edit((r) => ({ ...r, finalRemarks: v }))}
                placeholder="Advice or notes the customer should see"
                multiline
                minRows={3}
                filled
              />
            </SectionCard>

            <SectionCard title="Job status" gap="gap-3">
              <ConnectedSegments
                options={CARD_STATUSES}
                selected={cardStatus}
                onSelect={(s) => edit((r) => ({ ...r, status: s }))}
                label={(s) => CARD_STATUS_LABEL[s]}
                style={(s) => ({
                  selected: s === 'pending' ? 'bg-warning-container text-on-warning-container' : s === 'in-progress' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary text-on-primary',
                  idle: 'bg-surface-container-high text-on-surface',
                })}
                ariaLabel="Job status"
                height={56}
                fill
              />
            </SectionCard>

            <BillSection
              record={record}
              onLabour={(cost) => edit((r) => ({ ...r, laborCost: cost, totalCost: cost + r.partsCost }))}
              sendHref={phone ? buildWhatsAppUrl(phone, formatDeliveryMessage(presets.deliveryTemplate, record, vehicle, customer?.name)) : null}
            />
          </div>
        </div>
      </div>

      <StatusBar
        isDirty={isDirty}
        justSaved={justSaved}
        saving={saving}
        canSave={odometerValid}
        onDiscard={() => {
          if (original) setRecord(original);
          close();
        }}
        onSave={() => void save()}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard changes?"
        body="Your edits to this job card haven't been saved."
        confirmText="Discard"
        dismissText="Keep editing"
        confirmClass="text-tertiary"
        onConfirm={() => {
          if (original) setRecord(original);
          blocker.proceed?.();
        }}
        onDismiss={() => blocker.reset?.()}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete job card?"
        lead={
          <p className="m-0 text-on-surface-variant t-body-md">
            <span className="font-plate font-bold tracking-[1px] text-on-surface">{plate}</span> · {displayName(customer)}
          </p>
        }
        body="This job card and its tasks are permanently deleted. This can’t be undone."
        confirmText="Delete"
        dismissText="Cancel"
        onConfirm={() => void remove()}
        onDismiss={() => setConfirmDelete(false)}
      />
      <BottomSheet open={showParts} onDismiss={() => setShowParts(false)} title="Add part">
        <div className="flex items-center pl-6 pr-2">
          <h3 className="m-0 flex-1 py-2 text-on-surface t-title-lg" aria-hidden="true">
            Add part
          </h3>
          <TextButton text="+ Create" onClick={() => setCreatingPart(true)} />
        </div>
        {showParts && (
          <PartPicker
            parts={parts}
            onPick={(part) => {
              addPart(part);
              setShowParts(false);
            }}
          />
        )}
      </BottomSheet>
      <PartFormSheet open={creatingPart} part={null} onDismiss={() => setCreatingPart(false)} />
    </div>
  );
}

/** Add-part list: search by name / category plus category filter chips (same matching as the Inventory tab). */
function PartPicker({ parts, onPick }: { parts: Part[]; onPick: (part: Part) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(
    () => [...new Set(parts.map((p) => p.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [parts],
  );
  const needle = query.trim().toLowerCase();
  const shown = parts.filter(
    (p) => (category === null || p.category.trim() === category) && (needle === '' || p.name.toLowerCase().includes(needle) || p.category.toLowerCase().includes(needle)),
  );
  return (
    <div className="pb-6">
      {parts.length > 0 && (
        <div className="flex flex-col gap-3 px-6 pb-2">
          <SearchField value={query} onValue={setQuery} placeholder="Search parts or category" label="Search parts" />
          {categories.length > 0 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label="Filter parts by category">
              <FilterChip label="All" selected={category === null} onClick={() => setCategory(null)} />
              {categories.map((c) => (
                <FilterChip key={c} label={c} selected={category === c} onClick={() => setCategory(category === c ? null : c)} />
              ))}
            </div>
          )}
        </div>
      )}
      {parts.length === 0 && <p className="m-0 px-6 py-4 text-on-surface-variant t-body-md">No parts in inventory yet.</p>}
      {parts.length > 0 && shown.length === 0 && <p className="m-0 px-6 py-4 text-on-surface-variant t-body-md">No parts match.</p>}
      {shown.map((part) => (
        <button key={part.id} type="button" onClick={() => onPick(part)} className="state-layer flex min-h-[72px] w-full items-center gap-4 px-6 py-2 text-left text-on-surface">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate t-title-md">{part.name}</span>
            <span className={cn('t-body-md', isLowStock(part) ? 'text-warning' : 'text-on-surface-variant')}>
              {part.stockQuantity} in stock{part.location.trim() ? ` · Shelf ${part.location}` : ''}
            </span>
          </span>
          <span className="font-bold t-title-md">{formatInrWhole(part.price)}</span>
        </button>
      ))}
    </div>
  );
}

function OdometerOut({ record, valid, onChange }: { record: ServiceRecord; valid: boolean; onChange: (m: number | null) => void }) {
  const inKm = formatGrouped(record.mileage);
  const out = record.completionMileage ?? null;
  const isError = out !== null && !valid;
  const help = out === null ? 'Enter the reading when the customer collects the vehicle.' : !valid ? `Must be at least ${inKm} km (odometer in).` : `Driven ${formatGrouped(out - record.mileage)} km in the shop.`;
  return (
    <div className="flex flex-col gap-1">
      <span className={cn('t-label-md', isError ? 'text-error' : 'text-primary')}>Odometer out (required to deliver)</span>
      <OutlinedField
        label="Odometer out"
        value={out === null ? '' : String(out)}
        onValue={(raw) => {
          const digits = raw.replace(/\D/g, '').slice(0, 7);
          onChange(digits ? Number(digits) : null);
        }}
        placeholder={`${inKm} or more`}
        inputMode="numeric"
        textClass="t-mono-value"
        emphasized
        isError={isError}
        suffix="km"
      />
      <span className={cn('px-4 t-body-sm', isError ? 'text-error' : 'text-on-surface-variant')} aria-live="polite">
        {help}
      </span>
    </div>
  );
}

function ProblemsSection({ description, onDescription }: { description: string; onDescription: (d: string) => void }) {
  const tasks = useMemo(() => parseTasks(description), [description]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const done = tasks.filter((t) => t.done).length;
  return (
    <SectionCard
      title={`Problems & requests · ${done} of ${tasks.length} done`}
      padding="px-5 py-3"
      gap="gap-2"
      trailing={
        <TextButton
          text={editing ? 'Done' : 'Edit'}
          textClass="t-label-strong"
          className="-mr-3"
          onClick={() => {
            if (!editing) setDraft(tasks.map((t) => t.text).join('\n'));
            setEditing((e) => !e);
          }}
        />
      }
    >
      {editing ? (
        <div className="flex flex-col gap-1 pb-2">
          <span className="text-primary t-label-md">One problem per line</span>
          <OutlinedField
            label="Problems, one per line"
            value={draft}
            onValue={(v) => {
              setDraft(v);
              onDescription(serializeTasks(tasksFromText(v, tasks)));
            }}
            multiline
            minRows={6}
            emphasized
          />
          <span className="px-4 text-on-surface-variant t-body-sm">Each line becomes its own checklist item.</span>
        </div>
      ) : (
        <>
          {tasks.length === 0 && <p className="m-0 py-3 text-on-surface-variant t-body-md">No problems recorded. Tap Edit to add them.</p>}
          <div className="flex flex-col">
            {tasks.map((task, i) => (
              <label key={i} className={cn('flex min-h-14 cursor-pointer items-center gap-4 py-2', i > 0 && 'border-t border-outline-variant')}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => {
                    const next = [...tasks];
                    next[i] = { ...task, done: !task.done };
                    onDescription(serializeTasks(next));
                  }}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-sm border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                    task.done ? 'border-primary bg-primary text-on-primary' : 'border-outline bg-transparent'
                  )}
                >
                  {task.done && <Icon name="checkHeavy" size={14} />}
                </span>
                <span className={cn('t-body-lg', task.done ? 'text-on-surface-variant line-through' : 'text-on-surface')}>{task.text}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}

/** − qty + pill on surfaceContainerHigh with 40dp buttons. */
function QuantityStepper({ quantity, name, onDecrement, onIncrement }: { quantity: number; name: string; onDecrement: () => void; onIncrement: () => void }) {
  return (
    <div className="flex items-center rounded-full bg-surface-container-high">
      <button type="button" aria-label={`Remove one ${name}`} onClick={onDecrement} className="state-layer flex size-10 items-center justify-center rounded-full text-on-surface t-title-lg">
        −
      </button>
      <span className="min-w-6 text-center font-bold text-on-surface t-title-md" aria-live="polite">
        {quantity}
      </span>
      <button type="button" aria-label={`Add one ${name}`} onClick={onIncrement} className="state-layer flex size-10 items-center justify-center rounded-full text-on-surface t-title-lg">
        +
      </button>
    </div>
  );
}

function BillSection({ record, onLabour, sendHref }: { record: ServiceRecord; onLabour: (cost: number) => void; sendHref: string | null }) {
  const partsTotal = record.partsUsed.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
  const [labour, setLabour] = useState(record.laborCost > 0 ? String(Math.trunc(record.laborCost)) : '');
  // Re-sync when the record's labour changes from outside this field (Discard).
  const labourRef = useRef(labour);
  labourRef.current = labour;
  useEffect(() => {
    if (Number(labourRef.current || 0) !== record.laborCost) setLabour(record.laborCost > 0 ? String(Math.trunc(record.laborCost)) : '');
  }, [record.laborCost]);
  return (
    <SectionCard title="Bill" gap="gap-3">
      {record.partsUsed.length > 0 && (
        <div className="flex flex-col gap-1">
          {record.partsUsed.map((p, i) => (
            <div key={i} className="flex gap-3 text-on-surface-variant t-body-md">
              <span className="flex-1">
                {p.name} × {p.quantity}
              </span>
              <span>{formatInrWhole(p.unitPrice * p.quantity)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex text-on-surface t-title-md">
        <span className="flex-1">Parts subtotal</span>
        <span>{formatInrWhole(partsTotal)}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex-1 text-on-surface t-title-md">Labour charge</span>
        <OutlinedField
          label="Labour charge"
          value={labour}
          onValue={(raw) => {
            const digits = raw.replace(/\D/g, '').slice(0, 7);
            setLabour(digits);
            onLabour(digits ? Number(digits) : 0);
          }}
          prefix="₹"
          placeholder="0"
          inputMode="numeric"
          textClass="t-body-lg font-bold"
          align="right"
          filled
          className="w-[152px]"
        />
      </div>
      <div className="h-px bg-outline-variant" />
      <div className="flex items-end">
        <span className="flex-1 pb-1.5 font-bold text-on-surface t-title-md">Total</span>
        <span className="text-on-surface t-headline-lg">{formatInrWhole(partsTotal + record.laborCost)}</span>
      </div>
      {sendHref ? (
        <a href={sendHref} target="_blank" rel="noreferrer" className="state-layer inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-4 text-on-whatsapp no-underline t-label-strong">
          <Icon name="whatsApp" size={20} />
          Send bill on WhatsApp
        </a>
      ) : (
        <PillButton text="Send bill on WhatsApp" icon="whatsApp" disabled className="w-full" />
      )}
    </SectionCard>
  );
}

function StatusBar({
  isDirty,
  justSaved,
  saving,
  canSave,
  onDiscard,
  onSave,
}: {
  isDirty: boolean;
  justSaved: boolean;
  saving: boolean;
  canSave: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const note = isDirty ? 'Unsaved changes' : justSaved ? 'All changes saved' : '';
  return (
    <div className="w-full shrink-0 bg-surface-container" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-2 px-4 pt-3 pb-5">
        <div className="flex items-center px-2">
          <span className="flex-1 text-on-surface-variant t-label-md">Changes</span>
          <span className={cn('t-label-tiny', isDirty ? 'text-warning' : 'text-primary')} aria-live="polite">
            {note}
          </span>
        </div>
        <div className="flex gap-2">
          <OutlinedPillButton text="Discard" onClick={onDiscard} disabled={!isDirty || saving} className="flex-1 text-on-surface" />
          <PillButton text="Update" onClick={onSave} disabled={!isDirty || !canSave} loading={saving} className="flex-1 bg-primary text-on-primary" />
        </div>
      </div>
    </div>
  );
}
