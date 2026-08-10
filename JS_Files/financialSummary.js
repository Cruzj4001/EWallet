import {
    appState,
    loadAppState
} from './variables.js';


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
 * LOAD FINANCIAL DATA FROM DERBY
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
 * Actual income entries dated
 * during the current calendar month.
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


/*
 * Actual expense entries dated
 * during the current calendar month.
 */

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
 * UPDATE SUMMARY DISPLAY
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
 * MASCOT MESSAGE
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


    if (
        yearlyIncome === 0 &&
        yearlyExpenses === 0
    ) {

        mascotMessage.textContent =
            '"Add some income and expenses so I can analyze your finances!"';


    } else if (
        yearlySavings > 0
    ) {

        mascotMessage.textContent =
            '"Nice! You are currently projected to save ' +
            formatMoney(
                yearlySavings
            ) +
            ' this year."';


    } else if (
        yearlySavings === 0
    ) {

        mascotMessage.textContent =
            '"Your yearly income and expenses are currently balanced."';


    } else {

        mascotMessage.textContent =
            '"Your projected yearly expenses are higher than your income. You may want to review your spending."';
    }
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
     * Destroy any Chart.js chart
     * already connected to this canvas.
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


    /*
     * Expenses + Savings represent
     * how yearly income is divided.
     *
     * We do not include yearly income
     * itself as another slice because
     * that would double-count the total.
     */

    let labels;
    let values;
    let colors;


    if (
        yearlyIncome === 0 &&
        yearlyExpenses === 0
    ) {

        labels = [
            'No Financial Data'
        ];

        values = [
            1
        ];

        colors = [
            '#B0B0B0'
        ];


    } else if (
        yearlyExpenses >
        yearlyIncome
    ) {

        labels = [
            'Yearly Expenses',
            'Income Covered'
        ];


        values = [
            yearlyExpenses -
                yearlyIncome,

            yearlyIncome
        ];


        colors = [
            '#F44336',
            '#4CAF50'
        ];


    } else {

        labels = [
            'Yearly Expenses',
            'Yearly Savings'
        ];


        values = [
            yearlyExpenses,
            yearlySavings
        ];


        colors = [
            '#F44336',
            '#2196F3'
        ];
    }


    pieChartInstance =
        new Chart(
            ctx,
            {

                type:
                    'pie',


                data: {

                    labels:
                        labels,


                    datasets: [

                        {

                            data:
                                values,


                            backgroundColor:
                                colors,


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
                                        14
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

                                        /*
                                         * Do not display $1.00
                                         * for the placeholder
                                         * no-data slice.
                                         */

                                        if (
                                            yearlyIncome === 0 &&
                                            yearlyExpenses === 0
                                        ) {

                                            return (
                                                ' No financial data yet'
                                            );
                                        }


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
 * REPORT BUTTONS
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

        } catch {

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
            'CSV import completed.';


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
         * Reload Derby data so
         * imported records immediately
         * appear in the summary.
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


/*
 * ==================================================
 * IMPORT BUTTONS
 * ==================================================
 */

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
 * INITIALIZE PAGE
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