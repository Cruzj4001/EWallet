import { appState, saveAppState, loadAppState } from '../variables.js';

let authMode = 'login';
function escapeHTML(str) {
    if (!str) return '';

    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
    }[m]));
}


async function hashPassword(password) {

    const msgBuffer =
        new TextEncoder().encode(password);

    const hashBuffer =
        await crypto.subtle.digest(
            'SHA-256',
            msgBuffer
        );

    const hashArray =
        Array.from(
            new Uint8Array(hashBuffer)
        );

    return hashArray
        .map(
            b =>
                b.toString(16)
                    .padStart(2, '0')
        )
        .join('');
}


/*
 * ============================================================
 * AUTHENTICATION
 * ============================================================
 *
 * Login/Create Account now communicates with the Java server.
 *
 * Browser
 *      ↓
 * /api/auth
 *      ↓
 * UserDAO
 *      ↓
 * Derby Users table
 */
async function handleAuthFormSubmit(ev) {

    if (
        ev &&
        typeof ev.preventDefault === 'function'
    ) {
        ev.preventDefault();
    }


    const usernameEl =
        document.getElementById(
            'walletUsername'
        );

    const passwordEl =
        document.getElementById(
            'walletPassword'
        );

    const balanceEl =
        document.getElementById(
            'walletBaseBalance'
        );

    const incomeEl =
        document.getElementById(
            'walletBaseIncome'
        );


    if (!usernameEl || !passwordEl) {
        return;
    }


    const username =
        usernameEl.value.trim();

    const rawPassword =
        passwordEl.value;


    if (!username || !rawPassword) {

        alert(
            'Please fill out both username and password.'
        );

        return;
    }


    const passwordHash =
        await hashPassword(
            rawPassword
        );


    const baseBalance =
        balanceEl
            ? (
                parseFloat(
                    balanceEl.value
                ) || 500.00
            )
            : 500.00;


    const baseIncome =
        incomeEl
            ? (
                parseFloat(
                    incomeEl.value
                ) || 50.00
            )
            : 50.00;


    try {

        const formData =
            new URLSearchParams();
		
				formData.append(
			    'mode',
			    authMode
			);

        formData.append(
            'username',
            username
        );


        formData.append(
            'passwordHash',
            passwordHash
        );


        formData.append(
            'baseBalance',
            String(baseBalance)
        );


        formData.append(
            'baseIncome',
            String(baseIncome)
        );


        const response =
            await fetch(
                '/api/auth',
                {
                    method: 'POST',

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

            alert(
                result.message ||
                'Login failed.'
            );

            return;
        }


        const user =
            result.user;


        /*
         * User information returned by Derby.
         */
        appState.accountCreated = true;
        appState.isLoggedIn = true;
        appState.username =
            user.username;

        appState.passwordHash =
            passwordHash;


        /*
         * Store the Derby UserID.
         *
         * Later the Income, Expense,
         * Report and CSV APIs will use
         * this ID.
         */
        sessionStorage.setItem(
            'ewallet_userID',
            String(user.userID)
        );


        localStorage.setItem(
            'ewallet_userID',
            String(user.userID)
        );


        localStorage.setItem(
            'ewallet_baseBalance',
            String(user.baseBalance)
        );


        localStorage.setItem(
            'ewallet_baseIncome',
            String(user.baseIncome)
        );


        /*
         * Do NOT restore transactions
         * from ewallet_accounts_db.
         *
         * Income and expenses will
         * eventually come directly
         * from Derby.
         */
        appState.transactions = [];


        /*
         * Save basic session state.
         */
        appState.syncExpenses();


        const accountModal =
            document.getElementById(
                'accountCreationModal'
            );


        if (accountModal) {

            accountModal.style.display =
                'none';
        }


		        if (result.created) {

		            alert(
		                'Account created successfully!'
		            );

		        } else {

		            alert(
		                'Login successful!'
		            );
		        }


		        /*
		         * accountModal was already declared
		         * earlier in this function.
		         */
		        if (accountModal) {

		            accountModal.style.display =
		                'none';
		        }


		        const usernameDisplay =
		            document.querySelector(
		                '.username-text'
		            );

		        if (usernameDisplay) {

		            usernameDisplay.textContent =
		                user.username;
		        }


		        const loginLogoutButton =
		            document.getElementById(
		                'authBtn'
		            );

		        if (loginLogoutButton) {

		            loginLogoutButton.textContent =
		                'Logout';
		        }


		        /*
		         * Do not reload the page.
		         * The interface is updated immediately.
		         */


		    } catch (error) {

		        console.error(
		            'Authentication error:',
		            error
		        );

		        alert(
		            'Could not connect to the EWallet database.'
		        );
		    }
		}


/*
 * ============================================================
 * PAGE STARTUP
 * ============================================================
 */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        if (
            typeof loadAppState ===
            'function'
        ) {

            loadAppState();

        } else {

            appState.loadExpenses();
        }


        const hasExpenseView =
            !!document.getElementById(
                'expenseForm'
            );

        const hasPlanningView =
            !!document.getElementById(
                'planningForm'
            );

        const hasIncomeView =
            !!document.getElementById(
                'incomeForm'
            );


        const accountModal =
            document.getElementById(
                'accountCreationModal'
            );

        const profileForm =
            document.getElementById(
                'accountCreationForm'
            );

        const usernameContainer =
            document.querySelector(
                '.username-text'
            ) ||
            document.querySelector(
                'h2'
            );

        const authBtn =
            document.getElementById(
                'authBtn'
            );

			const showLoginBtn =
			    document.getElementById(
			        'showLoginBtn'
			    );

			const showCreateBtn =
			    document.getElementById(
			        'showCreateBtn'
			    );

			
			function showLoginMode() {

			    authMode = 'login';

			    const modalTitle =
			        document.getElementById(
			            'modalTitle'
			        );

			    const balanceGroup =
			        document
			            .getElementById(
			                'walletBaseBalance'
			            )
			            ?.closest(
			                '.form-group'
			            );

			    const incomeGroup =
			        document
			            .getElementById(
			                'walletBaseIncome'
			            )
			            ?.closest(
			                '.form-group'
			            );

			    const submitBtn =
			        document.getElementById(
			            'createAccountBtn'
			        );

			    if (modalTitle) {
			        modalTitle.textContent =
			            'Log In to Your Wallet';
			    }

			    if (balanceGroup) {
			        balanceGroup.style.display =
			            'none';
			    }

			    if (incomeGroup) {
			        incomeGroup.style.display =
			            'none';
			    }

			    if (submitBtn) {
			        submitBtn.textContent =
			            'Log In';
			    }
			}


			function showCreateMode() {

			    authMode = 'create';

			    const modalTitle =
			        document.getElementById(
			            'modalTitle'
			        );

			    const balanceGroup =
			        document
			            .getElementById(
			                'walletBaseBalance'
			            )
			            ?.closest(
			                '.form-group'
			            );

			    const incomeGroup =
			        document
			            .getElementById(
			                'walletBaseIncome'
			            )
			            ?.closest(
			                '.form-group'
			            );

			    const submitBtn =
			        document.getElementById(
			            'createAccountBtn'
			        );

			    if (modalTitle) {
			        modalTitle.textContent =
			            'Create E-Wallet Account';
			    }

			    if (balanceGroup) {
			        balanceGroup.style.display =
			            '';
			    }

			    if (incomeGroup) {
			        incomeGroup.style.display =
			            '';
			    }

			    if (submitBtn) {
			        submitBtn.textContent =
			            'Create Account';
			    }
			}


			if (showLoginBtn) {
			    showLoginBtn.addEventListener(
			        'click',
			        showLoginMode
			    );
			}

			if (showCreateBtn) {
			    showCreateBtn.addEventListener(
			        'click',
			        showCreateMode
			    );
			}

			showLoginMode();

        /*
         * ====================================================
         * LOGIN / LOGOUT BUTTON
         * ====================================================
         */

        if (authBtn) {

            authBtn.innerText =
                appState.isLoggedIn
                    ? 'Logout'
                    : 'Login';


            authBtn.addEventListener(
                'click',
                () => {

                    if (
                        appState.isLoggedIn
                    ) {

                        appState.isLoggedIn =
                            false;


                        /*
                         * Remove current Derby
                         * user session.
                         */
                        sessionStorage
                            .removeItem(
                                'ewallet_userID'
                            );

                        localStorage
                            .removeItem(
                                'ewallet_userID'
                            );


                        if (
                            usernameContainer
                        ) {

                            usernameContainer
                                .textContent =
                                '(Guest)';
                        }


                        const userField =
                            document
                                .getElementById(
                                    'walletUsername'
                                );

                        const passField =
                            document
                                .getElementById(
                                    'walletPassword'
                                );


                        if (userField) {

                            userField.value =
                                '';
                        }


                        if (passField) {

                            passField.value =
                                '';
                        }


                        appState.syncExpenses();


                        if (accountModal) {

                            accountModal
                                .style
                                .display =
                                'flex';
                        }

                    } else if (
                        accountModal
                    ) {

                        accountModal
                            .style
                            .display =
                            'flex';
                    }
                }
            );
        }


        /*
         * Display username.
         */
        if (
            appState.accountCreated &&
            usernameContainer
        ) {

            usernameContainer.innerHTML =
                usernameContainer
                    .innerHTML
                    .replace(
                        '(Username)',
                        escapeHTML(
                            appState.username
                        )
                    );
        }


        /*
         * ====================================================
         * ACCOUNT MODAL
         * ====================================================
         */

        if (
            !appState.isLoggedIn &&
            accountModal &&
            profileForm
        ) {

            accountModal.style.display =
                'flex';


            const modalTitle =
                document.getElementById(
                    'modalTitle'
                );


            const baseBalanceInput =
                document.getElementById(
                    'walletBaseBalance'
                );


				if (
				    appState.accountCreated &&
				    modalTitle
				) {

				    modalTitle.innerText =
				        'Log In to Your Wallet';

				    /*
				     * Existing users only need username
				     * and password to log in.
				     *
				     * Hide the starting balance and
				     * starting income fields individually
				     * instead of hiding the entire form.
				     */

				    const balanceGroup =
				        document
				            .getElementById(
				                'walletBaseBalance'
				            )
				            ?.closest(
				                '.form-group'
				            );

				    const incomeGroup =
				        document
				            .getElementById(
				                'walletBaseIncome'
				            )
				            ?.closest(
				                '.form-group'
				            );

				    if (balanceGroup) {
				        balanceGroup.style.display =
				            'none';
				    }

				    if (incomeGroup) {
				        incomeGroup.style.display =
				            'none';
				    }

				    const submitBtn =
				        document.getElementById(
				            'createAccountBtn'
				        );

				    if (submitBtn) {
				        submitBtn.textContent =
				            'Log In';
				    }
				}

            profileForm
                .addEventListener(
                    'submit',
                    handleAuthFormSubmit
                );


            const submitBtn =
                document.getElementById(
                    'createAccountBtn'
                ) ||
                profileForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitBtn) {

                submitBtn.onclick =
                    handleAuthFormSubmit;
            }

        } else if (
            !appState.isLoggedIn
        ) {

            const isIndexPage =
                window.location.pathname
                    .endsWith(
                        'index.html'
                    ) ||
                window.location.pathname ===
                    '/' ||
                !window.location.pathname
                    .includes(
                        '.html'
                    );


            if (!isIndexPage) {

                window.location.href =
                    'index.html';

                return;
            }
        }


        /*
         * Initialize whichever feature
         * exists on this page.
         */

        if (hasExpenseView) {

            initExpensesFeature();

        } else if (
            hasPlanningView
        ) {

            initPlanningFeature();

        } else if (
            hasIncomeView
        ) {

            initIncomeFeature();
        }
    }
);


/*
 * ============================================================
 * EXPENSE FEATURE
 * ============================================================
 */

function initExpensesFeature() {

    const form =
        document.getElementById(
            'expenseForm'
        );

    const tableBody =
        document.getElementById(
            'expenseEntriesTableBody'
        );


    if (!form || !tableBody) {
        return;
    }


    appState.loadExpenses();

    renderExpenseUI();


    form.addEventListener(
        'submit',
        (ev) => {

            ev.preventDefault();


            const date =
                document.getElementById(
                    'expensesDate'
                ).value;


            const source =
                document.getElementById(
                    'expensesSource'
                ).value;


            const amount =
                parseFloat(
                    document.getElementById(
                        'expensesAmount'
                    ).value
                ) || 0;


            const frequency =
                Number(
                    document.getElementById(
                        'expensesFrequency'
                    )?.value
                ) || 1;


            const category =
                document.getElementById(
                    'expensesCategory'
                ).value;


            const notes =
                document.getElementById(
                    'expensesNotes'
                ).value;


            const editId =
                form.dataset.editId;


            const safeUUID = () => {

                if (
                    typeof crypto !==
                        'undefined' &&
                    crypto.randomUUID
                ) {

                    return crypto
                        .randomUUID();
                }


                return (
                    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
                ).replace(
                    /[xy]/g,
                    c => {

                        const r =
                            Math.random() *
                                16 |
                            0;

                        return (
                            c === 'x'
                                ? r
                                : (
                                    r &
                                    0x3 |
                                    0x8
                                )
                        ).toString(16);
                    }
                );
            };


            if (editId) {

                const idx =
                    appState.transactions
                        .findIndex(
                            t =>
                                t.id ===
                                    editId &&
                                t.type ===
                                    'expense'
                        );


                if (idx !== -1) {

                    appState.transactions[
                        idx
                    ] = {

                        id: editId,
                        type: 'expense',
                        date,
                        source,
                        amount,
                        frequency,
                        category,
                        notes
                    };
                }


                delete form.dataset.editId;


                const submitBtn =
                    document
                        .getElementById(
                            'submitBtn'
                        );


                if (submitBtn) {

                    submitBtn.innerText =
                        'Add Expense';
                }

            } else {

                const id =
                    safeUUID();


                appState.transactions.push(
                    {
                        id,
                        type: 'expense',
                        date,
                        source,
                        amount,
                        frequency,
                        category,
                        notes
                    }
                );
            }


            appState.syncExpenses();

            renderExpenseUI();

            form.reset();
        }
    );


    tableBody.addEventListener(
        'click',
        (ev) => {

            const actionBtn =
                ev.target.closest(
                    'button[data-action]'
                );


            if (!actionBtn) {
                return;
            }


            const action =
                actionBtn.dataset.action;

            const id =
                actionBtn.dataset.id;


            if (
                action === 'delete'
            ) {

                appState.transactions =
                    appState.transactions
                        .filter(
                            t =>
                                t.id !== id
                        );


                appState.syncExpenses();

                renderExpenseUI();


            } else if (
                action === 'edit'
            ) {

                const target =
                    appState.transactions
                        .find(
                            t =>
                                t.id === id
                        );


                if (!target) {
                    return;
                }


                document
                    .getElementById(
                        'expensesDate'
                    ).value =
                    target.date;


                document
                    .getElementById(
                        'expensesSource'
                    ).value =
                    target.source;


                document
                    .getElementById(
                        'expensesAmount'
                    ).value =
                    target.amount;


                const frequencyInput =
                    document
                        .getElementById(
                            'expensesFrequency'
                        );


                if (frequencyInput) {

                    frequencyInput.value =
                        target.frequency ||
                        1;
                }


                document
                    .getElementById(
                        'expensesCategory'
                    ).value =
                    target.category;


                document
                    .getElementById(
                        'expensesNotes'
                    ).value =
                    target.notes;


                form.dataset.editId =
                    id;


                document
                    .getElementById(
                        'submitBtn'
                    )
                    .innerText =
                    'Update Expense';
            }
        }
    );


    function renderExpenseUI() {

        const expenses =
            appState.transactions
                .filter(
                    t =>
                        t.type ===
                        'expense'
                );


        tableBody.innerHTML =
            expenses.map(
                e => {

                    const frequency =
                        Number(
                            e.frequency
                        ) || 1;


                    return `
                        <tr data-id="${e.id}">
                            <td>${escapeHTML(e.date)}</td>
                            <td>${escapeHTML(e.source)}</td>
                            <td>
                                <span style="font-weight:bold; font-size:0.85em;">
                                    [${escapeHTML(e.category)}]
                                </span>
                            </td>
                            <td>$${Number(e.amount).toFixed(2)}</td>
                            <td>${frequency}</td>
                            <td>${escapeHTML(e.notes)}</td>
                            <td>
                                <button
                                    data-action="edit"
                                    data-id="${e.id}">
                                    Edit
                                </button>

                                <button
                                    data-action="delete"
                                    data-id="${e.id}">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `;
                }
            ).join('');


        const totalAmountEl =
            document.getElementById(
                'totalAmountDisplay'
            );


        const monthAmountEl =
            document.getElementById(
                'monthAmountDisplay'
            );


        if (totalAmountEl) {

            totalAmountEl.innerText =
                `$${appState.balance.toFixed(2)}`;
        }


        if (monthAmountEl) {

            const monthlyExpenses =
                typeof appState
                    .getMonthlyExpenses ===
                    'function'
                    ? appState
                        .getMonthlyExpenses()
                    : appState.expenses;


            monthAmountEl.innerText =
                `$${monthlyExpenses.toFixed(2)}`;
        }
    }
}


/*
 * ============================================================
 * PLANNING FEATURE
 * ============================================================
 */

function initPlanningFeature() {

    const form =
        document.getElementById(
            'planningForm'
        );


    const tableBody =
        document.getElementById(
            'planningEntriesTableBody'
        );


    if (!form || !tableBody) {
        return;
    }


    appState.loadExpenses();


    const goalAmountInput =
        document.getElementById(
            'goalAmount'
        );


    if (goalAmountInput) {

        const savedGoal =
            localStorage.getItem(
                'eWallet_planningGoal'
            );


        if (savedGoal !== null) {

            goalAmountInput.value =
                savedGoal;
        }


        goalAmountInput
            .addEventListener(
                'input',
                () => {

                    localStorage.setItem(
                        'eWallet_planningGoal',
                        goalAmountInput.value
                    );


                    renderPlanningUI();
                }
            );
    }


    renderPlanningUI();


    form.addEventListener(
        'submit',
        (ev) => {

            ev.preventDefault();


            const date =
                document.getElementById(
                    'planningDate'
                ).value;


            const description =
                document.getElementById(
                    'planningDescription'
                ).value;


            const amount =
                parseFloat(
                    document.getElementById(
                        'planningAmount'
                    ).value
                ) || 0;


            const savedAmount =
                parseFloat(
                    document.getElementById(
                        'planningSavedAmount'
                    )?.value || 0
                );


            const editId =
                form.dataset.editId;


            const safeUUID = () => {

                if (
                    typeof crypto !==
                        'undefined' &&
                    crypto.randomUUID
                ) {

                    return crypto
                        .randomUUID();
                }


                return (
                    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
                ).replace(
                    /[xy]/g,
                    c => {

                        const r =
                            Math.random() *
                                16 |
                            0;


                        return (
                            c === 'x'
                                ? r
                                : (
                                    r &
                                    0x3 |
                                    0x8
                                )
                        ).toString(16);
                    }
                );
            };


            if (editId) {

                const idx =
                    appState.transactions
                        .findIndex(
                            t =>
                                t.id ===
                                    editId &&
                                t.type ===
                                    'plan'
                        );


                if (idx !== -1) {

                    appState.transactions[
                        idx
                    ] = {

                        id: editId,
                        type: 'plan',
                        date,
                        description,
                        amount,
                        savedAmount
                    };
                }


                delete form.dataset.editId;


                const submitBtn =
                    document.getElementById(
                        'submitPlanBtn'
                    );


                if (submitBtn) {

                    submitBtn.innerText =
                        'Create Plan';
                }


            } else {

                appState.transactions.push(
                    {
                        id: safeUUID(),
                        type: 'plan',
                        date,
                        description,
                        amount,
                        savedAmount
                    }
                );
            }


            appState.syncExpenses();


            if (
                typeof saveAppState ===
                'function'
            ) {

                saveAppState();
            }


            renderPlanningUI();

            form.reset();
        }
    );


    tableBody.addEventListener(
        'click',
        (ev) => {

            const actionBtn =
                ev.target.closest(
                    'button'
                );


            if (!actionBtn) {
                return;
            }


            const row =
                actionBtn.closest(
                    'tr'
                );


            const id =
                row
                    ? row.dataset.id
                    : null;


            if (!id) {
                return;
            }


            const action =
                actionBtn.dataset.action ||
                (
                    actionBtn.classList
                        .contains(
                            'editBtn'
                        )
                        ? 'edit'
                        : actionBtn.classList
                            .contains(
                                'deleteBtn'
                            )
                            ? 'delete'
                            : null
                );


            if (
                action === 'delete'
            ) {

                appState.transactions =
                    appState.transactions
                        .filter(
                            t =>
                                t.id !== id
                        );


                appState.syncExpenses();


                if (
                    typeof saveAppState ===
                    'function'
                ) {

                    saveAppState();
                }


                renderPlanningUI();


            } else if (
                action === 'edit'
            ) {

                const target =
                    appState.transactions
                        .find(
                            t =>
                                t.id === id
                        );


                if (!target) {
                    return;
                }


                document
                    .getElementById(
                        'planningDate'
                    ).value =
                    target.date || '';


                document
                    .getElementById(
                        'planningDescription'
                    ).value =
                    target.description ||
                    '';


                document
                    .getElementById(
                        'planningAmount'
                    ).value =
                    target.amount || 0;


                const savedAmountInput =
                    document
                        .getElementById(
                            'planningSavedAmount'
                        );


                if (savedAmountInput) {

                    savedAmountInput.value =
                        target.savedAmount ||
                        0;
                }


                form.dataset.editId =
                    id;


                const submitBtn =
                    document.getElementById(
                        'submitPlanBtn'
                    );


                if (submitBtn) {

                    submitBtn.innerText =
                        'Update Plan';
                }
            }
        }
    );


    function renderPlanningUI() {

        const plans =
            appState.transactions
                .filter(
                    t =>
                        t.type ===
                        'plan'
                );


        const now =
            new Date();


        const currentMonthStr =
            `${now.getFullYear()}-${String(
                now.getMonth() + 1
            ).padStart(2, '0')}`;


        const totalPlanned =
            plans.reduce(
                (sum, p) =>
                    sum +
                    (
                        Number(p.amount) ||
                        0
                    ),
                0
            );


        const monthPlanned =
            plans
                .filter(
                    p =>
                        String(
                            p.date
                        ).startsWith(
                            currentMonthStr
                        )
                )
                .reduce(
                    (sum, p) =>
                        sum +
                        (
                            Number(
                                p.amount
                            ) || 0
                        ),
                    0
                );


        const totalSaved =
            plans.reduce(
                (sum, p) =>
                    sum +
                    (
                        parseFloat(
                            p.savedAmount
                        ) || 0
                    ),
                0
            );


        const customGoalEl =
            document.getElementById(
                'goalAmount'
            );


        const activeGoalTarget =
            customGoalEl
                ? (
                    parseFloat(
                        customGoalEl.value
                    ) || 0
                )
                : 0;


        const remainingValue =
            Math.max(
                0,
                activeGoalTarget -
                totalSaved
            );


        tableBody.innerHTML =
            plans.map(
                p => {

                    const safeId =
                        escapeHTML(
                            p.id
                        );


                    return `
                        <tr data-id="${safeId}">
                            <td>${escapeHTML(p.date)}</td>
                            <td>${escapeHTML(p.description)}</td>
                            <td>$${(parseFloat(p.savedAmount) || 0).toFixed(2)}</td>
                            <td>$${(Number(p.amount) || 0).toFixed(2)}</td>
                            <td>
                                <button
                                    class="editBtn"
                                    data-action="edit"
                                    data-id="${safeId}">
                                    Edit
                                </button>

                                <button
                                    class="deleteBtn"
                                    data-action="delete"
                                    data-id="${safeId}">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `;
                }
            ).join('');


        const updates = {

            totalPlanningAmountDisplay:
                totalPlanned,

            monthPlanningAmountDisplay:
                monthPlanned,

            totalSavedAmountDisplay:
                totalSaved,

            remainingTillGoalDisplay:
                remainingValue
        };


        Object.entries(
            updates
        ).forEach(
            ([id, val]) => {

                const el =
                    document.getElementById(
                        id
                    );


                if (el) {

                    el.innerText =
                        `$${val.toFixed(2)}`;
                }
            }
        );
    }
}


/*
 * ============================================================
 * INCOME FEATURE
 * ============================================================
 */

function initIncomeFeature() {

    const form =
        document.getElementById(
            'incomeForm'
        );


    const tableBody =
        document.getElementById(
            'incomeEntries'
        );


    const submitBtn =
        document.getElementById(
            'addBtn'
        );


    if (!form || !tableBody) {
        return;
    }


    appState.loadExpenses();

    renderIncomeUI();


    form.addEventListener(
        'submit',
        (ev) => {

            ev.preventDefault();


            const date =
                document.getElementById(
                    'incomeDate'
                ).value;


            const source =
                document.getElementById(
                    'incomeSource'
                ).value;


            const amount =
                parseFloat(
                    document.getElementById(
                        'incomeAmount'
                    ).value
                ) || 0;


            /*
             * Keep the frequency field
             * that was added during Sprint 1.
             */
            const frequency =
                Number(
                    document.getElementById(
                        'incomeFrequency'
                    )?.value
                ) || 1;


            const notes =
                document.getElementById(
                    'incomeNotes'
                ).value;


            const editId =
                form.dataset.editId;


            if (editId) {

                const idx =
                    appState.transactions
                        .findIndex(
                            t =>
                                t.id ===
                                    editId &&
                                t.type ===
                                    'income'
                        );


                if (idx !== -1) {

                    appState.transactions[
                        idx
                    ] = {

                        id: editId,
                        type: 'income',
                        date,
                        source,
                        amount,
                        frequency,
                        notes
                    };
                }


                delete form.dataset.editId;


                if (submitBtn) {

                    submitBtn.textContent =
                        'Add Income';
                }


            } else {

                const id =
                    typeof crypto !==
                        'undefined' &&
                    crypto.randomUUID
                        ? crypto.randomUUID()
                        : String(
                            Date.now()
                        );


                appState.transactions.push(
                    {
                        id,
                        type: 'income',
                        date,
                        source,
                        amount,
                        frequency,
                        notes
                    }
                );
            }


            appState.syncExpenses();


            if (
                typeof saveAppState ===
                'function'
            ) {

                saveAppState();
            }


            renderIncomeUI();

            form.reset();
        }
    );


    tableBody.addEventListener(
        'click',
        (ev) => {

            const actionBtn =
                ev.target.closest(
                    'button'
                );


            if (!actionBtn) {
                return;
            }


            const row =
                actionBtn.closest(
                    'tr'
                );


            const id =
                row
                    ? row.dataset.id
                    : null;


            if (!id) {
                return;
            }


            if (
                actionBtn.classList
                    .contains(
                        'editBtn'
                    ) ||
                actionBtn.textContent
                    .trim() ===
                    'Edit'
            ) {

                const target =
                    appState.transactions
                        .find(
                            t =>
                                t.id === id
                        );


                if (!target) {
                    return;
                }


                document
                    .getElementById(
                        'incomeDate'
                    ).value =
                    target.date;


                document
                    .getElementById(
                        'incomeSource'
                    ).value =
                    target.source;


                document
                    .getElementById(
                        'incomeAmount'
                    ).value =
                    target.amount;


                const frequencyInput =
                    document
                        .getElementById(
                            'incomeFrequency'
                        );


                if (frequencyInput) {

                    frequencyInput.value =
                        target.frequency ||
                        1;
                }


                document
                    .getElementById(
                        'incomeNotes'
                    ).value =
                    target.notes;


                form.dataset.editId =
                    id;


                if (submitBtn) {

                    submitBtn.textContent =
                        'Update Income';
                }


            } else if (
                actionBtn.classList
                    .contains(
                        'deleteBtn'
                    ) ||
                actionBtn.textContent
                    .trim() ===
                    'Delete'
            ) {

                appState.transactions =
                    appState.transactions
                        .filter(
                            t =>
                                t.id !== id
                        );


                appState.syncExpenses();


                if (
                    typeof saveAppState ===
                    'function'
                ) {

                    saveAppState();
                }


                renderIncomeUI();
            }
        }
    );


    function renderIncomeUI() {

        const incomes =
            appState.transactions
                .filter(
                    t =>
                        t.type ===
                        'income'
                );


        tableBody.innerHTML =
            incomes.map(
                i => {

                    const frequency =
                        Number(
                            i.frequency
                        ) || 1;


                    return `
                        <tr data-id="${i.id}">
                            <td>${escapeHTML(i.date)}</td>
                            <td>${escapeHTML(i.source)}</td>
                            <td>$${Number(i.amount).toFixed(2)}</td>
                            <td>${frequency}</td>
                            <td>${escapeHTML(i.notes)}</td>
                            <td>
                                <button class="editBtn">
                                    Edit
                                </button>

                                <button class="deleteBtn">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `;
                }
            ).join('');


        const displayEl =
            document.getElementById(
                'incomeDisplay'
            );


        if (displayEl) {

            const yearlyIncome =
                typeof appState
                    .getYearlyIncome ===
                    'function'
                    ? appState
                        .getYearlyIncome()
                    : appState.income;


            displayEl.textContent =
                '$' +
                yearlyIncome.toFixed(2);
        }
    }
}


/*
 * ============================================================
 * STORAGE EVENT
 * ============================================================
 */

window.addEventListener(
    'storage',
    (event) => {

        if (
            event.key ===
            'appState'
        ) {

            if (
                typeof loadAppState ===
                'function'
            ) {

                loadAppState();
            }


            const isIndexPage =
                window.location.pathname
                    .endsWith(
                        'index.html'
                    ) ||
                window.location.pathname ===
                    '/' ||
                !window.location.pathname
                    .includes(
                        '.html'
                    );


            const accountModal =
                document.getElementById(
                    'accountCreationModal'
                );


            const usernameContainer =
                document.querySelector(
                    '.username-text'
                ) ||
                document.querySelector(
                    'h2'
                );


            if (
                appState.isLoggedIn &&
                usernameContainer
            ) {

                usernameContainer
                    .textContent =
                    escapeHTML(
                        appState.username
                    );


                if (accountModal) {

                    accountModal
                        .style
                        .display =
                        'none';
                }


            } else if (
                !appState.isLoggedIn &&
                !isIndexPage
            ) {

                window.location.href =
                    'index.html';


            } else if (
                !appState.isLoggedIn &&
                isIndexPage &&
                accountModal
            ) {

                if (
                    accountModal
                        .style
                        .display !==
                    'flex'
                ) {

                    accountModal
                        .style
                        .display =
                        'flex';
                }
            }
        }
    }
);