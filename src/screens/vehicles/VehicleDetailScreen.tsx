import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Vehicle } from '../../types';
import { parseRecordDate, weekdayLabel } from '../../core/dates';
import { formatGrouped, formatInrWhole } from '../../core/format';
import { displayName, formatPhone, formatPlate, jobStatusOf, parseTasks, securityOf } from '../../core/jobs';
import { buildWhatsAppUrl, telUrl } from '../../core/whatsapp';
import { deleteVehicle, errorText, updateVehicle } from '../../data/repository';
import { useData } from '../../data/store';
import { useBack } from '../../app/shellContext';
import { useOpeners } from '../../app/openers';
import { ContactRow, DeleteEditBar, DetailField, DetailRow, FilterChip, IconButton, PillButton, PinBadge, SectionCard, StatusChip, WavyDivider } from '../../ui/components';
import { DetailTopBar } from '../../ui/chrome';
import { FilledField } from '../../ui/fields';
import { BottomSheet, ConfirmDialog } from '../../ui/overlays';
import { EmptyText } from '../../ui/listChrome';
import { shareCapture } from '../../ui/share';

export function VehicleDetailScreen() {
  const { vehicleId = '' } = useParams();
  const { vehicles, customers, records, isLoading, showMessage } = useData();
  const back = useBack('/vehicles');
  const navigate = useNavigate();
  const { openJob } = useOpeners();
  const vehicle = vehicles.get(vehicleId) ?? null;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const history = useMemo(() => records.filter((r) => r.vehicleId === vehicleId).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), [records, vehicleId]);

  if (!vehicle) {
    return (
      <div className="flex h-full flex-col bg-surface">
        <DetailTopBar title="Vehicle" backLabel="Back to vehicles" onBack={back} />
        <EmptyText>{isLoading ? 'Loading vehicle…' : 'This vehicle is no longer on file.'}</EmptyText>
      </div>
    );
  }

  const customer = customers.get(vehicle.customerId) ?? null;
  const phone = customer?.phone ?? '';
  const totalValue = history.reduce((s, r) => s + r.totalCost, 0);
  const security = securityOf(vehicle.passwordOrPin);
  const plate = formatPlate(vehicle.plateNumber);

  const remove = async () => {
    setConfirmDelete(false);
    try {
      await deleteVehicle(vehicle.id);
      showMessage('Vehicle deleted');
      navigate('/vehicles', { replace: true });
    } catch (e) {
      showMessage(`Couldn't delete the vehicle. ${errorText(e)}`);
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <DetailTopBar
        title="Vehicle"
        backLabel="Back to vehicles"
        onBack={back}
        actions={
          <IconButton
            icon="share"
            label="Share vehicle"
            className="text-on-surface"
            onClick={() => captureRef.current && void shareCapture(captureRef.current, 'vehicle-' + vehicle.plateNumber.replace(/[^A-Za-z0-9]/g, ''), 'Share vehicle')}
          />
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[640px]">
          {/* Plate down to the owner card is what the share button captures. */}
          <div ref={captureRef} className="bg-surface">
            <div className="flex flex-col gap-2 px-6 pt-2 pb-6">
              <h2 className="m-0 text-on-surface t-plate-lg">{plate}</h2>
              <div className="flex flex-col gap-4 pt-3">
                <DetailRow>
                  <DetailField label="Make" value={vehicle.make.trim() || '—'} />
                  <DetailField label="Model" value={vehicle.model.trim() || '—'} />
                </DetailRow>
                <DetailRow>
                  <DetailField label="Colour" value={vehicle.color.trim() || '—'} />
                  <DetailField label="Security">
                    {security.kind === 'pin' ? <PinBadge pin={security.value} /> : <span className={security.kind === 'key' ? 'text-on-surface t-title-md' : 'text-on-surface-variant t-title-md'}>{security.kind === 'key' ? 'Physical key' : 'Not recorded'}</span>}
                  </DetailField>
                </DetailRow>
              </div>
            </div>
            <div className="px-4 pb-2">
              <SectionCard padding="p-0" gap="gap-0">
                <ContactRow label="Owner" name={displayName(customer)} phone={phone ? formatPhone(phone) : ''} callHref={phone ? telUrl(phone) : null} whatsAppHref={buildWhatsAppUrl(phone)} />
                <div className="mx-5 h-px bg-outline-variant" />
                <div className="grid grid-cols-2 gap-4 p-5">
                  <SummaryFigure label="Total maintenance value" value={formatInrWhole(totalValue)} />
                  <SummaryFigure label="Recorded jobs" value={String(history.length)} />
                </div>
              </SectionCard>
            </div>
          </div>
          <div className="px-4 pb-6">
            <SectionCard title={`Service history · ${history.length} ${history.length === 1 ? 'job' : 'jobs'}`} padding="px-5 pt-5 pb-1" gap="gap-1">
              {history.length === 0 && <p className="m-0 pt-3 pb-5 text-on-surface-variant t-body-md">No jobs recorded for this vehicle yet.</p>}
              {history.map((r, i) => {
                const st = jobStatusOf(r.status);
                const d = parseRecordDate(r.date);
                const notes = parseTasks(r.description).map((t) => t.text).join('\n');
                const odometer = r.isDeadVehicle ? 'Dead vehicle' : r.isUnknownMileage ? 'Unknown' : `${formatGrouped(r.completionMileage ?? r.mileage)} km`;
                return (
                  <button key={r.id} type="button" onClick={(e) => openJob(r.id, e.currentTarget)} className="state-layer flex w-full flex-col gap-4 rounded-none pt-3 pb-5 text-left text-on-surface">
                    {i > 0 && <WavyDivider className="text-on-surface-variant" />}
                    <span className="flex w-full items-start gap-3">
                      <span className="flex flex-1 flex-col gap-2">
                        <span className="font-bold t-title-md">{d ? weekdayLabel(d) : '—'}</span>
                        <StatusChip text={st.label} tone={st.tone} className="self-start" />
                      </span>
                      <span className="flex flex-col items-end">
                        <span className="text-on-surface-variant t-body-sm">{st.value === 'completed' ? 'Invoiced' : 'Est.'}</span>
                        <span className="t-title-md">{formatInrWhole(r.totalCost)}</span>
                      </span>
                    </span>
                    <HistoryText label="Complaint and repair notes" value={notes || 'No notes recorded'} />
                    <span className="grid w-full grid-cols-3 gap-3">
                      <HistoryFigure label="Odometer" value={odometer} />
                      <HistoryFigure label="Labour" value={formatInrWhole(r.laborCost)} />
                      <HistoryFigure label="Parts" value={formatInrWhole(r.partsCost)} />
                    </span>
                    <HistoryText label="Parts used" value={r.partsUsed.map((p) => `${p.name} × ${p.quantity}`).join('\n') || 'No parts used'} />
                  </button>
                );
              })}
            </SectionCard>
          </div>
        </div>
      </div>
      <DeleteEditBar deleteLabel="Delete vehicle" editLabel="Edit vehicle" onDelete={() => setConfirmDelete(true)} onEdit={() => setEditing(true)} />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete vehicle?"
        body={`${plate} is removed from the vehicle list. Its job cards stay in Services.`}
        confirmText="Delete"
        dismissText="Cancel"
        onConfirm={() => void remove()}
        onDismiss={() => setConfirmDelete(false)}
      />
      {editing && (
        <VehicleEditSheet
          vehicle={vehicle}
          onDismiss={() => setEditing(false)}
          onSave={async (v) => {
            try {
              await updateVehicle(v);
              showMessage('Vehicle saved');
              setEditing(false);
            } catch (e) {
              showMessage(`Couldn't save the vehicle. ${errorText(e)}`);
            }
          }}
        />
      )}
    </div>
  );
}

function SummaryFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-on-surface-variant t-body-sm">{label}</span>
      <span className="text-on-surface t-value-lg">{value}</span>
    </div>
  );
}

function HistoryText({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-on-surface-variant t-body-sm">{label}</span>
      <span className="whitespace-pre-line text-on-surface t-body-md">{value}</span>
    </span>
  );
}

function HistoryFigure({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-on-surface-variant t-body-sm">{label}</span>
      <span className="truncate text-on-surface t-label-lg">{value}</span>
    </span>
  );
}

/** Edit sheet: the vehicle fields the intake records, in the filled-field style. */
function VehicleEditSheet({ vehicle, onDismiss, onSave }: { vehicle: Vehicle; onDismiss: () => void; onSave: (v: Vehicle) => Promise<void> }) {
  const initial = securityOf(vehicle.passwordOrPin);
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [colour, setColour] = useState(vehicle.color);
  const [plate, setPlate] = useState(vehicle.plateNumber);
  const [physicalKey, setPhysicalKey] = useState(initial.kind !== 'pin');
  const [pin, setPin] = useState(initial.kind === 'pin' ? initial.value : '');
  const [saving, setSaving] = useState(false);
  const valid = make.trim() !== '' && plate.trim() !== '' && (physicalKey || pin.trim() !== '');
  return (
    <BottomSheet open onDismiss={onDismiss} title="Edit vehicle">
      <div className="flex flex-col gap-5 px-6 pb-6">
        <h3 className="m-0 text-on-surface t-title-lg">Edit vehicle</h3>
        <FilledField label="Make" placeholder="e.g. Honda" value={make} onValue={setMake} />
        <FilledField label="Model" placeholder="e.g. Activa 6G" value={model} onValue={setModel} />
        <FilledField label="Plate number" placeholder="MH12AB1234" value={plate} onValue={(v) => setPlate(v.replace(/\s/g, '').toUpperCase())} textClass="t-plate" />
        <FilledField label="Colour" placeholder="e.g. Pearl White" value={colour} onValue={setColour} />
        <div className="flex flex-col gap-3">
          <FilledField
            label="Security"
            placeholder="4 to 6 digit PIN"
            value={physicalKey ? 'Physical key' : pin}
            disabled={physicalKey}
            inputMode="numeric"
            onValue={(v) => {
              if (!physicalKey && (v === '' || (v.length <= 6 && /^\d+$/.test(v)))) setPin(v);
            }}
            textClass={physicalKey ? 't-body-lg' : 't-pin'}
          />
          <div>
            <FilterChip
              label="Physical key"
              selected={physicalKey}
              onClick={() => {
                setPhysicalKey((k) => !k);
                setPin('');
              }}
            />
          </div>
        </div>
        <PillButton
          text="Save vehicle"
          disabled={!valid}
          loading={saving}
          className="w-full bg-primary text-on-primary"
          onClick={async () => {
            setSaving(true);
            await onSave({ ...vehicle, make, model, color: colour, plateNumber: plate, passwordOrPin: physicalKey ? 'Physical Key' : pin });
            setSaving(false);
          }}
        />
      </div>
    </BottomSheet>
  );
}
