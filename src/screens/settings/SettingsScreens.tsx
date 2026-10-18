import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUserRole, type UserRole, type WorkshopUser } from '../../types';
import { cn, initialsOf } from '../../core/format';
import { deleteUser, errorText, saveUser } from '../../data/repository';
import { useAuth } from '../../data/auth';
import { useData } from '../../data/store';
import { THEME_MODE_LABEL, useTheme, type ThemeMode } from '../../data/theme';
import { useLayout } from '../../app/layout';
import { useBack } from '../../app/shellContext';
import { BottomActionBar, connectedRadius, FilterChip, IconButton, OutlinedPillButton, PillButton } from '../../ui/components';
import { ProfilePhoto } from '../../ui/chrome';
import { FilledField } from '../../ui/fields';
import { Icon, type IconName } from '../../ui/icons';
import { SettingsDialog } from '../../ui/overlays';
import { toneColors, type SettingsTone } from '../../ui/settingsTones';
import { skillTags, useTeam } from './settingsData';
import { StatisticsDetailPage, StatisticsMenuPage } from './StatisticsScreens';
import { SettingsFrame } from './SettingsFrame';

export type SettingsSection = 'team' | 'theme' | 'statistics';

const ROLE_LABEL: Record<UserRole, string> = { admin: 'Workshop Admin', technician: 'Technician', assistant: 'Assistant' };
const ROLE_SHORT: Record<UserRole, string> = { admin: 'Admin', technician: 'Technician', assistant: 'Assistant' };
export const roleLabel = (role: UserRole | null) => (role ? ROLE_LABEL[role] : 'Awaiting a role');

const ENTRIES: { section: SettingsSection; title: string; supporting: string; tone: SettingsTone; icon: IconName; adminOnly: boolean }[] = [
  { section: 'team', title: 'Team Management', supporting: 'Advisors, technicians & role permissions', tone: 'team', icon: 'user', adminOnly: true },
  { section: 'theme', title: 'Theme', supporting: '', tone: 'theme', icon: 'palette', adminOnly: false },
  { section: 'statistics', title: 'Statistics', supporting: 'Workshop throughput, financials & business intelligence', tone: 'stats', icon: 'trendUp', adminOnly: true },
];

function useIsAdmin() {
  const { profile } = useAuth();
  return getUserRole(profile) === 'admin';
}

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <IconButton
      icon={isDark ? 'sunLarge' : 'moon'}
      label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={(e) => toggle(e.currentTarget)}
      className="bg-surface-container-high text-primary"
    />
  );
}

/** Navigation row on surfaceContainerLow: 40dp tone tile, title over a supporting line, chevron. */
function SettingsNavRow({
  icon,
  title,
  supporting,
  tone,
  radius,
  onClick,
  danger,
  selected,
  fill,
}: {
  icon: IconName;
  title: string;
  supporting: string;
  tone?: SettingsTone;
  radius: string;
  onClick: () => void;
  danger?: boolean;
  selected?: boolean;
  fill?: boolean;
}) {
  const { isDark } = useTheme();
  const tile = tone ? toneColors(tone, isDark) : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'state-layer flex w-full items-center gap-4 p-4 text-left transition-colors duration-150',
        selected ? 'bg-secondary-container text-on-secondary-container' : cn('bg-surface-container-low', danger ? 'text-error' : 'text-on-surface'),
        fill && 'h-full'
      )}
      style={{ borderRadius: radius }}
    >
      <span aria-hidden="true" className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', !tile && 'bg-surface-container-high')} style={tile}>
        <Icon name={icon} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="t-title-md">{title}</span>
        <span className={cn('t-body-md', selected ? 'text-on-secondary-container' : 'text-on-surface-variant')}>{supporting}</span>
      </span>
      <Icon name="chevronRight" className={danger || selected ? undefined : 'text-on-surface-variant'} />
    </button>
  );
}

function themeSummary(mode: ThemeMode) {
  return `${THEME_MODE_LABEL[mode]} · LaluZ colours`;
}

// ---------------------------------------------------------------------------
// Host: Settings home and its pages, by URL
// ---------------------------------------------------------------------------

/** /settings: the home page, or on two-pane layouts the home list beside the open page. */
export function SettingsHome() {
  const layout = useLayout();
  const isAdmin = useIsAdmin();
  if (layout.twoPane) return <SettingsTwoPane section={isAdmin ? 'team' : 'theme'} />;
  return <SettingsHomePage />;
}

/** /settings/:section on any layout (two-pane keeps the home list on the left). */
export function SettingsSectionRoute({ section }: { section: SettingsSection }) {
  const layout = useLayout();
  const isAdmin = useIsAdmin();
  const back = useBack('/settings');
  const locked = !isAdmin && (section === 'team' || section === 'statistics');
  if (locked) return <SettingsHome />;
  if (layout.twoPane) return <SettingsTwoPane section={section} />;
  return <SectionPage section={section} onBack={back} />;
}

function SectionPage({ section, onBack, pane = false }: { section: SettingsSection; onBack?: () => void; pane?: boolean }) {
  switch (section) {
    case 'team':
      return <TeamPage onBack={onBack} pane={pane} />;
    case 'theme':
      return <ThemePage onBack={onBack} pane={pane} />;
    case 'statistics':
      return <StatisticsMenuPage onBack={onBack} pane={pane} />;
  }
}

/** Two-pane Settings (tablet spec): profile, rows and Log out in a 360px column; the page on the right. */
function SettingsTwoPane({ section, child }: { section: SettingsSection; child?: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex min-h-20 items-center gap-2 pr-4 pl-6">
        <h1 className="m-0 flex-1 text-on-surface t-headline-md" style={{ letterSpacing: '-0.25px' }}>
          Settings
        </h1>
        <ThemeToggle />
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] gap-6 px-6 pb-6">
        <div className="min-h-0 overflow-y-auto pb-2">
          <HomeList variant="list" selected={section} />
        </div>
        <div className="min-h-0 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={section + (child ? ':child' : '')} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {child ?? <SectionPage section={section} pane />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/** /settings/team/:uid and /settings/statistics/:metric on two-pane layouts render here too. */
export function SettingsChildRoute({ kind }: { kind: 'member' | 'statistic' }) {
  const layout = useLayout();
  const isAdmin = useIsAdmin();
  const back = useBack(kind === 'member' ? '/settings/team' : '/settings/statistics');
  if (!isAdmin) return <SettingsHome />;
  const page = kind === 'member' ? <MemberPage onBack={back} pane={layout.twoPane} /> : <StatisticsDetailPage onBack={back} pane={layout.twoPane} />;
  if (layout.twoPane) return <SettingsTwoPane section={kind === 'member' ? 'team' : 'statistics'} child={page} />;
  return page;
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

function SettingsHomePage() {
  const layout = useLayout();
  const back = useBack('/');
  const isAdmin = useIsAdmin();
  return (
    <SettingsFrame title="Settings" onBack={layout.isCompact ? back : undefined} trailing={<ThemeToggle />}>
      {layout.isCompact ? (
        <>
          <ProfileHeader />
          <div className="px-4 pb-8">
            <HomeList variant="list" />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4 px-6 pb-6">
          <HomeList variant="grid" />
          {isAdmin && (
            <section aria-label="Team Management" className="rounded-2xl bg-surface-container-low">
              <TeamPreview />
            </section>
          )}
        </div>
      )}
    </SettingsFrame>
  );
}

/** Profile block on the phone home: 88dp avatar with the role ring, name, email and role chip. */
function ProfileHeader() {
  const { profile, user } = useAuth();
  const role = getUserRole(profile);
  const name = profile?.name?.trim() || user?.displayName || user?.email?.split('@')[0] || 'Operator';
  return (
    <div className="flex flex-col gap-1 px-6 pt-2 pb-8">
      <span
        aria-hidden="true"
        className="relative mb-3 flex size-[88px] items-center justify-center rounded-full bg-surface-container-high text-on-surface t-headline-lg"
        style={{ boxShadow: `0 0 0 2px var(${role === 'admin' ? '--color-error' : '--color-tertiary'})`, letterSpacing: 0 }}
      >
        {initialsOf(name)}
        <ProfilePhoto url={profile?.photoURL || user?.photoURL} />
      </span>
      <span className="text-on-surface t-headline-md">{name}</span>
      <span className="text-on-surface-variant t-body-lg">{profile?.email || user?.email}</span>
      <span className="mt-2 flex h-8 items-center gap-1.5 self-start rounded-full bg-secondary-container pr-3 pl-2.5 text-on-secondary-container t-label-lg">
        <Icon name="shield" size={18} />
        {roleLabel(role)}
      </span>
    </div>
  );
}

/** Profile card for rail layouts (tablet spec): 72dp avatar with ring, name, email, role chip. */
function ProfileCard() {
  const { profile, user } = useAuth();
  const role = getUserRole(profile);
  const name = profile?.name?.trim() || user?.displayName || user?.email?.split('@')[0] || 'Operator';
  return (
    <section aria-label="Profile" className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-surface-container-low px-6 py-5">
      <span
        aria-hidden="true"
        className="relative flex size-[72px] shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface t-headline-md font-extrabold"
        style={{ boxShadow: `0 0 0 2px var(${role === 'admin' ? '--color-error' : '--color-tertiary'})` }}
      >
        {initialsOf(name)}
        <ProfilePhoto url={profile?.photoURL || user?.photoURL} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-on-surface t-headline-sm">{name}</span>
        <span className="break-all text-on-surface-variant t-body-md">{profile?.email || user?.email}</span>
      </span>
      <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-secondary-container pr-3 pl-2.5 text-on-secondary-container t-label-lg">
        <Icon name="shield" size={18} />
        {role ? ROLE_SHORT[role] : 'No role'}
      </span>
    </section>
  );
}

/** The Settings rows plus Log out: a connected list, or (one-pane rail) a 2-column grid. */
function HomeList({ variant, selected }: { variant: 'list' | 'grid'; selected?: SettingsSection }) {
  const navigate = useNavigate();
  const layout = useLayout();
  const isAdmin = useIsAdmin();
  const { mode } = useTheme();
  const { signOut } = useAuth();
  const [confirmLogOut, setConfirmLogOut] = useState(false);
  const entries = ENTRIES.filter((e) => isAdmin || !e.adminOnly);
  const withProfile = !layout.isCompact;
  const grid = variant === 'grid';
  const logout = (
    <SettingsNavRow
      icon="signOut"
      title="Log out"
      supporting="End active session on this device"
      tone="logout"
      danger
      radius={grid || !withProfile ? '20px' : '4px 4px 20px 20px'}
      fill={grid}
      onClick={() => setConfirmLogOut(true)}
    />
  );
  return (
    <div className="flex flex-col gap-4">
      {withProfile && <ProfileCard />}
      <div className={cn(grid ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-0.5')}>
        {entries.map((e, i) => (
          <SettingsNavRow
            key={e.section}
            icon={e.icon}
            title={e.title}
            supporting={e.section === 'theme' ? themeSummary(mode) : e.supporting}
            tone={e.tone}
            selected={selected === e.section}
            fill={grid}
            radius={grid ? '20px' : withProfile ? connectedRadius(i, entries.length + 1) : connectedRadius(i, entries.length)}
            onClick={() => navigate(`/settings/${e.section}`)}
          />
        ))}
        {(grid || withProfile) && logout}
      </div>
      {!grid && !withProfile && <div className="pt-4">{logout}</div>}
      <SettingsDialog
        open={confirmLogOut}
        title="Log out?"
        body="You will be signed out of LaluZ Garage on this device. You can sign back in with Google or mail."
        confirmText="Log out"
        onConfirm={() => {
          setConfirmLogOut(false);
          void signOut();
        }}
        onDismiss={() => setConfirmLogOut(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

function teamSummary(count: number, awaiting: number) {
  return `${count} ${count === 1 ? 'member' : 'members'}${awaiting > 0 ? ` · ${awaiting} awaiting a role` : ''}`;
}

function MemberAvatar({ user }: { user: WorkshopUser }) {
  return (
    <span aria-hidden="true" className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high t-title-md font-bold">
      {initialsOf(user.name || user.email)}
      <ProfilePhoto url={user.photoURL} />
    </span>
  );
}

/** Role shield (error for admins, tertiary for everyone else) and, when a PIN is set, a primary key. */
function MemberBadges({ user }: { user: WorkshopUser }) {
  const role = getUserRole(user);
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="flex size-6 items-center justify-center">
        {user.pin?.trim() ? (
          <span role="img" aria-label="PIN set" className="flex">
            <Icon name="key" className="text-primary" />
          </span>
        ) : null}
      </span>
      <span role="img" aria-label={role ? ROLE_SHORT[role] : 'No role assigned'} className="flex">
        <Icon name="shield" className={role === 'admin' ? 'text-error' : role ? 'text-tertiary' : 'fill-warning-container text-warning-container'} />
      </span>
    </span>
  );
}

function MemberRow({ user, index, count, onClick }: { user: WorkshopUser; index: number; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="state-layer flex min-h-[72px] w-full items-center gap-3 bg-surface-container-low px-4 py-2 text-left text-on-surface"
      style={{ borderRadius: connectedRadius(index, count) }}
    >
      <MemberAvatar user={user} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate t-title-md">{user.name.trim() || user.email.split('@')[0]}</span>
        <span className="truncate text-on-surface-variant t-body-md">{user.email}</span>
      </span>
      <MemberBadges user={user} />
      <Icon name="chevronRight" className="text-on-surface-variant" />
    </button>
  );
}

function TeamPage({ onBack, pane }: { onBack?: () => void; pane: boolean }) {
  const { users, awaitingRole, error } = useTeam(true);
  const navigate = useNavigate();
  const { showMessage } = useData();
  useEffect(() => {
    if (error) showMessage(error);
  }, [error, showMessage]);
  return (
    <SettingsFrame title={pane ? 'Team members' : 'Team Management'} onBack={onBack} pane={pane}>
      <p className={cn('m-0 pb-4 text-on-surface-variant t-body-md', pane ? 'px-2' : 'px-6')}>{teamSummary(users.length, awaitingRole)}</p>
      <div className={cn('flex flex-col gap-0.5 pb-8', pane ? '' : 'px-4')}>
        {users.map((u, i) => (
          <MemberRow key={u.id} user={u} index={i} count={users.length} onClick={() => navigate(`/settings/team/${u.id}`)} />
        ))}
      </div>
    </SettingsFrame>
  );
}

/** Team members inside the one-pane rail Settings home (tablet portrait). */
function TeamPreview() {
  const { users, awaitingRole } = useTeam(true);
  const navigate = useNavigate();
  return (
    <>
      <div className="flex items-center gap-4 px-6 pt-6 pb-2">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="m-0 text-on-surface t-headline-sm">Team members</h2>
          <span className="text-on-surface-variant t-body-md">{teamSummary(users.length, awaitingRole)}</span>
        </span>
        <button type="button" onClick={() => navigate('/settings/team')} className="state-layer h-12 rounded-full bg-surface-container-high px-5 text-primary t-label-strong">
          Manage team
        </button>
      </div>
      <div className="flex flex-col gap-0.5 px-3 pt-2 pb-4">
        {users.map((u) => {
          return (
            <button key={u.id} type="button" onClick={() => navigate(`/settings/team/${u.id}`)} className="state-layer flex min-h-[72px] items-center gap-4 rounded-lg px-3 py-2 text-left text-on-surface">
              <MemberAvatar user={u} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate t-title-md">{u.name || u.email.split('@')[0]}</span>
                <span className="truncate text-on-surface-variant t-body-md">{u.email}</span>
              </span>
              <MemberBadges user={u} />
              <Icon name="chevronRight" className="text-on-surface-variant" />
            </button>
          );
        })}
      </div>
    </>
  );
}

const ROLE_DESCRIPTIONS: [UserRole, string][] = [
  ['admin', 'Full access, deletion rights and role management.'],
  ['technician', 'Full operations and parts intake. Cannot delete records or parts.'],
  ['assistant', 'Service intake access. Read-only dashboard and records.'],
];

/**
 * Single-choice row (role): connected shape; selected = secondaryContainer with a filled check
 * radio, unselected = surfaceContainerLow with a 2dp outline ring.
 */
function ChoiceRow({ label, description, selected, index, count, onClick }: { label: string; description: string; selected: boolean; index: number; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn('state-layer flex w-full items-center gap-4 p-4 text-left transition-colors duration-250', selected ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-low text-on-surface')}
      style={{ borderRadius: connectedRadius(index, count) }}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="t-title-md">{label}</span>
        <span className={cn('t-body-md', selected ? 'text-on-secondary-container' : 'text-on-surface-variant')}>{description}</span>
      </span>
      {selected ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-on-secondary-container text-secondary-container">
          <Icon name="checkHeavy" size={16} />
        </span>
      ) : (
        <span className="size-6 shrink-0 rounded-full border-2 border-outline" />
      )}
    </button>
  );
}

function SectionLabel({ children, bold = true }: { children: ReactNode; bold?: boolean }) {
  return <h3 className={cn('m-0 px-2 text-on-surface-variant', bold ? 't-title-sm' : 't-label-lg')}>{children}</h3>;
}

function MemberPage({ onBack, pane }: { onBack: () => void; pane: boolean }) {
  const { uid = '' } = useParams();
  const { users, tags } = useTeam(true);
  const { user: me } = useAuth();
  const { showMessage } = useData();
  const navigate = useNavigate();
  const member = users.find((u) => u.id === uid) ?? null;
  if (!member) {
    return (
      <SettingsFrame title="Edit member" onBack={onBack} pane={pane}>
        <p className="m-0 px-6 py-12 text-center text-on-surface-variant t-body-md">Loading member…</p>
      </SettingsFrame>
    );
  }
  return (
    <MemberForm
      key={member.id}
      member={member}
      allTags={tags}
      isSelf={member.id === me?.uid}
      pane={pane}
      onBack={onBack}
      onDone={(message) => {
        showMessage(message);
        navigate('/settings/team', { replace: true });
      }}
      onError={showMessage}
    />
  );
}

function MemberForm({
  member,
  allTags,
  isSelf,
  pane,
  onBack,
  onDone,
  onError,
}: {
  member: WorkshopUser;
  allTags: string[];
  isSelf: boolean;
  pane: boolean;
  onBack: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const originalTags = useMemo(() => new Set(skillTags(member)), [member]);
  const [role, setRole] = useState<UserRole | null>(getUserRole(member));
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [pin, setPin] = useState(member.pin ?? '');
  const [memberTags, setMemberTags] = useState<Set<string>>(originalTags);
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tagsChanged = memberTags.size !== originalTags.size || [...memberTags].some((t) => !originalTags.has(t));
  const dirty = role !== getUserRole(member) || name !== member.name || email !== member.email || pin !== (member.pin ?? '') || tagsChanged;

  const save = async () => {
    if (!email.trim()) return onError('Email address is required.');
    if (pin && pin.length !== 4) return onError('Security PIN must be exactly 4 digits.');
    setSaving(true);
    try {
      await saveUser(member.id, name, email, role, pin, [...memberTags].sort());
      onDone('Member saved');
    } catch (e) {
      setSaving(false);
      onError(`Couldn't save the member. ${errorText(e)}`);
    }
  };
  const remove = async () => {
    setConfirmDelete(false);
    try {
      await deleteUser(member.id);
      onDone(`Advisor "${member.name}" deleted`);
    } catch (e) {
      onError(`Couldn't delete the advisor. ${errorText(e)}`);
    }
  };

  return (
    <SettingsFrame
      title="Edit member"
      onBack={onBack}
      pane={pane}
      trailing={pane ? <IconButton icon="close" label="Close" onClick={onBack} className="text-on-surface-variant" /> : undefined}
      bottomBar={
        <BottomActionBar className={pane ? 'rounded-b-2xl' : undefined}>
          <div className="flex gap-2">
            {/* Firestore rules don't let an admin delete their own account. */}
            <OutlinedPillButton text="Delete member" onClick={() => setConfirmDelete(true)} disabled={isSelf} className="flex-1 text-error" borderClass="border-error" />
            <PillButton text="Save changes" onClick={() => void save()} disabled={!dirty} loading={saving} className="flex-1 bg-primary text-on-primary" />
          </div>
        </BottomActionBar>
      }
    >
      <div className={cn('flex flex-col gap-6 pt-2 pb-8', pane ? 'px-0' : 'px-4')}>
        <div className="flex flex-col gap-2">
          <SectionLabel bold={false}>Operational role</SectionLabel>
          <div role="radiogroup" aria-label="Operational role" className="flex flex-col gap-0.5">
            {ROLE_DESCRIPTIONS.map(([r, desc], i) => (
              <ChoiceRow key={r} label={ROLE_SHORT[r]} description={desc} selected={role === r} index={i} count={ROLE_DESCRIPTIONS.length} onClick={() => setRole(r)} />
            ))}
          </div>
        </div>
        <FilledField label="Full name" placeholder="e.g. John Doe" value={name} onValue={setName} />
        <FilledField label="Email address" placeholder="member@example.com" type="email" value={email} onValue={setEmail} />
        <FilledField
          label="Advisor PIN"
          placeholder="4 digits"
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          value={pin}
          onValue={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
          supporting="4 digits. Asked when this advisor issues a job card."
          textClass="t-pin"
          trailing={<IconButton icon={showPin ? 'eyeOff' : 'eye'} label={showPin ? 'Hide PIN' : 'Show PIN'} onClick={() => setShowPin((s) => !s)} className="text-on-surface-variant" />}
        />
        <div className="flex flex-col gap-2">
          <SectionLabel bold={false}>Skill and department tags</SectionLabel>
          {allTags.length === 0 ? (
            <p className="m-0 px-2 text-on-surface-variant t-body-md">No tags yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTags.map((t) => (
                <FilterChip
                  key={t}
                  label={t}
                  selected={memberTags.has(t)}
                  onClick={() =>
                    setMemberTags((prev) => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t);
                      else next.add(t);
                      return next;
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <SettingsDialog
        open={confirmDelete}
        title="Delete advisor?"
        body={`Are you sure you want to permanently delete advisor "${member.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => void remove()}
        onDismiss={() => setConfirmDelete(false)}
      />
    </SettingsFrame>
  );
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const MODE_DEFS: [ThemeMode, string][] = [
  ['system', "Follow the device's dark theme setting"],
  ['light', 'Always use the light theme'],
  ['dark', 'Always use the dark theme'],
];

/** Theme: System / Light / Dark. (Material You is Android-only, so the web has no Colour section.) */
function ThemePage({ onBack, pane }: { onBack?: () => void; pane: boolean }) {
  const { mode, setMode } = useTheme();
  return (
    <SettingsFrame title="Theme" onBack={onBack} pane={pane}>
      <div className={cn('flex flex-col gap-2 pt-2 pb-8', pane ? '' : 'px-4')}>
        <SectionLabel>Mode</SectionLabel>
        <div role="radiogroup" aria-label="Mode" className="flex flex-col gap-0.5">
          {MODE_DEFS.map(([m, desc], i) => (
            <ChoiceRowWithOrigin key={m} label={THEME_MODE_LABEL[m]} description={desc} selected={mode === m} index={i} count={MODE_DEFS.length} onClick={(el) => setMode(m, el)} />
          ))}
        </div>
      </div>
    </SettingsFrame>
  );
}

function ChoiceRowWithOrigin(props: { label: string; description: string; selected: boolean; index: number; count: number; onClick: (el: HTMLElement) => void }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setEl}>
      <ChoiceRow {...props} onClick={() => el && props.onClick(el)} />
    </div>
  );
}
