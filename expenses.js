import {
    appState,
    loadAppState
} from './variables.js';


let expenseRecords = [];

let editingExpenseID = null;


/*
 * ==================================================
 * HELPERS
 * ==================================================
 */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return '';
    }

    return String(value).replace(
        /[&<>"']/g,
        character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
        }[character])
    );
}


function getCurrentUserID() {

    const sessionID =
        sessionStorage.getItem(
            'ewallet_userID'
        );

    if (sessionID) {

        return Number(
            sessionID
        );
    }


    const localID =
        localStorage.getItem(
            'ewallet_userID'
        );

    if (localID) {

        return Number(
            localID
        );
    }


    return null;
}


function getFrequencyLabel(
    frequency
) {

    const labels = {

        1:
            'One Time or Yearly',

        12:
            'Monthly',

        24:
            'Twice Monthly',

        26:
            'Biweekly',

        52:
            'Weekly'
    };


    return (
        labels[
            Number(frequency)
        ] ||
        'One Time or Yearly'
    );
}


/*
 * ==================================================
 * USERNAME
 * ==================================================
 */

function displayUsername() {

    const usernameElement =
        document.querySelector(
            '.username-text'
        );


    if (!usernameElement) {
        return;
    }


    if (
        appState.username &&
        appState.username !==
            '(Username)'
    ) {

        usernameElement.textContent =
            appState.username;
    }
}


/*
 * ==================================================
 * LOAD EXPENSES FROM DERBY
 * ==================================================
 */

async function loadExpensesFromDatabase() {

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

        const response =
            await fetch(
                '/api/expenses?userID=' +
                encodeURIComponent(
                    userID
                )
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Could not load expenses.'
            );
        }


        expenseRecords =
            Array.isArray(
                result.expenses
            )
                ? result.expenses
                : [];


        renderExpenseEntries();

        updateExpenseSummary();


    } catch (error) {

        console.error(
            'Expense load error:',
            error
        );


        alert(
            'Could not load expenses from the EWallet database.'
        );
    }
}


/*
 * ==================================================
 * SUMMARY TOTALS
 * ==================================================
 */

function updateExpenseSummary() {

    const monthDisplay =
        document.getElementById(
            'monthAmountDisplay'
        );


    const totalDisplay =
        document.getElementById(
            'totalAmountDisplay'
        );


    /*
     * Convert each recurring expense
     * into a monthly estimate.
     *
     * amount × yearly frequency ÷ 12
     */
    const monthlyExpenses =
        expenseRecords.reduce(
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


                return (
                    total +
                    (
                        amount *
                        frequency /
                        12
                    )
                );
            },
            0
        );


    if (monthDisplay) {

        monthDisplay.textContent =
            '$' +
            monthlyExpenses.toFixed(2);
    }


    /*
     * This keeps the existing GUI field.
     *
     * We will later connect summary
     * balances completely to Derby.
     */
    if (totalDisplay) {

        const baseIncome =
            Number(
                localStorage.getItem(
                    'ewallet_baseIncome'
                )
            ) || 0;


        totalDisplay.textContent =
            '$' +
            baseIncome.toFixed(2);
    }
}


/*
 * ==================================================
 * RENDER TABLE
 * ==================================================
 */

function renderExpenseEntries() {

    const tableBody =
        document.getElementById(
            'expenseEntriesTableBody'
        );


    if (!tableBody) {

        console.error(
            'Expense table body was not found.'
        );

        return;
    }


    if (
        expenseRecords.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    No expense entries found.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        expenseRecords.map(
            expense => {

                const expenseID =
                    Number(
                        expense.expenseID
                    );


                const amount =
                    Number(
                        expense.amount
                    ) || 0;


                return `
                    <tr data-id="${expenseID}">

                        <td>
                            ${escapeHTML(
                                expense.date
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                expense.source
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                expense.category
                            )}
                        </td>

                        <td>
                            $${amount.toFixed(2)}
                        </td>

                        <td>
                            ${escapeHTML(
                                getFrequencyLabel(
                                    expense.frequency
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                expense.notes
                            )}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="editBtn"
                                data-id="${expenseID}">

                                Edit

                            </button>

                            <button
                                type="button"
                                class="deleteBtn"
                                data-id="${expenseID}">

                                Delete

                            </button>

                        </td>

                    </tr>
                `;
            }
        ).join('');
}


/*
 * ==================================================
 * ADD / UPDATE
 * ==================================================
 */

async function submitExpense(
    event
) {

    event.preventDefault();


    const userID =
        getCurrentUserID();


    if (!userID) {

        alert(
            'Please log in first.'
        );

        return;
    }


    const dateInput =
        document.getElementById(
            'expensesDate'
        );


    const sourceInput =
        document.getElementById(
            'expensesSource'
        );


    const amountInput =
        document.getElementById(
            'expensesAmount'
        );


    const frequencyInput =
        document.getElementById(
            'expensesFrequency'
        );


    const categoryInput =
        document.getElementById(
            'expensesCategory'
        );


    const notesInput =
        document.getElementById(
            'expensesNotes'
        );


    if (
        !dateInput ||
        !sourceInput ||
        !amountInput ||
        !frequencyInput ||
        !categoryInput ||
        !notesInput
    ) {

        console.error(
            'One or more Expense fields are missing.'
        );

        alert(
            'The Expense form could not be loaded correctly.'
        );

        return;
    }


    const date =
        dateInput.value;


    const source =
        sourceInput.value.trim();


    const amount =
        parseFloat(
            amountInput.value
        );


    const frequency =
        Number(
            frequencyInput.value
        ) || 1;


    const category =
        categoryInput.value;


    const notes =
        notesInput.value.trim();


    if (!date) {

        alert(
            'Please enter a date.'
        );

        return;
    }


    if (!source) {

        alert(
            'Please enter an expense source.'
        );

        return;
    }


    if (
        Number.isNaN(amount) ||
        amount < 0
    ) {

        alert(
            'Please enter a valid amount.'
        );

        return;
    }


    const formData =
        new URLSearchParams();


    formData.append(
        'userID',
        String(userID)
    );


    formData.append(
        'date',
        date
    );


    formData.append(
        'source',
        source
    );


    formData.append(
        'amount',
        String(amount)
    );


    formData.append(
        'frequency',
        String(frequency)
    );


    formData.append(
        'category',
        category
    );


    formData.append(
        'notes',
        notes
    );


    let method =
        'POST';


    if (
        editingExpenseID !== null
    ) {

        method =
            'PUT';


        formData.append(
            'expenseID',
            String(
                editingExpenseID
            )
        );
    }


    try {

        const response =
            await fetch(
                '/api/expenses',
                {
                    method:
                        method,

                    headers: {

                        'Content-Type':
                            'application/x-www-form-urlencoded'
                    },

                    body:
                        formData.toString()
                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Expense could not be saved.'
            );
        }


        editingExpenseID =
            null;


        const submitButton =
            document.getElementById(
                'submitBtn'
            );


        if (submitButton) {

            submitButton.textContent =
                'Add Expense';
        }


        const form =
            document.getElementById(
                'expenseForm'
            );


        if (form) {

            form.reset();
        }


        frequencyInput.value =
            '1';


        await loadExpensesFromDatabase();


    } catch (error) {

        console.error(
            'Expense save error:',
            error
        );


        alert(
            'Could not save expense: ' +
            error.message
        );
    }
}


/*
 * ==================================================
 * EDIT
 * ==================================================
 */

function beginEditExpense(
    expenseID
) {

    const expense =
        expenseRecords.find(
            record =>
                Number(
                    record.expenseID
                ) ===
                Number(
                    expenseID
                )
        );


    if (!expense) {

        alert(
            'Expense could not be found.'
        );

        return;
    }


    document.getElementById(
        'expensesDate'
    ).value =
        expense.date || '';


    document.getElementById(
        'expensesSource'
    ).value =
        expense.source || '';


    document.getElementById(
        'expensesAmount'
    ).value =
        expense.amount || '';


    document.getElementById(
        'expensesFrequency'
    ).value =
        String(
            expense.frequency || 1
        );


    document.getElementById(
        'expensesCategory'
    ).value =
        expense.category ||
        'General';


    document.getElementById(
        'expensesNotes'
    ).value =
        expense.notes || '';


    editingExpenseID =
        Number(
            expense.expenseID
        );


    const submitButton =
        document.getElementById(
            'submitBtn'
        );


    if (submitButton) {

        submitButton.textContent =
            'Update Expense';
    }


    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


/*
 * ==================================================
 * DELETE
 * ==================================================
 */

async function deleteExpense(
    expenseID
) {

    const userID =
        getCurrentUserID();


    if (!userID) {

        return;
    }


    const confirmed =
        window.confirm(
            'Are you sure you want to delete this expense?'
        );


    if (!confirmed) {

        return;
    }


    try {

        const url =
            '/api/expenses' +
            '?userID=' +
            encodeURIComponent(
                userID
            ) +
            '&expenseID=' +
            encodeURIComponent(
                expenseID
            );


        const response =
            await fetch(
                url,
                {
                    method:
                        'DELETE'
                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Expense could not be deleted.'
            );
        }


        editingExpenseID =
            null;


        const submitButton =
            document.getElementById(
                'submitBtn'
            );


        if (submitButton) {

            submitButton.textContent =
                'Add Expense';
        }


        await loadExpensesFromDatabase();


    } catch (error) {

        console.error(
            'Expense delete error:',
            error
        );


        alert(
            'Could not delete expense: ' +
            error.message
        );
    }
}


/*
 * ==================================================
 * BUTTON CLICKS
 * ==================================================
 */

function handleExpenseTableClick(
    event
) {

    const button =
        event.target.closest(
            'button'
        );


    if (!button) {
        return;
    }


    const expenseID =
        Number(
            button.dataset.id
        );


    if (!expenseID) {
        return;
    }


    if (
        button.classList.contains(
            'editBtn'
        )
    ) {

        beginEditExpense(
            expenseID
        );

        return;
    }


    if (
        button.classList.contains(
            'deleteBtn'
        )
    ) {

        deleteExpense(
            expenseID
        );
    }
}


/*
 * ==================================================
 * PAGE INITIALIZATION
 * ==================================================
 */

async function initExpensePage() {

    if (
        typeof loadAppState ===
        'function'
    ) {

        loadAppState();
    }


    displayUsername();


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


    const form =
        document.getElementById(
            'expenseForm'
        );


    if (!form) {

        console.error(
            'expenseForm was not found.'
        );

        return;
    }


    form.addEventListener(
        'submit',
        submitExpense
    );


    const tableBody =
        document.getElementById(
            'expenseEntriesTableBody'
        );


    if (tableBody) {

        tableBody.addEventListener(
            'click',
            handleExpenseTableClick
        );
    }


    await loadExpensesFromDatabase();
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
        initExpensePage
    );

} else {

    initExpensePage();
}