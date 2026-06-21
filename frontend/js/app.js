// State Management
const state = {
    currentUser: null,
    usersList: [],
    tasks: [],
    totalTasks: 0,
    filters: {
        search: '',
        priority: '',
        assigneeId: '',
        skip: 0,
        limit: 15
    },
    activeView: 'board', // 'board' or 'admin'
    draggedTaskId: null
};

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const regName = document.getElementById('reg-name');
const nameGroup = document.getElementById('name-group');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthBtn = document.getElementById('toggle-auth-btn');
const toggleAuthText = document.getElementById('toggle-auth-text');
const authSubtitle = document.getElementById('auth-subtitle');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');

const userDisplayName = document.getElementById('user-display-name');
const userDisplayRole = document.getElementById('user-display-role');
const userInitials = document.getElementById('user-initials');
const logoutBtn = document.getElementById('logout-btn');

const menuBoard = document.getElementById('menu-board');
const menuAdmin = document.getElementById('menu-admin');
const viewBoard = document.getElementById('view-board');
const viewAdmin = document.getElementById('view-admin');
const pageTitle = document.getElementById('page-title');

// Filter & Pagination Elements
const filterSearch = document.getElementById('filter-search');
const filterPriority = document.getElementById('filter-priority');
const filterAssignee = document.getElementById('filter-assignee');
const btnResetFilters = document.getElementById('btn-reset-filters');
const paginationInfo = document.getElementById('pagination-info');
const paginationPrev = document.getElementById('pagination-prev');
const paginationNext = document.getElementById('pagination-next');

// Kanban Columns
const cardsTodo = document.getElementById('cards-todo');
const cardsInprogress = document.getElementById('cards-inprogress');
const cardsDone = document.getElementById('cards-done');
const countTodo = document.getElementById('count-todo');
const countInprogress = document.getElementById('count-inprogress');
const countDone = document.getElementById('count-done');

// Modal Elements
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const taskModalId = document.getElementById('task-modal-id');
const taskModalTitle = document.getElementById('modal-title');
const taskTitle = document.getElementById('task-title');
const taskDesc = document.getElementById('task-desc');
const taskStatus = document.getElementById('task-status');
const taskPriority = document.getElementById('task-priority');
const taskAssignee = document.getElementById('task-assignee');
const taskDuedate = document.getElementById('task-duedate');
const btnCreateTask = document.getElementById('btn-create-task');
const taskModalCancel = document.getElementById('task-modal-cancel');
const taskModalCloseBtn = document.getElementById('modal-close-btn');

// Admin Elements
const adminUsersList = document.getElementById('admin-users-list');

// --- Initialization & Auth Flow ---

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAuthStatus();
});

// Check if user is already authenticated
async function checkAuthStatus() {
    if (TaskFlowAPI.isAuthenticated()) {
        try {
            const user = await TaskFlowAPI.getProfile();
            loginSuccess(user);
        } catch (err) {
            TaskFlowAPI.clearToken();
            showAuthForm();
        }
    } else {
        showAuthForm();
    }
}

function showAuthForm() {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    state.currentUser = null;
}

function loginSuccess(user) {
    state.currentUser = user;
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    // Render profile widget
    userDisplayName.textContent = user.full_name || user.email;
    userDisplayRole.textContent = user.role;
    
    const initials = (user.full_name || user.email)
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    userInitials.textContent = initials;

    // Show admin options if role is admin
    if (user.role === 'admin') {
        menuAdmin.style.display = 'flex';
    } else {
        menuAdmin.style.display = 'none';
        // Force view-board if demoted
        switchView('board');
    }

    // Load initial data
    loadInitialAppData();
}

async function loadInitialAppData() {
    try {
        // Fetch all users for dropdown lists
        state.usersList = await TaskFlowAPI.getUsers(0, 100);
        populateAssigneeDropdowns();
        
        // Fetch and render tasks
        fetchAndRenderTasks();
    } catch (err) {
        console.error('Failed to load initial data:', err);
    }
}

// Populate Assignee Dropdowns (Filters & Modal Form)
function populateAssigneeDropdowns() {
    // Clear dynamic options but retain the first default option
    filterAssignee.innerHTML = '<option value="">All Users</option>';
    taskAssignee.innerHTML = '<option value="">Unassigned</option>';

    state.usersList.forEach(user => {
        const name = user.full_name ? `${user.full_name} (${user.email})` : user.email;
        
        // Filter dropdown
        const filterOpt = document.createElement('option');
        filterOpt.value = user.id;
        filterOpt.textContent = name;
        filterAssignee.appendChild(filterOpt);

        // Form modal dropdown
        const formOpt = document.createElement('option');
        formOpt.value = user.id;
        formOpt.textContent = name;
        taskAssignee.appendChild(formOpt);
    });
}

// Global hook for unauthorized tokens
window.addEventListener('auth-failed', () => {
    showAuthForm();
});

// --- Event Listeners Setup ---

function setupEventListeners() {
    // Auth Toggle
    let isLoginMode = true;
    toggleAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        
        // Toggle view states
        if (isLoginMode) {
            authSubtitle.textContent = 'Login to access your project dashboard';
            nameGroup.style.display = 'none';
            regName.removeAttribute('required');
            authSubmitBtn.querySelector('span').textContent = 'Login';
            authSubmitBtn.querySelector('i').className = 'fa-solid fa-arrow-right-to-bracket';
            toggleAuthText.innerHTML = `Don't have an account? <a href="#" id="toggle-auth-btn">Register here</a>`;
        } else {
            authSubtitle.textContent = 'Create an account to start managing tasks';
            nameGroup.style.display = 'flex';
            regName.setAttribute('required', 'true');
            authSubmitBtn.querySelector('span').textContent = 'Register';
            authSubmitBtn.querySelector('i').className = 'fa-solid fa-user-plus';
            toggleAuthText.innerHTML = `Already have an account? <a href="#" id="toggle-auth-btn">Login here</a>`;
        }
        
        // Re-attach toggle listener since we reset innerHTML
        document.getElementById('toggle-auth-btn').addEventListener('click', (ev) => {
            ev.preventDefault();
            toggleAuthBtn.click();
        });
        
        // Clear message alerts
        authError.classList.add('hidden');
        authSuccess.classList.add('hidden');
    });

    // Auth Submission
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.classList.add('hidden');
        authSuccess.classList.add('hidden');

        const email = authEmail.value;
        const password = authPassword.value;

        try {
            if (isLoginMode) {
                // Login
                await TaskFlowAPI.login(email, password);
                const user = await TaskFlowAPI.getProfile();
                loginSuccess(user);
            } else {
                // Register
                const fullName = regName.value;
                await TaskFlowAPI.register(email, password, fullName);
                
                authSuccess.textContent = 'Registration successful! You can now log in.';
                authSuccess.classList.remove('hidden');
                
                // Toggle back to login mode
                toggleAuthBtn.click();
                authPassword.value = '';
            }
        } catch (err) {
            authError.textContent = err.message;
            authError.classList.remove('hidden');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        TaskFlowAPI.clearToken();
        showAuthForm();
    });

    // Sidebar Views Navigation
    menuBoard.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('board');
    });

    menuAdmin.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('admin');
    });

    // Filters and Search
    let searchDebounce;
    filterSearch.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            state.filters.search = filterSearch.value;
            state.filters.skip = 0; // reset to first page
            fetchAndRenderTasks();
        }, 300);
    });

    filterPriority.addEventListener('change', () => {
        state.filters.priority = filterPriority.value;
        state.filters.skip = 0;
        fetchAndRenderTasks();
    });

    filterAssignee.addEventListener('change', () => {
        state.filters.assigneeId = filterAssignee.value;
        state.filters.skip = 0;
        fetchAndRenderTasks();
    });

    btnResetFilters.addEventListener('click', () => {
        filterSearch.value = '';
        filterPriority.value = '';
        filterAssignee.value = '';
        state.filters.search = '';
        state.filters.priority = '';
        state.filters.assigneeId = '';
        state.filters.skip = 0;
        fetchAndRenderTasks();
    });

    // Pagination
    paginationPrev.addEventListener('click', () => {
        if (state.filters.skip > 0) {
            state.filters.skip = Math.max(0, state.filters.skip - state.filters.limit);
            fetchAndRenderTasks();
        }
    });

    paginationNext.addEventListener('click', () => {
        if (state.filters.skip + state.filters.limit < state.totalTasks) {
            state.filters.skip += state.filters.limit;
            fetchAndRenderTasks();
        }
    });

    // Task Modal Controls
    btnCreateTask.addEventListener('click', () => {
        openTaskModal(null);
    });

    taskModalCancel.addEventListener('click', closeTaskModal);
    taskModalCloseBtn.addEventListener('click', closeTaskModal);
    
    // Task Form Submit
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const taskId = taskModalId.value;
        const taskData = {
            title: taskTitle.value,
            description: taskDesc.value || null,
            status: taskStatus.value,
            priority: taskPriority.value,
            assignee_id: taskAssignee.value ? parseInt(taskAssignee.value) : null,
            due_date: taskDuedate.value ? new Date(taskDuedate.value).toISOString() : null
        };

        try {
            if (taskId) {
                // Update
                await TaskFlowAPI.updateTask(taskId, taskData);
            } else {
                // Create
                await TaskFlowAPI.createTask(taskData);
            }
            closeTaskModal();
            fetchAndRenderTasks();
        } catch (err) {
            alert('Failed to save task: ' + err.message);
        }
    });

    // Drag and Drop implementation for column elements
    const columns = document.querySelectorAll('.kanban-column');
    columns.forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault(); // necessary to allow drop
            col.classList.add('drag-over');
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('drag-over');
        });

        col.addEventListener('drop', async (e) => {
            e.preventDefault();
            col.classList.remove('drag-over');
            
            const taskId = state.draggedTaskId;
            const newStatus = col.getAttribute('data-status');
            
            if (taskId && newStatus) {
                try {
                    // Update task status on the backend
                    await TaskFlowAPI.updateTask(taskId, { status: newStatus });
                    fetchAndRenderTasks(); // Refresh board
                } catch (err) {
                    alert('Failed to update task status: ' + err.message);
                }
            }
            state.draggedTaskId = null;
        });
    });
}

// --- Views Routing Logic ---

function switchView(viewName) {
    state.activeView = viewName;

    if (viewName === 'board') {
        menuBoard.classList.add('active');
        menuAdmin.classList.remove('active');
        viewBoard.classList.remove('hidden');
        viewAdmin.classList.add('hidden');
        pageTitle.textContent = 'Kanban Board';
        fetchAndRenderTasks();
    } else if (viewName === 'admin') {
        menuBoard.classList.remove('active');
        menuAdmin.classList.add('active');
        viewBoard.classList.add('hidden');
        viewAdmin.classList.remove('hidden');
        pageTitle.textContent = 'Admin Dashboard';
        loadAdminUserDirectory();
    }
}

// --- Task Core Rendering Flow ---

async function fetchAndRenderTasks() {
    try {
        const response = await TaskFlowAPI.getTasks({
            status: '', // Fetch all, sorting them locally into columns
            priority: state.filters.priority,
            assigneeId: state.filters.assigneeId,
            search: state.filters.search,
            skip: state.filters.skip,
            limit: state.filters.limit
        });

        state.tasks = response.tasks;
        state.totalTasks = response.total;

        renderKanbanBoard();
        renderPagination();
    } catch (err) {
        console.error('Failed to fetch tasks:', err);
    }
}

function renderKanbanBoard() {
    // Clear columns
    cardsTodo.innerHTML = '';
    cardsInprogress.innerHTML = '';
    cardsDone.innerHTML = '';

    let todoCount = 0;
    let inprogressCount = 0;
    let doneCount = 0;

    state.tasks.forEach(task => {
        const card = createTaskCardElement(task);
        
        if (task.status === 'todo') {
            cardsTodo.appendChild(card);
            todoCount++;
        } else if (task.status === 'in_progress') {
            cardsInprogress.appendChild(card);
            inprogressCount++;
        } else if (task.status === 'done') {
            cardsDone.appendChild(card);
            doneCount++;
        }
    });

    // Update headers count badges
    countTodo.textContent = todoCount;
    countInprogress.textContent = inprogressCount;
    countDone.textContent = doneCount;
}

function createTaskCardElement(task) {
    const card = document.createElement('article');
    card.className = `task-card glass priority-${task.priority}`;
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-id', task.id);

    // Setup drag events
    card.addEventListener('dragstart', () => {
        card.classList.add('dragging');
        state.draggedTaskId = task.id;
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });

    // Card Header details
    const header = document.createElement('div');
    header.className = 'card-header';
    
    const title = document.createElement('h4');
    title.textContent = task.title;
    header.appendChild(title);

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge badge-${task.priority}`;
    priorityBadge.textContent = task.priority;
    header.appendChild(priorityBadge);
    
    card.appendChild(header);

    // Card Description
    if (task.description) {
        const desc = document.createElement('p');
        desc.className = 'card-desc';
        desc.textContent = task.description;
        card.appendChild(desc);
    }

    // Card Meta Info
    const meta = document.createElement('div');
    meta.className = 'card-meta';

    // Assignee details
    const assigneeDiv = document.createElement('div');
    assigneeDiv.className = 'card-assignee';
    if (task.assignee) {
        const avatar = document.createElement('div');
        avatar.className = 'avatar-sm';
        const nameParts = (task.assignee.full_name || task.assignee.email).split(' ');
        avatar.textContent = nameParts[0][0].toUpperCase() + (nameParts[1] ? nameParts[1][0] : '').toUpperCase();
        
        const nameLabel = document.createElement('span');
        nameLabel.textContent = task.assignee.full_name || task.assignee.email;

        assigneeDiv.appendChild(avatar);
        assigneeDiv.appendChild(nameLabel);
    } else {
        assigneeDiv.innerHTML = '<i class="fa-regular fa-user-circle"></i> <span>Unassigned</span>';
    }
    meta.appendChild(assigneeDiv);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    // Edit button (authorized to assignee, creator, or admin)
    const canEdit = state.currentUser.role === 'admin' || 
                    task.creator_id === state.currentUser.id || 
                    (task.assignee && task.assignee.id === state.currentUser.id);

    if (canEdit) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-card';
        editBtn.innerHTML = '<i class="fa-regular fa-pen-to-square"></i>';
        editBtn.title = 'Edit Task';
        editBtn.addEventListener('click', () => openTaskModal(task));
        actions.appendChild(editBtn);
    }

    // Delete button (authorized to creator or admin)
    const canDelete = state.currentUser.role === 'admin' || task.creator_id === state.currentUser.id;
    if (canDelete) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-card btn-card-delete';
        deleteBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
        deleteBtn.title = 'Delete Task';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
                try {
                    await TaskFlowAPI.deleteTask(task.id);
                    fetchAndRenderTasks();
                } catch (err) {
                    alert('Failed to delete task: ' + err.message);
                }
            }
        });
        actions.appendChild(deleteBtn);
    }

    meta.appendChild(actions);
    card.appendChild(meta);

    return card;
}

function renderPagination() {
    const skip = state.filters.skip;
    const limit = state.filters.limit;
    const total = state.totalTasks;

    const startIdx = total === 0 ? 0 : skip + 1;
    const endIdx = Math.min(skip + limit, total);
    
    paginationInfo.textContent = `Showing ${startIdx}-${endIdx} of ${total} tasks`;
    
    paginationPrev.disabled = skip === 0;
    paginationNext.disabled = skip + limit >= total;
}

// --- Task Modal Handlers ---

function openTaskModal(task = null) {
    taskForm.reset();
    
    if (task) {
        // Edit Mode
        taskModalTitle.textContent = 'Edit Task';
        taskModalId.value = task.id;
        taskTitle.value = task.title;
        taskDesc.value = task.description || '';
        taskStatus.value = task.status;
        taskPriority.value = task.priority;
        taskAssignee.value = task.assignee_id || '';
        
        // Format ISO datetime string for datetime-local input (YYYY-MM-DDTHH:MM)
        if (task.due_date) {
            const date = new Date(task.due_date);
            const formatted = date.toISOString().slice(0, 16);
            taskDuedate.value = formatted;
        } else {
            taskDuedate.value = '';
        }
    } else {
        // Create Mode
        taskModalTitle.textContent = 'Create New Task';
        taskModalId.value = '';
        taskStatus.value = 'todo';
        taskPriority.value = 'medium';
        taskAssignee.value = '';
        taskDuedate.value = '';
    }

    taskModal.classList.remove('hidden');
}

function closeTaskModal() {
    taskModal.classList.add('hidden');
}

// --- Admin Panel Functionality ---

async function loadAdminUserDirectory() {
    try {
        const users = await TaskFlowAPI.getUsers(0, 100);
        adminUsersList.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            
            // Name cell
            const nameTd = document.createElement('td');
            nameTd.innerHTML = `<strong>${user.full_name || 'No Name'}</strong>`;
            tr.appendChild(nameTd);

            // Email cell
            const emailTd = document.createElement('td');
            emailTd.textContent = user.email;
            tr.appendChild(emailTd);

            // Registered Date cell
            const dateTd = document.createElement('td');
            const date = new Date(user.created_at);
            dateTd.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            tr.appendChild(dateTd);

            // Role Badge cell
            const roleTd = document.createElement('td');
            const roleBadge = document.createElement('span');
            roleBadge.className = `badge ${user.role === 'admin' ? 'badge-high' : 'badge-low'}`;
            roleBadge.textContent = user.role;
            roleTd.appendChild(roleBadge);
            tr.appendChild(roleTd);

            // Actions cell
            const actionsTd = document.createElement('td');
            if (user.id === state.currentUser.id) {
                actionsTd.innerHTML = '<span class="text-muted">Current Session User</span>';
            } else {
                const select = document.createElement('select');
                select.className = 'user-role-select';
                select.innerHTML = `
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                `;
                
                select.addEventListener('change', async () => {
                    const newRole = select.value;
                    try {
                        await TaskFlowAPI.updateUserRole(user.id, newRole);
                        // Refresh directory list
                        loadAdminUserDirectory();
                    } catch (err) {
                        alert('Failed to change user role: ' + err.message);
                        select.value = user.role; // Reset selection
                    }
                });
                actionsTd.appendChild(select);
            }
            tr.appendChild(actionsTd);

            adminUsersList.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load user directory:', err);
    }
}
