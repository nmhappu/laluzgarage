import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ServiceRecord, Vehicle } from '../../types';
import { fieldDateLabel, parseRecordDate, today, type LocalDate } from '../../core/dates';
import { formatPlate, jobChanges, modelWithColor, parseTasks, securityOf, serializeTasks, tasksFromText } from '../../core/jobs';
import { errorText, updateServiceRecord } from '../../data/repository';
import { useData } from '../../data/store';
import { useBack } from '../../app/shellContext';
import { BottomActionBar, DetailField, DetailRow, FilterChip, OutlinedPillButton, PillButton, PinBadge, SectionCard } from '../../ui/components';
import { DetailTopBar } from '../../ui/chrome';
import { DateButton, FilledField } from '../../ui/fields';
import { Icon } from '../../ui/icons';
import { DatePickerDialog } from '../../ui/datePickers';
import { BatteryField } from '../../ui/battery';
import { EmptyText } from '../../ui/listChrome';

/**
 * Edit job card (from a Services card's Edit button): the job specification as issued at intake.
 * Odometer, battery, problems, belongings and the estimated delivery date can change; the intake
 * date is locked once the job card exists.
 */
export function JobEditScreen() {
  const { recordId = '' } = useParams();
  const { records, vehicles, isLoading, showMessage } = useData();
  const back = useBack('/services');
  const record = records.find((r) => r.id === recordId) ?? null;
  if (!record) {
    return (
      <div className="flex h-full flex-col bg-surface">
        <DetailTopBar title="Edit job card" backLabel="Back to Services" onBack={back} />
        <EmptyText>{isLoading ? 'Loading job card…' : 'This job card no longer exists.'}</EmptyText>
      </div>
    );
  }
  return <JobEditForm key={record.id} record={record} vehicle={vehicles.get(record.vehicleId) ?? null} back={back} showMessage={showMessage} />;
}

function JobEditForm({ record, vehicle, back, showMessage }: { record: ServiceRecord; vehicle: Vehicle | null; back: () => void; showMessage: (m: string) => void }) {
  const initialProblems = parseTasks(record.description).map((t) => t.text).join('\n');
  const initialOdo = record.isDeadVehicle || record.isUnknownMileage || record.mileage <= 0 ? '' : String(record.mileage);
  const initialLocked = record.isUnknownMileage && !record.isDeadVehicle;
  const initialDelivery = parseRecordDate(record.expectedDeliveryDate);

  // The card as it was when the form opened: a save sends only what differs from it.
  const [base] = useState(record);
  const [odometer, setOdometer] = useState(initialOdo);
  const [dead, setDead] = useState(record.isDeadVehicle);
  const [locked, setLocked] = useState(initialLocked);
  const [battery, setBattery] = useState<number | null>(record.battery ?? null);
  const [problems, setProblems] = useState(initialProblems);
  const [belongings, setBelongings] = useState(record.personalItems ?? '');
  const [delivery, setDelivery] = useState<LocalDate | null>(initialDelivery);
  const [picking, setPicking] = useState(false);
  const [showOdoError, setShowOdoError] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty =
    odometer !== initialOdo ||
    battery !== (record.battery ?? null) ||
    dead !== record.isDeadVehicle ||
    locked !== initialLocked ||
    problems !== initialProblems ||
    belongings !== (record.personalItems ?? '') ||
    delivery !== initialDelivery;
  const special = dead || locked;
  const intakeDate = parseRecordDate(record.date);
  const odoError = showOdoError && !special && Number(odometer || 0) <= 0;
  const security = securityOf(vehicle?.passwordOrPin);

  const save = async () => {
    const reading = Number(odometer || 0);
    if (!special && reading <= 0) {
      setShowOdoError(true);
      return;
    }
    // Untouched inputs keep the stored value as is, so a save never rewrites them in a new format.
    const description = problems !== initialProblems ? serializeTasks(tasksFromText(problems, parseTasks(base.description))) : base.description;
    const expectedDeliveryDate = delivery !== initialDelivery ? delivery : (base.expectedDeliveryDate ?? null);
    setSaving(true);
    try {
      await updateServiceRecord(
        base.id,
        jobChanges(base, {
          ...base,
          mileage: special ? 0 : reading,
          isDeadVehicle: dead,
          isUnknownMileage: locked,
          battery,
          description,
          personalItems: belongings.trim() || null,
          expectedDeliveryDate,
        })
      );
      showMessage('Job card updated');
      back();
    } catch (e) {
      setSaving(false);
      showMessage(`Couldn't save the job card. ${errorText(e)}`);
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <DetailTopBar title="Edit job card" backLabel="Back to Services" onBack={back} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[640px]">
          <div className="flex flex-col gap-2 px-6 pt-2 pb-6">
            <h2 className="m-0 text-on-surface t-headline-md">Job specification</h2>
            <p className="m-0 text-on-surface-variant t-body-lg">Update the details for this job card.</p>
          </div>
          <div className="flex flex-col gap-6 px-4 pb-8">
            <SectionCard title="Vehicle">
              <DetailRow>
                <DetailField label="Vehicle" value={modelWithColor(vehicle)} />
                <DetailField label="Plate" value={formatPlate(vehicle?.plateNumber)} valueClassName="t-plate-value" />
              </DetailRow>
              <DetailRow>
                <DetailField label="Security">
                  {security.kind === 'pin' ? <PinBadge pin={security.value} /> : <span className={security.kind === 'key' ? 'text-on-surface t-title-md' : 'text-on-surface-variant t-title-md'}>{security.kind === 'key' ? 'Physical key' : 'Not recorded'}</span>}
                </DetailField>
              </DetailRow>
            </SectionCard>
            <div className="flex flex-col gap-5 px-2">
              <FilledField
                label="Odometer reading"
                placeholder="e.g. 14250"
                value={dead ? 'Vehicle dead' : locked ? 'Odometer locked' : odometer}
                onValue={(v) => setOdometer(v.replace(/\D/g, '').slice(0, 7))}
                disabled={special}
                isError={odoError}
                inputMode="numeric"
                textClass={special ? 't-body-lg' : 't-mono-value'}
                trailing={<span className="pr-3 text-on-surface-variant t-body-md">km</span>}
                supporting={odoError ? 'Enter a reading above 0, or choose Dead vehicle or Vehicle locked.' : 'Enter the reading, or choose below if it can’t be read.'}
                below={
                  <div role="group" aria-label="Odometer not readable" className="flex gap-2">
                    <FilterChip label="Dead vehicle" selected={dead} tone="error" onClick={() => { setDead((d) => !d); setLocked(false); }} />
                    <FilterChip label="Vehicle locked" selected={locked} tone="warning" onClick={() => { setLocked((l) => !l); setDead(false); }} />
                  </div>
                }
              />
              <BatteryField percent={battery} onChange={setBattery} />
              <FilledField
                label="Problems and requests"
                placeholder={'Front brake pad replacement\nPeriodic servicing\nWheel alignment'}
                value={problems}
                onValue={setProblems}
                multiline
                minRows={4}
                supporting="One per line. Each line becomes a checklist item on the job card."
              />
              <FilledField label="Belongings left in vehicle" placeholder="e.g. Helmet, original documents, charging cable" value={belongings} onValue={setBelongings} />
              <div className="flex flex-col gap-1.5">
                <span className="text-on-surface-variant t-label-lg">Intake date</span>
                <div className="flex h-14 items-center gap-2 rounded-lg bg-surface-container-high px-4 opacity-[0.72]" aria-label={`Intake date, ${intakeDate ? fieldDateLabel(intakeDate) : 'Not recorded'}, locked`} role="group">
                  <span className="flex-1 text-on-surface-variant t-body-lg">{intakeDate ? fieldDateLabel(intakeDate) : 'Not recorded'}</span>
                  <Icon name="lock" className="text-on-surface-variant" />
                </div>
                <span className="px-4 text-on-surface-variant t-body-sm">Locked. The intake date can’t be changed after the job card is issued.</span>
              </div>
              <DateButton label="Estimated delivery date" value={delivery ? fieldDateLabel(delivery) : null} onClick={() => setPicking(true)} />
            </div>
          </div>
        </div>
      </div>
      <BottomActionBar>
        <div className="flex gap-2">
          <OutlinedPillButton text="Cancel" onClick={back} className="flex-1 text-on-surface" />
          <PillButton text="Save changes" onClick={() => void save()} disabled={!dirty} loading={saving} className="flex-1 bg-primary text-on-primary" />
        </div>
      </BottomActionBar>
      <DatePickerDialog
        open={picking}
        label="Estimated delivery date"
        initial={delivery}
        isAllowed={(d) => d >= (intakeDate ?? today())}
        onDismiss={() => setPicking(false)}
        onConfirm={(d) => {
          setDelivery(d);
          setPicking(false);
        }}
      />
    </div>
  );
}
