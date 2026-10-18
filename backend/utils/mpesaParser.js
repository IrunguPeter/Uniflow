/**
 * Enhanced M-Pesa SMS Parser & Kenyan Categorizer Utility
 * Parses all standard Safaricom notification message variations, 
 * extracts balances, transaction fees, counterparty, and auto-categorizes.
 */

// Keyword rules for Kenyan spending habits
const AUTO_CATEGORIES = [
    {
        category: 'Food & Dining',
        keywords: [
            'hotel', 'restaurant', 'cafe', 'kfc', 'java', 'pizza', 'chicken inn',
            'creamy inn', 'galitos', 'artcaffe', 'burger', 'bakery', 'butchery',
            'grill', 'snack', 'fast food', 'kitchen', 'takeaway', 'dishes', 'chips'
        ]
    },
    {
        category: 'Groceries & Shopping',
        keywords: [
            'naivas', 'quickmart', 'carrefour', 'chandarana', 'cleanshelf', 'choma',
            'supermarket', 'mart', 'mini market', 'general stores', 'wholesalers',
            'posho mill', 'duka', 'groceries', 'supplies', 'retail'
        ]
    },
    {
        category: 'Transport',
        keywords: [
            'uber', 'bolt', 'little cab', 'safiri', 'matatu', 'sacco', 'stage',
            'petrol', 'total', 'shell', 'rubis', 'ola energy', 'boda', 'shuttle', 'travellers'
        ]
    },
    {
        category: 'Utilities & Bills',
        keywords: [
            'kplc', 'token', 'prepaid', 'kenya power', 'nairobi water', 'water',
            'zuku', 'safaricom home', 'faiba', 'jtl', 'dstv', 'gotv', 'startimes',
            'trash', 'garbage'
        ]
    },
    {
        category: 'Airtime & Data',
        keywords: [
            'airtime', 'safaricom data', 'bundles', 'tunukiwa', 'safaricom postpay'
        ]
    },
    {
        category: 'Rent & Housing',
        keywords: [
            'hostel', 'apartments', 'properties', 'rent', 'residence', 'plaza', 'court', 'estates'
        ]
    },
    {
        category: 'Education & Campus',
        keywords: [
            'university', 'campus', 'college', 'school', 'academy', 'polytechnic',
            'library', 'helb', 'kuccps', 'bookshop', 'stationery', 'cyber'
        ]
    },
    {
        category: 'Health & Pharmacy',
        keywords: [
            'pharmacy', 'chemist', 'hospital', 'clinic', 'dispensary', 'dental', 'medicare', 'healthcare'
        ]
    },
    {
        category: 'Entertainment & Leisure',
        keywords: [
            'netflix', 'spotify', 'cinema', 'lounge', 'club', 'pub', 'sports', 'gaming', 'betika', 'sportpesa', 'cheza'
        ]
    }
];

function detectCategory(nameOrText, type = 'expense') {
    if (type === 'income') {
        const lower = nameOrText.toLowerCase();
        if (lower.includes('helb')) return 'HELB';
        if (lower.includes('salary') || lower.includes('payroll')) return 'Salary';
        if (lower.includes('remittance') || lower.includes('worldremit') || lower.includes('sendwave')) return 'Remittance';
        return 'Allowance & Gifts';
    }

    const text = (nameOrText || '').toLowerCase();
    for (const rule of AUTO_CATEGORIES) {
        if (rule.keywords.some(k => text.includes(k))) {
            return rule.category;
        }
    }
    return 'Other';
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
        // ignore and fallback
    }
    return new Date();
}

/**
 * Parses any format of Safaricom M-Pesa SMS message
 */
function parseMpesaSMS(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();

    // Check if it's an M-Pesa message
    if (!/confirmed/i.test(clean) && !/m-pesa/i.test(clean)) {
        return null;
    }

    // 1. Transaction Code (e.g. QKH7B6GKZ4, UE5JK2ZT6H, ABC123XYZ)
    let ref = null;
    const refMatchStart = clean.match(/^([A-Z0-9]{6,12})\s+Confirmed/i);
    const refMatchEnd = clean.match(/Transaction code,?\s*([A-Z0-9]{6,12})/i);
    if (refMatchStart) {
        ref = refMatchStart[1].toUpperCase();
    } else if (refMatchEnd) {
        ref = refMatchEnd[1].toUpperCase();
    } else {
        const genericCode = clean.match(/\b([A-Z0-9]{8,12})\b/);
        if (genericCode) ref = genericCode[1];
    }

    // 2. Amount: Ksh1,200.00 or KSh. 500 or Ksh 50
    const amtMatch = clean.match(/KSh?\.?\s*([\d,]+\.?\d*)/i);
    if (!amtMatch) return null;
    const amount = parseFloat(amtMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return null;

    // 3. Balance after transaction
    let balance = null;
    const balMatch = clean.match(/(?:new\s+)?M-PESA\s+balance\s+(?:is\s+)?KSh?\.?\s*([\d,]+\.?\d*)/i);
    if (balMatch) {
        balance = parseFloat(balMatch[1].replace(/,/g, ''));
    }

    // 4. Transaction Cost / Fee
    let cost = 0;
    const costMatch = clean.match(/transaction\s+cost(?:,?\s*is)?\s+KSh?\.?\s*([\d,]+\.?\d*)/i);
    if (costMatch) {
        cost = parseFloat(costMatch[1].replace(/,/g, ''));
    }

    // 5. Date & Time
    let dateStr = '';
    let timeStr = '';
    const dtMatch = clean.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[APap][Mm])/i);
    if (dtMatch) {
        dateStr = dtMatch[1];
        timeStr = dtMatch[2];
    }

    // 6. Transaction Type & Counterparty
    let type = 'expense';
    let counterparty = '';
    let subType = 'send';

    // Patterns
    if (/received\s+Ksh?\.?\s*[\d,.]+\s+from/i.test(clean) || /received\s+from/i.test(clean)) {
        type = 'income';
        subType = 'receive';
        const match = clean.match(/received\s+(?:Ksh?\.?\s*[\d,.]+\s+)?from\s+([^.]+?)\s+on\s+\d/i) ||
                      clean.match(/from\s+([^.]+?)\s+on\s+\d/i);
        if (match) counterparty = match[1].trim();
    } else if (/paid\s+to/i.test(clean)) {
        type = 'expense';
        subType = 'paybill';
        const match = clean.match(/paid\s+to\s+([^.]+?)\s+on\s+\d/i);
        if (match) counterparty = match[1].trim();
    } else if (/sent\s+to/i.test(clean)) {
        type = 'expense';
        subType = 'send';
        const match = clean.match(/sent\s+to\s+([^.]+?)\s+on\s+\d/i);
        if (match) counterparty = match[1].trim();
    } else if (/withdrawn\s+from/i.test(clean)) {
        type = 'expense';
        subType = 'withdraw';
        const match = clean.match(/withdrawn\s+from\s+([^.]+?)\s+on\s+\d/i);
        if (match) counterparty = match[1].trim();
    } else if (/airtime/i.test(clean) && /bought/i.test(clean)) {
        type = 'expense';
        subType = 'airtime';
        counterparty = 'Safaricom Airtime';
    } else if (/give\s+Ksh/i.test(clean) || /withdraw/i.test(clean)) {
        type = 'expense';
        subType = 'withdraw';
        counterparty = 'Agent / ATM';
    }

    // Clean up counterparty phone numbers/account numbers if any
    if (counterparty) {
        counterparty = counterparty.replace(/\s+/g, ' ').trim();
    } else {
        counterparty = subType === 'paybill' ? 'Merchant' : (type === 'income' ? 'Unknown Sender' : 'Unknown Recipient');
    }

    const category = detectCategory(counterparty, type);
    const parsedDate = dateStr ? parseKenyanDateTime(dateStr, timeStr) : new Date();

    let description = '';
    if (type === 'income') {
        description = `Received from ${counterparty}`;
    } else if (subType === 'paybill') {
        description = `Paid to ${counterparty}`;
    } else if (subType === 'withdraw') {
        description = `Withdrawn at ${counterparty}`;
    } else {
        description = `Sent to ${counterparty}`;
    }

    return {
        ref: ref || `MP${Date.now()}`,
        amount,
        cost,
        balance,
        counterparty,
        recipient: type === 'expense' ? counterparty : undefined,
        sender: type === 'income' ? counterparty : undefined,
        type,
        subType,
        category,
        description,
        date: dateStr,
        time: timeStr,
        timestamp: parsedDate,
        provider: 'MPESA'
    };
}

/**
 * Parse multiple SMS messages pasted in batch (split by Confirmed or newlines)
 */
function parseBatchMpesaSMS(text) {
    if (!text || typeof text !== 'string') return [];
    
    // Split messages cleanly by double newlines or message boundaries
    const rawChunks = text
        .split(/\n\s*\n+/)
        .flatMap(chunk => chunk.split(/(?<=\.)\s+(?=[A-Z0-9]{6,12}\s+Confirmed|Till\s+Number\s+\d+\s+Confirmed)/i));
        
    const results = [];

    for (const chunk of rawChunks) {
        const trimmed = chunk.trim();
        if (trimmed.length > 20) {
            const parsed = parseMpesaSMS(trimmed);
            if (parsed) {
                results.push({ ...parsed, rawSms: trimmed });
            }
        }
    }

    return results;
}

module.exports = {
    parseMpesaSMS,
    parseBatchMpesaSMS,
    detectCategory,
    AUTO_CATEGORIES
};
