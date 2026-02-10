const expenseDao = require('../dao/expenseDao');
const groupDao = require('../dao/groupDao');
const userDao = require('../dao/userDao');
const Group= require('../model/group');
const User = require('../model/users');
const mongoose = require('mongoose');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const resolveUserId = async (value) => {
    if (!value) return null;
    if (isObjectId(value)) return value;
    const user = await userDao.findByEmail(value);
    return user ? user._id : null;
};

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

            const resolvedParticipants = await Promise.all(
                participants.map((p) => resolveUserId(p))
            );

            if (resolvedParticipants.some((p) => !p)) {
                return res.status(400).json({
                    message: "One or more participants are invalid"
                });
            }

            const share = amountNum / resolvedParticipants.length;

            finalParticipants = resolvedParticipants.map(userId => ({
                userId,
                share,
                paid: 0
            }));
        }

        else {
            const total = participants.reduce(
                (sum, p) => sum + Number(p.share || 0),
                0
            );

            if (Math.abs(total - amountNum) > 0.01) {
                return res.status(400).json({
                    message: "Shares must sum to total amount" 
                });
            }

            const resolvedParticipants = await Promise.all(
                participants.map(async (p) => {
                    const resolvedUserId = await resolveUserId(p.userId);
                    return {
                        userId: resolvedUserId,
                        share: Number(p.share || 0),
                        paid: Number(p.paid || 0)
                    };
                })
            );

            if (resolvedParticipants.some((p) => !p.userId)) {
                return res.status(400).json({
                    message: "One or more participants are invalid"
                });
            }

            finalParticipants = resolvedParticipants;
        }

        const resolvedPaidBy = await resolveUserId(paidBy);
        if (!resolvedPaidBy) {
            return res.status(400).json({ message: "Paid by user is invalid" });
        }

        const expense = await expenseDao.addExpense({
            groupId,
            title,
            amount:amountNum,
            paidBy: resolvedPaidBy,
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
            const payerId = expense.paidBy._id
                ? expense.paidBy._id.toString()
                : expense.paidBy.toString();

            expense.participants.forEach(p=>{
                const userId = p.userId._id
                    ? p.userId._id.toString()
                    : p.userId.toString();
                const share= p.share;
                const paid= p.paid || 0;

                if(!balance[userId]) balance[userId]=0;
                if(!balance[payerId]) balance[payerId] =0;

                if(userId!==payerId){
                    const owes= share-paid;

                    balance[userId] += owes;
                    balance[payerId]-= owes;
                }
            })
        });

            const userIds = Object.keys(balance);
            const users = await User.find({ _id: { $in: userIds } })
                .select('name email');
            const profileById = users.reduce((acc, user) => {
                acc[user._id.toString()] = {
                    name: user.name,
                    email: user.email
                };
                return acc;
            }, {});

            const summary = Object.entries(balance).map(([userId,amount])=>({
                userId,
                name: profileById[userId]?.name || userId,
                email: profileById[userId]?.email || "",
                balance: amount
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
