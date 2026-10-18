import { memo, useDeferredValue, useMemo, useRef, useState } from 'react';
import { InventoryIndex, PART_SORTS, type PartRowModel } from '../../core/catalog';
import { cn } from '../../core/format';
import { useData } from '../../data/store';
import { useInventoryView } from '../../data/viewState';
import { useLayout } from '../../app/layout';
import { useOpeners } from '../../app/openers';
import { useShell, useToolbarScroll } from '../../app/shellContext';
import { connectedRadius, FilterChip, TextButton } from '../../ui/components';
import { OperatorAvatarButton, ScreenHeader, SyncTopBar, syncTitleStyle, TopBar } from '../../ui/chrome';
import { SearchField } from '../../ui/fields';
import { EmptyText, PinnedBand, Reflow, TabletCard, TopBarTitleSearch, useElementWidth, useListPages, useScrolledAway } from '../../ui/listChrome';
import { useSheetSelection } from '../../app/sheet';

const PLACEHOLDER = 'Search parts or category';

/** Inventory tab: parts in a connected list with category / low-stock filters and a stock sort. */
export function InventoryScreen({ active }: { active: boolean }) {
  const { parts, isLoading, sync } = useData();
  const view = useInventoryView();
  const { account } = useShell();
  const layout = useLayout();
  const { openPart } = useOpeners();
  const index = useMemo(() => new InventoryIndex(parts), [parts]);
  // The field echoes every keystroke at once; the list catches up in the background.
  const partSearch = useDeferredValue(view.partSearch);
  const rows = useMemo(() => index.select(partSearch, view.partFilter, view.partSort), [index, partSearch, view.partFilter, view.partSort]);
  // Rows are drawn a page at a time; the search, filter and count cover them all.
  const { limit, sentinel } = useListPages(rows.length, [partSearch, view.partFilter, view.partSort].join('|'));
  const [sortOpen, setSortOpen] = useState(false);
  const shown = rows.slice(0, limit);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  useToolbarScroll(scrollRef, active && layout.isCompact);
  const headerGone = useScrolledAway(headerRef, scrollRef);
  // Rail layouts open a part in the side sheet; its row stays selected while it is open.
  const openId = useSheetSelection().part;
  // Columns drop out as the card narrows (the side sheet or the rail takes width), so the table never squeezes.
  const [tableRef, tableWidth] = useElementWidth<HTMLDivElement>();
  const columns = tableWidth >= 700 ? 'full' : tableWidth >= 480 ? 'mid' : 'min';

  const sortLabel = PART_SORTS.find((s) => s.key === view.partSort)?.label ?? PART_SORTS[0].label;
  const chips = (
    <div role="group" aria-label="Filter parts" className="no-scrollbar flex gap-2 overflow-x-auto">
      {index.chips.map((c) => (
        <FilterChip key={c.key} label={c.label} count={c.count} selected={view.partFilter === c.key} onClick={() => view.setPartFilter(c.key)} />
      ))}
    </div>
  );
  const countRow = (
    <div className="flex items-center">
      <span className="flex-1 text-on-surface-variant t-label-lg">
        {rows.length} {rows.length === 1 ? 'part' : 'parts'}
      </span>
      <TextButton
        text={sortLabel}
        icon="sort"
        aria-label={`Sorted by ${sortLabel.toLowerCase()}. Open sort options`}
        aria-haspopup="menu"
        aria-expanded={sortOpen}
        onClick={() => setSortOpen((open) => !open)}
      />
    </div>
  );
  // Inline menu under the count row, the same as the canvas board; picking an order closes it.
  const sortMenu = sortOpen && (
    <div role="menu" aria-label="Sort parts" className="flex flex-col gap-0.5 rounded-2xl bg-surface-container-high p-2">
      {PART_SORTS.map((s) => {
        const selected = view.partSort === s.key;
        return (
          <button
            key={s.key}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            onClick={() => {
              view.setPartSort(s.key);
              setSortOpen(false);
            }}
            className={cn('h-12 rounded-xl px-3 text-left t-label-lg', selected ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface')}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
  const empty = isLoading ? 'Loading parts…' : 'No parts match.';

  if (layout.isCompact) {
    return (
      <div className="flex h-full flex-col bg-surface">
        <SyncTopBar sync={sync}>
          <TopBar>
            <TopBarTitleSearch title="Inventory" summary={index.summary} headerGone={headerGone} query={view.partSearch} onQuery={view.setPartSearch} placeholder={PLACEHOLDER} label="Search parts" titleStyle={syncTitleStyle(sync)} />
            <OperatorAvatarButton account={account} />
          </TopBar>
        </SyncTopBar>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="pb-[168px]">
            <div ref={headerRef} className="mx-auto w-full max-w-[640px]">
              <ScreenHeader title="Inventory" summary={index.summary} />
            </div>
            <div className="mx-auto w-full max-w-[640px] px-4">
              <SearchField value={view.partSearch} onValue={view.setPartSearch} placeholder={PLACEHOLDER} label="Search parts" />
            </div>
            <PinnedBand>
              <div className="px-4 pt-4">{chips}</div>
              <div className="pt-2 pr-2 pl-6">{countRow}</div>
              {sortMenu && <div className="px-4 pt-2">{sortMenu}</div>}
            </PinnedBand>
            <div className="mx-auto flex w-full max-w-[640px] flex-col gap-0.5 px-4">
              {shown.map((r, i) => (
                <PartRow key={r.part.id} row={r} index={i} count={rows.length} onClick={openPart} />
              ))}
              {sentinel}
            </div>
            {rows.length === 0 && <EmptyText>{empty}</EmptyText>}
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
            <h1 className="m-0 text-on-surface t-display-sm">Inventory</h1>
            <span className="truncate text-on-surface-variant t-body-md">{index.summary}</span>
          </div>
          <SearchField value={view.partSearch} onValue={view.setPartSearch} placeholder={PLACEHOLDER} label="Search parts" className={cn('mr-2', layout.railExpanded ? 'w-[360px]' : 'w-60')} />
          <OperatorAvatarButton account={account} />
        </header>
      </SyncTopBar>
      <div className="sheet-inset flex min-h-0 flex-1 px-6 pb-6">
        <TabletCard label="Parts">
          <div className="shrink-0 px-4 pt-4 pb-1">{chips}</div>
          <div className="shrink-0 px-6 pb-1">{countRow}</div>
          {sortMenu && <div className="shrink-0 px-6 pb-1">{sortMenu}</div>}
          <div
            role="presentation"
            className={cn('grid shrink-0 gap-3 px-9 pb-1 text-on-surface-variant t-label-md', TABLE_COLUMNS[columns])}
          >
            <span>Part</span>
            {columns !== 'min' && <span>Category</span>}
            {columns === 'full' && <span>Location</span>}
            <span className="text-right">Stock</span>
            <span className="text-right">Price</span>
          </div>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <div ref={tableRef} className="flex flex-col gap-0.5">
              {shown.map((r, i) => (
                <Reflow key={r.part.id}>
                  <TableRow row={r} index={i} count={rows.length} columns={columns} selected={openId === r.part.id} onClick={openPart} />
                </Reflow>
              ))}
            </div>
            {sentinel}
            {rows.length === 0 && <EmptyText>{empty}</EmptyText>}
          </div>
        </TabletCard>
      </div>
    </div>
  );
}

/** 72dp connected row: name and category · location, price and stock on the right. */
const PartRow = memo(function PartRow({ row, index, count, onClick }: { row: PartRowModel; index: number; count: number; onClick: (id: string, el: HTMLElement) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => onClick(row.part.id, e.currentTarget)}
      className="state-layer flex min-h-[72px] w-full items-center gap-4 bg-surface-container-low px-4 py-2 text-left text-on-surface"
      style={{ borderRadius: connectedRadius(index, count) }}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate t-title-md">{row.name}</span>
        {row.meta && <span className="truncate text-on-surface-variant t-body-md">{row.meta}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1">
          {row.isLow && <LowStockMark label={row.stockLabel} />}
          <span className="font-bold t-title-md">{row.price}</span>
        </span>
        {!row.isLow && <span className="text-on-surface-variant t-body-sm">{row.stockLabel}</span>}
      </span>
    </button>
  );
});

const TABLE_COLUMNS = {
  full: 'grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_96px_96px]',
  mid: 'grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_80px_96px]',
  min: 'grid-cols-[minmax(0,1fr)_72px_88px]',
} as const;

/** Table row (tablet spec): part, category, location, stock, price; low stock in a warning chip. Selected while its sheet is open. */
const TableRow = memo(function TableRow({ row, index, count, columns, selected, onClick }: { row: PartRowModel; index: number; count: number; columns: keyof typeof TABLE_COLUMNS; selected: boolean; onClick: (id: string, el: HTMLElement) => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(e) => onClick(row.part.id, e.currentTarget)}
      className={cn(
        'state-layer grid min-h-[60px] w-full items-center gap-3 px-5 py-2 text-left transition-colors duration-150',
        TABLE_COLUMNS[columns],
        selected ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-low text-on-surface'
      )}
      style={{ borderRadius: connectedRadius(index, count) }}
    >
      <span className="truncate t-title-md">{row.name}</span>
      {columns !== 'min' && <span className={cn('truncate t-body-md', selected ? 'text-on-secondary-container' : 'text-on-surface-variant')}>{row.part.category}</span>}
      {columns === 'full' && <span className={cn('truncate t-body-md', selected ? 'text-on-secondary-container' : 'text-on-surface-variant')}>{row.part.location}</span>}
      <span className="flex justify-end">
        <span className="inline-flex h-7 min-w-10 items-center justify-center rounded-sm px-2.5 t-label-strong">{row.part.stockQuantity}</span>
      </span>
      <span className="flex items-center justify-end gap-1 font-bold t-title-md">
        {row.isLow && <LowStockMark label={row.stockLabel} />}
        {row.price}
      </span>
    </button>
  );
});

/** Yellow triangle with rounded corners that marks a low-stock row beside its price. */
function LowStockMark({ label }: { label: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex text-warning">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4L21 19H3Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
