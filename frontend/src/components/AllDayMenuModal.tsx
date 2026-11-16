import React, { useState, useMemo } from 'react';
import { X, Search, Clock, UtensilsCrossed, Sparkles, Tag, ChevronRight } from 'lucide-react';
import { MenuItem } from '../api/client';

interface AllDayMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  onSelectPeriod?: (period: 'breakfast' | 'lunch' | 'dinner') => void;
}

// Category emoji helper
const getDishEmoji = (category: string, name: string) => {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  if (n.includes('biryani') || n.includes('rice') || n.includes('thali') || c.includes('main')) return '🍛';
  if (n.includes('dosa') || n.includes('idli') || n.includes('poha') || n.includes('paratha') || c.includes('breakfast')) return '🥞';
  if (n.includes('sandwich') || n.includes('toast') || n.includes('roll')) return '🥪';
  if (n.includes('soup') || n.includes('dal')) return '🍲';
  if (n.includes('coffee') || n.includes('tea') || c.includes('beverage')) return '☕';
  if (n.includes('gulab') || n.includes('sweet') || c.includes('dessert')) return '🍮';
  if (n.includes('salad') || n.includes('fruit')) return '🥗';
  if (n.includes('maggi') || n.includes('samosa') || n.includes('tacos') || c.includes('snack')) return '🥟';
  return '🍱';
};

export const AllDayMenuModal: React.FC<AllDayMenuModalProps> = ({
  isOpen,
  onClose,
  menuItems,
  onSelectPeriod,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all');

  // Categorize menu items into Breakfast, Lunch, and Dinner based on meal schedule
  const categorized = useMemo(() => {
    const breakfastList: MenuItem[] = [];
    const lunchList: MenuItem[] = [];
    const dinnerList: MenuItem[] = [];

    for (const item of menuItems) {
      if (!item.active) continue;
      const cat = (item.category || '').toLowerCase();
      const tags = (item.tags || []).map((t) => t.toLowerCase());

      // Breakfast: pure breakfast items, morning snacks, light fruits, hot/cold morning beverages
      const isBreakfast =
        cat === 'breakfast' ||
        tags.includes('breakfast') ||
        ['cold_coffee', 'fruit_bowl', 'fruit_salad', 'grilled_sandwich', 'veg_sandwich', 'poha', 'aloo_paratha', 'masala_dosa', 'idli_sambar', 'avocado_toast', 'avocado_sourdough'].includes(item.id);

      // Lunch: hearty mains, soups, desserts, snacks (excludes morning-only dosas/idlis)
      const isLunch = cat !== 'breakfast' && !['masala_dosa', 'idli_sambar', 'poha', 'aloo_paratha', 'avocado_toast', 'avocado_sourdough'].includes(item.id);

      // Dinner: evening mains, comfort curries, desserts, light evening snacks (excludes morning breakfast)
      const isDinner = isLunch;

      if (isBreakfast) breakfastList.push(item);
      if (isLunch) lunchList.push(item);
      if (isDinner) dinnerList.push(item);
    }

    return {
      breakfast: breakfastList,
      lunch: lunchList,
      dinner: dinnerList,
    };
  }, [menuItems]);

  if (!isOpen) return null;

  const matchesSearch = (item: MenuItem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.tags?.some((t) => t.toLowerCase().includes(q))
    );
  };

  const sections = [
    {
      id: 'breakfast' as const,
      title: 'Breakfast Service',
      timeWindow: '06:00 AM – 10:30 AM',
      subtitle: 'Crisp griddle dosas, steaming idlis, hearty parathas, bowls & morning brews',
      icon: '🌅',
      items: categorized.breakfast.filter(matchesSearch),
      badgeClass: 'bg-yuzu/20 text-yuzu-dark border-yuzu/40',
    },
    {
      id: 'lunch' as const,
      title: 'Lunch Service',
      timeWindow: '11:30 AM – 03:30 PM',
      subtitle: 'Royal biryanis, balanced veg thalis, dal tadka, rich curries & desserts',
      icon: '☀️',
      items: categorized.lunch.filter(matchesSearch),
      badgeClass: 'bg-matcha/15 text-matcha-dark dark:text-matcha-light border-matcha/30',
    },
    {
      id: 'dinner' as const,
      title: 'Dinner Service',
      timeWindow: '07:00 PM – 10:30 PM',
      subtitle: 'Comforting evening mains, paneer specialties, rice bowls, soups & warm sweets',
      icon: '🌙',
      items: categorized.dinner.filter(matchesSearch),
      badgeClass: 'bg-persimmon/15 text-persimmon dark:text-persimmon-tint border-persimmon/30',
    },
  ];

  const visibleSections =
    selectedFilter === 'all'
      ? sections
      : sections.filter((s) => s.id === selectedFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-ink/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-canvas dark:bg-[#151917] rounded-3xl border-2 border-matcha/30 dark:border-matcha/40 shadow-quirky flex flex-col overflow-hidden animate-spring">
        {/* Header Bar */}
        <div className="p-6 border-b border-ink-hairline dark:border-ink-dark-hairline bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-matcha text-white flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="w-5 h-5 text-yuzu" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="sticker-badge bg-yuzu/20 text-ink dark:text-yuzu border-yuzu/40 font-mono text-[10px]">
                  ALL-DAY SCHEDULE
                </span>
                <span className="text-[11px] font-mono text-ink-muted">
                  3 Structured Meal Windows
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink dark:text-cream mt-0.5">
                Cafeteria Meal Time Catalog
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes or tags..."
                className="w-full pl-9 pr-3 py-1.5 rounded-full text-xs bg-canvas dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline outline-none text-ink dark:text-cream font-sans placeholder:text-ink-muted/70 focus:border-persimmon transition-colors"
              />
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-canvas-subtle dark:hover:bg-white/10 text-ink-muted hover:text-ink dark:hover:text-cream cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Meal Period Filter Pills */}
        <div className="px-6 py-2.5 bg-canvas-subtle/50 dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-[11px] font-bold text-ink-muted mr-1">Filter View:</span>
            {(['all', 'breakfast', 'lunch', 'dinner'] as const).map((filterId) => {
              const active = selectedFilter === filterId;
              const count =
                filterId === 'all'
                  ? menuItems.filter((m) => m.active).length
                  : categorized[filterId].length;
              return (
                <button
                  key={filterId}
                  onClick={() => setSelectedFilter(filterId)}
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                    active
                      ? 'bg-matcha text-cream shadow-xs scale-102'
                      : 'text-ink-muted dark:text-cream/70 hover:text-ink hover:bg-surface'
                  }`}
                >
                  {filterId} ({count})
                </button>
              );
            })}
          </div>

          <span className="text-[11px] font-mono text-ink-muted hidden md:inline">
            Each meal period automatically activates matching items in the demand ledger
          </span>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {visibleSections.map((sec) => (
            <section key={sec.id} className="space-y-3">
              {/* Section Header */}
              <div className="flex flex-wrap items-center justify-between pb-2 border-b border-ink-hairline dark:border-ink-dark-hairline gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{sec.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-ink dark:text-cream">
                        {sec.title}
                      </h3>
                      <span className={`sticker-badge font-mono text-[10px] ${sec.badgeClass}`}>
                        <Clock className="w-2.5 h-2.5 inline mr-1" />
                        {sec.timeWindow}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">{sec.subtitle}</p>
                  </div>
                </div>

                {onSelectPeriod && (
                  <button
                    onClick={() => {
                      onSelectPeriod(sec.id);
                      onClose();
                    }}
                    className="btn-tactile text-xs font-bold text-persimmon hover:text-persimmon-hover flex items-center gap-1 cursor-pointer"
                  >
                    <span>Switch Ledger to {sec.title.split(' ')[0]}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Items Grid */}
              {sec.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-muted font-mono rounded-2xl bg-canvas-subtle/50">
                  No matching dishes found in {sec.title.toLowerCase()} for "{searchQuery}".
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sec.items.map((dish) => (
                    <div
                      key={`${sec.id}-${dish.id}`}
                      className="quirky-card p-3.5 flex flex-col justify-between hover:border-matcha/40 transition-all group"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg shrink-0">
                              {getDishEmoji(dish.category, dish.name)}
                            </span>
                            <span className="font-serif font-bold text-sm text-ink dark:text-cream truncate">
                              {dish.name}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-xs text-persimmon shrink-0 bg-persimmon/10 px-2 py-0.5 rounded-full border border-persimmon/20">
                            ₹{dish.price.toFixed(0)}
                          </span>
                        </div>

                        {/* Category & Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-mono uppercase bg-canvas-subtle dark:bg-white/10 text-ink-muted px-2 py-0.5 rounded-md">
                            {dish.category}
                          </span>
                          {(dish.tags || []).slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-mono text-matcha dark:text-matcha-light bg-matcha/10 px-1.5 py-0.5 rounded-md"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2.5 mt-2 border-t border-ink-hairline/60 dark:border-ink-dark-hairline/60 flex items-center justify-between text-[11px] text-ink-muted font-mono">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-yuzu" />
                          <span>Active on Radar</span>
                        </span>
                        <span className="text-matcha font-bold capitalize">
                          {sec.id} Menu
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-surface/90 dark:bg-surface-dark/90 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-xs text-ink-muted shrink-0">
          <span className="font-mono text-[11px]">
            Total {menuItems.filter((m) => m.active).length} dishes mapped across 3 daily meal services.
          </span>
          <button
            onClick={onClose}
            className="btn-tactile px-5 py-1.5 rounded-xl bg-ink dark:bg-cream text-white dark:text-ink font-bold text-xs shadow-sm cursor-pointer"
          >
            Close Menu Schedule
          </button>
        </div>
      </div>
    </div>
  );
};
