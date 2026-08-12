import { appState, loadAppState, saveAppState } from './variables.js';
import { loadTransactionsIntoState, saveTransactionToDatabase, deleteTransactionFromDatabase } from './derbyBridge.js';

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


async function initIncomePage() {
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

    try {
        await loadTransactionsIntoState();
    } catch (error) {
        console.error('Income database load error:', error);
        alert(error.message || 'Could not load income from Derby.');
    }

    updateIncomeDisplay();
    renderIncomeEntriesFromState();

    const incomeEntries = document.getElementById('incomeEntries');
    const addButton = document.getElementById('addBtn');
    const incomeForm = document.getElementById('incomeForm');

    if (!incomeEntries || !addButton || !incomeForm) {
        return;
    }


    incomeEntries.addEventListener('click', async event => {
        const button = event.target.closest('button');
        if (!button) return;
        const row = button.closest('tr');
        if (!row) return;

        const id = row.dataset.id || button.dataset.id;
        const target = id
            ? appState.transactions.find(transaction => transaction.id === id && transaction.type === 'income')
            : null;

        if (button.classList.contains('editBtn')) {
            if (!target) return;
            document.getElementById('incomeDate').value = target.date || '';
            document.getElementById('incomeSource').value = target.source || '';
            document.getElementById('incomeAmount').value = target.amount || '';
            document.getElementById('incomeFrequency').value = target.frequency || 1;
            document.getElementById('incomeNotes').value = target.notes || '';
            editTransactionId = target.id;
            addButton.textContent = 'Update Income';
            editingRow = row;
            row.remove();
            updateIncomeDisplay();
        }

        if (button.classList.contains('deleteBtn')) {
            if (!target) return;
            try {
                await deleteTransactionFromDatabase(target);
                updateIncomeDisplay();
                renderIncomeEntriesFromState();
                if (editTransactionId === id) {
                    incomeForm.reset();
                    editTransactionId = null;
                    editingRow = null;
                    addButton.textContent = 'Add Income';
                }
            } catch (error) {
                console.error('Income database delete error:', error);
                alert(error.message || 'Could not delete income.');
            }
        }
    });

    incomeForm.addEventListener('submit', async event => {
        event.preventDefault();

        const date = document.getElementById('incomeDate').value;
        const source = document.getElementById('incomeSource').value;
        const amount = document.getElementById('incomeAmount').value;
        const notes = document.getElementById('incomeNotes').value;
        const frequency = parseInt(document.getElementById('incomeFrequency').value) || 1;

        if (!date || !source || !amount) {
            alert('Please complete date, source, and amount fields.');
            return false;
        }

        const amountValue = parseFloat(amount) || 0;
        const existing = editTransactionId
            ? appState.transactions.find(t => t.id === editTransactionId && t.type === 'income')
            : null;

        const transaction = {
            type: 'income', date, source, amount: amountValue, frequency, notes
        };

        try {
            await saveTransactionToDatabase(transaction, existing?.dbId || null);
            editTransactionId = null;
            editingRow = null;
            addButton.textContent = 'Add Income';
            incomeForm.reset();
            const frequencyInput = document.getElementById('incomeFrequency');
            if (frequencyInput) frequencyInput.value = '1';
            updateIncomeDisplay();
            renderIncomeEntriesFromState();
        } catch (error) {
            console.error('Income database save error:', error);
            alert(error.message || 'Could not save income.');
        }
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