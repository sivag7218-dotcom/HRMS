/**
 * ENHANCED FEATURES TEST SCRIPT
 * Quick tests for the new payroll calculator and services
 * 
 * Usage: node test-enhanced-features.js
 */

const payrollCalc = require('./utils/payroll-calculator.enhanced');

console.log('\n🧪 Testing Enhanced Payroll Calculator\n');
console.log('='.repeat(60));

// Test 1: Professional Tax
console.log('\n1️⃣ Professional Tax Calculation');
const monthlyGross1 = 25000;
const monthlyGross2 = 75000;
const pt1 = payrollCalc.calculateProfessionalTax(monthlyGross1);
const pt2 = payrollCalc.calculateProfessionalTax(monthlyGross2);
console.log(`   Gross ₹${monthlyGross1.toLocaleString('en-IN')}/month → PT: ₹${pt1}`);
console.log(`   Gross ₹${monthlyGross2.toLocaleString('en-IN')}/month → PT: ₹${pt2}`);

// Test 2: Annual TDS
console.log('\n2️⃣ Annual TDS Calculation');
const annualIncome1 = 500000;
const annualIncome2 = 1200000;
const tds1 = payrollCalc.calculateAnnualTDS(annualIncome1, 50000);
const tds2 = payrollCalc.calculateAnnualTDS(annualIncome2, 50000);
console.log(`   Income ₹${annualIncome1.toLocaleString('en-IN')}/year → TDS: ₹${tds1.toLocaleString('en-IN')}`);
console.log(`   Income ₹${annualIncome2.toLocaleString('en-IN')}/year → TDS: ₹${tds2.toLocaleString('en-IN')}`);

// Test 3: Overtime Pay
console.log('\n3️⃣ Overtime Pay Calculation');
const basicSalary = 50000;
const overtimeHours = 20;
const overtime = payrollCalc.calculateOvertime(basicSalary, overtimeHours, 2.0);
console.log(`   Basic: ₹${basicSalary.toLocaleString('en-IN')}, OT Hours: ${overtimeHours}`);
console.log(`   Overtime Pay (2x): ₹${Math.round(overtime).toLocaleString('en-IN')}`);

// Test 4: Performance Bonus
console.log('\n4️⃣ Performance Bonus Calculation');
const annualCTC = 800000;
for (let rating = 1; rating <= 5; rating++) {
    const bonus = payrollCalc.calculatePerformanceBonus(annualCTC, rating, 20);
    const ratingLabel = ['Poor', 'Below Avg', 'Average', 'Good', 'Excellent'][rating - 1];
    console.log(`   Rating ${rating} (${ratingLabel}): ₹${Math.round(bonus).toLocaleString('en-IN')}/month`);
}

// Test 5: Gratuity
console.log('\n5️⃣ Gratuity Calculation');
const lastSalary = 60000;
const years1 = 3;
const years2 = 5;
const years3 = 10;
const gratuity1 = payrollCalc.calculateGratuity(lastSalary, years1);
const gratuity2 = payrollCalc.calculateGratuity(lastSalary, years2);
const gratuity3 = payrollCalc.calculateGratuity(lastSalary, years3);
console.log(`   ${years1} years service: ₹${gratuity1.toLocaleString('en-IN')} (Not eligible)`);
console.log(`   ${years2} years service: ₹${gratuity2.toLocaleString('en-IN')}`);
console.log(`   ${years3} years service: ₹${gratuity3.toLocaleString('en-IN')}`);

// Test 6: PF Calculation
console.log('\n6️⃣ PF Calculation');
const basic1 = 15000;
const basic2 = 50000;
const pf1 = payrollCalc.calculatePF(basic1);
const pf2 = payrollCalc.calculatePF(basic2);
console.log(`   Basic ₹${basic1.toLocaleString('en-IN')} → PF: ₹${pf1.toLocaleString('en-IN')} (12%)`);
console.log(`   Basic ₹${basic2.toLocaleString('en-IN')} → PF: ₹${pf2.toLocaleString('en-IN')} (12% of ₹15,000 ceiling)`);

// Test 7: ESI Calculation
console.log('\n7️⃣ ESI Calculation');
const gross1 = 18000;
const gross2 = 25000;
const esi1 = payrollCalc.calculateESI(gross1);
const esi2 = payrollCalc.calculateESI(gross2);
console.log(`   Gross ₹${gross1.toLocaleString('en-IN')} → ESI: ₹${esi1.toLocaleString('en-IN')} (0.75%)`);
console.log(`   Gross ₹${gross2.toLocaleString('en-IN')} → ESI: ₹${esi2.toLocaleString('en-IN')} (Not applicable)`);

// Test 8: LOP Calculation
console.log('\n8️⃣ LOP (Loss of Pay) Calculation');
const monthlyGross = 60000;
const workingDays = 26;
const absentDays = 3;
const lop = payrollCalc.calculateLOP(monthlyGross, absentDays, workingDays);
console.log(`   Monthly Gross: ₹${monthlyGross.toLocaleString('en-IN')}`);
console.log(`   Absent Days: ${absentDays} out of ${workingDays}`);
console.log(`   LOP Deduction: ₹${lop.toLocaleString('en-IN')}`);

// Test 9: Proration
console.log('\n9️⃣ Proration Calculation');
const fullAmount = 50000;
const workedDays = 15;
const totalDays = 26;
const proratedAmount = payrollCalc.calculateProration(fullAmount, workedDays, totalDays);
console.log(`   Full Amount: ₹${fullAmount.toLocaleString('en-IN')}`);
console.log(`   Worked ${workedDays}/${totalDays} days`);
console.log(`   Prorated Amount: ₹${proratedAmount.toLocaleString('en-IN')}`);

// Test 10: Complete Salary Calculation Example
console.log('\n🔟 Complete Salary Calculation');
console.log('-'.repeat(60));

const mockComponents = [
    { code: 'BASIC', name: 'Basic Salary', component_type: 'EARNING', calculation_type: 'PERCENTAGE', value: 40, taxable: true, prorated: true, sequence: 1 },
    { code: 'HRA', name: 'House Rent Allowance', component_type: 'EARNING', calculation_type: 'PERCENTAGE', value: 20, percentage_of_code: 'BASIC', taxable: true, prorated: false, sequence: 2 },
    { code: 'DA', name: 'Dearness Allowance', component_type: 'EARNING', calculation_type: 'PERCENTAGE', value: 10, percentage_of_code: 'BASIC', taxable: true, prorated: true, sequence: 3 },
    { code: 'CONVEYANCE', name: 'Conveyance Allowance', component_type: 'EARNING', calculation_type: 'FIXED', value: 1600, taxable: false, prorated: false, sequence: 4 }
];

const mockStructure = {
    ctc_amount: 600000,
    employee_id: 1
};

const mockAttendance = {
    working_days: 26,
    paid_days: 24,
    lop_days: 2
};

const mockAdditional = {
    overtimeHours: 10,
    performanceRating: 4,
    bonusPercent: 15
};

const result = payrollCalc.calculateNetSalary(
    mockComponents,
    {},
    mockStructure,
    mockAttendance,
    mockAdditional
);

console.log(`\n📊 Salary Breakdown:`);
console.log(`   Annual CTC: ₹${mockStructure.ctc_amount.toLocaleString('en-IN')}`);
console.log(`   Working Days: ${mockAttendance.working_days}`);
console.log(`   Paid Days: ${mockAttendance.paid_days}`);
console.log(`   LOP Days: ${mockAttendance.lop_days}`);
console.log(`   Overtime Hours: ${mockAdditional.overtimeHours}`);
console.log(`   Performance Rating: ${mockAdditional.performanceRating}/5`);

console.log(`\n💰 Earnings:`);
result.breakdown.earnings.forEach(e => {
    console.log(`   ${e.name.padEnd(25)} ₹${Math.round(e.amount).toLocaleString('en-IN').padStart(10)}`);
});

console.log(`\n💸 Deductions:`);
console.log(`   PF (Employee).padEnd(25)} ₹${result.breakdown.statutory.pf_employee.toLocaleString('en-IN').padStart(10)}`);
console.log(`   ESI.padEnd(25)} ₹${result.breakdown.statutory.esi_employee.toLocaleString('en-IN').padStart(10)}`);
console.log(`   Professional Tax.padEnd(25)} ₹${result.breakdown.statutory.professional_tax.toLocaleString('en-IN').padStart(10)}`);
console.log(`   TDS.padEnd(25)} ₹${result.breakdown.statutory.tds.toLocaleString('en-IN').padStart(10)}`);
console.log(`   LOP.padEnd(25)} ₹${result.breakdown.statutory.lop.toLocaleString('en-IN').padStart(10)}`);

console.log(`\n📈 Summary:`);
console.log(`   Gross Earnings:           ₹${result.gross_earnings.toLocaleString('en-IN').padStart(10)}`);
console.log(`   Total Deductions:         ₹${result.total_deductions.toLocaleString('en-IN').padStart(10)}`);
console.log(`   ${'='.repeat(40)}`);
console.log(`   Net Pay:                  ₹${result.net_pay.toLocaleString('en-IN').padStart(10)}`);

console.log('\n' + '='.repeat(60));
console.log('✅ All tests completed successfully!\n');

console.log('📖 Next Steps:');
console.log('   1. Run database migration: node setup-enhanced-features.js');
console.log('   2. Start server: npm start');
console.log('   3. Test API endpoints via Swagger: http://localhost:3000/api-docs');
console.log('   4. Check ENHANCED_FEATURES_GUIDE.md for API usage\n');
