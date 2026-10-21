/**
 * Lightweight, idempotent schema migrations.
 *
 * `sequelize.sync()` only creates missing tables — it never adds columns to
 * tables that already exist. These migrations bring an existing database up to
 * date with the models (e.g. the `toProvider` column used for transfers).
 */

const ADDED_COLUMNS = [
    { table: 'Transactions', column: 'toProvider' },
    { table: 'PendingTransactions', column: 'fromProvider' },
    { table: 'PendingTransactions', column: 'toProvider' },
];

async function runMigrations(sequelize) {
    for (const { table, column } of ADDED_COLUMNS) {
        const [rows] = await sequelize.query(`PRAGMA table_info(\`${table}\`)`);

        // Table not created yet (fresh database) — sync() already made it correct.
        if (rows.length === 0) continue;

        if (rows.some((row) => row.name === column)) continue;

        await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` TEXT`);
        console.log(`Migration applied: added ${table}.${column}`);
    }
}

module.exports = { runMigrations };
