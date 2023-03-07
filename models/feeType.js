const mongoose = require('mongoose');

const feetypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    accountType: {
        type: String,
        enum: ['Savings', 'Current', 'Fixed Deposit', 'Assets',
            'Liabilities', 'Equity', 'Revenue', 'Expenses',
            'Debits', 'Credits', 'Accounts Payable', 'Accounts Receivable', 'Cash'],
        required: true
    }
});

const Feetype = mongoose.model('Feetype', feetypeSchema);

module.exports = Feetype;
