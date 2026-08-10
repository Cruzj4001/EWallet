import {
    appState,
    loadAppState,
    saveAppState
} from './variables.js';


let authMode = 'login';


/*
 * ============================================================
 * HELPERS
 * ============================================================
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


async function hashPassword(password) {

    const msgBuffer =
        new TextEncoder()
            .encode(password);

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
            byte =>
                byte
                    .toString(16)
                    .padStart(2, '0')
        )
        .join('');
}


/*
 * ============================================================
 * AUTH MODE DISPLAY
 * ============================================================
 */

function showLoginMode() {

    authMode = 'login';


    const modalTitle =
        document.getElementById(
            'modalTitle'
        );


    const balanceInput =
        document.getElementById(
            'walletBaseBalance'
        );


    const incomeInput =
        document.getElementById(
            'walletBaseIncome'
        );


    const balanceGroup =
        balanceInput
            ?.closest(
                '.form-group'
            );


    const incomeGroup =
        incomeInput
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


    const balanceInput =
        document.getElementById(
            'walletBaseBalance'
        );


    const incomeInput =
        document.getElementById(
            'walletBaseIncome'
        );


    const balanceGroup =
        balanceInput
            ?.closest(
                '.form-group'
            );


    const incomeGroup =
        incomeInput
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


/*
 * ============================================================
 * AUTHENTICATION
 * ============================================================
 *
 * Browser
 *      ↓
 * /api/auth
 *      ↓
 * EWalletServer
 *      ↓
 * UserDAO
 *      ↓
 * Derby Users table
 * ============================================================
 */

async function handleAuthFormSubmit(event) {

    if (
        event &&
        typeof event.preventDefault ===
            'function'
    ) {

        event.preventDefault();
    }


    const usernameInput =
        document.getElementById(
            'walletUsername'
        );


    const passwordInput =
        document.getElementById(
            'walletPassword'
        );


    const balanceInput =
        document.getElementById(
            'walletBaseBalance'
        );


    const incomeInput =
        document.getElementById(
            'walletBaseIncome'
        );


    if (
        !usernameInput ||
        !passwordInput
    ) {

        return;
    }


    const username =
        usernameInput
            .value
            .trim();


    const rawPassword =
        passwordInput.value;


    if (
        !username ||
        !rawPassword
    ) {

        alert(
            'Please fill out both username and password.'
        );

        return;
    }


    try {

        const passwordHash =
            await hashPassword(
                rawPassword
            );


        const baseBalance =
            balanceInput
                ? (
                    parseFloat(
                        balanceInput.value
                    ) || 500.00
                )
                : 500.00;


        const baseIncome =
            incomeInput
                ? (
                    parseFloat(
                        incomeInput.value
                    ) || 50.00
                )
                : 50.00;


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
                    method:
                        'POST',

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
                'Authentication failed.'
            );

            return;
        }


        const user =
            result.user;


        /*
         * Store session information.
         */
        appState.accountCreated =
            true;

        appState.isLoggedIn =
            true;

        appState.username =
            user.username;

        appState.passwordHash =
            passwordHash;


        /*
         * This ID is used by the
         * Derby-backed Income,
         * Expense, Planning,
         * Report and CSV APIs.
         */
        sessionStorage.setItem(
            'ewallet_userID',
            String(
                user.userID
            )
        );


        localStorage.setItem(
            'ewallet_userID',
            String(
                user.userID
            )
        );


        localStorage.setItem(
            'ewallet_baseBalance',
            String(
                user.baseBalance
            )
        );


        localStorage.setItem(
            'ewallet_baseIncome',
            String(
                user.baseIncome
            )
        );


        /*
         * Financial records now come
         * from Derby instead of the
         * old browser transaction list.
         */
        appState.transactions = [];


        if (
            typeof saveAppState ===
            'function'
        ) {

            saveAppState();
        }


        const accountModal =
            document.getElementById(
                'accountCreationModal'
            );


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


        const authButton =
            document.getElementById(
                'authBtn'
            );


        if (authButton) {

            authButton.textContent =
                'Logout';
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
 * LOG OUT
 * ============================================================
 */

function logoutUser() {

    appState.isLoggedIn =
        false;


    sessionStorage.removeItem(
        'ewallet_userID'
    );


    localStorage.removeItem(
        'ewallet_userID'
    );


    if (
        typeof saveAppState ===
        'function'
    ) {

        saveAppState();
    }


    const usernameDisplay =
        document.querySelector(
            '.username-text'
        );


    if (usernameDisplay) {

        usernameDisplay.textContent =
            '(Guest)';
    }


    const usernameInput =
        document.getElementById(
            'walletUsername'
        );


    const passwordInput =
        document.getElementById(
            'walletPassword'
        );


    if (usernameInput) {

        usernameInput.value =
            '';
    }


    if (passwordInput) {

        passwordInput.value =
            '';
    }


    const authButton =
        document.getElementById(
            'authBtn'
        );


    if (authButton) {

        authButton.textContent =
            'Login';
    }


    const accountModal =
        document.getElementById(
            'accountCreationModal'
        );


    if (accountModal) {

        showLoginMode();

        accountModal.style.display =
            'flex';
    }
}


/*
 * ============================================================
 * PAGE STARTUP
 * ============================================================
 */

function initializePage() {

    /*
     * Load login/session information
     * from local storage.
     */
    if (
        typeof loadAppState ===
        'function'
    ) {

        loadAppState();
    }


    const accountModal =
        document.getElementById(
            'accountCreationModal'
        );


    const accountForm =
        document.getElementById(
            'accountCreationForm'
        );


    const showLoginBtn =
        document.getElementById(
            'showLoginBtn'
        );


    const showCreateBtn =
        document.getElementById(
            'showCreateBtn'
        );


    const authBtn =
        document.getElementById(
            'authBtn'
        );


    const usernameDisplay =
        document.querySelector(
            '.username-text'
        );


    /*
     * Login/Create Account selector.
     */
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


    /*
     * Start in Login mode.
     */
    showLoginMode();


    /*
     * Account form.
     *
     * Only use addEventListener here.
     * Do NOT also set onclick on the
     * submit button because that would
     * send the request twice.
     */
    if (accountForm) {

        accountForm.addEventListener(
            'submit',
            handleAuthFormSubmit
        );
    }


    /*
     * Login / Logout button.
     */
    if (authBtn) {

        authBtn.textContent =
            appState.isLoggedIn
                ? 'Logout'
                : 'Login';


        authBtn.addEventListener(
            'click',
            () => {

                if (
                    appState.isLoggedIn
                ) {

                    logoutUser();

                } else {

                    showLoginMode();


                    if (accountModal) {

                        accountModal
                            .style
                            .display =
                            'flex';
                    }
                }
            }
        );
    }


    /*
     * Display current username.
     */
    if (
        appState.isLoggedIn &&
        appState.username &&
        usernameDisplay
    ) {

        usernameDisplay.textContent =
            escapeHTML(
                appState.username
            );
    }


    /*
     * If nobody is logged in,
     * display the login window.
     */
    if (
        !appState.isLoggedIn &&
        accountModal
    ) {

        accountModal.style.display =
            'flex';
    }


    /*
     * If somebody is already logged
     * in, hide the modal.
     */
    if (
        appState.isLoggedIn &&
        accountModal
    ) {

        accountModal.style.display =
            'none';
    }
}


/*
 * ============================================================
 * STORAGE EVENT
 * ============================================================
 *
 * Keeps the visible login state synced
 * if appState changes in another tab.
 * ============================================================
 */

window.addEventListener(
    'storage',
    event => {

        if (
            event.key !==
            'appState'
        ) {

            return;
        }


        if (
            typeof loadAppState ===
            'function'
        ) {

            loadAppState();
        }


        const usernameDisplay =
            document.querySelector(
                '.username-text'
            );


        const authBtn =
            document.getElementById(
                'authBtn'
            );


        const accountModal =
            document.getElementById(
                'accountCreationModal'
            );


        if (appState.isLoggedIn) {

            if (usernameDisplay) {

                usernameDisplay.textContent =
                    escapeHTML(
                        appState.username
                    );
            }


            if (authBtn) {

                authBtn.textContent =
                    'Logout';
            }


            if (accountModal) {

                accountModal.style.display =
                    'none';
            }


        } else {

            if (usernameDisplay) {

                usernameDisplay.textContent =
                    '(Guest)';
            }


            if (authBtn) {

                authBtn.textContent =
                    'Login';
            }


            if (accountModal) {

                showLoginMode();

                accountModal.style.display =
                    'flex';
            }
        }
    }
);


/*
 * ============================================================
 * START
 * ============================================================
 */

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initializePage
    );

} else {

    initializePage();
}