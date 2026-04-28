/**
 * Indian Tax Calculator Utility
 * Supports FY 2024-25 and FY 2025-26
 */

const calculateTaxForRegime = (income, deductions = 0, regime = 'new', fy = '2025-26') => {
  let taxableIncome = income;
  let tax = 0;
  const standardDeduction = fy === '2025-26' ? 75000 : (fy === '2024-25' ? 75000 : 50000);

  if (regime === 'new') {
    // New Regime Logic
    taxableIncome = Math.max(0, income - standardDeduction);
    
    if (fy === '2025-26') {
      if (taxableIncome <= 1200000) {
        tax = 0;
      } else {
        if (taxableIncome > 2400000) tax += (taxableIncome - 2400000) * 0.30;
        if (taxableIncome > 2000000) tax += (Math.min(taxableIncome, 2400000) - 2000000) * 0.25;
        if (taxableIncome > 1600000) tax += (Math.min(taxableIncome, 2000000) - 1600000) * 0.20;
        if (taxableIncome > 1200000) tax += (Math.min(taxableIncome, 1600000) - 1200000) * 0.15;
        if (taxableIncome > 800000) tax += (Math.min(taxableIncome, 1200000) - 800000) * 0.10;
        if (taxableIncome > 400000) tax += (Math.min(taxableIncome, 800000) - 400000) * 0.05;
      }
    } else {
      if (taxableIncome <= 700000) {
        tax = 0;
      } else {
        if (taxableIncome > 1500000) tax += (taxableIncome - 1500000) * 0.30;
        if (taxableIncome > 1200000) tax += (Math.min(taxableIncome, 1500000) - 1200000) * 0.20;
        if (taxableIncome > 1000000) tax += (Math.min(taxableIncome, 1200000) - 1000000) * 0.15;
        if (taxableIncome > 700000) tax += (Math.min(taxableIncome, 1000000) - 700000) * 0.10;
        if (taxableIncome > 300000) tax += (Math.min(taxableIncome, 700000) - 300000) * 0.05;
      }
    }
  } else {
    // Old Regime Logic
    // Standard deduction for Old Regime is ₹50,000
    taxableIncome = Math.max(0, income - deductions - 50000);
    
    if (taxableIncome <= 500000) {
      tax = 0;
    } else {
      if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.30;
      if (taxableIncome > 500000) tax += (Math.min(taxableIncome, 1000000) - 500000) * 0.20;
      if (taxableIncome > 250000) tax += (Math.min(taxableIncome, 500000) - 250000) * 0.05;
    }
  }

  const cess = tax * 0.04;
  const totalTax = tax + cess;

  return { taxableIncome, tax, cess, totalTax };
};

const compareRegimes = (income, deductions = 0, fy = '2025-26') => {
  const newRegime = calculateTaxForRegime(income, 0, 'new', fy);
  const oldRegime = calculateTaxForRegime(income, deductions, 'old', fy);

  const better = newRegime.totalTax <= oldRegime.totalTax ? 'new' : 'old';
  const savings = Math.abs(newRegime.totalTax - oldRegime.totalTax);

  return {
    income,
    fy,
    newRegime: { ...newRegime, regime: 'new' },
    oldRegime: { ...oldRegime, regime: 'old' },
    better,
    savings
  };
};

module.exports = { calculateTaxForRegime, compareRegimes };
