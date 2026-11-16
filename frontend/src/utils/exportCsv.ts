import { ForecastItemResult } from '../api/client';

export const exportPreparationLedgerCsv = (
  items: ForecastItemResult[],
  serviceDate: string,
  servicePeriod: string
) => {
  if (!items || items.length === 0) {
    alert('No menu items available to export.');
    return;
  }

  const headers = [
    'Item ID',
    'Dish Name',
    'Category',
    'Price (INR)',
    'Model Forecast (Servings)',
    '95% Conformal Lower Bound',
    '95% Conformal Upper Bound',
    'Planned Portions (Kitchen Prep)',
    'Recommended Portions (Newsvendor)',
    'Estimated Leftover Buffer',
    'Estimated Shortfall',
    'Safety Status',
    'Calibration Tier',
    'Service Date',
    'Service Period',
  ];

  const rows = items.map((item) => {
    return [
      `"${item.item_id}"`,
      `"${item.item_name.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      item.price,
      item.predicted_demand,
      item.lower_estimate,
      item.upper_estimate,
      item.planned_portions,
      item.recommended_portions,
      item.estimated_leftovers,
      item.estimated_shortfall,
      `"${item.risk_level}"`,
      `"${item.history_status}"`,
      `"${serviceDate}"`,
      `"${servicePeriod}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Leftover_Radar_Prep_Plan_${serviceDate}_${servicePeriod.toLowerCase()}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
