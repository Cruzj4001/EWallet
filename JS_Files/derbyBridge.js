import { appState, saveAppState } from './variables.js';

function getUserID() {
    const value = sessionStorage.getItem('ewallet_userID') || localStorage.getItem('ewallet_userID');
    return value ? Number(value) : null;
}

async function postForm(url, values, method = 'POST') {
    const form = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
        form.append(key, value == null ? '' : String(value));
    });

    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
    });

    let result = {};
    try { result = await response.json(); } catch (_) { /* keep empty result */ }

    return { response, result };
}

export async function authenticateOrCreate(username, passwordHash, baseBalance, baseIncome) {
    let auth = await postForm('/api/auth', {
        mode: 'login', username, passwordHash, baseBalance, baseIncome
    });

    if (auth.response.status === 404) {
        auth = await postForm('/api/auth', {
            mode: 'create', username, passwordHash, baseBalance, baseIncome
        });
    }

    if (!auth.response.ok || !auth.result.success) {
        throw new Error(auth.result.message || 'Login failed.');
    }

    const user = auth.result.user;
    sessionStorage.setItem('ewallet_userID', String(user.userID));
    localStorage.setItem('ewallet_userID', String(user.userID));
    sessionStorage.setItem('ewallet_username', user.username);
    localStorage.setItem('ewallet_username', user.username);
    localStorage.setItem('ewallet_baseBalance', String(user.baseBalance));
    localStorage.setItem('ewallet_baseIncome', String(user.baseIncome));

    appState.accountCreated = true;
    appState.isLoggedIn = true;
    appState.username = user.username;
    appState.passwordHash = passwordHash;
    appState.userID = Number(user.userID);

    return user;
}

export async function loadTransactionsIntoState() {
    const userID = getUserID();
    if (!userID || !appState.isLoggedIn) return appState.transactions;

    const [incomeResponse, expenseResponse, planResponse] = await Promise.all([
        fetch('/api/income?userID=' + encodeURIComponent(userID)),
        fetch('/api/expenses?userID=' + encodeURIComponent(userID)),
        fetch('/api/plans?userID=' + encodeURIComponent(userID))
    ]);

    const [incomeResult, expenseResult, planResult] = await Promise.all([
        incomeResponse.json(), expenseResponse.json(), planResponse.json()
    ]);

    if (!incomeResponse.ok || !incomeResult.success) {
        throw new Error(incomeResult.message || 'Could not load income.');
    }
    if (!expenseResponse.ok || !expenseResult.success) {
        throw new Error(expenseResult.message || 'Could not load expenses.');
    }
    if (!planResponse.ok || !planResult.success) {
        throw new Error(planResult.message || 'Could not load plans.');
    }

    const incomes = (incomeResult.income || []).map(item => ({
        id: 'income-' + item.incomeID,
        dbId: Number(item.incomeID),
        type: 'income',
        date: item.date,
        source: item.source,
        amount: Number(item.amount) || 0,
        frequency: Number(item.frequency) || 1,
        notes: item.notes || ''
    }));

    const expenses = (expenseResult.expenses || []).map(item => ({
        id: 'expense-' + item.expenseID,
        dbId: Number(item.expenseID),
        type: 'expense',
        date: item.date,
        source: item.source,
        amount: Number(item.amount) || 0,
        frequency: Number(item.frequency) || 1,
        category: item.category || 'General',
        notes: item.notes || ''
    }));

    const plans = (planResult.plans || []).map(item => ({
        id: 'plan-' + item.planID,
        dbId: Number(item.planID),
        type: 'plan',
        date: item.date,
        description: item.description,
        amount: Number(item.goalAmount) || 0,
        savedAmount: Number(item.savedAmount) || 0
    }));

    appState.transactions = [...incomes, ...expenses, ...plans];
    appState.userID = userID;
    if (typeof appState.updateTotals === 'function') appState.updateTotals();
    saveAppState();
    return appState.transactions;
}

export async function saveTransactionToDatabase(transaction, existingDbId = null) {
    const userID = getUserID();
    if (!userID) throw new Error('Please log in again.');

    let url;
    const values = { userID };

    if (transaction.type === 'income') {
        url = '/api/income';
        Object.assign(values, {
            date: transaction.date,
            source: transaction.source,
            amount: transaction.amount,
            frequency: transaction.frequency || 1,
            notes: transaction.notes || ''
        });
        if (existingDbId) values.incomeID = existingDbId;
    } else if (transaction.type === 'expense') {
        url = '/api/expenses';
        Object.assign(values, {
            date: transaction.date,
            source: transaction.source,
            amount: transaction.amount,
            frequency: transaction.frequency || 1,
            category: transaction.category || 'General',
            notes: transaction.notes || ''
        });
        if (existingDbId) values.expenseID = existingDbId;
    } else if (transaction.type === 'plan') {
        url = '/api/plans';
        Object.assign(values, {
            date: transaction.date,
            description: transaction.description,
            goalAmount: transaction.amount,
            savedAmount: transaction.savedAmount || 0
        });
        if (existingDbId) values.planID = existingDbId;
    } else {
        throw new Error('Unsupported transaction type.');
    }

    const { response, result } = await postForm(url, values, existingDbId ? 'PUT' : 'POST');
    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not save transaction.');
    }
    await loadTransactionsIntoState();
}

export async function deleteTransactionFromDatabase(transaction) {
    const userID = getUserID();
    if (!userID) throw new Error('Please log in again.');
    if (!transaction || !transaction.dbId) throw new Error('Database record ID was not found.');

    let url;
    let idName;
    if (transaction.type === 'income') {
        url = '/api/income'; idName = 'incomeID';
    } else if (transaction.type === 'expense') {
        url = '/api/expenses'; idName = 'expenseID';
    } else if (transaction.type === 'plan') {
        url = '/api/plans'; idName = 'planID';
    } else {
        throw new Error('Unsupported transaction type.');
    }

    const response = await fetch(
        `${url}?userID=${encodeURIComponent(userID)}&${idName}=${encodeURIComponent(transaction.dbId)}`,
        { method: 'DELETE' }
    );
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not delete transaction.');
    }
    await loadTransactionsIntoState();
}

export function clearDerbySession() {
    sessionStorage.removeItem('ewallet_userID');
    sessionStorage.removeItem('ewallet_username');
    localStorage.removeItem('ewallet_userID');
    localStorage.removeItem('ewallet_username');
}
