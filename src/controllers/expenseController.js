const expenseDao = require('../dao/expenseDao');
const groupDao = require('../dao/groupDao');
const Group= require('../model/group');

const expenseController ={
    add: async (req,res) => {
        try {
        const { groupId, title, amount, paidBy, participants, splitType } = req.body;

        const amountNum= Number(amount);

        if (!groupId || !title || !amountNum || !paidBy || !participants?.length) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        if(amountNum<=0){
            return res.status(400).json({
                message: "Amount must begreater than zero"
            });
        }

        let finalParticipants = [];

        if (splitType === "equal") {

            if(!participants.length){
                return res.status(400).json({ message: "Participants are required" });
            }

            const share = amountNum / participants.length;

            finalParticipants = participants.map(userId => ({
                userId,
                share,
                paid: 0
            }));
        }

        else {
            const total = participants.reduce((sum, p) => sum + p.share, 0);

            if (total !== amount) {
                return res.status(400).json({
                    message: "Shares must sum to total amount" 
                });
            }

            finalParticipants = participants.map(p => ({
                userId: p.userId,
                share: Number(p.share || 0),
                paid: Number(p.paid || 0)
            }));
        }

        const expense = await expenseDao.addExpense({
            groupId,
            title,
            amount:amountNum,
            paidBy,
            participants: finalParticipants,
            splitType
        });

        res.status(201).json({
            message: "Expense added successfully",
            data:expense
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
    },
    summary: async (req,res) => {
        try {
            const {groupId} = req.params;

            const expenses = await expenseDao.getExpensesByGroup(groupId);

            if(!expenses || expenses.length ===0 ){
                return res.status(200).json({
                    message:"No expense found for this group"
                });
            }

            const balance={};

            expenses.forEach(expense =>{
                const payer= expense.paidBy.toString();

                expense.participants.forEach(p=>{
                    const user= p.userId.toString();
                    const share= p.share;
                    const paid= p.paid || 0;

                    if(!balance[user]) balance[user]=0;
                    if(!balance[payer]) balance[payer] =0;

                    if(user!==payer){
                        const owes= share-paid;

                        balance[user] += owes;
                        balance[payer]-= owes;
                    }
                })
            });

            const summary = Object.entries(balance).map(([userId,amount])=>({
                userId,
                balance:amount
            }));

            res.status(200).json({
                message:"Group summary fetched.",
                data:summary
            });
        } catch(error){
            console.log(error);
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    },
    settle:async (req,res) => {
        try {
            const {groupId} = req.params;

            const group = await Group.findById(groupId);
            if(!group){
                return res.status(404).json({message: "Group not found"});
            }

            const expenses = await expenseDao.getExpensesByGroup(groupId);

            for (const expense of expenses) {
                const updatedParticipants = expense.participants.map(p => ({
                    userId: p.userId,
                    share: p.share,
                    paid: p.share
                }));

                await expenseDao.updateExpense(expense._id, {
                    participants: updatedParticipants
                });
            }
            
            await groupDao.updateGroup({
                groupId,
                name: group.name,
                description: group.description,
                thumbnail: group.thumbnail,
                adminEmail: group.adminEmail,
                paymentStatus: {
                    isPaid: true,
                    date: new Date(),
                    amount: 0
                }
            });

            res.status(200).json({
                message: "Group settled successfully"
            });

        } catch (error) {
            console.log(error);
            res.status(500).json({
                message:"Internal Server Error"
            });
        }
    },

    getExpensesByGroup: async (req,res) => {
        try{
            const {groupId}= req.params;
            const expenses= await expenseDao.getExpensesByGroup(groupId);
            res.status(200).json({
                data:expenses
            });
        } catch(error){
            console.log(error);
            res.status(500).json({
                message: "Internal Server Error"
            })
        }
    },
    update: async(req,res) => {
        try {
            const {expenseId} = req.params;

            const updated= await expenseDao.updateExpense(expenseId, req.body);
            if(!updated){
                return res.status(404).json({
                    message: "Expense not found"
                });
            }
            res.status(200).json({
                message:"Updated successfully",
                data: updated
            });

        } catch (error) {
            res.status(500).json({
                message: "Internal server error"
            });
        }
    },
    delete: async (req,res) => {
        try {
            const {expenseId} = req.params;

            const deleted = await expenseDao.deleteExpense(expenseId);

            if (!deleted) {
            return res.status(404).json({ message: "Expense not found" });
            }

            res.status(200).json({
                message: "Expense deleted successfully"
            });

        } catch (error) {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    }
}

module.exports= expenseController;