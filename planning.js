import {
    appState,
    loadAppState
} from './variables.js';


let planRecords = [];

let editingPlanID = null;


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
        appState.username !== '(Username)'
    ) {

        usernameElement.textContent =
            appState.username;
    }
}


/*
 * ==================================================
 * LOAD PLANS FROM DERBY
 * ==================================================
 */

async function loadPlansFromDatabase() {

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
                '/api/plans?userID=' +
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
                'Could not load plans.'
            );
        }


        planRecords =
            Array.isArray(
                result.plans
            )
                ? result.plans
                : [];


        renderPlans();

        updatePlanningSummary();


    } catch (error) {

        console.error(
            'Plan load error:',
            error
        );


        alert(
            'Could not load planning data from the database.'
        );
    }
}


/*
 * ==================================================
 * SUMMARY
 * ==================================================
 */

function updatePlanningSummary() {

    const totalSaved =
        planRecords.reduce(
            (
                total,
                plan
            ) =>
                total +
                (
                    Number(
                        plan.savedAmount
                    ) || 0
                ),
            0
        );


    const totalPlanned =
        planRecords.reduce(
            (
                total,
                plan
            ) =>
                total +
                (
                    Number(
                        plan.goalAmount
                    ) || 0
                ),
            0
        );


    const now =
        new Date();


    const currentMonth =
        `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, '0')}`;


    const addedThisMonth =
        planRecords
            .filter(
                plan =>
                    String(
                        plan.date || ''
                    ).startsWith(
                        currentMonth
                    )
            )
            .reduce(
                (
                    total,
                    plan
                ) =>
                    total +
                    (
                        Number(
                            plan.savedAmount
                        ) || 0
                    ),
                0
            );


    const goalInput =
        document.getElementById(
            'goalAmount'
        );


    const currentGoal =
        Number(
            goalInput?.value
        ) || 0;


    const remaining =
        Math.max(
            0,
            currentGoal -
            totalSaved
        );


    const totalSavedEl =
        document.getElementById(
            'totalSavedAmountDisplay'
        );


    const totalPlannedEl =
        document.getElementById(
            'totalPlanningAmountDisplay'
        );


    const monthEl =
        document.getElementById(
            'monthPlanningAmountDisplay'
        );


    const remainingEl =
        document.getElementById(
            'remainingTillGoalDisplay'
        );


    if (totalSavedEl) {

        totalSavedEl.textContent =
            '$' +
            totalSaved.toFixed(2);
    }


    if (totalPlannedEl) {

        totalPlannedEl.textContent =
            '$' +
            totalPlanned.toFixed(2);
    }


    if (monthEl) {

        monthEl.textContent =
            '$' +
            addedThisMonth.toFixed(2);
    }


    if (remainingEl) {

        remainingEl.textContent =
            '$' +
            remaining.toFixed(2);
    }
}


/*
 * ==================================================
 * RENDER TABLE
 * ==================================================
 */

function renderPlans() {

    const tableBody =
        document.getElementById(
            'planningEntriesTableBody'
        );


    if (!tableBody) {
        return;
    }


    if (planRecords.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    No planning entries found.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        planRecords.map(
            plan => {

                const id =
                    Number(
                        plan.planID
                    );


                return `
                    <tr data-id="${id}">

                        <td>
                            ${escapeHTML(
                                plan.date
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                plan.description
                            )}
                        </td>

                        <td>
                            $${(
                                Number(
                                    plan.savedAmount
                                ) || 0
                            ).toFixed(2)}
                        </td>

                        <td>
                            $${(
                                Number(
                                    plan.goalAmount
                                ) || 0
                            ).toFixed(2)}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="editBtn"
                                data-id="${id}">

                                Edit

                            </button>


                            <button
                                type="button"
                                class="deleteBtn"
                                data-id="${id}">

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
 * ADD / UPDATE PLAN
 * ==================================================
 */

async function submitPlan(
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


    const date =
        document.getElementById(
            'planningDate'
        ).value;


    const description =
        document.getElementById(
            'planningDescription'
        ).value.trim();


    const savedAmount =
        parseFloat(
            document.getElementById(
                'planningSavedAmount'
            ).value
        );


    const goalAmount =
        parseFloat(
            document.getElementById(
                'planningAmount'
            ).value
        );


    if (
        !date ||
        !description ||
        Number.isNaN(savedAmount) ||
        Number.isNaN(goalAmount)
    ) {

        alert(
            'Please complete all planning fields.'
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
        'description',
        description
    );


    formData.append(
        'goalAmount',
        String(goalAmount)
    );


    formData.append(
        'savedAmount',
        String(savedAmount)
    );


    let method =
        'POST';


    if (
        editingPlanID !== null
    ) {

        method =
            'PUT';


        formData.append(
            'planID',
            String(
                editingPlanID
            )
        );
    }


    try {

        const response =
            await fetch(
                '/api/plans',
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
                'Plan could not be saved.'
            );
        }


        editingPlanID =
            null;


        const submitButton =
            document.getElementById(
                'submitPlanBtn'
            );


        if (submitButton) {

            submitButton.textContent =
                'Create Plan';
        }


        document
            .getElementById(
                'planningForm'
            )
            .reset();


        await loadPlansFromDatabase();


    } catch (error) {

        console.error(
            'Plan save error:',
            error
        );


        alert(
            'Could not save plan: ' +
            error.message
        );
    }
}


/*
 * ==================================================
 * EDIT
 * ==================================================
 */

function beginEditPlan(
    planID
) {

    const plan =
        planRecords.find(
            record =>
                Number(
                    record.planID
                ) ===
                Number(
                    planID
                )
        );


    if (!plan) {
        return;
    }


    document.getElementById(
        'planningDate'
    ).value =
        plan.date || '';


    document.getElementById(
        'planningDescription'
    ).value =
        plan.description || '';


    document.getElementById(
        'planningSavedAmount'
    ).value =
        plan.savedAmount || 0;


    document.getElementById(
        'planningAmount'
    ).value =
        plan.goalAmount || 0;


    editingPlanID =
        Number(
            plan.planID
        );


    const submitButton =
        document.getElementById(
            'submitPlanBtn'
        );


    if (submitButton) {

        submitButton.textContent =
            'Update Plan';
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

async function deletePlan(
    planID
) {

    const userID =
        getCurrentUserID();


    if (!userID) {
        return;
    }


    const confirmed =
        window.confirm(
            'Are you sure you want to delete this plan?'
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                '/api/plans'
                + '?userID='
                + encodeURIComponent(
                    userID
                )
                + '&planID='
                + encodeURIComponent(
                    planID
                ),
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
                'Plan could not be deleted.'
            );
        }


        await loadPlansFromDatabase();


    } catch (error) {

        console.error(
            'Plan delete error:',
            error
        );


        alert(
            'Could not delete plan: ' +
            error.message
        );
    }
}


/*
 * ==================================================
 * PAGE INITIALIZATION
 * ==================================================
 */

async function initPlanningPage() {

    if (
        typeof loadAppState ===
        'function'
    ) {

        loadAppState();
    }


    displayUsername();


    const form =
        document.getElementById(
            'planningForm'
        );


    form.addEventListener(
        'submit',
        submitPlan
    );


    const tableBody =
        document.getElementById(
            'planningEntriesTableBody'
        );


    tableBody.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    'button'
                );


            if (!button) {
                return;
            }


            const planID =
                Number(
                    button.dataset.id
                );


            if (
                button.classList.contains(
                    'editBtn'
                )
            ) {

                beginEditPlan(
                    planID
                );
            }


            if (
                button.classList.contains(
                    'deleteBtn'
                )
            ) {

                deletePlan(
                    planID
                );
            }
        }
    );


    const goalInput =
        document.getElementById(
            'goalAmount'
        );


    if (goalInput) {

        goalInput.addEventListener(
            'input',
            updatePlanningSummary
        );
    }


    await loadPlansFromDatabase();
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
        initPlanningPage
    );

} else {

    initPlanningPage();
}