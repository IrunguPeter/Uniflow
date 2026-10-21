const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./services/db');
const { runMigrations } = require('./services/migrations');

require('./models/User');
require('./models/Transaction');
require('./models/RecurringExpense');
require('./models/ChatMessage');
require('./models/BudgetPlan');
require('./models/PendingTransaction');

const app = express();
const PORT = process.env.PORT || 5070;

const financeRoutes = require('./routes/financeRoutes');

app.use(cors());
app.use(express.json());

sequelize.sync()
    .then(() => runMigrations(sequelize))
    .then(async () => {
        console.log('Connected to SQLite database');

        const User = require('./models/User');
        await User.findOrCreateByUserId('demo-user');
        console.log('Default user ready');
    })
    .catch(err => console.error('SQLite connection error:', err));

app.use('/api/finance', financeRoutes);

app.get('/', (req, res) => {
    res.send('UniFlow Finance API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
