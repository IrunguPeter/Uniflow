/**
 * M-Pesa SMS Parser Utility
 * Extracts data from real Safaricom transaction notification messages.
 */

const MPESA_PATTERNS = {
    // UE5JK2ZT6H Confirmed. Ksh50.00 sent to SAMUEL MALOI on 5/5/26 at 7:27 AM. New M-PESA balance is Ksh731.40...
    SEND: /^(\S+)\s+Confirmed\.\s+Ksh([\d,.]+)\s+sent\s+to\s+(.+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[APap][Mm])\./i,

    // ABC123 Confirmed. Ksh500.00 received from JANE DOE on 17/7/26 at 11:00 AM. New M-PESA balance is...
    RECEIVE: /^(\S+)\s+Confirmed\.\s+Ksh([\d,.]+)\s+received\s+from\s+(.+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[APap][Mm])\./i,

    // XYZ789 Confirmed. Ksh100.00 paid to BUY GUYS 123456 on 17/7/26 at 12:00 PM. New M-PESA balance is...
    PAYBILL: /^(\S+)\s+Confirmed\.\s+Ksh([\d,.]+)\s+paid\s+to\s+(.+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[APap][Mm])\./i,

    // ABC123 Confirmed. Ksh200.00 withdrawn from ATM on 17/7/26 at 1:00 PM. New M-PESA balance is...
    WITHDRAW: /^(\S+)\s+Confirmed\.\s+Ksh([\d,.]+)\s+withdrawn\s+from\s+(.+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[APap][Mm])\./i,

    // Generic fallback: capture ref, amount, and any verb phrase
    GENERIC: /^(\S+)\s+Confirmed\.\s+Ksh([\d,.]+)\s+(\w[\w\s]+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[APap][Mm])\./i
};

const parseMpesaSMS = (text) => {
    const trimmed = text.trim();
    let match;

    if ((match = trimmed.match(MPESA_PATTERNS.SEND))) {
        return {
            ref: match[1],
            amount: parseFloat(match[2].replace(/,/g, '')),
            recipient: match[3].trim(),
            date: match[4],
            time: match[5],
            type: 'expense',
            provider: 'MPESA'
        };
    }

    if ((match = trimmed.match(MPESA_PATTERNS.RECEIVE))) {
        return {
            ref: match[1],
            amount: parseFloat(match[2].replace(/,/g, '')),
            sender: match[3].trim(),
            date: match[4],
            time: match[5],
            type: 'income',
            provider: 'MPESA'
        };
    }

    if ((match = trimmed.match(MPESA_PATTERNS.PAYBILL))) {
        return {
            ref: match[1],
            amount: parseFloat(match[2].replace(/,/g, '')),
            paybill: match[3].trim(),
            date: match[4],
            time: match[5],
            type: 'expense',
            provider: 'MPESA'
        };
    }

    if ((match = trimmed.match(MPESA_PATTERNS.WITHDRAW))) {
        return {
            ref: match[1],
            amount: parseFloat(match[2].replace(/,/g, '')),
            paybill: match[3].trim(),
            date: match[4],
            time: match[5],
            type: 'expense',
            provider: 'MPESA'
        };
    }

    if ((match = trimmed.match(MPESA_PATTERNS.GENERIC))) {
        const verb = match[3].trim().toLowerCase();
        const isIncome = verb.startsWith('received');
        return {
            ref: match[1],
            amount: parseFloat(match[2].replace(/,/g, '')),
            recipient: isIncome ? undefined : match[3].trim(),
            sender: isIncome ? match[3].trim() : undefined,
            date: match[4],
            time: match[5],
            type: isIncome ? 'income' : 'expense',
            provider: 'MPESA'
        };
    }

    return null;
};

module.exports = { parseMpesaSMS };
