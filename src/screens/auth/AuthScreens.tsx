import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../data/auth';
import { useTheme, type ThemeMode } from '../../data/theme';
import { cn, initialsOf } from '../../core/format';
import { useLayout } from '../../app/layout';
import { CookieBadge, DetailField, Divider, IconButton, PillButton, StatusChip, TonalRowButton } from '../../ui/components';
import { FilledField } from '../../ui/fields';
import { GoogleG, Icon, type IconName } from '../../ui/icons';
import { LaluzLogo, LOGO_DRAW_TOTAL_MS } from '../../ui/Logo';
import { ProfilePhoto } from '../../ui/chrome';
import { localDateOf, timestampMillis, weekdayLabel } from '../../core/dates';

const LICENSE_URL = 'https://github.com/nmhappu/laluzgarage/blob/master/LICENSE';
const EMPHASIZED = [0.2, 0, 0, 1] as const;

/**
 * Soft radial glow behind auth screens: a circle at (cx, cy) fading to transparent at 55% of the
 * farthest-corner radius, as the artboard's CSS radial-gradient. [color] is a CSS colour.
 */
function glow(color: string, cx: number, cy: number): string {
  return `radial-gradient(circle farthest-corner at ${cx * 100}% ${cy * 100}%, ${color} 0%, transparent 55%)`;
}

const mix = (token: string, pct: number) => `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;

/** Splash while auth resolves: the logo on the surface. */
export function LoadingScreen() {
  return (
    <div className="flex h-full items-center justify-center bg-surface" role="status" aria-label="Loading">
      <LaluzLogo />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

let logoDrawnThisPage = false;

export function LoginScreen() {
  const { isDark } = useTheme();
  const { twoPane } = useLayout();
  const [mail, setMail] = useState(false);
  // The logo writes itself once per page load; coming back from the mail view doesn't replay it.
  const [draw] = useState(() => !logoDrawnThisPage);
  const [solid, setSolid] = useState(!draw);
  useEffect(() => {
    logoDrawnThisPage = true;
    if (!draw) return;
    const t = setTimeout(() => setSolid(true), LOGO_DRAW_TOTAL_MS + 50);
    return () => clearTimeout(t);
  }, [draw]);
  const glowColor = mix('--color-primary', isDark ? 10 : 7);
  return (
    <div className="relative flex h-full overflow-hidden bg-surface">
      {twoPane && <WelcomeHero draw={!solid} glowColor={glowColor} />}
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={mail}>
          <motion.div
            key={mail ? 'mail' : 'start'}
            custom={mail}
            className="absolute inset-0 bg-surface"
            style={twoPane ? undefined : { backgroundImage: glow(glowColor, 0.2, 0.38) }}
            variants={{
              enter: (fwd: boolean) => ({ x: fwd ? '100%' : '-25%', zIndex: fwd ? 2 : 1 }),
              center: { x: 0 },
              exit: (fwd: boolean) => ({ x: fwd ? '-25%' : '100%', zIndex: fwd ? 1 : 2 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: EMPHASIZED }}
          >
            {mail ? <MailView onBack={() => setMail(false)} /> : <StartView onMail={() => setMail(true)} draw={!solid} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Tablet (two-pane) welcome: the brand fills the left half, the sign-in options sit on the right. */
function WelcomeHero({ draw, glowColor }: { draw: boolean; glowColor: string }) {
  return (
    <section
      aria-label="Welcome"
      className="flex min-w-0 flex-[1.05] flex-col justify-center py-14 pr-6 pl-[72px]"
      style={{ backgroundImage: glow(glowColor, 0.24, 0.3) }}
    >
      <LaluzLogo width={240} height={121} draw={draw} />
      <h1 className="m-0 mt-10 text-on-surface" style={{ fontSize: 40, lineHeight: '48px', fontWeight: 800, letterSpacing: -0.5 }}>
        Welcome to LaluZ Garage
      </h1>
      <p className="m-0 mt-3 max-w-[440px] text-on-surface-variant" style={{ fontSize: 18, lineHeight: '28px' }}>
        Sign in to manage vehicle records and inventory. Internal use only.
      </p>
    </section>
  );
}

function StartView({ onMail, draw }: { onMail: () => void; draw: boolean }) {
  const { signInWithGoogle } = useAuth();
  const { isDark, toggle } = useTheme();
  const { isCompact, twoPane } = useLayout();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const google = async () => {
    setError(null);
    setGoogleBusy(true);
    const message = await signInWithGoogle();
    setGoogleBusy(false);
    setError(message);
  };

  const buttonClass = isCompact ? undefined : 'h-16';
  const buttons = (
    <>
      <TonalRowButton
        text="Continue with Google"
        onClick={google}
        loading={googleBusy}
        className={buttonClass}
        leading={
          <span className={cn('flex items-center justify-center rounded-full bg-[#FFFFFF]', isCompact ? 'size-6' : 'size-8')}>
            <GoogleG size={isCompact ? 14 : 18} />
          </span>
        }
      />
      <TonalRowButton text="Continue with mail" onClick={onMail} disabled={googleBusy} className={buttonClass} leading={<Icon name="mail" />} />
      {error && (
        <p className="m-0 px-4 text-error t-body-md" aria-live="polite">
          {error}
        </p>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <header className={cn('flex shrink-0 items-center gap-2 pr-2 pl-4', isCompact ? 'h-16' : 'h-20 pr-4 pl-6')}>
        <span className="pl-1.5 font-bold text-on-surface t-body-lg">{twoPane ? '' : 'LaluZ Garage'}</span>
        <span className="flex-1" />
        <IconButton
          icon={isDark ? 'moon' : 'sun'}
          label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={(e) => toggle(e.currentTarget)}
          className="bg-surface-container-high text-on-surface"
        />
      </header>
      {isCompact ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex-[3]" />
          <div className="w-full max-w-[560px] px-6">
            <LaluzLogo draw={draw} />
            <h1 className="m-0 mt-8 text-on-surface t-headline-sm" style={{ lineHeight: '36px' }}>
              Welcome to LaluZ Garage
            </h1>
            <p className="m-0 mt-2 text-on-surface-variant t-body-md" style={{ lineHeight: '24px' }}>
              Sign in to manage vehicle records and inventory.
              <br />
              Internal use only.
            </p>
          </div>
          <div className="flex w-full max-w-[560px] flex-col gap-3 px-6 pt-8">{buttons}</div>
          <div className="flex-[4]" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6">
          <div className="flex w-full max-w-[440px] flex-col">
            {twoPane ? (
              <div className="mb-8">
                <h2 className="m-0 text-on-surface" style={{ fontSize: 28, lineHeight: '36px', fontWeight: 700 }}>
                  Sign in
                </h2>
                <p className="m-0 mt-1 text-on-surface-variant t-body-lg">Choose how you want to continue.</p>
              </div>
            ) : (
              <div className="mb-10">
                <LaluzLogo width={220} height={111} draw={draw} />
                <h1 className="m-0 mt-8 text-on-surface" style={{ fontSize: 32, lineHeight: '40px', fontWeight: 800, letterSpacing: -0.25 }}>
                  Welcome to LaluZ Garage
                </h1>
                <p className="m-0 mt-2 text-on-surface-variant t-body-lg">Sign in to manage vehicle records and inventory. Internal use only.</p>
              </div>
            )}
            <div className="flex flex-col gap-3">{buttons}</div>
          </div>
        </div>
      )}
      <footer className="flex shrink-0 flex-col items-center px-6 pb-3 text-on-surface-variant t-body-sm">
        <span className="flex items-center gap-1.5">
          Created with
          <span className="text-error" role="img" aria-label="love">
            <Icon name="heart" size={14} />
          </span>
          by <span className="font-semibold text-on-surface">Prince Santhosh</span>
        </span>
        <span>
          © 2026 LaluZ Garage ·{' '}
          <a href={LICENSE_URL} target="_blank" rel="noreferrer" className="font-semibold text-on-surface no-underline hover:underline">
            License
          </a>
        </span>
      </footer>
    </div>
  );
}

function MailView({ onBack }: { onBack: () => void }) {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { isCompact } = useLayout();
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const eErr = email.trim() ? null : 'Enter your email address.';
    const pErr = password ? null : 'Enter your password.';
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;
    setBusy(true);
    setError(null);
    const message = await signInWithEmail(email, password);
    setBusy(false);
    setError(message);
  };

  return (
    <div className="flex h-full flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }} onKeyDown={(e) => e.key === 'Escape' && onBack()}>
      <header className="flex h-16 shrink-0 items-center px-2">
        <IconButton icon="arrowBack" label="Back" onClick={onBack} className="text-on-surface" />
      </header>
      <form
        onSubmit={submit}
        className={cn('flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-6', isCompact ? 'max-w-[560px]' : 'mx-auto max-w-[488px] justify-center')}
        noValidate
      >
        <div className="flex flex-col gap-2 pt-2">
          <h1 className="m-0 text-on-surface t-headline-md">Sign in with mail</h1>
          <p className="m-0 text-on-surface-variant t-body-lg">Use the email and password for your account.</p>
        </div>
        <div className="flex flex-col gap-4 pt-6">
          <FilledField
            ref={emailRef as React.Ref<HTMLInputElement>}
            label="Email"
            placeholder="name@example.com"
            type="email"
            autoComplete="email"
            value={email}
            onValue={(v) => {
              setEmail(v);
              setEmailError(null);
              setError(null);
            }}
            isError={emailError !== null}
            supporting={emailError}
          />
          <FilledField
            label="Password"
            placeholder="Password"
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onValue={(v) => {
              setPassword(v);
              setPasswordError(null);
              setError(null);
            }}
            isError={passwordError !== null}
            supporting={passwordError}
            trailing={
              <IconButton
                icon={visible ? 'eyeOff' : 'eye'}
                label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
                onClick={() => setVisible((v) => !v)}
                className="text-on-surface-variant"
              />
            }
          />
        </div>
        {error && (
          <p className="m-0 px-4 pt-4 text-error t-body-md" aria-live="polite">
            {error}
          </p>
        )}
        <TonalRowButton text="Sign in" type="submit" loading={busy} className={cn('my-6', !isCompact && 'h-16')} />
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending approval
// ---------------------------------------------------------------------------

export function PendingApprovalScreen() {
  const { user, profile, signOut } = useAuth();
  const { isDark } = useTheme();
  const { isCompact, twoPane } = useLayout();
  const name = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Team member';
  const email = user?.email ?? profile?.email ?? '';
  const provider = user?.providerData.some((p) => p.providerId === 'google.com') ? 'Google' : 'Email';
  const millis = timestampMillis(profile?.createdAt) ?? (user?.metadata.creationTime ? Date.parse(user.metadata.creationTime) : null);
  const requested = millis ? weekdayLabel(localDateOf(new Date(millis))) : 'Today';
  const warningGlow = `color-mix(in srgb, #FFD60A ${isDark ? 10 : 14}%, transparent)`;

  const account = (
    <section aria-label="Account waiting for approval" className={cn('flex flex-col rounded-xl bg-surface-container-low', isCompact ? 'mt-8 gap-4 p-4' : 'gap-5 rounded-[28px] p-6')}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'relative flex shrink-0 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container t-label-tiny',
            isCompact ? 'size-10' : 'size-14'
          )}
          aria-hidden="true"
        >
          {initialsOf(name)}
          <ProfilePhoto url={profile?.photoURL || user?.photoURL} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-on-surface t-title-md">{name}</span>
          <span className="truncate text-on-surface-variant t-body-md">{email}</span>
        </div>
        <StatusChip text="Pending" tone="pending" />
      </div>
      <Divider />
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Signed in with" value={provider} />
        <DetailField label="Requested" value={requested} />
      </div>
    </section>
  );

  if (isCompact) {
    return (
      <div className="h-full overflow-y-auto bg-surface" style={{ backgroundImage: glow(warningGlow, 0.22, 0.16) }}>
        <div className="flex min-h-full w-full max-w-[560px] flex-col px-6 pt-[72px] pb-6">
          <CookieBadge icon="clock" containerClass="text-warning-container" contentClass="text-on-warning-container" />
          <h1 className="m-0 mt-8 text-on-surface t-headline-md">Waiting for approval</h1>
          <p className="m-0 mt-3 text-on-surface-variant t-body-lg">An admin needs to approve your account before you can use LaluZ Garage.</p>
          {account}
          <div className="min-h-6 flex-1" />
          <TonalRowButton text="Sign out" onClick={() => void signOut()} />
        </div>
      </div>
    );
  }

  // Tablet: the status fills the left half in landscape; in portrait it stacks, centred as one block.
  const hero = (
    <section aria-label="Status" className={twoPane ? 'flex min-w-0 flex-[1.05] flex-col justify-center py-14 pr-6 pl-[72px]' : 'mx-auto flex w-full max-w-[528px] flex-col px-6'} style={twoPane ? { backgroundImage: glow(warningGlow, 0.24, 0.22) } : undefined}>
      <CookieBadge icon="clock" size={twoPane ? 160 : 140} iconSize={64} containerClass="text-warning-container" contentClass="text-on-warning-container" />
      <h1 className="m-0 mt-10 text-on-surface" style={{ fontSize: twoPane ? 40 : 36, lineHeight: twoPane ? '48px' : '44px', fontWeight: 800, letterSpacing: -0.5 }}>
        Waiting for approval
      </h1>
      <p className="m-0 mt-3 max-w-[440px] text-on-surface-variant" style={{ fontSize: 18, lineHeight: '28px' }}>
        An admin needs to approve your account before you can use LaluZ Garage.
      </p>
    </section>
  );
  const side = (
    <div className={cn('flex w-full max-w-[480px] flex-col gap-6', !twoPane && 'mx-auto px-6 pt-12')}>
      {account}
      <TonalRowButton text="Sign out" onClick={() => void signOut()} className="h-16" />
    </div>
  );
  return twoPane ? (
    <div className="flex h-full overflow-y-auto bg-surface">
      {hero}
      <div className="flex min-w-0 flex-1 items-center justify-center p-6">{side}</div>
    </div>
  ) : (
    <div className="flex h-full flex-col justify-center overflow-y-auto bg-surface" style={{ backgroundImage: glow(warningGlow, 0.18, 0.22) }}>
      {hero}
      {side}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Choose theme (first sign-in)
// ---------------------------------------------------------------------------

const CHOICES: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: 'system', label: 'System Default', icon: 'smartphone' },
  { mode: 'dark', label: 'Dark', icon: 'moon' },
  { mode: 'light', label: 'Light', icon: 'sun' },
];

/** First sign-in theme picker, once per account per device. Choices apply live. */
export function ThemePickerScreen() {
  const { mode, setMode } = useTheme();
  const { finishThemeChoice } = useAuth();
  const selected = CHOICES.find((c) => c.mode === mode) ?? CHOICES[0];
  const rows = [CHOICES.slice(0, 2), CHOICES.slice(2)];
  return (
    <div className="h-full overflow-y-auto bg-surface transition-colors duration-150">
      <div className="flex min-h-full w-full max-w-[560px] flex-col px-6 pt-14 pb-6">
        <CookieBadge icon={selected.icon} size={104} containerClass="text-secondary-container" contentClass="text-on-secondary-container" />
        <h1 className="m-0 mt-6 text-on-surface t-headline-md">Choose your theme</h1>
        <p className="m-0 mt-2 text-on-surface-variant t-body-lg">See how the app looks before you start. You can change this later in Settings.</p>
        <PreviewCustomerCard />
        <h2 className="m-0 mt-6 mb-2 text-on-surface-variant t-title-sm">Theme</h2>
        <div role="radiogroup" aria-label="Theme" className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              {row.map((c) => {
                const on = c.mode === selected.mode;
                return (
                  <button
                    key={c.mode}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={(e) => setMode(c.mode, e.currentTarget)}
                    className={cn(
                      'state-layer flex min-h-16 items-center gap-2 rounded-xl bg-surface-container-low py-2 pr-3 pl-2 text-left transition-shadow duration-150',
                      on ? 'shadow-[inset_0_0_0_2px_var(--color-primary)]' : 'shadow-[inset_0_0_0_1px_var(--color-outline-variant)]'
                    )}
                  >
                    <span className={cn('flex size-9 items-center justify-center rounded-full transition-colors duration-150', on ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant')}>
                      <Icon name={c.icon} size={20} />
                    </span>
                    <span className="flex-1 text-on-surface t-label-strong">{c.label}</span>
                    {on && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-on-primary">
                        <Icon name="checkBold" size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="min-h-6 flex-1" />
        <PillButton text="Continue" icon="arrowForward" onClick={finishThemeChoice} className="h-14 w-full bg-primary text-on-primary" />
      </div>
    </div>
  );
}

/** A customer card with a call button and a "New job" button in the live theme. Decorative. */
function PreviewCustomerCard() {
  const pill = (text: string, cls: string, icon: IconName) => (
    <span className={cn('flex h-11 flex-1 items-center justify-center gap-2 rounded-full t-label-strong', cls)}>
      <Icon name={icon} size={18} />
      {text}
    </span>
  );
  return (
    <div aria-hidden="true" className="mt-6 flex flex-col gap-4 rounded-xl bg-surface-container-low p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container t-label-tiny">JW</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-on-surface t-title-md">John Wick</span>
          <span className="text-on-surface-variant t-mono-sm">+91 85471 87744</span>
        </div>
        <span className="flex h-6 items-center rounded-sm bg-secondary-container px-2 text-on-secondary-container t-label-md">Regular</span>
      </div>
      <Divider />
      <div className="flex items-center">
        <span className="flex-1 text-on-surface-variant t-body-md">Swift Dzire · KL 07 CD 4521</span>
        <span className="text-primary t-mono-sm">₹4,850</span>
      </div>
      <div className="flex gap-2">
        {pill('Call', 'bg-primary text-on-primary', 'phone')}
        {pill('New job', 'bg-secondary-container text-on-secondary-container', 'plus')}
      </div>
    </div>
  );
}
