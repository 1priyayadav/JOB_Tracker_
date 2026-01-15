const STORAGE_KEY = 'internship_applications_v1';

// In-memory list of applications
let applications = [];
let currentId = 1;

// For edit mode: which application are we editing? null means "add new"
let editingId = null;

// Currently selected date in the date chips; "all" means show all dates
let activeDate = 'all';

const form = document.getElementById('application-form');
const tbody = document.getElementById('applications-body');
const filterSelect = document.getElementById('filter-status');
const summaryText = document.getElementById('summary-text');
const submitBtn = form.querySelector('button[type="submit"]');
const dateChipContainer = document.getElementById('date-chip-container');

// Load saved applications from localStorage when the page loads
window.addEventListener('load', () => {
  loadFromStorage();
  renderTable();
});

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const company = document.getElementById('company').value.trim();
  const position = document.getElementById('position').value.trim();
  const deadline = document.getElementById('deadline').value;
  const link = document.getElementById('link').value.trim();
  const applied = document.getElementById('applied').checked;
  const notes = document.getElementById('notes').value.trim();

  if (!company || !position) {
    alert('Please fill in at least company and position.');
    return;
  }

  if (editingId === null) {
    // ADD NEW
    const newApp = {
      id: currentId++,
      company,
      position,
      deadline: deadline || '',
      link,
      applied,
      notes,
      createdAt: todayString() // date when entry was added
    };
    applications.push(newApp);
  } else {
    // EDIT EXISTING
    const app = applications.find(a => a.id === editingId);
    if (app) {
      app.company = company;
      app.position = position;
      app.deadline = deadline || '';
      app.link = link;
      app.applied = applied;
      app.notes = notes;
      // keep createdAt as it was
    }
  }

  saveToStorage();
  resetFormState();
  renderTable();
});

filterSelect.addEventListener('change', renderTable);

function renderTable() {
  const statusFilter = filterSelect.value;
  tbody.innerHTML = '';

  const filtered = applications.filter(app => {
    // status filter
    if (statusFilter === 'applied' && !app.applied) return false;
    if (statusFilter === 'not-applied' && app.applied) return false;

    // date filter
    if (activeDate !== 'all' && app.createdAt !== activeDate) return false;

    return true;
  });

  filtered.forEach((app, index) => {
    const tr = document.createElement('tr');

    // Index / serial number
    const indexTd = document.createElement('td');
    indexTd.textContent = index + 1;
    tr.appendChild(indexTd);

    // Company
    const companyTd = document.createElement('td');
    companyTd.textContent = app.company;
    tr.appendChild(companyTd);

    // Position
    const positionTd = document.createElement('td');
    positionTd.textContent = app.position;
    tr.appendChild(positionTd);

    // Deadline
    const deadlineTd = document.createElement('td');
    deadlineTd.textContent = app.deadline || '-';
    tr.appendChild(deadlineTd);

    // Link
    const linkTd = document.createElement('td');
    if (app.link) {
      const a = document.createElement('a');
      a.href = app.link;
      a.target = '_blank';
      a.textContent = 'Open';
      linkTd.appendChild(a);
    } else {
      linkTd.textContent = '-';
    }
    tr.appendChild(linkTd);

    // Notes
    const notesTd = document.createElement('td');
    notesTd.textContent = app.notes && app.notes.trim() ? app.notes : '-';
    tr.appendChild(notesTd);

    // Status
    const statusTd = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.textContent = app.applied ? 'Applied' : 'Not applied';
    statusSpan.className = app.applied
      ? 'status-applied'
      : 'status-not-applied';
    statusTd.appendChild(statusSpan);
    tr.appendChild(statusTd);

    // Actions
    const actionsTd = document.createElement('td');
    actionsTd.className = 'actions';

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.type = 'button';
    editBtn.addEventListener('click', () => startEdit(app.id));
    actionsTd.appendChild(editBtn);

    actionsTd.appendChild(document.createTextNode(' '));

    // Toggle status button
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = app.applied ? 'Mark Not Applied' : 'Mark Applied';
    toggleBtn.type = 'button';
    toggleBtn.addEventListener('click', () => toggleStatus(app.id));
    actionsTd.appendChild(toggleBtn);

    actionsTd.appendChild(document.createTextNode(' '));

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'danger';
    deleteBtn.type = 'button';
    deleteBtn.addEventListener('click', () => deleteApplication(app.id));
    actionsTd.appendChild(deleteBtn);

    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });

  updateSummary(filtered);
  renderDateChips();
}

function startEdit(id) {
  const app = applications.find(a => a.id === id);
  if (!app) return;

  editingId = id;

  document.getElementById('company').value = app.company;
  document.getElementById('position').value = app.position;
  document.getElementById('deadline').value = app.deadline || '';
  document.getElementById('link').value = app.link || '';
  document.getElementById('applied').checked = !!app.applied;
  document.getElementById('notes').value = app.notes || '';

  submitBtn.textContent = 'Save Changes';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteApplication(id) {
  if (!confirm('Are you sure you want to delete this application?')) {
    return;
  }
  applications = applications.filter(app => app.id !== id);
  saveToStorage();
  renderTable();
}

function toggleStatus(id) {
  const app = applications.find(a => a.id === id);
  if (app) {
    app.applied = !app.applied;
    saveToStorage();
    renderTable();
  }
}

function resetFormState() {
  form.reset();
  editingId = null;
  submitBtn.textContent = 'Add Application';
}

function updateSummary(list = applications) {
  const total = list.length;
  const appliedCount = list.filter(a => a.applied).length;
  const notAppliedCount = total - appliedCount;
  summaryText.textContent =
    total + ' total, ' + appliedCount + ' applied, ' +
    notAppliedCount + ' not applied';
}

function renderDateChips() {
  if (!dateChipContainer) return;

  const dates = Array.from(
    new Set(applications.map(a => a.createdAt || todayString()))
  ).sort();

  dateChipContainer.innerHTML = '';

  // "All" chip
  const allChip = document.createElement('button');
  allChip.type = 'button';
  allChip.textContent = `All (${applications.length})`;
  allChip.className = 'date-chip' + (activeDate === 'all' ? ' active' : '');
  allChip.addEventListener('click', () => {
    activeDate = 'all';
    renderTable();
  });
  dateChipContainer.appendChild(allChip);

  // One chip per date
  dates.forEach(date => {
    const count = applications.filter(a => a.createdAt === date).length;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = `${date} (${count})`;
    chip.className = 'date-chip' + (activeDate === date ? ' active' : '');
    chip.addEventListener('click', () => {
      activeDate = date;
      renderTable();
    });
    dateChipContainer.appendChild(chip);
  });
}

function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function saveToStorage() {
  const data = {
    applications,
    currentId
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data.applications)) {
      applications = data.applications.map(app => ({
        ...app,
        createdAt: app.createdAt || app.deadline || todayString()
      }));
      currentId =
        data.currentId ||
        (applications.length
          ? Math.max(...applications.map(a => a.id)) + 1
          : 1);
    }
  } catch (e) {
    console.error('Failed to load saved data:', e);
  }
}