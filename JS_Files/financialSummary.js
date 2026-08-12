import { appState, loadAppState, saveAppState } from './variables.js';
import { loadTransactionsIntoState } from './derbyBridge.js';

if (typeof appState.loadExpenses === 'function') {
    appState.loadExpenses();
}

const yearlyIncomeEl = document.getElementById('yearlyIncome');
const yearlyExpensesEl = document.getElementById('yearlyExpenses');
const yearlyLeftoverEl = document.getElementById('totalAmount');

const monthlyIncomeEl = document.getElementById('monthlyIncome');
const monthlyExpensesEl = document.getElementById('monthlyExpenses');
const monthlyLeftoverEl = document.getElementById('monthlyLeftover');

const incomeThisMonthEl = document.getElementById('incomeMonth');
const expensesThisMonthEl = document.getElementById('expensesMonth');

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
    }[m]));
}

/*function updateDashboardMetricsDisplay() {
    if (!appState.isLoggedIn) {
        window.location.href = 'index.html';
        return;
    }


    const totalTarget = document.getElementById('totalAmount');
    if (totalTarget) totalTarget.textContent = '$' + (Number(appState.balance) || 0).toFixed(2);
    const incomeTarget = document.getElementById('incomeMonth');
    if (incomeTarget) incomeTarget.textContent = '$' + (Number(appState.income) || 0).toFixed(2);
    const expensesTarget = document.getElementById('expensesMonth');
    if (expensesTarget) expensesTarget.textContent = '$' + (Number(appState.expenses) || 0).toFixed(2);

    const usernameContainer = document.querySelector('.username-text') || document.querySelector('h2');
    if (usernameContainer && appState.accountCreated && appState.username) {
        const cleanName = escapeHTML(appState.username);
        if (usernameContainer.innerHTML.includes('(Username)')) {
            usernameContainer.innerHTML = usernameContainer.innerHTML.replace('(Username)', cleanName);
        } else {
            usernameContainer.textContent = cleanName;
        }
    }

    if (totalAmountEl) totalAmountEl.textContent = '$' + (Number(appState.balance) || 0).toFixed(2);
    if (incomeMonthEl) incomeMonthEl.textContent = '$' + (Number(appState.income) || 0).toFixed(2);
    if (expensesMonthEl) expensesMonthEl.textContent = '$' + (Number(appState.expenses) || 0).toFixed(2);
}*/

// decided to just add my own function here without messing with theirs in a way that made sense to me

function updateDashboardMetricsDisplay() {
    if (!appState.isLoggedIn) {
        window.location.href = 'index.html';
        return;
    }

    if (yearlyIncomeEl) {
        yearlyIncomeEl.textContent =
            '$' + appState.getYearlyIncome().toFixed(2);
    }

    if (yearlyExpensesEl) {
        yearlyExpensesEl.textContent =
            '$' + appState.getYearlyExpenses().toFixed(2);
    }

    if (yearlyLeftoverEl) {
        yearlyLeftoverEl.textContent =
            '$' + appState.getYearlyLeftover().toFixed(2);
    }

    if (monthlyIncomeEl) {
        monthlyIncomeEl.textContent =
            '$' + appState.getMonthlyIncome().toFixed(2);
    }

    if (monthlyExpensesEl) {
        monthlyExpensesEl.textContent =
            '$' + appState.getMonthlyExpenses().toFixed(2);
    }

    if (monthlyLeftoverEl) {
        monthlyLeftoverEl.textContent =
            '$' + appState.getMonthlyLeftover().toFixed(2);
    }

    if (incomeThisMonthEl) {
        incomeThisMonthEl.textContent =
            '$' + appState.getIncomeThisMonth().toFixed(2);
    }

    if (expensesThisMonthEl) {
        expensesThisMonthEl.textContent =
            '$' + appState.getExpensesThisMonth().toFixed(2);
    }

    const usernameContainer =
        document.querySelector('.username-text') ||
        document.querySelector('h2');

    if (
        usernameContainer &&
        appState.accountCreated &&
        appState.username
    ) {
        const cleanName = escapeHTML(appState.username);

        if (usernameContainer.innerHTML.includes('(Username)')) {
            usernameContainer.innerHTML =
                usernameContainer.innerHTML.replace('(Username)', cleanName);
        } else {
            usernameContainer.textContent = cleanName;
        }
    }
}


let pieChartInstance = null;

function renderOrUpdateFinancialChart() {
    const chartCanvas = document.getElementById('pieChart');
    if (!chartCanvas || typeof Chart === 'undefined') return;
    const ctx = chartCanvas.getContext('2d');

    //const currentIncome = Math.max(0, Number(appState.income) || 0);
    //const currentExpenses = Math.max(0, Number(appState.expenses) || 0);
    //const currentBalance = Math.max(0, Number(appState.balance) || 0);

    // replacing with updated summary calculations

    const currentIncome = Math.max(
        0,
        Number(appState.getYearlyIncome()) || 0
    );

    const currentExpenses = Math.max(
        0,
        Number(appState.getYearlyExpenses()) || 0
    );

    const currentBalance = Math.max(
        0,
        Number(appState.getYearlyLeftover()) || 0
    );

    if (pieChartInstance) {
        pieChartInstance.data.datasets[0].data = [currentIncome, currentExpenses, currentBalance];
        pieChartInstance.update();
    } else {
        pieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Yearly Income', 'Yearly Expenses', 'Estimated Yearly Savings'],
                datasets: [{
                    data: [currentIncome, currentExpenses, currentBalance],
                    backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels:
                        {
                            font: { size: 16 },
                            weight: 'bold',
                            color: '#000000',
                            padding: 20
                        }
                    },
                    tooltip: {
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                return ` ${context.label}: $${val.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }
}

async function initSummaryPageLifecycle() {
    try {
        await loadTransactionsIntoState();
    } catch (error) {
        console.error('Summary database load error:', error);
    }

    updateDashboardMetricsDisplay();
    renderOrUpdateFinancialChart();
}

window.addEventListener('storage', (event) => {
    if (event.key === 'appState') {
        if (typeof appState.loadExpenses === 'function') appState.loadExpenses();
        initSummaryPageLifecycle();
    }
});

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSummaryPageLifecycle);
    } else {
        initSummaryPageLifecycle();
    }
}
