/**
 * M-Pesa Statement Parser
 * Parses M-Pesa statements from Safaricom — supports PDF and CSV formats.
 *
 * M-Pesa statement rows look like:
 *   Date       Time     Details                                          Trans Code   Amount   Balance
 *   15/01/26   2:30 PM  Customer Transfer to GEORGE OTIENO              QKH7B6GKZ4    -1,200.00 4,500.00
 *   15/01/26   2:35 PM  MOM                                            ABC123XYZ      +500.00  5,000.00
 *
 * Each row is normalized into the same shape as parseMpesaSMS() so it can
 * flow through the existing pending-transaction pipeline.
 */

const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { detectCategory } = require('./mpesaParser');

const STATEMENT_HEADER_REGEX = /date\s+time\s+details\s+trans\s*code\s+amount\s+balance/i;

/**
 * Normalize a raw statement row into the same shape as parseMpesaSMS output.
 */
function normalizeRow(row) {
    const {
        date, time, details, transCode, amount, balance, rawLine
    } = row;

    const ref = transCode || `MP${Date.now()}`;
    const amountNum = parseAmount(amount);
    if (!amountNum || amountNum <= 0) return null;

    const parsedDate = date ? parseKenyanDateTime(date, time) : new Date();

    // Determine type from amount sign or keywords
    const isIncome = /received|deposit|reversal|refund/i.test(details) || amount.startsWith('+');
    const isTransfer = /customer transfer|transfer to|transfer from|withdraw|cash deposit|atm/i.test(details);
    const type = isTransfer ? 'transfer' : (isIncome ? 'income' : 'expense');

    let fromProvider = null;
    let toProvider = null;
    let subType = 'send';

    if (/cash deposit|deposited/i.test(details)) {
        subType = 'deposit';
        fromProvider = 'CASH';
        toProvider = 'MPESA';
    } else if (/withdraw|cash withdrawal|atm/i.test(details)) {
        subType = 'withdraw';
        fromProvider = 'MPESA';
        toProvider = 'CASH';
    } else if (/received from/i.test(details)) {
        subType = 'receive';
    } else if (/paid to|paybill|buy goods/i.test(details)) {
        subType = 'paybill';
    } else if (/sent to|customer transfer to/i.test(details)) {
        subType = 'send';
    }

    // Extract counterparty — strip the transaction type prefix
    let counterparty = details;
    counterparty = counterparty
        .replace(/^(customer transfer to|received from|paid to|sent to|cash deposit|cash withdrawal|withdraw|atm)\s*/i, '')
        .replace(/^at\s+/i, '')                                     // strip leading "at "
        .replace(/\s+/g, ' ')
        .trim();

    if (!counterparty) {
        counterparty = type === 'income' ? 'Unknown Sender' : (type === 'transfer' ? 'M-Pesa Agent' : 'Unknown Recipient');
    }

    const description = buildDescription(type, subType, counterparty);
    const category = type === 'transfer' ? 'Transfer' : detectCategory(counterparty, type);

    return {
        ref,
        amount: amountNum,
        cost: 0,
        balance: balance ? parseAmount(balance) : null,
        counterparty,
        recipient: type === 'expense' ? counterparty : undefined,
        sender: type === 'income' ? counterparty : undefined,
        type,
        subType,
        category,
        description,
        date,
        time,
        timestamp: parsedDate,
        provider: 'MPESA',
        fromProvider,
        toProvider,
        rawSms: rawLine || details
    };
}

function parseAmount(str) {
    if (!str) return null;
    const cleaned = String(str).replace(/[+,KSh,\s]/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.abs(num);
}

function parseKenyanDateTime(dateStr, timeStr) {
    try {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            let day = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10) - 1;
            let year = parseInt(parts[2], 10);
            if (year < 100) year += 2000;

            let hours = 0;
            let minutes = 0;
            if (timeStr) {
                const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*([APap][Mm])?/);
                if (timeMatch) {
                    hours = parseInt(timeMatch[1], 10);
                    minutes = parseInt(timeMatch[2], 10);
                    const ampm = (timeMatch[3] || '').toUpperCase();
                    if (ampm === 'PM' && hours < 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;
                }
            }
            return new Date(year, month, day, hours, minutes);
        }
    } catch {
        // ignore
    }
    return new Date();
}

function buildDescription(type, subType, counterparty) {
    if (type === 'transfer' && subType === 'deposit') return `Cash deposit to M-Pesa at ${counterparty}`;
    if (type === 'transfer') return `Cash withdrawal from M-Pesa at ${counterparty}`;
    if (type === 'income') return `Received from ${counterparty}`;
    if (subType === 'paybill') return `Paid to ${counterparty}`;
    if (subType === 'withdraw') return `Withdrawn at ${counterparty}`;
    return `Sent to ${counterparty}`;
}

/**
 * Parse a CSV M-Pesa statement.
 * Expected columns: Date, Time, Details, Trans Code, Amount, Balance
 */
function parseCsvStatement(csvText) {
    if (!csvText || typeof csvText !== 'string') return [];

    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    // Find header line
    let headerIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        if (STATEMENT_HEADER_REGEX.test(lines[i]) || /date.*time.*details/i.test(lines[i])) {
            headerIdx = i;
            break;
        }
    }

    const start = headerIdx >= 0 ? headerIdx + 1 : 0;
    const results = [];

    // Match amount,balance at end of line (both may contain commas as thousands separators, optional +/- sign)
    const endAmountsRegex = /([+-]?[\d,]+\.\d{2}),([+-]?[\d,]+\.\d{2})\s*$/;

    for (let i = start; i < lines.length; i++) {
        const line = lines[i];
        if (line.length < 10) continue;

        const endMatch = line.match(endAmountsRegex);
        if (!endMatch) continue;

        const amountStr = endMatch[1];
        const balanceStr = endMatch[2];

        // Everything before the amounts is the header: date, time, details, trans code
        const header = line.substring(0, endMatch.index).trim();

        // Extract date (DD/MM/YY at start)
        const dateMatch = header.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+/);
        const date = dateMatch ? dateMatch[1] : '';

        // Extract time (HH:MM AM/PM after date)
        let time = '';
        let timeMatch = header.match(/\d{1,2}:\d{2}\s*[APap][Mm]/);
        if (timeMatch) time = timeMatch[0].replace(/\s+/g, ' ');

        // Extract transaction code (6-12 alphanumeric, must contain at least one digit)
        let transCode = '';
        const codeMatches = header.match(/\b[A-Z0-9]{6,12}\b/g);
        if (codeMatches) {
            transCode = codeMatches.find((c) => /\d/.test(c)) || '';
        }

        // Details: header minus date, time, and trans code
        let details = header;
        if (dateMatch) details = details.substring(dateMatch[0].length).trim();
        if (timeMatch) {
            const tIdx = details.indexOf(timeMatch[0]);
            if (tIdx >= 0) details = details.substring(tIdx + timeMatch[0].length).trim();
        }
        if (transCode) {
            const cIdx = details.indexOf(transCode);
            if (cIdx >= 0) details = details.substring(0, cIdx).trim();
        }
        details = details.replace(/^[,]\s*|[,]\s*$/g, '').trim();

        const row = {
            date,
            time,
            details,
            transCode,
            amount: amountStr,
            balance: balanceStr,
            rawLine: line
        };
        const normalized = normalizeRow(row);
        if (normalized) results.push(normalized);
    }

    return results;
}

/**
 * Parse a PDF M-Pesa statement buffer.
 */
async function parsePdfStatement(pdfBuffer) {
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) return [];

    const data = await pdf(pdfBuffer);
    const text = data.text || '';

    return parsePdfText(text);
}

/**
 * Parse text extracted from a PDF statement.
 */
function parsePdfText(pdfText) {
    if (!pdfText || typeof pdfText !== 'string') return [];

    const lines = pdfText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    // Find where the transaction table starts
    let startIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        if (STATEMENT_HEADER_REGEX.test(lines[i])) {
            startIdx = i + 1;
            break;
        }
    }

    if (startIdx === -1) {
        // Fallback: try to find lines that look like transactions
        // (start with a date like DD/MM/YY)
        return lines
            .filter(l => /^\d{1,2}\/\d{1,2}\/\d{2,4}\s/.test(l))
            .map(l => parsePdfLine(l))
            .filter(Boolean);
    }

    const results = [];
    for (let i = startIdx; i < lines.length; i++) {
        const normalized = parsePdfLine(lines[i]);
        if (normalized) results.push(normalized);
    }

    return results;
}

/**
 * Parse a single PDF text line into a statement row.
 * PDF text extraction often jumbles columns, so we use positional heuristics.
 */
function parsePdfLine(line) {
    if (!line || line.length < 10) return null;

    // Skip non-transaction lines
    if (/^(page|total|balance|statement|mpesa|safaricom|customer care)/i.test(line) && !/\d{2}\/\d{2}\//.test(line)) {
        return null;
    }

    // Try to extract date at start
    const dateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+/);
    if (!dateMatch) return null;
    const date = dateMatch[1];
    const remainder = line.substring(dateMatch[0].length).trim();

    // Extract time (HH:MM AM/PM)
    let time = '';
    const timeMatch = remainder.match(/^(\d{1,2}:\d{2}\s*[APap][Mm])\s+/);
    if (timeMatch) {
        time = timeMatch[1].replace(/\s+/g, ' ');
        const afterTime = remainder.substring(timeMatch[0].length).trim();
    }

    // Extract amount and balance from end of line
    // M-Pesa statements end with: ... CODE   -1,200.00   4,500.00
    const amountMatches = remainder.match(/-?[\d,]+\.\d{2}/g);
    let amount = '';
    let balance = '';
    if (amountMatches) {
        amount = amountMatches[0];
        balance = amountMatches.length > 1 ? amountMatches[amountMatches.length - 1] : '';
    }

    // Extract transaction code (alphanumeric 6-12 chars)
    let transCode = '';
    const codeMatch = remainder.match(/\b([A-Z0-9]{6,12})\b/);
    if (codeMatch) transCode = codeMatch[1];

    // Details is everything between time and the amounts
    let details = remainder;
    if (timeMatch) details = details.substring(timeMatch[0].length).trim();
    // Remove trailing amounts and code
    if (amount) details = details.replace(new RegExp(amount.replace(/[.+*?^${}()|[\]\\]/g, '\\$&') + '\\s*$'), '').trim();
    if (balance && balance !== amount) details = details.replace(new RegExp(balance.replace(/[.+*?^${}()|[\]\\]/g, '\\$&') + '\\s*$'), '').trim();
    if (transCode) details = details.replace(new RegExp(transCode + '\\s*$'), '').trim();
    details = details.trim();

    const row = {
        date,
        time,
        details,
        transCode,
        amount,
        balance,
        rawLine: line
    };

    return normalizeRow(row);
}

module.exports = {
    parseCsvStatement,
    parsePdfStatement,
    parsePdfText,
    normalizeRow
};
