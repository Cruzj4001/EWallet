import { appState, loadAppState, saveAppState } from './variables.js';
import { authenticateOrCreate, loadTransactionsIntoState, saveTransactionToDatabase, deleteTransactionFromDatabase, clearDerbySession } from './derbyBridge.js';

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
    }[m]));
}


// frequency helper

function getFrequencyLabel(frequency) {
    const labels =
    {
        1: 'One Time or Yearly',
        12: 'Monthly',
        24: 'Twice Monthly',
        26: 'Biweekly',
        52: 'Weekly'
    };

    return labels[Number(frequency)] || 'One Time or Yearly';
}



async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleAuthFormSubmit(ev) {
    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();

    const usernameEl = document.getElementById('walletUsername');
    const passwordEl = document.getElementById('walletPassword');
    if (!usernameEl || !passwordEl) return;

    const newUsername = usernameEl.value.trim();
    const rawPassword = passwordEl.value;
    if (!newUsername || !rawPassword) {
        alert('Please fill out both fields.');
        return;
    }

    const hashedPassword = await hashPassword(rawPassword);
    const balanceEl = document.getElementById('walletBaseBalance');
    const incomeEl = document.getElementById('walletBaseIncome');
    const inputBalance = balanceEl ? (parseFloat(balanceEl.value) || 500.00) : 500.00;
    const inputIncome = incomeEl ? (parseFloat(incomeEl.value) || 50.00) : 50.00;

    try {
        await authenticateOrCreate(
            newUsername,
            hashedPassword,
            inputBalance,
            inputIncome
        );

        await loadTransactionsIntoState();
        if (typeof saveAppState === 'function') saveAppState();

        const accountModal = document.getElementById('accountCreationModal');
        if (accountModal) accountModal.style.display = 'none';

        window.location.reload();
    } catch (error) {
        console.error('Derby authentication error:', error);
        alert(error.message || 'Could not connect to the EWallet database.');
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadAppState === 'function') {
        loadAppState();
    } else {
        appState.loadExpenses();
    }

    if (appState.isLoggedIn) {
        try {
            await loadTransactionsIntoState();
        } catch (error) {
            console.error('Could not load Derby data:', error);
            alert('Could not load saved EWallet data from Derby.');
        }
    }

    const hasExpenseView = !!document.getElementById('expenseForm');
    const hasPlanningView = !!document.getElementById('planningForm');
    const hasIncomeView = !!document.getElementById('incomeForm');

    const accountModal = document.getElementById('accountCreationModal');
    const profileForm = document.getElementById('accountCreationForm');
    const usernameContainer = document.querySelector('.username-text') || document.querySelector('h2');
    const authBtn = document.getElementById('authBtn');

    if (authBtn) {
        authBtn.innerText = appState.isLoggedIn ? 'Logout' : 'Login';

        authBtn.addEventListener('click', () => {
            if (appState.isLoggedIn) {
                appState.isLoggedIn = false;
                clearDerbySession();

                if (usernameContainer) {
                    usernameContainer.textContent = "(Guest)";
                }

                const userField = document.getElementById('walletUsername');
                const passField = document.getElementById('walletPassword');
                if (userField) userField.value = '';
                if (passField) passField.value = '';

                appState.syncExpenses();

                if (accountModal) {
                    accountModal.style.display = 'flex';
                }
            } else if (accountModal) {
                accountModal.style.display = 'flex';
            }
        });
    }

    if (appState.accountCreated && usernameContainer) {
        usernameContainer.innerHTML = usernameContainer.innerHTML.replace('(Username)', escapeHTML(appState.username));
    }

    if (!appState.isLoggedIn && accountModal && profileForm) {
        accountModal.style.display = 'flex';

		const modalTitle = document.getElementById('modalTitle');

		const baseBalanceInput =
		    document.getElementById('walletBaseBalance');

		const baseIncomeInput =
		    document.getElementById('walletBaseIncome');

		const balanceGroup =
		    baseBalanceInput
		        ? baseBalanceInput.closest('.form-group')
		        : null;

		const incomeGroup =
		    baseIncomeInput
		        ? baseIncomeInput.closest('.form-group')
		        : null;

		if (appState.accountCreated && modalTitle) {

		    modalTitle.innerText = "Log In to Your Wallet";

		    if (balanceGroup) {
		        balanceGroup.style.display = 'none';
		    }

		    if (incomeGroup) {
		        incomeGroup.style.display = 'none';
		    }
		}

        profileForm.addEventListener('submit', handleAuthFormSubmit);
        // The form submit listener is enough; avoiding a second click handler prevents duplicate database requests.
    } else if (!appState.isLoggedIn) {
        const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('.html');
        if (!isIndexPage) {
            window.location.href = 'index.html';
            return;
        }
    }

    if (hasExpenseView) {
        initExpensesFeature();
    } else if (hasPlanningView) {
        initPlanningFeature();
    } else if (hasIncomeView) {
        initIncomeFeature();
    }
});

function initExpensesFeature() {
    const form = document.getElementById('expenseForm');
    const tableBody = document.getElementById('expenseEntriesTableBody');

    appState.loadExpenses();
    renderExpenseUI();

    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();

        const date = document.getElementById('expensesDate').value;
        const source = document.getElementById('expensesSource').value;
        const amount = parseFloat(document.getElementById('expensesAmount').value) || 0;
        const frequency = parseInt(document.getElementById('expensesFrequency').value) || 1;
        const category = document.getElementById('expensesCategory').value;
        const notes = document.getElementById('expensesNotes').value;
        const editId = form.dataset.editId;

        const existing = editId
            ? appState.transactions.find(t => t.id === editId && t.type === 'expense')
            : null;

        const transaction = {
            type: 'expense', date, source, amount, frequency, category, notes
        };

        try {
            await saveTransactionToDatabase(transaction, existing?.dbId || null);
            delete form.dataset.editId;
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) submitBtn.innerText = 'Add Expense';
            form.reset();
            renderExpenseUI();
        } catch (error) {
            console.error('Expense database save error:', error);
            alert(error.message || 'Could not save expense.');
        }
    });

    tableBody.addEventListener('click', async (ev) => {
        const actionBtn = ev.target.closest('button[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.dataset.action;
        const id = actionBtn.dataset.id;
        const target = appState.transactions.find(t => t.id === id && t.type === 'expense');
        if (!target) return;

        if (action === 'delete') {
            try {
                await deleteTransactionFromDatabase(target);
                renderExpenseUI();
            } catch (error) {
                console.error('Expense database delete error:', error);
                alert(error.message || 'Could not delete expense.');
            }
        } else if (action === 'edit') {
            document.getElementById('expensesDate').value = target.date;
            document.getElementById('expensesSource').value = target.source;
            document.getElementById('expensesAmount').value = target.amount;
            document.getElementById('expensesFrequency').value = target.frequency || 1;
            document.getElementById('expensesCategory').value = target.category;
            document.getElementById('expensesNotes').value = target.notes;
            form.dataset.editId = id;
            document.getElementById('submitBtn').innerText = 'Update Expense';
        }
    });

    function renderExpenseUI() {
        const expenses = appState.transactions.filter(t => t.type === 'expense');
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        tableBody.innerHTML = expenses.map(e => {
            return `
                <tr data-id="${e.id}">
                    <td>${escapeHTML(e.date)}</td>
                    <td>${escapeHTML(e.source)}</td>
                    <td><span style="font-weight:bold; font-size:0.85em;">[${escapeHTML(e.category)}]</span></td>
                    <td>$${e.amount.toFixed(2)}</td>
					<td>${escapeHTML(getFrequencyLabel(e.frequency))}</td>
                    <td>${escapeHTML(e.notes)}</td>
                    <td>
                        <button data-action="edit" data-id="${e.id}">Edit</button>
                        <button data-action="delete" data-id="${e.id}">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        const totalAmountEl = document.getElementById('totalAmountDisplay');
        const monthAmountEl = document.getElementById('monthAmountDisplay');

        if (totalAmountEl) totalAmountEl.innerText = `$${appState.balance.toFixed(2)}`;
        if (monthAmountEl) monthAmountEl.innerText = `$${appState.expenses.toFixed(2)}`;
    }
}

function initPlanningFeature() {
    const form = document.getElementById('planningForm');
    const tableBody = document.getElementById('planningEntriesTableBody');
    if (!form || !tableBody) return;

    appState.loadExpenses();

    const goalAmountInput = document.getElementById('goalAmount');
    if (goalAmountInput) {
        const savedGoal = localStorage.getItem('eWallet_planningGoal');
        if (savedGoal !== null) {
            goalAmountInput.value = savedGoal;
        }

        goalAmountInput.addEventListener('input', () => {
            localStorage.setItem('eWallet_planningGoal', goalAmountInput.value);
            renderPlanningUI();
        });
    }


    // Currency Converter setup

    const converterSourceOptions =
        document.querySelectorAll('input[name="converterSource"]');

    const customAmountGroup =
        document.getElementById('customAmountGroup');

    const plannedPurchaseGroup =
        document.getElementById('plannedPurchaseGroup');

    const plannedPurchaseSelect =
        document.getElementById('plannedPurchaseSelect');

    const converterAmount =
        document.getElementById('converterAmount');

    const toCurrency =
        document.getElementById('toCurrency');

    const exchangeRate =
        document.getElementById('exchangeRate');

    const convertCurrencyBtn =
        document.getElementById('convertCurrencyBtn');

    const convertedAmountDisplay =
        document.getElementById('convertedAmountDisplay');

    function updatePlannedPurchaseOptions() {
        if (!plannedPurchaseSelect) return;

        const plans = appState.transactions.filter(
            transaction => transaction.type === 'plan'
        );

        plannedPurchaseSelect.innerHTML =
            '<option value="">Select a planned purchase</option>';

        plans.forEach(plan => {
            const option = document.createElement('option');

            option.value = plan.id;
            option.textContent =
                `${plan.description} - $${(Number(plan.amount) || 0).toFixed(2)}`;

            plannedPurchaseSelect.appendChild(option);
        });

        if (plans.length === 1) {
            plannedPurchaseSelect.value = plans[0].id;

            converterAmount.value =
                (Number(plans[0].amount) || 0).toFixed(2);
        }
    }


    converterSourceOptions.forEach(option => {

        option.addEventListener('change', () => {

            if (option.value === 'planned' && option.checked) {

                customAmountGroup.style.display = 'none';
                plannedPurchaseGroup.style.display = 'block';

                updatePlannedPurchaseOptions();

            }

            if (option.value === 'custom' && option.checked) {

                plannedPurchaseGroup.style.display = 'none';
                customAmountGroup.style.display = 'block';

                plannedPurchaseSelect.value = '';
                converterAmount.value = '';
            }

        });

    });


    if (plannedPurchaseSelect) {
        plannedPurchaseSelect.addEventListener('change', () => {

            const selectedPlan = appState.transactions.find(
                transaction =>
                    transaction.id === plannedPurchaseSelect.value
            );

            if (selectedPlan) {
                converterAmount.value =
                    Number(selectedPlan.amount).toFixed(2);
            }

        });
    }


    if (convertCurrencyBtn) {
        convertCurrencyBtn.addEventListener('click', () => {

            const amount =
                parseFloat(converterAmount.value) || 0;

            const rate =
                parseFloat(exchangeRate.value) || 0;

            if (amount <= 0 || rate <= 0) {
                alert('Please enter a valid amount and exchange rate.');
                return;
            }

            const convertedAmount = amount * rate;

            convertedAmountDisplay.textContent =
                `${toCurrency.value} ${convertedAmount.toFixed(2)}`;
        });
    }
	
	renderPlanningUI();

    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const date = document.getElementById('planningDate').value;
        const description = document.getElementById('planningDescription').value;
        const amount = parseFloat(document.getElementById('planningAmount').value) || 0;
        const savedAmount = parseFloat(document.getElementById('planningSavedAmount')?.value || 0);
        const editId = form.dataset.editId;

        const existing = editId
            ? appState.transactions.find(t => t.id === editId && t.type === 'plan')
            : null;

        const transaction = {
            type: 'plan', date, description, amount, savedAmount
        };

        try {
            await saveTransactionToDatabase(transaction, existing?.dbId || null);
            delete form.dataset.editId;
            const submitBtn = document.getElementById('submitPlanBtn');
            if (submitBtn) submitBtn.innerText = 'Create Plan';
            form.reset();
            renderPlanningUI();
        } catch (error) {
            console.error('Planning database save error:', error);
            alert(error.message || 'Could not save planned purchase.');
        }
    });

    tableBody.addEventListener('click', async (ev) => {
        const actionBtn = ev.target.closest('button');
        if (!actionBtn) return;

        const row = actionBtn.closest('tr');
        const id = row ? row.dataset.id : null;
        if (!id) return;

        const target = appState.transactions.find(t => t.id === id && t.type === 'plan');
        if (!target) return;

        const action = actionBtn.dataset.action ||
            (actionBtn.classList.contains('editBtn') ? 'edit' :
            actionBtn.classList.contains('deleteBtn') ? 'delete' : null);

        if (action === 'delete') {
            try {
                await deleteTransactionFromDatabase(target);
                renderPlanningUI();
            } catch (error) {
                console.error('Planning database delete error:', error);
                alert(error.message || 'Could not delete planned purchase.');
            }
        } else if (action === 'edit') {
            document.getElementById('planningDate').value = target.date || '';
            document.getElementById('planningDescription').value = target.description || '';
            document.getElementById('planningAmount').value = target.amount || 0;

            const savedAmountInput = document.getElementById('planningSavedAmount');
            if (savedAmountInput) savedAmountInput.value = target.savedAmount || 0;

            form.dataset.editId = id;
            const submitBtn = document.getElementById('submitPlanBtn');
            if (submitBtn) submitBtn.innerText = 'Update Plan';
        }
    });

    function renderPlanningUI() {
        const tableBody = document.getElementById('planningEntriesTableBody');
        if (!tableBody) return;

        const plans = appState.transactions.filter(t => t.type === 'plan');
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const totalPlanned = plans.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const monthPlanned = plans
            .filter(p => String(p.date).startsWith(currentMonthStr))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalSaved = plans.reduce((sum, p) => sum + (parseFloat(p.savedAmount) || 0), 0);

        const remainingValue = Math.max(0, totalPlanned - totalSaved);


        const monthlyLeftover = appState.getMonthlyLeftover();
        const monthsUntilGoal =
            monthlyLeftover > 0
                ? Math.ceil(remainingValue / monthlyLeftover)
                : null;

        tableBody.innerHTML = plans.map(p => {
            const safeId = escapeHTML(p.id);
            return `
            <tr data-id="${safeId}">
                <td>${escapeHTML(p.date)}</td>
                <td>${escapeHTML(p.description)}</td>
                <td>$${(parseFloat(p.savedAmount) || 0).toFixed(2)}</td>
                <td>$${(Number(p.amount) || 0).toFixed(2)}</td>
                <td>
                    <button class="editBtn" data-action="edit" data-id="${safeId}">Edit</button>
                    <button class="deleteBtn" data-action="delete" data-id="${safeId}">Delete</button>
                </td>
            </tr>
        `;
        }).join('');

        const updates = {
            'totalPlanningAmountDisplay': totalPlanned,
            'monthPlanningAmountDisplay': monthPlanned,
            'totalSavedAmountDisplay': totalSaved,
            'remainingTillGoalDisplay': remainingValue
        };

        Object.entries(updates).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.innerText = `$${val.toFixed(2)}`;
        });


        // adding a display 

        const monthsDisplay = document.getElementById('monthsUntilGoalDisplay');

        if (monthsDisplay) {
            monthsDisplay.innerText =
                monthsUntilGoal === null
                    ? 'N/A'
                    : `${monthsUntilGoal} month${monthsUntilGoal === 1 ? '' : 's'}`;
        }

        updatePlannedPurchaseOptions();

    }

}

function initIncomeFeature() {
    const form = document.getElementById('incomeForm');
    const tableBody = document.getElementById('incomeEntries');
    const submitBtn = document.getElementById('addBtn');

    appState.loadExpenses();
    renderIncomeUI();

    form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const date = document.getElementById('incomeDate').value;
        const source = document.getElementById('incomeSource').value;
        const amount = parseFloat(document.getElementById('incomeAmount').value) || 0;

        const frequency =
            parseInt(document.getElementById('incomeFrequency').value, 10) || 1;

        const notes = document.getElementById('incomeNotes').value;

        const editId = form.dataset.editId;

        if (editId) {
            const idx = appState.transactions.findIndex(t => t.id === editId && t.type === 'income');
            if (idx !== -1) {
                appState.transactions[idx] = { id: editId, type: 'income', date, source, amount, frequency, notes };
            }
            delete form.dataset.editId;
            if (submitBtn) submitBtn.textContent = 'Add Income';
        } else {
            const id = crypto.randomUUID();
            appState.transactions.push({ id, type: 'income', date, source, amount, frequency, notes });
        }

        appState.syncExpenses();
        if (typeof saveAppState === 'function') saveAppState();

        renderIncomeUI();
        form.reset();
    });

    tableBody.addEventListener('click', (ev) => {
        const actionBtn = ev.target.closest('button');
        if (!actionBtn) return;

        const row = actionBtn.closest('tr');
        const id = row ? row.dataset.id : null;
        if (!id) return;

        if (actionBtn.classList.contains('editBtn') || actionBtn.textContent.trim() === 'Edit') {
            const target = appState.transactions.find(t => t.id === id);
            if (!target) return;

            document.getElementById('incomeDate').value = target.date;
            document.getElementById('incomeSource').value = target.source;
            document.getElementById('incomeAmount').value = target.amount;
            document.getElementById('incomeNotes').value = target.notes;

            form.dataset.editId = id;
            if (submitBtn) submitBtn.textContent = 'Update Income';

        } else if (actionBtn.classList.contains('deleteBtn') || actionBtn.textContent.trim() === 'Delete') {
            appState.transactions = appState.transactions.filter(t => t.id !== id);

            appState.syncExpenses();
            if (typeof saveAppState === 'function') saveAppState();

            renderIncomeUI();
        }
    });

    function renderIncomeUI() {
        const incomes = appState.transactions.filter(t => t.type === 'income');

        tableBody.innerHTML = incomes.map(i => `
            <tr data-id="${i.id}">
                <td>${escapeHTML(i.date)}</td>
                <td>${escapeHTML(i.source)}</td>
                <td>$${i.amount.toFixed(2)}</td>
                <td>${escapeHTML(i.notes)}</td>
                <td>
                    <button class="editBtn">Edit</button>
                    <button class="deleteBtn">Delete</button>
                </td>
            </tr>
        `).join('');

        const displayEl = document.getElementById('incomeDisplay');
        if (displayEl) {
            displayEl.textContent = '$' + appState.balance.toFixed(2);
        }
    }
}

window.addEventListener('storage', (event) => {
    if (event.key === 'appState') {
        if (typeof loadAppState === 'function') loadAppState();

        const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('.html');
        const accountModal = document.getElementById('accountCreationModal');
        const usernameContainer = document.querySelector('.username-text') || document.querySelector('h2');

        if (appState.isLoggedIn && usernameContainer) {
            usernameContainer.textContent = escapeHTML(appState.username);
            if (accountModal) accountModal.style.display = 'none';
        } else if (!appState.isLoggedIn && !isIndexPage) {
            window.location.href = 'index.html';
        } else if (!appState.isLoggedIn && isIndexPage && accountModal) {
            if (accountModal.style.display !== 'flex') {
                accountModal.style.display = 'flex';
            }
        }
        const hasExpenseView = !!document.getElementById('expenseForm');
        const hasPlanningView = !!document.getElementById('planningForm');

        if (hasExpenseView && typeof renderExpenseUI === 'function') {
            renderExpenseUI();
        }
        if (hasPlanningView && typeof renderPlanningUI === 'function') {
            renderPlanningUI();
        }
    }
});


