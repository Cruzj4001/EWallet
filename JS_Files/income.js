import { appState, loadAppState, saveAppState } from './variables.js';

if (typeof loadAppState === 'function') {
    loadAppState();
}

let editingRow = null;

// Track active update identifiers without destroying state array sequences
let editTransactionId = null;

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


// Frequency label function

function getFrequencyLabel(frequency) {
    const labels = {
        1: 'One Time or Yearly',
        12: 'Monthly',
        24: 'Twice Monthly',
        26: 'Biweekly',
        52: 'Weekly'
    };

    return labels[Number(frequency)] || 'One Time or Yearly';
}


function updateIncomeDisplay() {
    const display = document.getElementById('incomeDisplay');

    const yearlyIncome = appState.transactions
        .filter(transaction => transaction.type === 'income')
        .reduce((total, income) => {
            const amount = Number(income.amount) || 0;
            const frequency = Number(income.frequency) || 1;

            return total + (amount * frequency);
        }, 0);

    if (display) {
        display.textContent = '$' + yearlyIncome.toFixed(2);
    }
}


// Global renderer wrapper helper to keep data states tightly synchronized

function renderIncomeEntriesFromState() {
    const incomeEntries = document.getElementById('incomeEntries');

    if (!incomeEntries) return;

    const incomes = appState.transactions.filter(
        transaction => transaction.type === 'income'
    );

    incomeEntries.innerHTML = incomes.map(income => {
        const safeId = escapeHTML(income.id);

        return `
            <tr data-id="${safeId}">
                <td>${escapeHTML(income.date)}</td>
                <td>${escapeHTML(income.source)}</td>
                <td>$${(Number(income.amount) || 0).toFixed(2)}</td>
                <td>${escapeHTML(getFrequencyLabel(income.frequency))}</td>
                <td>${escapeHTML(income.notes)}</td>
                <td>
                    <button class="editBtn"
                            data-id="${safeId}">
                        Edit
                    </button>

                    <button class="deleteBtn"
                            data-id="${safeId}">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}


function initIncomePage() {
    if (!appState.isLoggedIn) {
        window.location.href = 'index.html';
        return;
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
                usernameContainer.innerHTML.replace(
                    '(Username)',
                    cleanName
                );
        } else {
            usernameContainer.textContent = cleanName;
        }
    }

    updateIncomeDisplay();
    renderIncomeEntriesFromState();

    const incomeEntries = document.getElementById('incomeEntries');
    const addButton = document.getElementById('addBtn');
    const incomeForm = document.getElementById('incomeForm');

    if (!incomeEntries || !addButton || !incomeForm) {
        return;
    }


    incomeEntries.addEventListener('click', event => {
        const button = event.target.closest('button');

        if (!button) return;

        const row = button.closest('tr');

        if (!row) return;

        const id = row.dataset.id || button.dataset.id;


        if (button.classList.contains('editBtn')) {
            const target = id
                ? appState.transactions.find(
                    transaction => transaction.id === id
                )
                : appState.transactions.find(transaction =>
                    transaction.type === 'income' &&
                    transaction.date === row.cells[0].textContent &&
                    transaction.source === row.cells[1].textContent
                );

            if (!target) return;

            document.getElementById('incomeDate').value =
                target.date || '';

            document.getElementById('incomeSource').value =
                target.source || '';

            document.getElementById('incomeAmount').value =
                target.amount || '';

            // Frequency element
            document.getElementById('incomeFrequency').value =
                target.frequency || 1;

            document.getElementById('incomeNotes').value =
                target.notes || '';

            editTransactionId = target.id;

            addButton.textContent = 'Update Income';
            editingRow = row;

            // Keep the saved transaction in state while editing.
            // Only remove the visible row temporarily.
            row.remove();

            updateIncomeDisplay();
        }


        if (button.classList.contains('deleteBtn')) {
            const dateCell = row.cells[0];
            const sourceCell = row.cells[1];
            const amountCell = row.cells[2];

            const amountToRemove =
                parseFloat(
                    amountCell.textContent.replace('$', '')
                ) || 0;

            if (id) {
                appState.transactions =
                    appState.transactions.filter(
                        transaction => transaction.id !== id
                    );
            } else {
                appState.transactions =
                    appState.transactions.filter(transaction =>
                        !(
                            transaction.type === 'income' &&
                            transaction.date === dateCell.textContent &&
                            transaction.source === sourceCell.textContent &&
                            Number(transaction.amount) === amountToRemove
                        )
                    );
            }

            appState.syncExpenses();

            updateIncomeDisplay();
            renderIncomeEntriesFromState();

            if (editTransactionId === id) {
                incomeForm.reset();

                editTransactionId = null;
                editingRow = null;

                addButton.textContent = 'Add Income';

                const frequencyInput =
                    document.getElementById('incomeFrequency');

                if (frequencyInput) {
                    frequencyInput.value = '1';
                }
            }
        }

        saveAppState();
    });


    incomeForm.addEventListener('submit', event => {
        event.preventDefault();

        const date =
            document.getElementById('incomeDate').value;

        const source =
            document.getElementById('incomeSource').value;

        const amount =
            document.getElementById('incomeAmount').value;

        const notes =
            document.getElementById('incomeNotes').value;

        // Read frequency
        const frequency =
            parseInt(
                document.getElementById('incomeFrequency').value,
                10
            ) || 1;


        if (!date || !source || !amount) {
            alert(
                'Please complete date, source, and amount fields.'
            );

            return false;
        }

        const amountValue = parseFloat(amount) || 0;


        const safeUUID = () => {
            if (
                typeof crypto !== 'undefined' &&
                typeof crypto.randomUUID === 'function'
            ) {
                return crypto.randomUUID();
            }

            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
                .replace(/[xy]/g, character => {
                    const randomNumber =
                        Math.random() * 16 | 0;

                    const value =
                        character === 'x'
                            ? randomNumber
                            : (randomNumber & 0x3 | 0x8);

                    return value.toString(16);
                });
        };


        if (editTransactionId) {
            const index =
                appState.transactions.findIndex(
                    transaction =>
                        transaction.id === editTransactionId
                );

            if (index !== -1) {
                appState.transactions[index] = {
                    id: editTransactionId,
                    type: 'income',
                    date: date,
                    source: source,
                    amount: amountValue,
                    frequency: frequency,
                    notes: notes
                };
            }

            editTransactionId = null;
        } else {
            appState.transactions.push({
                id: safeUUID(),
                type: 'income',
                date: date,
                source: source,
                amount: amountValue,
                frequency: frequency,
                notes: notes
            });
        }


        appState.syncExpenses();

        updateIncomeDisplay();
        renderIncomeEntriesFromState();

        editingRow = null;
        addButton.textContent = 'Add Income';

        incomeForm.reset();

        const frequencyInput =
            document.getElementById('incomeFrequency');

        if (frequencyInput) {
            frequencyInput.value = '1';
        }

        saveAppState();

        return false;
    });
}


window.addEventListener('storage', event => {
    if (event.key === 'appState') {
        if (typeof loadAppState === 'function') {
            loadAppState();
        }

        if (!appState.isLoggedIn) {
            window.location.href = 'index.html';
            return;
        }

        const usernameContainer =
            document.querySelector('.username-text') ||
            document.querySelector('h2');

        if (usernameContainer && appState.username) {
            usernameContainer.textContent =
                escapeHTML(appState.username);
        }

        updateIncomeDisplay();
        renderIncomeEntriesFromState();
    }
});


if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        initIncomePage
    );
} else {
    initIncomePage();
}