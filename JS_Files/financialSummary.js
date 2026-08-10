import { appState } from '../variables.js';

if (typeof appState.loadExpenses === 'function') {
    appState.loadExpenses();
}

const totalAmountEl = document.getElementById('totalAmount') || document.querySelector('[id*="totalAmount"]');
const incomeMonthEl = document.getElementById('incomeMonth') || document.querySelector('[id*="incomeMonth"]');
const expensesMonthEl = document.getElementById('expensesMonth');

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
    }[m]));
}

function updateDashboardMetricsDisplay() {
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
}

let pieChartInstance = null;

function renderOrUpdateFinancialChart() {
    const chartCanvas = document.getElementById('pieChart');
    if (!chartCanvas || typeof Chart === 'undefined') return;
    const ctx = chartCanvas.getContext('2d');

    const currentIncome = Math.max(0, Number(appState.income) || 0);
    const currentExpenses = Math.max(0, Number(appState.expenses) || 0);
    const currentBalance = Math.max(0, Number(appState.balance) || 0);

    if (pieChartInstance) {
        pieChartInstance.data.datasets[0].data = [currentIncome, currentExpenses, currentBalance];
        pieChartInstance.update();
    } else {
        pieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Income', 'Expenses', 'Balance'],
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
                        position: 'bottom',
                        labels: {
                            font: { size: 14 },
                            color: '#000000'
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

function initSummaryPageLifecycle() {
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
// ==================================================
// REPORT BUTTONS
// ==================================================

function getCurrentUserID() {

    const sessionUserID =
        sessionStorage.getItem('ewallet_userID');

    if (sessionUserID) {
        return Number(sessionUserID);
    }

    const localUserID =
        localStorage.getItem('ewallet_userID');

    if (localUserID) {
        return Number(localUserID);
    }

    /*
     * Temporary fallback while Derby-backed HTML
     * authentication is being completed.
     */
    return 1;
}


async function loadFinancialReport(endpoint) {

    const userID =
        getCurrentUserID();

    const reportOutput =
        document.getElementById('reportOutput');

    if (!reportOutput) {
        return;
    }

    try {

        reportOutput.textContent =
            'Loading report...';

        const response =
            await fetch(
                `${endpoint}?userID=${userID}`
            );

        const reportText =
            await response.text();

        if (!response.ok) {

            reportOutput.textContent =
                'Could not load report.\n\n'
                + reportText;

            return;
        }

        reportOutput.textContent =
            reportText;

    } catch (error) {

        console.error(
            'Report request failed:',
            error
        );

        reportOutput.textContent =
            'Could not connect to the EWallet backend.';
    }
}


function initializeReportButtons() {

    const incomeReportBtn =
        document.getElementById(
            'incomeReportBtn'
        );

    const expenseReportBtn =
        document.getElementById(
            'expenseReportBtn'
        );

    const fullReportBtn =
        document.getElementById(
            'fullReportBtn'
        );

    if (incomeReportBtn) {

        incomeReportBtn.addEventListener(
            'click',
            () => loadFinancialReport(
                '/api/report/income'
            )
        );
    }

    if (expenseReportBtn) {

        expenseReportBtn.addEventListener(
            'click',
            () => loadFinancialReport(
                '/api/report/expenses'
            )
        );
    }

    if (fullReportBtn) {

        fullReportBtn.addEventListener(
            'click',
            () => loadFinancialReport(
                '/api/report/full'
            )
        );
    }
}


if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        initializeReportButtons
    );

} else {

    initializeReportButtons();
}
// ==================================================
// CSV EXPORT BUTTONS
// ==================================================

function downloadCSV(endpoint) {

    const userID =
        getCurrentUserID();

    window.location.href =
        `${endpoint}?userID=${userID}`;
}


function initializeExportButtons() {

    const exportIncomeBtn =
        document.getElementById(
            'exportIncomeBtn'
        );

    const exportExpenseBtn =
        document.getElementById(
            'exportExpenseBtn'
        );

    const exportFullBtn =
        document.getElementById(
            'exportFullBtn'
        );

    if (exportIncomeBtn) {

        exportIncomeBtn.addEventListener(
            'click',
            () => downloadCSV(
                '/api/export/income'
            )
        );
    }

    if (exportExpenseBtn) {

        exportExpenseBtn.addEventListener(
            'click',
            () => downloadCSV(
                '/api/export/expenses'
            )
        );
    }

    if (exportFullBtn) {

        exportFullBtn.addEventListener(
            'click',
            () => downloadCSV(
                '/api/export/full'
            )
        );
    }
}


if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        initializeExportButtons
    );

} else {

    initializeExportButtons();
}
// ==================================================
// CSV IMPORT BUTTONS
// ==================================================

async function importCSV(
    fileInputID,
    endpoint
) {

    const fileInput =
        document.getElementById(
            fileInputID
        );

    const reportOutput =
        document.getElementById(
            'reportOutput'
        );

    if (
        !fileInput
        || !fileInput.files
        || fileInput.files.length === 0
    ) {

        alert(
            'Please choose a CSV file first.'
        );

        return;
    }

    const file =
        fileInput.files[0];

    const userID =
        getCurrentUserID();

    try {

        const csvText =
            await file.text();

        if (reportOutput) {

            reportOutput.textContent =
                'Importing CSV...';
        }

        const response =
            await fetch(
                `${endpoint}?userID=${userID}`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'text/csv; charset=UTF-8'
                    },

                    body: csvText
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            const message =
                result.message
                || 'CSV import failed.';

            alert(message);

            if (reportOutput) {

                reportOutput.textContent =
                    message;
            }

            return;
        }

        alert(result.message);

        if (reportOutput) {

            reportOutput.textContent =
                result.message;
        }

        fileInput.value = '';

    } catch (error) {

        console.error(
            'CSV import failed:',
            error
        );

        alert(
            'Could not import CSV.'
        );

        if (reportOutput) {

            reportOutput.textContent =
                'Could not import CSV.';
        }
    }
}


function initializeImportButtons() {

    const importIncomeBtn =
        document.getElementById(
            'importIncomeBtn'
        );

    const importExpenseBtn =
        document.getElementById(
            'importExpenseBtn'
        );

    if (importIncomeBtn) {

        importIncomeBtn.addEventListener(
            'click',
            () => importCSV(
                'incomeCsvInput',
                '/api/import/income'
            )
        );
    }

    if (importExpenseBtn) {

        importExpenseBtn.addEventListener(
            'click',
            () => importCSV(
                'expenseCsvInput',
                '/api/import/expenses'
            )
        );
    }
}


if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        initializeImportButtons
    );

} else {

    initializeImportButtons();
}