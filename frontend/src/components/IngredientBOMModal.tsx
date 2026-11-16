import React, { useState, useMemo } from 'react';
import { X, Search, ShoppingBag, Copy, Check, Printer, Scale, DollarSign, Package } from 'lucide-react';
import { ForecastItemResult } from '../api/client';

interface IngredientBOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ForecastItemResult[];
  serviceDate: string;
  servicePeriod: string;
}

interface RawIngredientRequirement {
  id: string;
  name: string;
  category: 'Grains & Flours' | 'Dairy & Fats' | 'Fresh Produce' | 'Proteins' | 'Pantry & Spices';
  totalQuantity: number;
  unit: 'kg' | 'L' | 'units';
  estimatedRatePerUnit: number; // INR
  contributingDishes: Array<{ name: string; portions: number }>;
}

export const IngredientBOMModal: React.FC<IngredientBOMModalProps> = ({
  isOpen,
  onClose,
  items,
  serviceDate,
  servicePeriod,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Compute Bill of Materials (BOM) from planned portions
  const rawIngredients = useMemo(() => {
    const ingMap: Record<string, RawIngredientRequirement> = {
      basmati_rice: {
        id: 'basmati_rice',
        name: 'Premium Basmati Rice',
        category: 'Grains & Flours',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 85,
        contributingDishes: [],
      },
      whole_wheat_atta: {
        id: 'whole_wheat_atta',
        name: 'Whole Wheat Chakki Atta',
        category: 'Grains & Flours',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 42,
        contributingDishes: [],
      },
      fresh_paneer: {
        id: 'fresh_paneer',
        name: 'Fresh Malai Paneer',
        category: 'Dairy & Fats',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 340,
        contributingDishes: [],
      },
      fresh_chicken: {
        id: 'fresh_chicken',
        name: 'Fresh Dressed Chicken',
        category: 'Proteins',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 220,
        contributingDishes: [],
      },
      farm_eggs: {
        id: 'farm_eggs',
        name: 'Farm Fresh Table Eggs',
        category: 'Proteins',
        totalQuantity: 0,
        unit: 'units',
        estimatedRatePerUnit: 7,
        contributingDishes: [],
      },
      toor_dal: {
        id: 'toor_dal',
        name: 'Polished Toor / Arhar Dal',
        category: 'Grains & Flours',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 140,
        contributingDishes: [],
      },
      rajma_kidney_beans: {
        id: 'rajma_kidney_beans',
        name: 'Chitra Rajma (Kidney Beans)',
        category: 'Grains & Flours',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 130,
        contributingDishes: [],
      },
      kabuli_chana: {
        id: 'kabuli_chana',
        name: 'Kabuli Chana (Chickpeas)',
        category: 'Grains & Flours',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 125,
        contributingDishes: [],
      },
      potatoes_onions: {
        id: 'potatoes_onions',
        name: 'Potatoes & Red Onions Base',
        category: 'Fresh Produce',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 30,
        contributingDishes: [],
      },
      fresh_tomatoes: {
        id: 'fresh_tomatoes',
        name: 'Vine Ripe Tomatoes (Gravies)',
        category: 'Fresh Produce',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 35,
        contributingDishes: [],
      },
      refined_oil_ghee: {
        id: 'refined_oil_ghee',
        name: 'Cooking Oil & Pure Desi Ghee',
        category: 'Dairy & Fats',
        totalQuantity: 0,
        unit: 'L',
        estimatedRatePerUnit: 160,
        contributingDishes: [],
      },
      full_cream_milk: {
        id: 'full_cream_milk',
        name: 'Full Cream Dairy Milk',
        category: 'Dairy & Fats',
        totalQuantity: 0,
        unit: 'L',
        estimatedRatePerUnit: 65,
        contributingDishes: [],
      },
      spices_masalas: {
        id: 'spices_masalas',
        name: 'Garam Masala, Whole Spices & Salt',
        category: 'Pantry & Spices',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 450,
        contributingDishes: [],
      },
      bread_bakery: {
        id: 'bread_bakery',
        name: 'Sandwich Bread Loaves',
        category: 'Grains & Flours',
        totalQuantity: 0,
        unit: 'units',
        estimatedRatePerUnit: 40,
        contributingDishes: [],
      },
      sugar_sweetener: {
        id: 'sugar_sweetener',
        name: 'Refined Sugar & Syrups',
        category: 'Pantry & Spices',
        totalQuantity: 0,
        unit: 'kg',
        estimatedRatePerUnit: 44,
        contributingDishes: [],
      },
    };

    // Calculate recipe weights based on planned portions
    for (const it of items) {
      const q = it.planned_portions || 0;
      if (q <= 0) continue;
      const iid = (it.item_id || '').toLowerCase();
      const name = it.item_name;

      // Helper to add
      const add = (id: string, perPortion: number) => {
        if (ingMap[id]) {
          ingMap[id].totalQuantity += q * perPortion;
          ingMap[id].contributingDishes.push({ name, portions: q });
        }
      };

      if (iid.includes('biryani')) {
        add('basmati_rice', 0.14);
        add('potatoes_onions', 0.08);
        add('refined_oil_ghee', 0.025);
        add('spices_masalas', 0.012);
        if (iid.includes('chicken')) add('fresh_chicken', 0.13);
        if (iid.includes('veg')) add('potatoes_onions', 0.06);
      } else if (iid.includes('paneer')) {
        add('fresh_paneer', 0.08);
        add('basmati_rice', 0.12);
        add('fresh_tomatoes', 0.09);
        add('potatoes_onions', 0.07);
        add('refined_oil_ghee', 0.02);
        add('spices_masalas', 0.008);
      } else if (iid.includes('chole')) {
        add('kabuli_chana', 0.075);
        add('whole_wheat_atta', 0.08);
        add('potatoes_onions', 0.06);
        add('fresh_tomatoes', 0.05);
        add('refined_oil_ghee', 0.035);
      } else if (iid.includes('rajma')) {
        add('rajma_kidney_beans', 0.07);
        add('basmati_rice', 0.14);
        add('fresh_tomatoes', 0.08);
        add('potatoes_onions', 0.06);
        add('refined_oil_ghee', 0.02);
      } else if (iid.includes('dal')) {
        add('toor_dal', 0.065);
        add('basmati_rice', 0.14);
        add('fresh_tomatoes', 0.04);
        add('potatoes_onions', 0.04);
        add('refined_oil_ghee', 0.02);
        add('spices_masalas', 0.006);
      } else if (iid.includes('egg')) {
        add('farm_eggs', 2.0);
        add('basmati_rice', 0.14);
        add('potatoes_onions', 0.07);
        add('fresh_tomatoes', 0.06);
        add('refined_oil_ghee', 0.02);
      } else if (iid.includes('dosa') || iid.includes('idli')) {
        add('basmati_rice', 0.12);
        add('toor_dal', 0.03);
        add('potatoes_onions', 0.07);
        add('refined_oil_ghee', 0.015);
      } else if (iid.includes('paratha')) {
        add('whole_wheat_atta', 0.1);
        add('potatoes_onions', 0.09);
        add('refined_oil_ghee', 0.02);
      } else if (iid.includes('poha')) {
        add('basmati_rice', 0.08);
        add('potatoes_onions', 0.06);
        add('refined_oil_ghee', 0.015);
      } else if (iid.includes('sandwich') || iid.includes('toast')) {
        add('bread_bakery', 0.1); // ~1/10th of a loaf per sandwich
        add('potatoes_onions', 0.05);
        add('refined_oil_ghee', 0.01);
      } else if (iid.includes('coffee')) {
        add('full_cream_milk', 0.2);
        add('sugar_sweetener', 0.025);
      } else if (iid.includes('gulab')) {
        add('sugar_sweetener', 0.07);
        add('full_cream_milk', 0.05);
        add('refined_oil_ghee', 0.02);
      } else if (iid.includes('samosa') || iid.includes('maggi') || iid.includes('tacos')) {
        add('potatoes_onions', 0.08);
        add('refined_oil_ghee', 0.02);
        add('whole_wheat_atta', 0.06);
      } else {
        // Fallback default
        add('potatoes_onions', 0.05);
        add('refined_oil_ghee', 0.01);
      }
    }

    return Object.values(ingMap).filter((ing) => ing.totalQuantity > 0);
  }, [items]);

  if (!isOpen) return null;

  const totalRawCost = rawIngredients.reduce(
    (acc, it) => acc + it.totalQuantity * it.estimatedRatePerUnit,
    0
  );

  const totalRawWeightKg = rawIngredients
    .filter((it) => it.unit === 'kg')
    .reduce((acc, it) => acc + it.totalQuantity, 0);

  const filtered = rawIngredients.filter((ing) => {
    const matchesSearch =
      ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCat === 'all' || ing.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  const categories = ['all', 'Grains & Flours', 'Dairy & Fats', 'Fresh Produce', 'Proteins', 'Pantry & Spices'];

  const handleCopyClipboard = () => {
    const textLines = [
      `LEFTOVER RADAR - KITCHEN RAW INGREDIENT REQUISITION`,
      `Service Date: ${serviceDate} | Meal Period: ${servicePeriod.toUpperCase()}`,
      `Total Estimated Procurement Cost: ₹${Math.round(totalRawCost).toLocaleString()}`,
      `--------------------------------------------------`,
      ...rawIngredients.map(
        (r) =>
          `• ${r.name} (${r.category}): ${r.totalQuantity.toFixed(1)} ${r.unit} (Est. ₹${Math.round(
            r.totalQuantity * r.estimatedRatePerUnit
          ).toLocaleString()})`
      ),
    ];
    navigator.clipboard.writeText(textLines.join('\n'));
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-canvas dark:bg-canvas-dark rounded-2xl border border-ink-hairline dark:border-ink-dark-hairline shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-matcha/10 text-matcha">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-ink dark:text-ink-dark flex items-center gap-2">
                <span>Kitchen Bill of Materials (BOM)</span>
                <span className="text-xs font-mono font-bold text-matcha bg-matcha/15 px-2.5 py-0.5 rounded-full border border-matcha/30">
                  {rawIngredients.length} Raw Ingredients Required
                </span>
              </h2>
              <p className="text-xs text-ink-muted">
                Calculated raw ingredient requisition for {servicePeriod} ({serviceDate})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyClipboard}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-hairline text-xs font-bold text-ink-muted hover:text-ink bg-surface dark:bg-surface-dark cursor-pointer shadow-xs"
              title="Copy requisition list to clipboard"
            >
              {hasCopied ? <Check className="w-3.5 h-3.5 text-matcha" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{hasCopied ? 'Copied!' : 'Copy List'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-persimmon hover:bg-persimmon-hover text-white text-xs font-bold cursor-pointer shadow-xs"
              title="Print procurement requisition order"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-ink-muted hover:text-ink hover:bg-canvas-subtle transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bento Summary Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 bg-canvas-subtle/50 dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline text-xs">
          <div className="p-3 rounded-xl bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-matcha" />
            <div>
              <span className="text-[10px] font-mono text-ink-muted uppercase">Estimated Raw Procurement Cost</span>
              <div className="font-serif text-lg font-bold text-ink dark:text-ink-dark tabular-nums">
                ₹{Math.round(totalRawCost).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline flex items-center gap-3">
            <Scale className="w-5 h-5 text-persimmon" />
            <div>
              <span className="text-[10px] font-mono text-ink-muted uppercase">Total Bulk Solid Weight</span>
              <div className="font-serif text-lg font-bold text-ink dark:text-ink-dark tabular-nums">
                {totalRawWeightKg.toFixed(1)} <span className="text-xs font-sans font-normal text-ink-muted">kg</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline flex items-center gap-3">
            <Package className="w-5 h-5 text-yuzu-dark" />
            <div>
              <span className="text-[10px] font-mono text-ink-muted uppercase">Active Service Yield</span>
              <div className="font-serif text-lg font-bold text-ink dark:text-ink-dark tabular-nums">
                {items.reduce((acc, it) => acc + (it.planned_portions || 0), 0)}{' '}
                <span className="text-xs font-sans font-normal text-ink-muted">portions planned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-ink-hairline dark:border-ink-dark-hairline flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px] bg-canvas-subtle dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline rounded-xl px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search raw ingredients or category..."
              className="bg-transparent text-xs text-ink dark:text-ink-dark outline-none w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCat(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all ${
                  selectedCat === c
                    ? 'bg-matcha text-white font-bold'
                    : 'text-ink-muted hover:text-ink hover:bg-canvas-subtle'
                }`}
              >
                {c === 'all' ? 'All Ingredients' : c}
              </button>
            ))}
          </div>
        </div>

        {/* Ingredient Table */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="quirky-card overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted text-[10px] font-mono font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Raw Ingredient</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Required Quantity</th>
                  <th className="py-2.5 px-3 text-right">Wholesale Rate</th>
                  <th className="py-2.5 px-3 text-right">Est. Cost (₹)</th>
                  <th className="py-2.5 px-4">Contributing Planned Dishes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline">
                {filtered.map((r) => {
                  const cost = Math.round(r.totalQuantity * r.estimatedRatePerUnit);
                  return (
                    <tr key={r.id} className="hover:bg-canvas-subtle/50 transition-colors">
                      <td className="py-2.5 px-4 font-serif font-bold text-ink dark:text-ink-dark text-xs">
                        {r.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="sticker-badge bg-canvas-subtle text-[10px] text-ink-muted">
                          {r.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-ink dark:text-ink-dark text-xs tabular-nums">
                        {r.totalQuantity.toFixed(1)}{' '}
                        <span className="text-[10px] font-sans text-ink-muted">{r.unit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-ink-muted text-xs tabular-nums">
                        ₹{r.estimatedRatePerUnit}/{r.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-matcha dark:text-matcha-light text-xs tabular-nums">
                        ₹{cost.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-ink-muted font-sans max-w-[280px] truncate" title={r.contributingDishes.map((d) => `${d.name} (${d.portions}p)`).join(', ')}>
                        {r.contributingDishes.map((d) => `${d.name} (${d.portions})`).join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
