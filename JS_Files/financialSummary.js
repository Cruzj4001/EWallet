import {
    appState,
    loadAppState
} from '../variables.js';


/*
 * ==================================================
 * SUMMARY PAGE DATA
 * ==================================================
 */

let incomeRecords = [];
let expenseRecords = [];

let pieChartInstance = null;


/*
 * ==================================================
 * HELPERS
 * ==================================================
 */

function getCurrentUserID() {

    const sessionUserID =
        sessionStorage.getItem(
            'ewallet_userID'
        );


    if (sessionUserID) {

        return Number(
            sessionUserID
        );
    }


    const localUserID =
        localStorage.getItem(
            'ewallet_userID'
        );


    if (localUserID) {

        return Number(
            localUserID
        );
    }


    return null;
}


function getUsername() {

    if (
        appState.username &&
        appState.username !== '(Username)'
    ) {

        return appState.username;
    }


    return '(Username)';
}


function formatMoney(value) {

    return '$' +
        (
            Number(value) || 0
        ).toFixed(2);
}


/*
 * ==================================================
 * LOAD DERBY DATA
 * ==================================================
 */

async function loadFinancialData() {

    const userID =
        getCurrentUserID();


    if (!userID) {

        alert(
            'Please log in again.'
        );


        window.location.href =
            '../index.html';


        return;
    }


    try {

        /*
         * Load income and expenses
         * from Derby at the same time.
         */

        const [
            incomeResponse,
            expenseResponse
        ] = await Promise.all([

            fetch(
                '/api/income?userID=' +
                encodeURIComponent(
                    userID
                )
            ),

            fetch(
                '/api/expenses?userID=' +
                encodeURIComponent(
                    userID
                )
            )

        ]);


        const incomeResult =
            await incomeResponse.json();


        const expenseResult =
            await expenseResponse.json();


        if (
            !incomeResponse.ok ||
            !incomeResult.success
        ) {

            throw new Error(
                incomeResult.message ||
                'Could not load income.'
            );
        }


        if (
            !expenseResponse.ok ||
            !expenseResult.success
        ) {

            throw new Error(
                expenseResult.message ||
                'Could not load expenses.'
            );
        }


        incomeRecords =
            Array.isArray(
                incomeResult.income
            )
                ? incomeResult.income
                : [];


        expenseRecords =
            Array.isArray(
                expenseResult.expenses
            )
                ? expenseResult.expenses
                : [];


        updateDashboardMetricsDisplay();

        renderOrUpdateFinancialChart();

        updateMascotMessage();


    } catch (error) {

        console.error(
            'Financial summary load error:',
            error
        );


        alert(
            'Could not load financial summary from the database.'
        );
    }
}


/*
 * ==================================================
 * FINANCIAL CALCULATIONS
 * ==================================================
 */

function getYearlyIncome() {

    return incomeRecords.reduce(
        (
            total,
            income
        ) => {

            const amount =
                Number(
                    income.amount
                ) || 0;


            const frequency =
                Number(
                    income.frequency
                ) || 1;


            return total +
                (
                    amount *
                    frequency
                );
        },
        0
    );
}


function getYearlyExpenses() {

    return expenseRecords.reduce(
        (
            total,
            expense
        ) => {

            const amount =
                Number(
                    expense.amount
                ) || 0;


            const frequency =
                Number(
                    expense.frequency
                ) || 1;


            return total +
                (
                    amount *
                    frequency
                );
        },
        0
    );
}


function getMonthlyIncome() {

    return (
        getYearlyIncome() /
        12
    );
}


function getMonthlyExpenses() {

    return (
        getYearlyExpenses() /
        12
    );
}


function getYearlyLeftover() {

    return (
        getYearlyIncome() -
        getYearlyExpenses()
    );
}


function getMonthlyLeftover() {

    return (
        getMonthlyIncome() -
        getMonthlyExpenses()
    );
}


/*
 * ==================================================
 * CURRENT MONTH CALCULATIONS
 * ==================================================
 */

function getIncomeThisMonth() {

    const now =
        new Date();


    const currentMonth =
        `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, '0')}`;


    return incomeRecords
        .filter(
            income =>
                String(
                    income.date || ''
                ).startsWith(
                    currentMonth
                )
        )
        .reduce(
            (
                total,
                income
            ) => {

                return total +
                    (
                        Number(
                            income.amount
                        ) || 0
                    );
            },
            0
        );
}


function getExpensesThisMonth() {

    const now =
        new Date();


    const currentMonth =
        `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, '0')}`;


    return expenseRecords
        .filter(
            expense =>
                String(
                    expense.date || ''
                ).startsWith(
                    currentMonth
                )
        )
        .reduce(
            (
                total,
                expense
            ) => {

                return total +
                    (
                        Number(
                            expense.amount
                        ) || 0
                    );
            },
            0
        );
}


/*
 * ==================================================
 * UPDATE SUMMARY TEXT
 * ==================================================
 */

function updateDashboardMetricsDisplay() {

    const usernameContainer =
        document.querySelector(
            '.username-text'
        );


    if (usernameContainer) {

        usernameContainer.textContent =
            getUsername();
    }


    const yearlyIncomeEl =
        document.getElementById(
            'yearlyIncome'
        );


    const yearlyExpensesEl =
        document.getElementById(
            'yearlyExpenses'
        );


    const yearlyLeftoverEl =
        document.getElementById(
            'totalAmount'
        );


    const monthlyIncomeEl =
        document.getElementById(
            'monthlyIncome'
        );


    const monthlyExpensesEl =
        document.getElementById(
            'monthlyExpenses'
        );


    const monthlyLeftoverEl =
        document.getElementById(
            'monthlyLeftover'
        );


    const incomeThisMonthEl =
        document.getElementById(
            'incomeMonth'
        );


    const expensesThisMonthEl =
        document.getElementById(
            'expensesMonth'
        );


    if (yearlyIncomeEl) {

        yearlyIncomeEl.textContent =
            formatMoney(
                getYearlyIncome()
            );
    }


    if (yearlyExpensesEl) {

        yearlyExpensesEl.textContent =
            formatMoney(
                getYearlyExpenses()
            );
    }


    if (yearlyLeftoverEl) {

        yearlyLeftoverEl.textContent =
            formatMoney(
                getYearlyLeftover()
            );
    }


    if (monthlyIncomeEl) {

        monthlyIncomeEl.textContent =
            formatMoney(
                getMonthlyIncome()
            );
    }


    if (monthlyExpensesEl) {

        monthlyExpensesEl.textContent =
            formatMoney(
                getMonthlyExpenses()
            );
    }


    if (monthlyLeftoverEl) {

        monthlyLeftoverEl.textContent =
            formatMoney(
                getMonthlyLeftover()
            );
    }


    if (incomeThisMonthEl) {

        incomeThisMonthEl.textContent =
            formatMoney(
                getIncomeThisMonth()
            );
    }


    if (expensesThisMonthEl) {

        expensesThisMonthEl.textContent =
            formatMoney(
                getExpensesThisMonth()
            );
    }
}


/*
 * ==================================================
 * MR. MONEYBARKS MESSAGE
 * ==================================================
 */

function updateMascotMessage() {

    const mascotMessage =
        document.getElementById(
            'mascotMessage'
        );


    if (!mascotMessage) {

        return;
    }


    const yearlyIncome =
        getYearlyIncome();


    const yearlyExpenses =
        getYearlyExpenses();


    const yearlySavings =
        getYearlyLeftover();


    /*
     * No financial information yet.
     */

    if (
        yearlyIncome === 0 &&
        yearlyExpenses === 0
    ) {

        mascotMessage.textContent =
            '"Add some income and expenses so I can analyze your finances!"';

        return;
    }


    /*
     * Positive savings.
     */

    if (yearlySavings > 0) {

        mascotMessage.textContent =
            '"Looking good! You are projected to save ' +
            formatMoney(
                yearlySavings
            ) +
            ' this year!"';

        return;
    }


    /*
     * Income and expenses match.
     */

    if (yearlySavings === 0) {

        mascotMessage.textContent =
            '"Your income and expenses are currently balanced!"';

        return;
    }


    /*
     * Expenses exceed income.
     */

    mascotMessage.textContent =
        '"Your yearly expenses are higher than your income. You may want to review your spending!"';
}


/*
 * ==================================================
 * PIE CHART
 * ==================================================
 */

function renderOrUpdateFinancialChart() {

    const chartCanvas =
        document.getElementById(
            'pieChart'
        );


    if (!chartCanvas) {

        console.error(
            'pieChart canvas was not found.'
        );

        return;
    }


    if (
        typeof Chart ===
        'undefined'
    ) {

        console.error(
            'Chart.js was not loaded.'
        );

        return;
    }


    /*
     * Values come directly from
     * Derby income and expense data.
     */

    const yearlyIncome =
        Math.max(
            0,
            Number(
                getYearlyIncome()
            ) || 0
        );


    const yearlyExpenses =
        Math.max(
            0,
            Number(
                getYearlyExpenses()
            ) || 0
        );


    /*
     * Savings cannot be a negative
     * pie-chart slice.
     */

    const yearlySavings =
        Math.max(
            0,
            yearlyIncome -
            yearlyExpenses
        );


    console.log(
        'PIE CHART VALUES:',
        {
            income:
                yearlyIncome,

            expenses:
                yearlyExpenses,

            savings:
                yearlySavings
        }
    );


    /*
     * Destroy the previous chart
     * before creating another one.
     */

    const oldChart =
        Chart.getChart(
            chartCanvas
        );


    if (oldChart) {

        oldChart.destroy();
    }


    if (pieChartInstance) {

        pieChartInstance =
            null;
    }


    const ctx =
        chartCanvas.getContext(
            '2d'
        );


    pieChartInstance =
        new Chart(
            ctx,
            {

                type:
                    'pie',


                data: {

                    labels: [

                        'Yearly Income',

                        'Yearly Expenses',

                        'Estimated Yearly Savings'
                    ],


                    datasets: [

                        {

                            data: [

                                yearlyIncome,

                                yearlyExpenses,

                                yearlySavings
                            ],


                            backgroundColor: [

                                '#4CAF50',

                                '#F44336',

                                '#2196F3'
                            ],


                            borderColor:
                                '#ffffff',


                            borderWidth:
                                2
                        }
                    ]
                },


                options: {

                    responsive:
                        true,


                    maintainAspectRatio:
                        true,


                    plugins: {

                        legend: {

                            position:
                                'right',


                            labels: {

                                font: {

                                    size:
                                        16
                                },


                                color:
                                    '#000000',


                                padding:
                                    20
                            }
                        },


                        tooltip: {

                            titleFont: {

                                size:
                                    14
                            },


                            bodyFont: {

                                size:
                                    13
                            },


                            callbacks: {

                                label:
                                    function(
                                        context
                                    ) {

                                        const value =
                                            Number(
                                                context.raw
                                            ) || 0;


                                        return (
                                            ' ' +
                                            context.label +
                                            ': $' +
                                            value.toFixed(
                                                2
                                            )
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


/*
 * ==================================================
 * FINANCIAL REPORTS
 * ==================================================
 */

async function loadFinancialReport(
    endpoint
) {

    const userID =
        getCurrentUserID();


    if (!userID) {

        alert(
            'Please log in again.'
        );

        return;
    }


    const reportOutput =
        document.getElementById(
            'reportOutput'
        );


    if (!reportOutput) {

        return;
    }


    try {

        reportOutput.textContent =
            'Loading report...';


        const response =
            await fetch(
                `${endpoint}?userID=${encodeURIComponent(
                    userID
                )}`
            );


        const reportText =
            await response.text();


        if (!response.ok) {

            reportOutput.textContent =
                'Could not load report.\n\n' +
                reportText;


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
            () =>
                loadFinancialReport(
                    '/api/report/income'
                )
        );
    }


    if (expenseReportBtn) {

        expenseReportBtn.addEventListener(
            'click',
            () =>
                loadFinancialReport(
                    '/api/report/expenses'
                )
        );
    }


    if (fullReportBtn) {

        fullReportBtn.addEventListener(
            'click',
            () =>
                loadFinancialReport(
                    '/api/report/full'
                )
        );
    }
}


/*
 * ==================================================
 * CSV EXPORT
 * ==================================================
 */

function downloadCSV(
    endpoint
) {

    const userID =
        getCurrentUserID();


    if (!userID) {

        alert(
            'Please log in again.'
        );

        return;
    }


    window.location.href =
        `${endpoint}?userID=${encodeURIComponent(
            userID
        )}`;
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
            () =>
                downloadCSV(
                    '/api/export/income'
                )
        );
    }


    if (exportExpenseBtn) {

        exportExpenseBtn.addEventListener(
            'click',
            () =>
                downloadCSV(
                    '/api/export/expenses'
                )
        );
    }


    if (exportFullBtn) {

        exportFullBtn.addEventListener(
            'click',
            () =>
                downloadCSV(
                    '/api/export/full'
                )
        );
    }
}


/*
 * ==================================================
 * CSV IMPORT
 * ==================================================
 */

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
        !fileInput ||
        !fileInput.files ||
        fileInput.files.length === 0
    ) {

        alert(
            'Please choose a CSV file first.'
        );

        return;
    }


    const userID =
        getCurrentUserID();


    if (!userID) {

        alert(
            'Please log in again.'
        );

        return;
    }


    const file =
        fileInput.files[0];


    try {

        const csvText =
            await file.text();


        if (reportOutput) {

            reportOutput.textContent =
                'Importing CSV...';
        }


        const response =
            await fetch(
                `${endpoint}?userID=${encodeURIComponent(
                    userID
                )}`,
                {

                    method:
                        'POST',


                    headers: {

                        'Content-Type':
                            'text/csv; charset=UTF-8'
                    },


                    body:
                        csvText
                }
            );


        let result;


        try {

            result =
                await response.json();

        } catch (error) {

            result = {

                success:
                    false,

                message:
                    'The server returned an invalid response.'
            };
        }


        if (!response.ok) {

            const message =
                result.message ||
                'CSV import failed.';


            alert(
                message
            );


            if (reportOutput) {

                reportOutput.textContent =
                    message;
            }


            return;
        }


        const message =
            result.message ||
            'CSV import completed successfully.';


        alert(
            message
        );


        if (reportOutput) {

            reportOutput.textContent =
                message;
        }


        fileInput.value =
            '';


        /*
         * Reload Derby data after
         * importing new records.
         */

        await loadFinancialData();


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
            () =>
                importCSV(
                    'incomeCsvInput',
                    '/api/import/income'
                )
        );
    }


    if (importExpenseBtn) {

        importExpenseBtn.addEventListener(
            'click',
            () =>
                importCSV(
                    'expenseCsvInput',
                    '/api/import/expenses'
                )
        );
    }
}


/*
 * ==================================================
 * INITIALIZE SUMMARY PAGE
 * ==================================================
 */

async function initSummaryPage() {

    if (
        typeof loadAppState ===
        'function'
    ) {

        loadAppState();
    }


    const userID =
        getCurrentUserID();


    if (!userID) {

        alert(
            'Please log in again.'
        );


        window.location.href =
            '../index.html';


        return;
    }


    initializeReportButtons();

    initializeExportButtons();

    initializeImportButtons();


    await loadFinancialData();
}


/*
 * ==================================================
 * START
 * ==================================================
 */

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initSummaryPage
    );


} else {

    initSummaryPage();
}