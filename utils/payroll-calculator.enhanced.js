/**
 * ENHANCED PAYROLL CALCULATOR
 * Advanced salary calculation engine with support for:
 * - Professional tax slabs
 * - Overtime calculations
 * - Bonus & incentives
 * - Gratuity calculations
 * - Advanced proration
 * - Tax optimization
 */

const PROFESSIONAL_TAX_SLABS = {
  // Monthly slabs (example - adjust per state)
  0: 0,
  10000: 0,
  15000: 150,
  20000: 200,
  999999: 200
};

const TDS_SLABS_ANNUAL = {
  // Annual income tax slabs (Old Regime - example)
  250000: { rate: 0, base: 0 },
  500000: { rate: 5, base: 0 },
  1000000: { rate: 20, base: 12500 },
  9999999: { rate: 30, base: 112500 }
};

/**
 * Calculate professional tax based on gross salary
 */
function calculateProfessionalTax(monthlyGross) {
  let tax = 0;
  const slabs = Object.keys(PROFESSIONAL_TAX_SLABS).map(Number).sort((a, b) => a - b);
  
  for (const slab of slabs) {
    if (monthlyGross >= slab) {
      tax = PROFESSIONAL_TAX_SLABS[slab];
    } else {
      break;
    }
  }
  
  return tax;
}

/**
 * Calculate TDS based on annual income
 */
function calculateAnnualTDS(annualIncome, deductions = 0) {
  const taxableIncome = Math.max(0, annualIncome - deductions);
  const slabs = Object.keys(TDS_SLABS_ANNUAL).map(Number).sort((a, b) => a - b);
  
  let tax = 0;
  let previousSlab = 0;
  
  for (const slab of slabs) {
    if (taxableIncome > slab) {
      const taxableAmount = Math.min(taxableIncome, slab) - previousSlab;
      const slabData = TDS_SLABS_ANNUAL[slab];
      tax += (taxableAmount * slabData.rate) / 100;
      previousSlab = slab;
    } else {
      break;
    }
  }
  
  return Math.round(tax);
}

/**
 * Calculate overtime pay
 * @param {number} basicSalary - Monthly basic salary
 * @param {number} overtimeHours - Extra hours worked
 * @param {number} multiplier - Overtime rate multiplier (default 2x)
 */
function calculateOvertime(basicSalary, overtimeHours, multiplier = 2.0) {
  // Assume 26 working days, 8 hours per day = 208 hours per month
  const hourlyRate = basicSalary / 208;
  return Math.round(hourlyRate * overtimeHours * multiplier);
}

/**
 * Calculate performance bonus
 * @param {number} ctc - Annual CTC
 * @param {number} performanceRating - Rating (1-5)
 * @param {number} maxBonusPercent - Maximum bonus percentage
 */
function calculatePerformanceBonus(ctc, performanceRating, maxBonusPercent = 20) {
  const ratingMultiplier = {
    1: 0,      // Poor
    2: 0.25,   // Below Average
    3: 0.50,   // Average
    4: 0.75,   // Good
    5: 1.0     // Excellent
  };
  
  const multiplier = ratingMultiplier[performanceRating] || 0;
  const annualBonus = (ctc * maxBonusPercent / 100) * multiplier;
  
  return Math.round(annualBonus / 12); // Monthly bonus
}

/**
 * Calculate gratuity (applicable after 5 years of service)
 * Formula: (Last drawn salary × 15 days × Years of service) / 26
 */
function calculateGratuity(lastDrawnSalary, yearsOfService) {
  if (yearsOfService < 5) return 0;
  
  const gratuity = (lastDrawnSalary * 15 * yearsOfService) / 26;
  return Math.round(gratuity);
}

/**
 * Advanced proration based on actual working days
 * @param {number} amount - Full month amount
 * @param {number} workedDays - Days actually worked
 * @param {number} totalDays - Total working days in month
 * @param {boolean} includeWeekends - Whether to include weekends in calculation
 */
function calculateProration(amount, workedDays, totalDays, includeWeekends = false) {
  if (totalDays === 0) return 0;
  
  // Calendar days method
  if (includeWeekends) {
    const daysInMonth = totalDays;
    return Math.round((amount * workedDays) / daysInMonth);
  }
  
  // Working days method (excluding weekends)
  return Math.round((amount * workedDays) / totalDays);
}

/**
 * Calculate LOP (Loss of Pay) deduction
 */
function calculateLOP(monthlyGross, absentDays, totalWorkingDays) {
  if (absentDays <= 0) return 0;
  
  const perDayAmount = monthlyGross / totalWorkingDays;
  return Math.round(perDayAmount * absentDays);
}

/**
 * Calculate employee PF contribution (12% of Basic + DA)
 */
function calculatePF(basic, da = 0, ceiling = 15000) {
  const pfBase = Math.min(basic + da, ceiling);
  return Math.round(pfBase * 0.12);
}

/**
 * Calculate ESI contribution (0.75% of gross, applicable if gross < 21000)
 */
function calculateESI(grossSalary, threshold = 21000) {
  if (grossSalary > threshold) return 0;
  return Math.round(grossSalary * 0.0075);
}

/**
 * Enhanced component calculation with all rules
 */
function calculateComponentAmount(component, computed, structure, attendanceData) {
  let amount = 0;
  
  // Base calculation
  if (component.calculation_type === 'FIXED') {
    amount = Number(component.value);
  } else if (component.calculation_type === 'PERCENTAGE') {
    const pct = Number(component.value);
    
    if (component.percentage_of_code && computed[component.percentage_of_code]) {
      // Percentage of another component
      amount = (Number(computed[component.percentage_of_code]) * pct) / 100;
    } else {
      // Percentage of CTC
      amount = (Number(structure.ctc_amount || 0) / 12 * pct) / 100;
    }
  }
  
  // Apply proration if component is marked as prorated
  if (component.prorated && attendanceData) {
    const { working_days, paid_days } = attendanceData;
    if (working_days > 0) {
      amount = calculateProration(amount, paid_days, working_days);
    }
  }
  
  return Math.round(amount * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate net salary with all components
 */
function calculateNetSalary(components, computed, structure, attendanceData, additionalData = {}) {
  let totalEarnings = 0;
  let totalDeductions = 0;
  let taxableEarnings = 0;
  
  const breakdown = {
    earnings: [],
    deductions: [],
    statutory: {}
  };
  
  // Calculate all earnings and deductions
  for (const comp of components) {
    const amount = calculateComponentAmount(comp, computed, structure, attendanceData);
    computed[comp.code] = amount;
    
    if (comp.component_type === 'EARNING') {
      totalEarnings += amount;
      if (comp.taxable) {
        taxableEarnings += amount;
      }
      breakdown.earnings.push({
        code: comp.code,
        name: comp.name,
        amount: amount,
        taxable: comp.taxable
      });
    } else if (comp.component_type === 'DEDUCTION') {
      totalDeductions += amount;
      breakdown.deductions.push({
        code: comp.code,
        name: comp.name,
        amount: amount
      });
    }
  }
  
  // Calculate statutory deductions
  const basic = computed['BASIC'] || 0;
  const da = computed['DA'] || 0;
  
  // PF Calculation
  const pf = calculatePF(basic, da);
  breakdown.statutory.pf_employee = pf;
  breakdown.statutory.pf_employer = pf;
  totalDeductions += pf;
  
  // ESI Calculation
  const esi = calculateESI(totalEarnings);
  breakdown.statutory.esi_employee = esi;
  breakdown.statutory.esi_employer = Math.round(esi * 3.25); // Employer pays 3.25%
  totalDeductions += esi;
  
  // Professional Tax
  const pt = calculateProfessionalTax(totalEarnings);
  breakdown.statutory.professional_tax = pt;
  totalDeductions += pt;
  
  // LOP Calculation if attendance data provided
  let lop = 0;
  if (attendanceData && attendanceData.lop_days > 0) {
    lop = calculateLOP(totalEarnings, attendanceData.lop_days, attendanceData.working_days);
    breakdown.statutory.lop = lop;
    totalDeductions += lop;
  }
  
  // TDS (Monthly) - simplified calculation
  const annualTaxable = taxableEarnings * 12;
  const annualStandardDeduction = 50000;
  const monthlyTDS = Math.round(calculateAnnualTDS(annualTaxable, annualStandardDeduction) / 12);
  breakdown.statutory.tds = monthlyTDS;
  totalDeductions += monthlyTDS;
  
  // Additional components (overtime, bonus)
  if (additionalData.overtimeHours > 0) {
    const overtime = calculateOvertime(basic, additionalData.overtimeHours);
    breakdown.earnings.push({
      code: 'OVERTIME',
      name: 'Overtime Pay',
      amount: overtime,
      taxable: true
    });
    totalEarnings += overtime;
    taxableEarnings += overtime;
  }
  
  if (additionalData.performanceRating && structure.ctc_amount) {
    const bonus = calculatePerformanceBonus(
      structure.ctc_amount, 
      additionalData.performanceRating, 
      additionalData.bonusPercent || 20
    );
    breakdown.earnings.push({
      code: 'PERFORMANCE_BONUS',
      name: 'Performance Bonus',
      amount: bonus,
      taxable: true
    });
    totalEarnings += bonus;
    taxableEarnings += bonus;
  }
  
  // Calculate net pay
  const netPay = totalEarnings - totalDeductions;
  
  return {
    gross_earnings: Math.round(totalEarnings),
    total_deductions: Math.round(totalDeductions),
    net_pay: Math.round(netPay),
    taxable_earnings: Math.round(taxableEarnings),
    breakdown,
    computed
  };
}

module.exports = {
  calculateProfessionalTax,
  calculateAnnualTDS,
  calculateOvertime,
  calculatePerformanceBonus,
  calculateGratuity,
  calculateProration,
  calculateLOP,
  calculatePF,
  calculateESI,
  calculateComponentAmount,
  calculateNetSalary
};
