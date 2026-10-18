import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useBlocker, useNavigate } from 'react-router-dom';
import type { Customer, Vehicle, WorkshopUser } from '../../types';
import { fieldDateLabel, parseRecordDate, today, weekdayLabel, type LocalDate } from '../../core/dates';
import { cn } from '../../core/format';
import { formatPhone, formatPlate, parseTasks, securityOf, serializeTasks } from '../../core/jobs';
import { buildWhatsAppUrl, formatIntakeMessage } from '../../core/whatsapp';
import { createCustomer, createServiceRecord, createVehicle, errorText } from '../../data/repository';
import { useAuth } from '../../data/auth';
import { useData } from '../../data/store';
import { useTheme } from '../../data/theme';
import { useBack } from '../../app/shellContext';
import { BottomActionBar, connectedRadius, CookieBadge, COOKIE_PATH, DetailField, DetailRow, FilterChip, OutlinedPillButton, PillButton, SectionCard } from '../../ui/components';
import { DetailTopBar } from '../../ui/chrome';
import { DatePickerDialog } from '../../ui/datePickers';
import { DateButton, FilledField, SearchField } from '../../ui/fields';
import { Icon } from '../../ui/icons';
import { ConfirmDialog } from '../../ui/overlays';
import { BatteryField } from '../../ui/battery';

/** Accepted on every account until advisors set their own PIN (same as the Compose app). */
const DEFAULT_ADVISOR_PIN = '1234';
/** Stored when the vehicle has no registration yet. */
const UNREGISTERED_PLATE = 'U/R';
/** Common makes offered as one-tap chips under the Make field. */
const COMMON_MAKES = ['Ola', 'Ather', 'Honda', 'TVS', 'Hero', 'Tylos'];

type Step = 'pin' | 'search' | 'customer' | 'vehicle' | 'job' | 'success';
const STEP_ORDER: Step[] = ['pin', 'search', 'customer', 'vehicle', 'job', 'success'];

export function advisorPinMatches(advisor: WorkshopUser | null, pin: string): boolean {
  const own = advisor?.pin?.trim() || null;
  return (own !== null && own === pin) || pin === DEFAULT_ADVISOR_PIN;
}

interface Match {
  customer: Customer;
  vehicle: Vehicle | null;
  lastService: LocalDate | null;
}

interface Issued {
  customerName: string;
  phone: string;
  make: string;
  model: string;
  plate: string;
  intakeDate: LocalDate;
  deliveryDate: LocalDate | null;
  description: string;
}

/**
 * Vehicle intake, full screen: advisor verification → find customer → (new customer) → (vehicle
 * specification) → job specification → job card issued. Each step's main action sits in a pinned
 * bottom bar; leaving with details entered asks first.
 */
export function IntakeScreen() {
  const { profile } = useAuth();
  const { customers, vehicles, records, presets } = useData();
  const { isDark } = useTheme();
  const back = useBack('/');
  const navigate = useNavigate();
  const advisor = profile;

  const [step, setStep] = useState<Step>('pin');
  const [dir, setDir] = useState(1);
  const go = (s: Step) => {
    setDir(STEP_ORDER.indexOf(s) >= STEP_ORDER.indexOf(step) ? 1 : -1);
    setStep(s);
  };

  const [pin, setPin] = useState('');
  const [pinWrong, setPinWrong] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [unregistered, setUnregistered] = useState(false);
  const [colour, setColour] = useState('');
  const [vehiclePin, setVehiclePin] = useState('');
  const [physicalKey, setPhysicalKey] = useState(false);
  const [odometer, setOdometer] = useState('');
  const [odometerTouched, setOdometerTouched] = useState(false);
  const [battery, setBattery] = useState<number | null>(null);
  const [deadVehicle, setDeadVehicle] = useState(false);
  const [vehicleLocked, setVehicleLocked] = useState(false);
  const [problems, setProblems] = useState('');
  const [belongings, setBelongings] = useState('');
  const [intakeDate, setIntakeDate] = useState<LocalDate>(today());
  const [deliveryDate, setDeliveryDate] = useState<LocalDate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [picker, setPicker] = useState<'intake' | 'delivery' | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const leaving = useRef(false);

  const phoneDigits = customerPhone.replace(/\D/g, '');
  const customerValid = customerName.trim() !== '' && phoneDigits.length === 10;
  const vehicleValid = make.trim() !== '' && model.trim() !== '' && (unregistered || plate.trim() !== '') && (physicalKey || vehiclePin.trim() !== '');
  const odometerOk = deadVehicle || vehicleLocked || Number(odometer || 0) > 0;
  const odometerError = !deadVehicle && !vehicleLocked && ((odometerTouched && !odometerOk) || /^0+$/.test(odometer));
  const jobValid = problems.trim() !== '' && deliveryDate !== null && odometerOk;
  const hasData =
    query.trim() !== '' || selectedCustomer !== null || customerName.trim() !== '' || customerPhone.trim() !== '' || make.trim() !== '' || model.trim() !== '' ||
    plate.trim() !== '' || unregistered || colour.trim() !== '' || vehiclePin.trim() !== '' || physicalKey || odometer.trim() !== '' || battery !== null ||
    deadVehicle || vehicleLocked || problems.trim() !== '' || belongings.trim() !== '' || deliveryDate !== null;

  const customerLabel = selectedCustomer?.name?.trim() || customerName.trim();
  const phoneLabel = selectedCustomer?.phone ?? phoneDigits;
  const vehicleMake = selectedVehicle?.make ?? make.trim();
  const vehicleModel = selectedVehicle?.model ?? model.trim();
  const plateLabel = selectedVehicle?.plateNumber ?? (unregistered ? UNREGISTERED_PLATE : plate);
  const securityLabel = selectedVehicle?.passwordOrPin ?? (physicalKey ? 'Physical Key' : vehiclePin);

  // Leaving the flow (browser back included) with details entered asks first; the success step doesn't.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => hasData && step !== 'success' && !leaving.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === 'blocked') setConfirmDiscard(true);
  }, [blocker.state]);

  const close = () => {
    if (hasData && step !== 'success') setConfirmDiscard(true);
    else exit();
  };
  const exit = () => {
    leaving.current = true;
    if (blocker.state === 'blocked') blocker.proceed();
    else back();
  };
  const done = () => {
    leaving.current = true;
    navigate('/services', { replace: true });
  };

  const stepBack = () => {
    setSubmitError(null);
    switch (step) {
      case 'pin':
      case 'search':
        return close();
      case 'customer':
        return go('search');
      case 'vehicle':
        return go(selectedCustomer ? 'search' : 'customer');
      case 'job':
        return go(selectedVehicle ? 'search' : 'vehicle');
      case 'success':
        return done();
    }
  };

  const verifyPin = (value = pin) => {
    if (value.length !== 4) return;
    if (advisorPinMatches(advisor, value)) {
      setPinWrong(false);
      go('search');
    } else setPinWrong(true);
  };

  // ---- Customer discovery ----
  const lastServiceByVehicle = useMemo(() => {
    const map = new Map<string, LocalDate>();
    for (const r of records) {
      const d = parseRecordDate(r.date);
      if (d && (!map.get(r.vehicleId) || d > map.get(r.vehicleId)!)) map.set(r.vehicleId, d);
    }
    return map;
  }, [records]);
  const matches = useMemo<Match[]>(() => {
    const needle = query.toLowerCase().replace(/[\s+]/g, '');
    if (!needle) return [];
    const byCustomer = new Map<string, Vehicle[]>();
    for (const v of vehicles.values()) {
      const list = byCustomer.get(v.customerId);
      if (list) list.push(v);
      else byCustomer.set(v.customerId, [v]);
    }
    const hit = (s: string) => s.trim() !== '' && s.toLowerCase().replace(/[\s+]/g, '').includes(needle);
    const out: Match[] = [];
    for (const c of customers.values()) {
      const own = byCustomer.get(c.id) ?? [];
      const customerHit = hit(c.name) || hit(c.phone);
      if (own.length === 0) {
        if (customerHit) out.push({ customer: c, vehicle: null, lastService: null });
      } else {
        for (const v of own) if (customerHit || hit(v.plateNumber) || hit(`${v.make} ${v.model}`)) out.push({ customer: c, vehicle: v, lastService: lastServiceByVehicle.get(v.id) ?? null });
      }
    }
    return out.sort((a, b) => ((b.lastService ?? '') > (a.lastService ?? '') ? 1 : (b.lastService ?? '') < (a.lastService ?? '') ? -1 : 0)).slice(0, 30);
  }, [query, customers, vehicles, lastServiceByVehicle]);

  const pickMatch = (m: Match) => {
    setSelectedCustomer(m.customer);
    setSelectedVehicle(m.vehicle);
    go(m.vehicle ? 'job' : 'vehicle');
  };
  const registerNewCustomer = () => {
    const digits = query.replace(/\D/g, '');
    const prefill = customerPhone.trim() === '' && digits.length >= 10 && !/[a-z]/i.test(query);
    setSelectedCustomer(null);
    setSelectedVehicle(null);
    if (prefill) setCustomerPhone(digits.slice(-10));
    go('customer');
  };

  // ---- Issue ----
  const issue = async () => {
    if (!jobValid || submitting) return;
    const advisorId = advisor?.id || 'advisor';
    const advisorName = advisor?.name?.trim() || advisor?.email || 'Service Advisor';
    setSubmitting(true);
    setSubmitError(null);
    try {
      const customerId = selectedCustomer?.id ?? (await createCustomer(customerName.trim(), '+91' + phoneDigits, advisorId));
      const vehicleId =
        selectedVehicle?.id ??
        (await createVehicle({
          customerId,
          plateNumber: unregistered ? UNREGISTERED_PLATE : plate,
          make: make.trim(),
          model: model.trim(),
          color: colour.trim(),
          passwordOrPin: physicalKey ? 'Physical Key' : vehiclePin.trim(),
          technicianId: advisorId,
        }));
      const description = serializeTasks(problems.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((text) => ({ text, done: false })));
      const now = new Date();
      const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
      await createServiceRecord({
        vehicleId,
        customerId,
        technicianId: advisorId,
        technicianName: advisorName,
        date: `${intakeDate}T${time}`,
        expectedDeliveryDate: deliveryDate,
        mileage: deadVehicle || vehicleLocked ? 0 : Number(odometer || 0),
        isDeadVehicle: deadVehicle,
        isUnknownMileage: vehicleLocked,
        battery,
        personalItems: belongings.trim() || null,
        description,
      });
      setIssued({ customerName: customerLabel, phone: phoneLabel, make: vehicleMake, model: vehicleModel, plate: plateLabel, intakeDate, deliveryDate, description });
      setSubmitting(false);
      go('success');
    } catch (e) {
      setSubmitting(false);
      setSubmitError(`Couldn't issue the job card. ${errorText(e)}`);
    }
  };

  const backLabel =
    step === 'pin' || step === 'search'
      ? 'Close intake'
      : step === 'customer'
        ? 'Back to customer search'
        : step === 'vehicle'
          ? selectedCustomer
            ? 'Back to customer search'
            : 'Back to customer details'
          : step === 'job'
            ? selectedVehicle
              ? 'Back to customer search'
              : 'Back to vehicle details'
            : null;

  const pinGlow = `radial-gradient(circle farthest-corner at 22% 24%, color-mix(in srgb, var(--color-tertiary) ${isDark ? 12 : 10}%, transparent) 0%, transparent 55%)`;

  return (
    <div className="flex h-full flex-col bg-surface" style={step === 'pin' ? { backgroundImage: pinGlow } : undefined} onKeyDown={(e) => e.key === 'Escape' && stepBack()}>
      <DetailTopBar title="Vehicle intake" backLabel={backLabel} onBack={stepBack} transparent={step === 'pin'} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            className={cn('absolute inset-0 overflow-y-auto', step !== 'pin' && 'bg-surface')}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? '100%' : '-25%', zIndex: d > 0 ? 2 : 1 }),
              center: { x: 0 },
              exit: (d: number) => ({ x: d > 0 ? '-25%' : '100%', zIndex: d > 0 ? 1 : 2 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          >
            <div className="mx-auto w-full max-w-[640px] pb-6">
              {step === 'pin' && (
                <PinStep
                  pin={pin}
                  wrong={pinWrong}
                  onPin={(v) => {
                    const digits = v.replace(/\D/g, '').slice(0, 4);
                    setPin(digits);
                    setPinWrong(false);
                    if (digits.length === 4 && pin.length < 4) verifyPin(digits);
                  }}
                  onSubmit={() => verifyPin()}
                />
              )}
              {step === 'search' && (
                <>
                  <StepHeading title="Find customer" body="Search by phone number, plate or customer name." />
                  <div className="px-4">
                    <SearchField value={query} onValue={setQuery} placeholder="Plate, phone or customer name" label="Search customers" autoFocus />
                  </div>
                  {query.trim() !== '' && (
                    <div className="flex flex-col gap-0.5 px-4 pt-4">
                      <span className="px-2 pb-2 text-on-surface-variant t-label-lg" aria-live="polite">
                        {matches.length === 0 ? 'No matches' : matches.length === 1 ? '1 match' : `${matches.length} matches`}
                      </span>
                      {matches.map((m, i) => (
                        <MatchRow key={`${m.customer.id}-${m.vehicle?.id ?? 'none'}`} match={m} index={i} count={matches.length} onClick={() => pickMatch(m)} />
                      ))}
                      {matches.length === 0 && (
                        <p className="m-0 px-2 py-8 text-on-surface-variant t-body-md">No customer or vehicle found for “{query.trim()}”. Register a new customer to continue.</p>
                      )}
                    </div>
                  )}
                </>
              )}
              {step === 'customer' && (
                <>
                  <StepHeading title="New customer" body="Enter the contact details to create a workshop profile." />
                  <div className="flex flex-col gap-5 px-6">
                    <FilledField label="Full name" placeholder="e.g. Joseph K" value={customerName} onValue={setCustomerName} autoCapitalize="words" autoFocus />
                    <FilledField
                      label="Mobile number"
                      placeholder="98765 43210"
                      inputMode="tel"
                      value={customerPhone}
                      onValue={(v) => {
                        let s = v.replace(/[^\d ]/g, '');
                        if (s.startsWith('91') && s.replace(/\D/g, '').length > 10) s = s.slice(2);
                        setCustomerPhone(s.slice(0, 11));
                      }}
                      textClass="t-phone"
                      leading={
                        <>
                          <span className="text-on-surface t-mono-value">+91</span>
                          <span aria-hidden="true" className="h-6 w-px bg-outline-variant" />
                        </>
                      }
                    />
                  </div>
                </>
              )}
              {step === 'vehicle' && (
                <>
                  <StepHeading title="Vehicle specification" body="Record the vehicle and how to unlock it for this job card." />
                  <div className="flex flex-col gap-6 px-4">
                    <SectionCard title="Customer">
                      <DetailRow>
                        <DetailField label="Name" value={customerLabel} truncate />
                        <DetailField label="Phone" value={formatPhone(phoneLabel)} valueClassName="t-phone" truncate />
                      </DetailRow>
                    </SectionCard>
                    <div className="flex flex-col gap-5 px-2">
                      <FilledField
                        label="Make"
                        placeholder="e.g. Honda"
                        value={make}
                        onValue={setMake}
                        autoCapitalize="words"
                        below={
                          <div role="group" aria-label="Common makes" className="no-scrollbar -mr-6 flex gap-2 overflow-x-auto pr-6">
                            {COMMON_MAKES.map((m) => (
                              <FilterChip key={m} label={m} selected={make.trim().toLowerCase() === m.toLowerCase()} onClick={() => setMake(m)} />
                            ))}
                          </div>
                        }
                      />
                      <FilledField label="Model" placeholder="e.g. Activa 6G, S1 Pro Gen 2, 450X" value={model} onValue={setModel} autoCapitalize="words" />
                      <FilledField
                        label="Plate number"
                        placeholder="MH12AB1234"
                        value={unregistered ? UNREGISTERED_PLATE : plate}
                        onValue={(v) => setPlate(v.replace(/\s+/g, '').toUpperCase().slice(0, 15))}
                        disabled={unregistered}
                        textClass="t-plate"
                        autoCapitalize="characters"
                        below={
                          <FilterChip
                            label="Unregistered (U/R)"
                            selected={unregistered}
                            onClick={() => {
                              setUnregistered((u) => !u);
                              setPlate('');
                            }}
                          />
                        }
                      />
                      <FilledField label="Colour" placeholder="e.g. Pearl White" value={colour} onValue={setColour} autoCapitalize="words" />
                      <FilledField
                        label="Security"
                        placeholder="4 to 6 digit PIN"
                        value={physicalKey ? 'Physical key' : vehiclePin}
                        onValue={(v) => {
                          if (v === '' || (v.length <= 6 && /^\d+$/.test(v))) setVehiclePin(v);
                        }}
                        disabled={physicalKey}
                        inputMode="numeric"
                        textClass={physicalKey ? 't-body-lg' : 't-pin'}
                        below={
                          <FilterChip
                            label="Physical key"
                            selected={physicalKey}
                            onClick={() => {
                              setPhysicalKey((k) => !k);
                              setVehiclePin('');
                            }}
                          />
                        }
                      />
                    </div>
                  </div>
                </>
              )}
              {step === 'job' && (
                <>
                  <StepHeading title="Job specification" body="Add the odometer reading, battery level, what the customer wants done and the delivery date." />
                  <div className="flex flex-col gap-6 px-4">
                    <SectionCard title="Vehicle">
                      <DetailRow>
                        <DetailField label="Vehicle" value={`${vehicleMake} ${vehicleModel}`.trim() || 'Vehicle'} />
                        <DetailField label="Plate" value={plateLabel === UNREGISTERED_PLATE ? UNREGISTERED_PLATE : formatPlate(plateLabel)} valueClassName="t-mono-value" />
                      </DetailRow>
                      <DetailRow>
                        <DetailField label="Security">
                          <SecurityValue raw={securityLabel} />
                        </DetailField>
                      </DetailRow>
                    </SectionCard>
                    <div className="flex flex-col gap-5 px-2">
                      <FilledField
                        label="Odometer reading"
                        placeholder="e.g. 14250"
                        value={deadVehicle ? 'Vehicle dead' : vehicleLocked ? 'Odometer locked' : odometer}
                        onValue={(v) => setOdometer(v.replace(/\D/g, '').slice(0, 7))}
                        disabled={deadVehicle || vehicleLocked}
                        isError={odometerError}
                        inputMode="numeric"
                        textClass={deadVehicle || vehicleLocked ? 't-body-lg' : 't-mono-value'}
                        onBlurField={() => setOdometerTouched(true)}
                        trailing={<span className="pr-3 text-on-surface-variant t-body-md">km</span>}
                        supporting={
                          <span className="flex items-center gap-2">
                            {odometerError && <Icon name="alertCircle" size={16} className="text-error" />}
                            {odometerError ? 'Enter a reading above 0, or choose Dead vehicle or Vehicle locked.' : 'Enter the reading, or choose below if it can’t be read.'}
                          </span>
                        }
                        below={
                          <div role="group" aria-label="Odometer not readable" className="flex gap-2">
                            <FilterChip label="Dead vehicle" tone="error" selected={deadVehicle} onClick={() => { setDeadVehicle((d) => !d); setVehicleLocked(false); setOdometer(''); }} />
                            <FilterChip label="Vehicle locked" tone="warning" selected={vehicleLocked} onClick={() => { setVehicleLocked((l) => !l); setDeadVehicle(false); setOdometer(''); }} />
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
                      <DateButton label="Intake date" value={fieldDateLabel(intakeDate)} onClick={() => setPicker('intake')} />
                      <DateButton label="Estimated delivery date" value={deliveryDate ? fieldDateLabel(deliveryDate) : null} onClick={() => setPicker('delivery')} />
                    </div>
                  </div>
                </>
              )}
              {step === 'success' && issued && <SuccessStep issued={issued} />}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {step === 'pin' && <PinBar ready={pin.length === 4 && !pinWrong} onCancel={exit} onVerify={() => verifyPin()} />}
      {step === 'search' && (
        <BottomActionBar>
          <PrimaryButton text="Register new customer" enabled onClick={registerNewCustomer} />
        </BottomActionBar>
      )}
      {step === 'customer' && (
        <BottomActionBar>
          <PrimaryButton text="Continue to vehicle details" enabled={customerValid} onClick={() => customerValid && go('vehicle')} />
        </BottomActionBar>
      )}
      {step === 'vehicle' && (
        <BottomActionBar>
          <PrimaryButton text="Continue to job details" enabled={vehicleValid} onClick={() => vehicleValid && go('job')} />
        </BottomActionBar>
      )}
      {step === 'job' && (
        <BottomActionBar>
          {submitError && (
            <p className="m-0 px-2 text-error t-body-sm" aria-live="polite">
              {submitError}
            </p>
          )}
          <PrimaryButton text="Issue job card" enabled={jobValid} loading={submitting} onClick={() => void issue()} />
        </BottomActionBar>
      )}
      {step === 'success' && issued && (
        <BottomActionBar>
          {issued.phone.trim() ? (
            <a
              href={buildWhatsAppUrl(issued.phone, formatIntakeMessage(presets.intakeTemplate, issued.customerName, issued.make, issued.model, issued.plate, issued.description)) ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="state-layer inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-4 text-on-whatsapp no-underline t-label-strong"
            >
              <Icon name="whatsApp" size={20} />
              Share on WhatsApp
            </a>
          ) : (
            <PillButton text="Share on WhatsApp" icon="whatsApp" disabled className="w-full" />
          )}
          <OutlinedPillButton text="Done" onClick={done} className="w-full text-tertiary" borderClass="border-tertiary" />
        </BottomActionBar>
      )}

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard intake?"
        body="You have unsaved details. If you leave now, this intake is discarded."
        confirmText="Discard"
        dismissText="Keep editing"
        onConfirm={() => {
          setConfirmDiscard(false);
          exit();
        }}
        onDismiss={() => {
          setConfirmDiscard(false);
          if (blocker.state === 'blocked') blocker.reset();
        }}
      />
      <DatePickerDialog
        open={picker !== null}
        label={picker === 'intake' ? 'Intake date' : 'Estimated delivery date'}
        initial={picker === 'intake' ? intakeDate : deliveryDate}
        isAllowed={(d) => (picker === 'intake' ? d <= today() : d >= today())}
        onDismiss={() => setPicker(null)}
        onConfirm={(d) => {
          if (picker === 'intake') setIntakeDate(d);
          else setDeliveryDate(d);
          setPicker(null);
        }}
      />
    </div>
  );
}

/** Step heading: 28/36 title over 16/24 supporting text, 24dp gutters, 8dp top / 24dp bottom. */
function StepHeading({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2 px-6 pt-2 pb-6">
      <h2 className="m-0 text-on-surface t-headline-md">{title}</h2>
      <p className="m-0 text-on-surface-variant t-body-lg">{body}</p>
    </div>
  );
}

/** The intake's main action: a 48dp tertiaryContainer pill. */
function PrimaryButton({ text, enabled, onClick, loading }: { text: string; enabled: boolean; onClick: () => void; loading?: boolean }) {
  return <PillButton text={text} disabled={!enabled} loading={loading} onClick={onClick} className="w-full bg-tertiary-container text-on-tertiary-container" />;
}

function SecurityValue({ raw }: { raw: string }) {
  const s = securityOf(raw);
  if (s.kind === 'pin')
    return (
      <span role="img" aria-label={`PIN ${s.value.split('').join(' ')}`} className="inline-flex h-6 items-center self-start rounded-sm bg-secondary-container px-2 text-on-secondary-container t-pin-sm">
        {s.value}
      </span>
    );
  return <span className={s.kind === 'key' ? 'text-on-surface t-title-md' : 'text-on-surface-variant t-title-md'}>{s.kind === 'key' ? 'Physical key' : 'Not recorded'}</span>;
}

/** 88dp connected row: name, plate · vehicle, phone; last service on the right. */
function MatchRow({ match, index, count, onClick }: { match: Match; index: number; count: number; onClick: () => void }) {
  const v = match.vehicle;
  return (
    <button
      type="button"
      onClick={onClick}
      className="state-layer flex min-h-[88px] w-full items-center gap-4 bg-surface-container-low px-4 py-3 text-left text-on-surface"
      style={{ borderRadius: connectedRadius(index, count) }}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate t-title-md">{match.customer.name.trim() || 'Walk-in customer'}</span>
        <span className="truncate text-on-surface-variant t-body-md">
          {v ? (
            <>
              <span className="font-mono font-bold text-on-surface">{formatPlate(v.plateNumber)}</span> · {`${v.make} ${v.model}`.trim()}
            </>
          ) : (
            'No vehicle on record'
          )}
        </span>
        {match.customer.phone.trim() && <span className="text-on-surface-variant t-phone-sm">{formatPhone(match.customer.phone)}</span>}
      </span>
      {v && (
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-on-surface-variant t-body-sm">Last service</span>
          <span className="text-on-surface t-label-lg">{match.lastService ? weekdayLabel(match.lastService) : 'None yet'}</span>
        </span>
      )}
    </button>
  );
}

/**
 * "Advisor verification": the spinning tertiary cookie, heading and four PIN boxes over one hidden
 * numeric field, vertically centred. The fourth digit submits straight away.
 */
function PinStep({ pin, wrong, onPin, onSubmit }: { pin: string; wrong: boolean; onPin: (v: string) => void; onSubmit: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    input.current?.focus();
  }, []);
  return (
    <div className="flex min-h-full flex-col justify-center py-6" style={{ minHeight: 'calc(100dvh - 64px - 104px)' }}>
      <CookieBadge icon="lock" size={96} containerClass="text-tertiary-container" contentClass="text-on-tertiary-container" className="mb-5 ml-6" />
      <StepHeading title="Advisor verification" body="Enter your 4-digit security PIN to authorise and start vehicle intake." />
      <div className="flex flex-col gap-1.5 px-6">
        <label htmlFor="advisor-pin" className="text-on-surface-variant t-label-lg">
          Advisor PIN
        </label>
        <div className="relative w-max" onClick={() => input.current?.focus()}>
          <div className="flex gap-3" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => {
              const current = pin.length === i || (pin.length === 4 && i === 3);
              const ring = wrong ? 'shadow-[inset_0_0_0_2px_var(--color-error)]' : focused && current ? 'shadow-[inset_0_0_0_2px_var(--color-primary)]' : '';
              return (
                <span key={i} className={cn('flex h-16 w-14 items-center justify-center rounded-lg bg-surface-container-high text-on-surface t-pin-digit', ring)}>
                  {pin.length > i ? '•' : ''}
                </span>
              );
            })}
          </div>
          <input
            ref={input}
            id="advisor-pin"
            aria-label="Advisor PIN, 4 digits"
            inputMode="numeric"
            autoComplete="one-time-code"
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => onPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="flex min-h-4 items-center gap-2 px-1" aria-live="polite">
          {wrong && (
            <>
              <Icon name="alertCircle" size={16} className="text-error" />
              <span className="text-error t-body-sm">Invalid advisor PIN. Please try again.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Cancel (outlined tertiary) and Verify (tertiaryContainer) pinned at the bottom. */
function PinBar({ ready, onCancel, onVerify }: { ready: boolean; onCancel: () => void; onVerify: () => void }) {
  return (
    <BottomActionBar>
      <div className="flex gap-2">
        <OutlinedPillButton text="Cancel" onClick={onCancel} className="flex-1 text-tertiary" borderClass="border-tertiary" />
        <PillButton text="Verify" disabled={!ready} onClick={onVerify} className="flex-1 bg-tertiary-container text-on-tertiary-container" />
      </div>
    </BottomActionBar>
  );
}

function SuccessStep({ issued }: { issued: Issued }) {
  return (
    <>
      <div className="flex flex-col px-6 pt-4 pb-6">
        <span className="relative flex size-24 items-center justify-center text-on-primary-container" aria-hidden="true">
          <svg viewBox="0 0 48 48" className="absolute inset-0 size-24 text-primary-container">
            <path d={COOKIE_PATH} fill="currentColor" />
          </svg>
          <span className="relative">
            <Icon name="checkBold" size={40} />
          </span>
        </span>
        <h2 className="m-0 mt-6 text-on-surface t-headline-md" aria-live="polite">
          Job card issued
        </h2>
        <p className="m-0 mt-2 text-on-surface-variant t-body-lg">The job card is saved. Share it with the customer on WhatsApp.</p>
      </div>
      <div className="px-4">
        <SectionCard>
          <div className="flex flex-col gap-4">
            <DetailRow>
              <DetailField label="Customer" value={issued.customerName || 'Walk-in customer'} truncate />
              <DetailField label="Vehicle" value={issued.plate === UNREGISTERED_PLATE ? UNREGISTERED_PLATE : formatPlate(issued.plate)} valueClassName="t-mono-value" />
            </DetailRow>
            <DetailRow>
              <DetailField label="Intake date" value={weekdayLabel(issued.intakeDate)} />
              <DetailField label="Estimated delivery" value={issued.deliveryDate ? weekdayLabel(issued.deliveryDate) : 'Not set'} />
            </DetailRow>
          </div>
          <Field label="Problems and requests">{parseTasks(issued.description).map((t) => t.text).join('\n')}</Field>
        </SectionCard>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-on-surface-variant t-body-sm">{label}</span>
      <span className="whitespace-pre-line text-on-surface t-body-md">{children}</span>
    </div>
  );
}
