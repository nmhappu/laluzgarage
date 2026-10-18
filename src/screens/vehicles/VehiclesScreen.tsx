import { memo, useDeferredValue, useMemo, useRef } from 'react';
import { VehiclesIndex, vehiclesSummary, type VehicleCardModel } from '../../core/catalog';
import { cn } from '../../core/format';
import { useData } from '../../data/store';
import { useVehiclesView } from '../../data/viewState';
import { useLayout } from '../../app/layout';
import { useOpeners } from '../../app/openers';
import { useShell, useToolbarScroll } from '../../app/shellContext';
import { DetailField } from '../../ui/components';
import { OperatorAvatarButton, ScreenHeader, SyncTopBar, syncTitleStyle, TopBar } from '../../ui/chrome';
import { SearchField } from '../../ui/fields';
import { EmptyText, Reflow, TabletCard, TopBarTitleSearch, useListPages, useScrolledAway } from '../../ui/listChrome';
import { useSheetSelection } from '../../app/sheet';

const PLACEHOLDER = 'Search plate, vehicle, owner or phone';

/** Vehicles tab: every vehicle on file, newest service first, searchable by plate, vehicle, owner or phone. */
export function VehiclesScreen({ active }: { active: boolean }) {
  const { records, vehicles, customers, isLoading, sync } = useData();
  const { vehicleSearch, setVehicleSearch } = useVehiclesView();
  const { account } = useShell();
  const layout = useLayout();
  const { openVehicle } = useOpeners();
  const index = useMemo(() => new VehiclesIndex(vehicles, customers, records), [vehicles, customers, records]);
  // The field echoes every keystroke at once; the list catches up in the background.
  const query = useDeferredValue(vehicleSearch);
  const cards = useMemo(() => index.select(query), [index, query]);
  // Cards are drawn a page at a time; the search and the count cover them all.
  const { limit, sentinel } = useListPages(cards.length, query);
  const shown = cards.slice(0, limit);
  const summary = vehiclesSummary(index.total);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  useToolbarScroll(scrollRef, active && layout.isCompact);
  const headerGone = useScrolledAway(headerRef, scrollRef);
  // Rail layouts open a vehicle in the side sheet; its card stays selected while it is open.
  const openId = useSheetSelection().vehicle;

  const empty = isLoading ? 'Loading vehicles…' : query.trim() ? 'No vehicles match your search.' : 'No vehicles on file yet.';
  const countLabel = `${cards.length} ${cards.length === 1 ? 'vehicle' : 'vehicles'}`;

  if (layout.isCompact) {
    return (
      <div className="flex h-full flex-col bg-surface">
        <SyncTopBar sync={sync}>
          <TopBar>
            <TopBarTitleSearch
              title="Vehicles"
              summary={summary}
              headerGone={headerGone}
              query={vehicleSearch}
              onQuery={setVehicleSearch}
              placeholder={PLACEHOLDER}
              label="Search vehicles"
              titleStyle={syncTitleStyle(sync)}
            />
            <OperatorAvatarButton account={account} />
          </TopBar>
        </SyncTopBar>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[640px] pb-[168px]">
            <div ref={headerRef}>
              <ScreenHeader title="Vehicles" summary={summary} />
            </div>
            <div className="px-4">
              <SearchField value={vehicleSearch} onValue={setVehicleSearch} placeholder={PLACEHOLDER} label="Search vehicles" />
            </div>
            <p className="m-0 px-6 pt-4 pb-2 text-on-surface-variant t-label-lg">{countLabel}</p>
            <div className="flex flex-col gap-2 px-4">
              {shown.map((c) => (
                <VehicleCard key={c.vehicle.id} card={c} onClick={openVehicle} />
              ))}
            </div>
            {sentinel}
            {cards.length === 0 && <EmptyText>{empty}</EmptyText>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <SyncTopBar sync={sync}>
        <header className="flex min-h-24 items-center gap-4 pr-4 pl-6">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5" style={syncTitleStyle(sync)}>
            <h1 className="m-0 text-on-surface t-display-sm">Vehicles</h1>
            <span className="truncate text-on-surface-variant t-body-md">{summary}</span>
          </div>
          <SearchField value={vehicleSearch} onValue={setVehicleSearch} placeholder={PLACEHOLDER} label="Search vehicles" className={cn('mr-2', layout.railExpanded ? 'w-[360px]' : 'w-60')} />
          <OperatorAvatarButton account={account} />
        </header>
      </SyncTopBar>
      <div className="sheet-inset flex min-h-0 flex-1 px-6 pb-6">
        <TabletCard label="Vehicle list">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="m-0 px-2 pb-2 text-on-surface-variant t-label-lg">{countLabel}</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2">
              {shown.map((c) => (
                <Reflow key={c.vehicle.id}>
                  <VehicleCard card={c} selected={openId === c.vehicle.id} onClick={openVehicle} />
                </Reflow>
              ))}
            </div>
            {sentinel}
            {cards.length === 0 && <EmptyText>{empty}</EmptyText>}
          </div>
        </TabletCard>
      </div>
    </div>
  );
}

/**
 * Vehicle card: plate and vehicle top-left, service count top-right, then a hairline and an
 * Owner / Last service pair. surfaceContainerLow (secondaryContainer when selected), 20dp radius.
 */
const VehicleCard = memo(function VehicleCard({ card, onClick, selected }: { card: VehicleCardModel; onClick: (id: string, el: HTMLElement) => void; selected?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => onClick(card.vehicle.id, e.currentTarget)}
      aria-pressed={selected}
      className={cn(
        'state-layer flex w-full flex-col gap-4 rounded-xl p-4 text-left transition-colors duration-150',
        selected ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-low text-on-surface'
      )}
    >
      <span className="flex w-full items-start gap-2">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="t-plate">{card.plate}</span>
          <span className={cn('truncate t-body-md', selected ? 'text-on-secondary-container' : 'text-on-surface-variant')}>{card.description}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="t-title-lg">{card.services}</span>
          <span className={cn('t-body-sm', selected ? 'text-on-secondary-container' : 'text-on-surface-variant')}>{card.services === 1 ? 'service' : 'services'}</span>
        </span>
      </span>
      <span className="flex w-full flex-col">
        <span className={cn('h-px w-full', selected ? 'bg-on-secondary-container/40' : 'bg-outline-variant')} />
        <span className="grid grid-cols-2 gap-4 pt-3">
          <DetailField label="Owner" value={card.owner} truncate valueClassName={selected ? 'text-on-secondary-container' : undefined} />
          <DetailField label="Last service" value={card.lastService} truncate valueClassName={selected ? 'text-on-secondary-container' : undefined} />
        </span>
      </span>
    </button>
  );
});
