import React, { useEffect, useState } from 'react';
import { X, Printer, Check, Loader2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline rounded-ticket shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print p-4 border-b border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between bg-canvas dark:bg-canvas-dark">
          <div className="text-xs font-mono font-medium text-ink-muted dark:text-ink-dark-muted">
            Kitchen Preparation Ticket · Printable Sheet
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-forest hover:bg-forest-hover text-[#F6F1E7] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Print Sheet</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-control text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-8 overflow-y-auto space-y-6 bg-white text-black font-sans print:p-0">
          {loading && (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-forest" strokeWidth={1.5} />
              <p className="text-xs font-mono">Generating kitchen service ticket layout...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded border border-red-300 bg-red-50 text-red-700 text-xs">
              {error}
            </div>
          )}

          {!loading && data && (
            <div className="prep-ticket-print border border-black p-6 space-y-6">
              {/* Ticket Header */}
              <div className="border-b-2 border-black pb-4 flex justify-between items-start">
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest text-gray-600">
                    Kitchen Daily Preparation Order
                  </div>
                  <h1 className="font-serif text-2xl font-bold tracking-tight mt-0.5">
                    {data.kitchen_name}
                  </h1>
                  <div className="text-sm font-semibold mt-1">
                    Service: {data.service_period} · Date: {data.service_date}
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="border border-black px-2 py-1 inline-block font-bold">
                    BATCH: {data.service_date.replace(/-/g, '')}-{data.service_period.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Total Prep: {data.total_planned_portions} Portions
                  </div>
                </div>
              </div>

              {/* Items Preparation Table */}
              <div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black font-mono text-[11px] uppercase">
                      <th className="py-2 px-1 w-8">Done</th>
                      <th className="py-2 px-2">Menu Item</th>
                      <th className="py-2 px-2">Category</th>
                      <th className="py-2 px-2 text-right">Target Prep</th>
                      <th className="py-2 px-2 text-right">Recommended</th>
                      <th className="py-2 px-2 text-center">80% Interval</th>
                      <th className="py-2 px-2">Chef Initials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 font-mono text-xs">
                    {data.items.map((item, idx) => (
                      <tr key={idx} className="h-10">
                        <td className="py-2 px-1 text-center">
                          <div className="w-4 h-4 border border-black inline-block rounded-[1px]" />
                        </td>
                        <td className="py-2 px-2 font-sans font-semibold text-sm">
                          {item.item_name}
                        </td>
                        <td className="py-2 px-2 uppercase text-[10px] text-gray-600">
                          {item.category}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-sm">
                          {item.planned_portions}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700">
                          {item.recommended_portions}
                        </td>
                        <td className="py-2 px-2 text-center text-gray-500 text-[11px]">
                          [{item.p80_range}]
                        </td>
                        <td className="py-2 px-2">
                          <div className="w-16 border-b border-gray-400 h-4" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sign-off Strip */}
              <div className="border-t-2 border-black pt-6 grid grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <div className="text-gray-500 text-[10px] uppercase">Head Chef Verification</div>
                  <div className="mt-8 border-b border-black w-4/5" />
                  <div className="text-[10px] text-gray-500 mt-1">Signature & Timestamp</div>
                </div>
                <div>
                  <div className="text-gray-500 text-[10px] uppercase">Station Supervisor</div>
                  <div className="mt-8 border-b border-black w-4/5" />
                  <div className="text-[10px] text-gray-500 mt-1">Quality & Temp Check</div>
                </div>
                <div>
                  <div className="text-gray-500 text-[10px] uppercase">Close-out Handover</div>
                  <div className="mt-8 border-b border-black w-4/5" />
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
