const Transaction = require('../models/Transaction');

class HelbPlannerService {
    /**
     * Calculates the allocation of HELB loan across a semester.
     * @param {number} totalLoan - Total loan amount received.
     * @param {number} weeksPerSemester - Total weeks in the semester (e.g., 15).
     * @param {Object} fixedCosts - Costs like rent, tuition, books.
     */
    static calculateAllocation(totalLoan, weeksPerSemester, fixedCosts) {
        const totalFixed = Object.values(fixedCosts).reduce((a, b) => a + b, 0);
        const remainingForLiving = totalLoan - totalFixed;
        
        if (remainingForLiving < 0) {
            return {
                error: "Loan amount is insufficient to cover basic fixed costs.",
                shortfall: Math.abs(remainingForLiving)
            };
        }

        const weeklyAllowance = remainingForLiving / weeksPerSemester;

        return {
            totalLoan,
            fixedCosts,
            totalFixed,
            remainingForLiving,
            weeklyAllowance: Math.floor(weeklyAllowance),
            savingsBuffer: remainingForLiving % weeksPerSemester
        };
    }
}

module.exports = HelbPlannerService;
