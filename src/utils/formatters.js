export const formatCurrency = (amount, decimals = 2) => {
  const val = parseFloat(amount || 0);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
};

export const formatBillMonth = (billMonth) => {
  if (!billMonth) return '';
  const parts = billMonth.split('-');
  if (parts.length < 2) return billMonth;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const date = new Date(year, monthIdx, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return clean;
};
