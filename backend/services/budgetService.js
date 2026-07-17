const { Op, fn, col, literal } = require('sequelize');
const Transaction = require('../models/Transaction');
const RecurringExpense = require('../models/RecurringExpense');

const WEEKS_PER_MONTH = 4.33;
const WEEKS_PER_SEMESTER = 15;

const ESSENTIAL_CATEGORIES = ['Rent', 'Food', 'Transport', 'Bills', 'Education', 'Health'];

class BudgetService {
    static async getWeeklyRecurringTotal(userId) {
        const items = await RecurringExpense.findAll({ where: { userId, type: 'expense' } });
        return items.reduce((sum, item) => {
            if (item.frequency === 'weekly') return sum + item.amount;
            if (item.frequency === 'monthly') return sum + (item.amount / WEEKS_PER_MONTH);
            if (item.frequency === 'semester') return sum + (item.amount / WEEKS_PER_SEMESTER);
            return sum;
        }, 0);
    }

    static async getWeeklyRecurringIncome(userId) {
        const items = await RecurringExpense.findAll({ where: { userId, type: 'income' } });
        return items.reduce((sum, item) => {
            if (item.frequency === 'weekly') return sum + item.amount;
            if (item.frequency === 'monthly') return sum + (item.amount / WEEKS_PER_MONTH);
            if (item.frequency === 'semester') return sum + (item.amount / WEEKS_PER_SEMESTER);
            return sum;
        }, 0);
    }

    static async checkWeeklySpend(userId, weeklyLimit) {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const transactions = await Transaction.findAll({
            where: {
                userId,
                type: 'expense',
                timestamp: { [Op.gte]: startOfWeek }
            }
        });

        const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const recurringWeekly = await this.getWeeklyRecurringTotal(userId);
        const effectiveLimit = weeklyLimit - recurringWeekly;
        const discretionarySpent = Math.max(0, totalSpent - recurringWeekly);
        const percentageUsed = effectiveLimit > 0 ? (discretionarySpent / effectiveLimit) * 100 : (totalSpent / weeklyLimit) * 100;

        return {
            totalSpent,
            weeklyLimit,
            recurringWeekly: Math.round(recurringWeekly),
            effectiveLimit: Math.round(effectiveLimit),
            remaining: Math.round(effectiveLimit - discretionarySpent),
            percentageUsed,
            status: percentageUsed >= 100 ? 'EXCEEDED' : (percentageUsed >= 80 ? 'WARNING' : 'OK')
        };
    }

    static async getBalance(userId) {
        const transactions = await Transaction.findAll({ where: { userId } });

        const mpesa = { income: 0, expenses: 0 };
        const bank = { income: 0, expenses: 0 };
        const cash = { income: 0, expenses: 0 };

        for (const tx of transactions) {
            const target = tx.provider === 'MPESA' ? mpesa
                : (tx.provider === 'NCBA' || tx.provider === 'IM') ? bank
                : cash;
            if (tx.type === 'income') target.income += tx.amount;
            else if (tx.type === 'expense') target.expenses += tx.amount;
        }

        return {
            mpesaBalance: mpesa.income - mpesa.expenses,
            mpesaIncome: mpesa.income,
            mpesaExpenses: mpesa.expenses,
            bankBalance: bank.income - bank.expenses,
            bankIncome: bank.income,
            bankExpenses: bank.expenses,
            cashBalance: cash.income - cash.expenses,
            balance: (mpesa.income - mpesa.expenses) + (bank.income - bank.expenses) + (cash.income - cash.expenses),
            income: mpesa.income + bank.income + cash.income,
            expenses: mpesa.expenses + bank.expenses + cash.expenses,
        };
    }

    static async getChartData(userId) {
        const transactions = await Transaction.findAll({ where: { userId } });

        const categoryMap = {};
        const monthlyMap = {};

        for (const tx of transactions) {
            const cat = tx.category || 'Other';
            if (!categoryMap[cat]) categoryMap[cat] = { income: 0, expense: 0 };
            if (tx.type === 'income') categoryMap[cat].income += tx.amount;
            else if (tx.type === 'expense') categoryMap[cat].expense += tx.amount;

            const date = new Date(tx.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { income: 0, expense: 0 };
            if (tx.type === 'income') monthlyMap[monthKey].income += tx.amount;
            else if (tx.type === 'expense') monthlyMap[monthKey].expense += tx.amount;
        }

        const byCategory = Object.entries(categoryMap).map(([name, data]) => ({
            name,
            ...data,
        })).sort((a, b) => (b.expense + b.income) - (a.expense + a.income));

        const byMonth = Object.entries(monthlyMap)
            .map(([month, data]) => ({ month, ...data, balance: data.income - data.expense }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-6);

        return { byCategory, byMonth };
    }

    static async getBudgetSummary(userId, plan) {
        const now = new Date();
        let startOfPeriod;

        if (plan.period === 'weekly') {
            startOfPeriod = new Date(now);
            startOfPeriod.setDate(now.getDate() - now.getDay());
            startOfPeriod.setHours(0, 0, 0, 0);
        } else if (plan.period === 'monthly') {
            startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            startOfPeriod = new Date(now.getFullYear(), 0, 1);
        }

        const transactions = await Transaction.findAll({
            where: {
                userId,
                type: 'expense',
                timestamp: { [Op.gte]: startOfPeriod }
            }
        });

        const categories = plan.categories || [];
        const categorySpending = {};

        for (const tx of transactions) {
            const cat = tx.category || 'Other';
            categorySpending[cat] = (categorySpending[cat] || 0) + tx.amount;
        }

        const categoryDetails = categories.map(cat => ({
            name: cat.name,
            budgeted: cat.amount,
            isEssential: cat.isEssential,
            spent: categorySpending[cat.name] || 0,
            remaining: cat.amount - (categorySpending[cat.name] || 0),
            percentageUsed: cat.amount > 0 ? Math.round(((categorySpending[cat.name] || 0) / cat.amount) * 100) : 0
        }));

        const essentialsBudget = categories
            .filter(c => c.isEssential)
            .reduce((sum, c) => sum + c.amount, 0);
        const essentialsSpent = categories
            .filter(c => c.isEssential)
            .reduce((sum, c) => sum + (categorySpending[c.name] || 0), 0);

        const miscBudget = plan.totalBudget - essentialsBudget;
        const miscSpent = transactions.reduce((sum, tx) => {
            const cat = tx.category || 'Other';
            if (ESSENTIAL_CATEGORIES.includes(cat)) return sum;
            return sum + tx.amount;
        }, 0);

        const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);

        return {
            totalBudget: plan.totalBudget,
            totalSpent,
            totalRemaining: plan.totalBudget - totalSpent,
            essentials: {
                budget: essentialsBudget,
                spent: essentialsSpent,
                remaining: essentialsBudget - essentialsSpent,
                percentageUsed: essentialsBudget > 0 ? Math.round((essentialsSpent / essentialsBudget) * 100) : 0
            },
            miscellaneous: {
                budget: miscBudget,
                spent: miscSpent,
                remaining: miscBudget - miscSpent,
                percentageUsed: miscBudget > 0 ? Math.round((miscSpent / miscBudget) * 100) : 0
            },
            categoryDetails
        };
    }
}

module.exports = BudgetService;
