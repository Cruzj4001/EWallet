import {
    appState,
    loadAppState
} from '../variables.js';


/*
 * ==================================================
 * INCOME PAGE STATE
 * ==================================================
 */

let incomeRecords = [];

let editingIncomeID = null;


/*
 * ==================================================
 * HELPER FUNCTIONS
 * ==================================================
 */

function escapeHTML(value) {

    if (value === null ||
        value === undefined) {

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


/*
 * Get the UserID that was saved
 * when the user logged in.
 */
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


    /*
     * Fallback in case app.js stored
     * the user information in appState.
     */
    if (appState.userID) {

        return Number(
            appState.userID
        );
    }


    return null;
}


/*
 * Get username for the header.
 */
function getCurrentUsername() {

    const sessionUsername =
        sessionStorage.getItem(
            'ewallet_username'
        );

    if (sessionUsername) {

        return sessionUsername;
    }


    const localUsername =
        localStorage.getItem(
            'ewallet_username'
        );

    if (localUsername) {

        return localUsername;
    }


    if (
        appState.username &&
        appState.username !== '(Username)'
    ) {

        return appState.username;
    }


    return '(Username)';
}


/*
 * Convert the frequency number stored
 * in Derby into readable text.
 */
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
 * USERNAME DISPLAY
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


    usernameElement.textContent =
        getCurrentUsername();
}


/*
 * ==================================================
 * LOAD INCOME FROM DERBY
 * ==================================================
 */

async function loadIncomeFromDatabase() {

    const userID =
        getCurrentUserID();


    if (!userID) {

        console.error(
            'No logged-in UserID was found.'
        );

        alert(
            'Your login session could not be found. Please log in again.'
        );

        window.location.href =
            '../index.html';

        return;
    }


    try {

        const response =
            await fetch(
                '/api/income?userID=' +
                encodeURIComponent(
                    userID
                )
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                'Could not load income.'
            );
        }


        if (!result.success) {

            throw new Error(
                result.message ||
                'Could not load income.'
            );
        }


        if (
            Array.isArray(
                result.income
            )
        ) {

            incomeRecords =
                result.income;

        } else {

            incomeRecords = [];
        }


        renderIncomeEntries();

        updateIncomeDisplay();


    } catch (error) {

        console.error(
            'Income load error:',
            error
        );

        alert(
            'Could not load income from the EWallet database.'
        );
    }
}


/*
 * ==================================================
 * YEARLY INCOME TOTAL
 * ==================================================
 */

function updateIncomeDisplay() {

    const display =
        document.getElementById(
            'incomeDisplay'
        );


    if (!display) {

        return;
    }


    const yearlyIncome =
        incomeRecords.reduce(
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


                return (
                    total +
                    (
                        amount *
                        frequency
                    )
                );
            },
            0
        );


    display.textContent =
        '$' +
        yearlyIncome.toFixed(2);
}


/*
 * ==================================================
 * DISPLAY INCOME TABLE
 * ==================================================
 */

function renderIncomeEntries() {

    const tableBody =
        document.getElementById(
            'incomeEntries'
        );


    if (!tableBody) {

        console.error(
            'incomeEntries table body was not found.'
        );

        return;
    }


    if (incomeRecords.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    No income entries found.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        incomeRecords.map(
            income => {

                const incomeID =
                    Number(
                        income.incomeID
                    );


                const amount =
                    Number(
                        income.amount
                    ) || 0;


                return `
                    <tr data-id="${incomeID}">

                        <td>
                            ${escapeHTML(
                                income.date
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                income.source
                            )}
                        </td>

                        <td>
                            $${amount.toFixed(2)}
                        </td>

                        <td>
                            ${escapeHTML(
                                getFrequencyLabel(
                                    income.frequency
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                income.notes
                            )}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="editBtn"
                                data-id="${incomeID}">

                                Edit

                            </button>


                            <button
                                type="button"
                                class="deleteBtn"
                                data-id="${incomeID}">

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
 * ADD OR UPDATE INCOME
 * ==================================================
 */

async function submitIncome(
    event
) {

    /*
     * VERY IMPORTANT:
     *
     * This prevents the browser from
     * performing a normal HTML form
     * submission.
     *
     * Without this, the server receives
     * a GET request and displays
     * "GET required".
     */
    event.preventDefault();


    const userID =
        getCurrentUserID();


    if (!userID) {

        alert(
            'Please log in before adding income.'
        );

        window.location.href =
            '../index.html';

        return;
    }


    /*
     * Find every form element.
     */
    const dateInput =
        document.getElementById(
            'incomeDate'
        );

    const sourceInput =
        document.getElementById(
            'incomeSource'
        );

    const amountInput =
        document.getElementById(
            'incomeAmount'
        );

    const frequencyInput =
        document.getElementById(
            'incomeFrequency'
        );

    const notesInput =
        document.getElementById(
            'incomeNotes'
        );


    /*
     * Make sure the HTML and JS
     * actually match.
     */
    if (
        !dateInput ||
        !sourceInput ||
        !amountInput ||
        !frequencyInput ||
        !notesInput
    ) {

        console.error(
            'One or more Income form fields were not found.',
            {
                dateInput,
                sourceInput,
                amountInput,
                frequencyInput,
                notesInput
            }
        );

        alert(
            'The Income form could not be loaded correctly.'
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
            'Please enter an income source.'
        );

        return;
    }


    if (
        Number.isNaN(amount) ||
        amount < 0
    ) {

        alert(
            'Please enter a valid income amount.'
        );

        return;
    }


    /*
     * Build the information sent
     * to EWalletServer.java.
     */
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
        'notes',
        notes
    );


    /*
     * No editing ID means INSERT.
     *
     * An editing ID means UPDATE.
     */
    let requestMethod =
        'POST';


    if (
        editingIncomeID !== null
    ) {

        requestMethod =
            'PUT';


        formData.append(
            'incomeID',
            String(
                editingIncomeID
            )
        );
    }


    try {

        const response =
            await fetch(
                '/api/income',
                {
                    method:
                        requestMethod,

                    headers: {

                        'Content-Type':
                            'application/x-www-form-urlencoded'
                    },

                    body:
                        formData.toString()
                }
            );


        let result;


        try {

            result =
                await response.json();

        } catch (jsonError) {

            const text =
                await response.text();

            throw new Error(
                text ||
                'The server returned an invalid response.'
            );
        }


        if (!response.ok) {

            throw new Error(
                result.message ||
                'Income could not be saved.'
            );
        }


        if (!result.success) {

            throw new Error(
                result.message ||
                'Income could not be saved.'
            );
        }


        /*
         * Reset editing state.
         */
        editingIncomeID =
            null;


        const addButton =
            document.getElementById(
                'addBtn'
            );


        if (addButton) {

            addButton.textContent =
                'Add Income';
        }


        /*
         * Clear the form.
         */
        const incomeForm =
            document.getElementById(
                'incomeForm'
            );


        if (incomeForm) {

            incomeForm.reset();
        }


        /*
         * Put frequency back at
         * its default.
         */
        frequencyInput.value =
            '1';


        /*
         * Reload from Derby.
         *
         * This proves the displayed
         * information came from the DB.
         */
        await loadIncomeFromDatabase();


    } catch (error) {

        console.error(
            'Income save error:',
            error
        );


        alert(
            'Could not save income: ' +
            error.message
        );
    }
}


/*
 * ==================================================
 * EDIT INCOME
 * ==================================================
 */

function beginEditIncome(
    incomeID
) {

    const income =
        incomeRecords.find(
            record =>
                Number(
                    record.incomeID
                ) ===
                Number(
                    incomeID
                )
        );


    if (!income) {

        alert(
            'That income entry could not be found.'
        );

        return;
    }


    const dateInput =
        document.getElementById(
            'incomeDate'
        );

    const sourceInput =
        document.getElementById(
            'incomeSource'
        );

    const amountInput =
        document.getElementById(
            'incomeAmount'
        );

    const frequencyInput =
        document.getElementById(
            'incomeFrequency'
        );

    const notesInput =
        document.getElementById(
            'incomeNotes'
        );


    if (
        !dateInput ||
        !sourceInput ||
        !amountInput ||
        !frequencyInput ||
        !notesInput
    ) {

        alert(
            'The Income form could not be loaded correctly.'
        );

        return;
    }


    dateInput.value =
        income.date || '';


    sourceInput.value =
        income.source || '';


    amountInput.value =
        income.amount || '';


    frequencyInput.value =
        String(
            income.frequency || 1
        );


    notesInput.value =
        income.notes || '';


    editingIncomeID =
        Number(
            income.incomeID
        );


    const addButton =
        document.getElementById(
            'addBtn'
        );


    if (addButton) {

        addButton.textContent =
            'Update Income';
    }


    /*
     * Move back toward the form
     * so the user can edit it.
     */
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


/*
 * ==================================================
 * DELETE INCOME
 * ==================================================
 */

async function deleteIncome(
    incomeID
) {

    const userID =
        getCurrentUserID();


    if (!userID) {

        alert(
            'Please log in first.'
        );

        return;
    }


    const confirmed =
        window.confirm(
            'Are you sure you want to delete this income entry?'
        );


    if (!confirmed) {

        return;
    }


    try {

        const url =
            '/api/income' +
            '?userID=' +
            encodeURIComponent(
                userID
            ) +
            '&incomeID=' +
            encodeURIComponent(
                incomeID
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


        if (!response.ok) {

            throw new Error(
                result.message ||
                'Income could not be deleted.'
            );
        }


        if (!result.success) {

            throw new Error(
                result.message ||
                'Income could not be deleted.'
            );
        }


        if (
            Number(
                editingIncomeID
            ) ===
            Number(
                incomeID
            )
        ) {

            editingIncomeID =
                null;


            const addButton =
                document.getElementById(
                    'addBtn'
                );


            if (addButton) {

                addButton.textContent =
                    'Add Income';
            }
        }


        await loadIncomeFromDatabase();


    } catch (error) {

        console.error(
            'Income delete error:',
            error
        );


        alert(
            'Could not delete income: ' +
            error.message
        );
    }
}


/*
 * ==================================================
 * TABLE BUTTON HANDLER
 * ==================================================
 */

function handleTableClick(
    event
) {

    const button =
        event.target.closest(
            'button'
        );


    if (!button) {

        return;
    }


    const incomeID =
        Number(
            button.dataset.id
        );


    if (!incomeID) {

        return;
    }


    if (
        button.classList.contains(
            'editBtn'
        )
    ) {

        beginEditIncome(
            incomeID
        );

        return;
    }


    if (
        button.classList.contains(
            'deleteBtn'
        )
    ) {

        deleteIncome(
            incomeID
        );
    }
}


/*
 * ==================================================
 * INITIALIZE PAGE
 * ==================================================
 */

async function initIncomePage() {

    /*
     * Load the existing login/app state.
     */
    if (
        typeof loadAppState ===
        'function'
    ) {

        loadAppState();
    }


    /*
     * Display the logged-in username.
     */
    displayUsername();


    /*
     * Make sure we have a UserID.
     */
    const userID =
        getCurrentUserID();


    if (!userID) {

        console.error(
            'Income page opened without a UserID.'
        );

        alert(
            'Please log in again before opening the Income page.'
        );


        window.location.href =
            '../index.html';

        return;
    }


    /*
     * Attach JavaScript to the form.
     *
     * This is what prevents the
     * "GET required" problem.
     */
    const form =
        document.getElementById(
            'incomeForm'
        );


    if (!form) {

        console.error(
            'incomeForm was not found.'
        );

        return;
    }


    form.addEventListener(
        'submit',
        submitIncome
    );


    /*
     * Attach Edit/Delete controls.
     */
    const tableBody =
        document.getElementById(
            'incomeEntries'
        );


    if (tableBody) {

        tableBody.addEventListener(
            'click',
            handleTableClick
        );
    }


    /*
     * Finally load this user's
     * income directly from Derby.
     */
    await loadIncomeFromDatabase();
}


/*
 * ==================================================
 * START PAGE
 * ==================================================
 */

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initIncomePage
    );

} else {

    initIncomePage();
}