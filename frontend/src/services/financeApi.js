import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5070/api/finance';

const api = axios.create({ baseURL: API_BASE });

export async function getBudgetInsight(userId = 'demo-user') {
  const { data } = await api.get('/budget-insight', { params: { userId } });
  return data;
}

export async function getTransactions(userId = 'demo-user') {
  const { data } = await api.get('/transactions', { params: { userId } });
  return data;
}

export async function getAccounts(userId = 'demo-user') {
  const { data } = await api.get('/accounts', { params: { userId } });
  return data;
}

export async function getTransfers(userId = 'demo-user') {
  const { data } = await api.get('/transfers', { params: { userId } });
  return data;
}

export async function createTransfer(transfer, userId = 'demo-user') {
  const { data } = await api.post('/transfers', { ...transfer, userId });
  return data;
}

export async function addTransaction(tx, userId = 'demo-user') {
  const { data } = await api.post('/transactions', { ...tx, userId });
  return data;
}

export async function updateTransaction(id, changes, userId = 'demo-user') {
  const { data } = await api.patch(`/transactions/${id}`, { ...changes, userId });
  return data;
}

export async function deleteTransaction(id, userId = 'demo-user') {
  const { data } = await api.delete(`/transactions/${id}`, { params: { userId } });
  return data;
}

export async function parseSms(smsText, userId = 'demo-user') {
  const { data } = await api.post('/parse-sms', { smsText, userId });
  return data;
}

export async function parseBatchSms(batchText, autoConfirm = false, userId = 'demo-user') {
  const { data } = await api.post('/parse-batch-sms', { batchText, autoConfirm, userId });
  return data;
}

export async function getSpendingLeaks(userId = 'demo-user') {
  const { data } = await api.get('/spending-leaks', { params: { userId } });
  return data;
}

export async function helbCalculate(totalLoan, weeksPerSemester, fixedCosts = {}) {
  const { data } = await api.post('/helb-calculate', { totalLoan, weeksPerSemester, fixedCosts });
  return data;
}

export async function getRecurringExpenses(type = null, userId = 'demo-user') {
  const params = { userId };
  if (type) params.type = type;
  const { data } = await api.get('/recurring-expenses', { params });
  return data;
}

export async function addRecurringExpense(expense, userId = 'demo-user') {
  const { data } = await api.post('/recurring-expenses', { ...expense, userId });
  return data;
}

export async function deleteRecurringExpense(id) {
  const { data } = await api.delete(`/recurring-expenses/${id}`);
  return data;
}

export async function getSavingsConfig(userId = 'demo-user') {
  const { data } = await api.get('/savings-config', { params: { userId } });
  return data;
}

export async function updateSavingsConfig(savingsPercentage, userId = 'demo-user') {
  const { data } = await api.put('/savings-config', { savingsPercentage, userId });
  return data;
}

export async function getBudgetPlan(userId = 'demo-user') {
  const { data } = await api.get('/budget-plan', { params: { userId } });
  return data;
}

export async function saveBudgetPlan(plan, userId = 'demo-user') {
  const { data } = await api.post('/budget-plan', { ...plan, userId });
  return data;
}

export async function deleteBudgetPlan(userId = 'demo-user') {
  const { data } = await api.delete('/budget-plan', { params: { userId } });
  return data;
}

export async function getChatHistory(userId = 'demo-user') {
  const { data } = await api.get('/chat/history', { params: { userId } });
  return data;
}

export async function sendChatMessage(message, userId = 'demo-user') {
  const { data } = await api.post('/chat', { message, userId });
  return data;
}

export async function clearChatHistory(userId = 'demo-user') {
  const { data } = await api.delete('/chat/history', { params: { userId } });
  return data;
}

export async function getChartData(userId = 'demo-user') {
  const { data } = await api.get('/charts', { params: { userId } });
  return data;
}

export async function getSyncStats(userId = 'demo-user') {
  const { data } = await api.get('/sync-stats', { params: { userId } });
  return data;
}

export async function getPendingTransactions(userId = 'demo-user') {
  const { data } = await api.get('/pending-transactions', { params: { userId } });
  return data;
}

export async function categorizeTransaction(id, category, description, asTransfer = false) {
  const { data } = await api.post(`/pending-transactions/${id}/categorize`, { category, description, asTransfer });
  return data;
}

export async function ignoreTransaction(id) {
  const { data } = await api.post(`/pending-transactions/${id}/ignore`);
  return data;
}

export async function autoCategorizePending(userId = 'demo-user') {
  const { data } = await api.post('/pending-transactions/auto-categorize', { userId });
  return data;
}

// ── AI agent ───────────────────────────────────────────────────────

export async function getAiActions(userId = 'demo-user') {
  const { data } = await api.get('/ai/actions', { params: { userId } });
  return data;
}

export async function confirmAiAction(id, userId = 'demo-user') {
  const { data } = await api.post(`/ai/actions/${id}/confirm`, { userId });
  return data;
}

export async function cancelAiAction(id, userId = 'demo-user') {
  const { data } = await api.post(`/ai/actions/${id}/cancel`, { userId });
  return data;
}
