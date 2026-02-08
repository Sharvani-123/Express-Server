const Expense = require('../model/expense');

const expenseDao={
    addExpense: async (data) => {
        const newExpense = new Expense(data);
        return await newExpense.save();
    },
    updateExpense: async (expenseId,updateData) => {
        return await Expense.findByIdAndUpdate(
            expenseId,
            updateData,
            {new:true}
        );
    },
    deleteExpense: async(expenseId) => {
        return await Expense.findByIdAndDelete(expenseId);
    },
    getExpensesByGroup: async (groupId) => {
        return await Expense.find({ groupId });
    },
    getExpense: async (expenseId) => {
        return await Expense.findById(expenseId);
    },
    updateExpensesByGroup: async (groupId, updateData) => {
        return await Expense.updateMany({ groupId }, updateData);
    }
};

module.exports= expenseDao;