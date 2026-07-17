import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/finance';

const api = axios.create({ baseURL: API_BASE });

export async function getBudgetInsight(userId = 'demo-user') {
  const { data } = await api.get('/budget-insight', { params: { userId } });
  return data;
}

export async function getTransactions(userId = 'demo-user') {
  const { data } = await api.get('/transactions', { params: { userId } });
  return data;
}

export async function addTransaction(tx, userId = 'demo-user') {
  const { data } = await api.post('/transactions', { ...tx, userId });
  return data;
}

export async function deleteTransaction(id) {
  const { data } = await api.delete(`/transactions/${id}`);
  return data;
}

export async function parseSms(smsText, userId = 'demo-user') {
  const { data } = await api.post('/parse-sms', { smsText, userId });
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
