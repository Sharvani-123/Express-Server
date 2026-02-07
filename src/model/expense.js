const mongoose= require('mongoose');

const expenseSchema = new mongoose.Schema({
    groupId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required: true
    },
    title: {name: String, required: true},
    amount: {type: Number, required: true},
    paidBy: {type: String, required: true},
    //excluded members not counted in participants
    participants:[
        {
            email: {type: String, required: true},
            share: {type: Number, required: true, min:0},
            paid: {type:Boolean, default:false}
        }
    ],
    splitType:{
        type: String,
        enum: ["equal", "unequal"],
        default: "equal"
    },
    createdAt: {type:Date, default: Date.now}
});

module.exports= mongoose.models('Expense',expenseSchema);