import React, { useEffect, useState } from 'react';
import { X, Printer, Loader2, UtensilsCrossed } from 'lucide-react';
import { api, PrepSheetData } from '../api/client';

interface PrepSheetModalProps {
  serviceDate: string;
  servicePeriod: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PrepSheetModal: React.FC<PrepSheetModalProps> = ({
  serviceDate,
  servicePeriod,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<PrepSheetData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    api
      .getPrepSheet(serviceDate, servicePeriod)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load printable prep sheet.'))
      .finally(() => setLoading(false));
  }, [isOpen, serviceDate, servicePeriod]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-surface dark:bg-surface-dark border-2 border-ink-hairline dark:border-ink-dark-hairline rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print p-4 px-6 border-b border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between bg-canvas-subtle/80 dark:bg-black/30">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="text-xs font-mono font-bold text-ink dark:text-ink-dark uppercase tracking-wider">
              Kitchen Preparation Order Ticket
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="btn-tactile flex items-center gap-2 px-4 py-2 rounded-xl bg-matcha hover:bg-matcha-hover text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-yuzu" strokeWidth={2} />
              <span>Print Sheet</span>
            </button>
            <button
              onClick={onClose}
              className="btn-tactile p-2 rounded-xl text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark hover:bg-canvas-subtle cursor-pointer"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-8 overflow-y-auto space-y-6 bg-[#FCFAF6] text-[#191C1A] font-sans print:p-0 print:bg-white print:text-black">
          {loading && (
            <div className="py-16 text-center text-gray-500 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-persimmon" strokeWidth={2.5} />
              <p className="text-xs font-mono">Generating kitchen service order layout...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl border border-berry bg-berry/10 text-berry text-xs">
              {error}
            </div>
          )}

          {!loading && data && (
            <div className="prep-ticket-print border-2 border-black p-8 space-y-6 bg-white relative rounded-xl shadow-xs">
              {/* Ticket Header */}
              <div className="border-b-2 border-black pb-5 flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gray-600 font-bold">
                    Official Cafeteria Daily Prep Order • Batch Ticket
                  </div>
                  <h1 className="font-serif text-3xl font-bold tracking-tight mt-1 text-black">
                    {data.kitchen_name}
                  </h1>
                  <div className="text-sm text-gray-800 mt-1 font-sans">
                    Service: <span className="font-bold uppercase">{data.service_period}</span> • Date: {data.service_date}
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <div className="border-2 border-black px-3 py-1.5 inline-block font-bold text-sm bg-gray-50 rounded-lg">
                    BATCH: {data.service_date.replace(/-/g, '')}-{data.service_period.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-700 font-bold mt-1.5">
                    Total Planned Prep: {data.total_planned_portions} Portions
                  </div>
                </div>
              </div>

              {/* Items Preparation Table */}
              <div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black font-mono text-[11px] uppercase tracking-wider text-black">
                      <th className="py-2.5 px-2 w-10 text-center">Done</th>
                      <th className="py-2.5 px-3">Menu Dish</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Target Prep</th>
                      <th className="py-2.5 px-3 text-right">Recommended</th>
                      <th className="py-2.5 px-3 text-center">80% Interval</th>
                      <th className="py-2.5 px-3">Chef Initials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 font-mono text-xs">
                    {data.items.map((item, idx) => (
                      <tr key={idx} className="h-10 hover:bg-gray-50">
                        <td className="py-2 px-2 text-center">
                          <div className="w-4 h-4 border-2 border-black inline-block rounded-xs" />
                        </td>
                        <td className="py-2 px-3 font-serif font-bold text-sm text-black">
                          {item.item_name}
                        </td>
                        <td className="py-2 px-3 uppercase text-[10px] text-gray-600 font-medium">
                          {item.category}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-base text-black tabular-nums">
                          {item.planned_portions}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-700 tabular-nums">
                          {item.recommended_portions}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-600 text-[11px] tabular-nums">
                          [{item.p80_range}]
                        </td>
                        <td className="py-2 px-3">
                          <div className="w-20 border-b border-gray-400 h-5" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sign-off Strip */}
              <div className="border-t-2 border-black pt-6 grid grid-cols-3 gap-6 text-xs font-mono">
                <div>
                  <div className="text-gray-600 text-[10px] uppercase font-bold">1. Head Chef Authorization</div>
                  <div className="mt-8 border-b-2 border-black w-4/5" />
                  <div className="text-[10px] text-gray-500 mt-1">Signature & Timestamp</div>
                </div>
                <div>
                  <div className="text-gray-600 text-[10px] uppercase font-bold">2. Line Cook Quality Check</div>
                  <div className="mt-8 border-b-2 border-black w-4/5" />
                  <div className="text-[10px] text-gray-500 mt-1">Temperature Verified</div>
                </div>
                <div>
                  <div className="text-gray-600 text-[10px] uppercase font-bold">3. Closing Supervisor</div>
                  <div className="mt-8 border-b-2 border-black w-4/5" />
                  <div className="text-[10px] text-gray-500 mt-1">Actuals Transferred</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
