const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    participants: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            share: {
                type: Number,
                required: true,
                min: 0
            },
            paid: {
                type: Number,
                default: 0 
            }
        }
    ],
    splitType: {
        type: String,
        enum: ["equal", "unequal"],
        default: "equal"
    }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);