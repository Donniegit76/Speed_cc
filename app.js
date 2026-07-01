/**
 * Fast_cc - Gestione Auto Sostitutive
 * Core JavaScript Logic - Backend Integrated
 */

// --- STATE MANAGEMENT ---
let vehicles = [];
let bookings = [];
let currentDate = new Date(); // Keep track of navigated month/week
let currentView = 'month';    // 'month' | 'week' | 'timeline'
let activeFilters = [];       // List of vehicle IDs to show on calendar
let selectedBooking = null;   // Active booking being edited
let confirmCallback = null;   // Active callback for the custom confirm modal

// --- SELECTORS ---
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const vehicleListEl = document.getElementById('vehicle-list');
const calendarViewport = document.getElementById('calendar-viewport');
const currentDateLabel = document.getElementById('current-date-label');
const viewButtons = document.querySelectorAll('.view-btn');

// Nav buttons
const todayBtn = document.getElementById('today-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.querySelector('.refresh-icon');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIconMoon = document.getElementById('theme-icon-moon');
const themeIconSun = document.getElementById('theme-icon-sun');

// Modals & Forms
const bookingModal = document.getElementById('booking-modal');
const bookingForm = document.getElementById('booking-form');
const bookingModalTitle = document.getElementById('booking-modal-title');
const bookingIdInput = document.getElementById('booking-id');
const bookingClientInput = document.getElementById('booking-client');
const bookingVehicleSelect = document.getElementById('booking-vehicle');
const bookingStatusSelect = document.getElementById('booking-status');
const bookingStartDateInput = document.getElementById('booking-start-date');
const bookingStartTimeInput = document.getElementById('booking-start-time');
const bookingEndDateInput = document.getElementById('booking-end-date');
const bookingEndTimeInput = document.getElementById('booking-end-time');
const bookingNotesInput = document.getElementById('booking-notes');
const deleteBookingBtn = document.getElementById('delete-booking-btn');
const cancelBookingBtn = document.getElementById('cancel-booking-btn');
const closeBookingModalBtn = document.getElementById('close-booking-modal-btn');
const newBookingSidebarBtn = document.getElementById('new-booking-sidebar-btn');

// Vehicle Modal
const vehicleModal = document.getElementById('vehicle-modal');
const vehicleForm = document.getElementById('vehicle-form');
const addVehicleBtn = document.getElementById('add-vehicle-btn');
const cancelVehicleBtn = document.getElementById('cancel-vehicle-btn');
const closeVehicleModalBtn = document.getElementById('close-vehicle-modal-btn');

// Custom Confirm Modal
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOkBtn = document.getElementById('confirm-ok-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const closeConfirmModalBtn = document.getElementById('close-confirm-modal-btn');

const toastContainer = document.getElementById('toast-container');

// Booking Form new inputs
const bookingKmStartInput = document.getElementById('booking-km-start');
const bookingKmEndInput = document.getElementById('booking-km-end');
const bookingFuelStartSelect = document.getElementById('booking-fuel-start');
const bookingFuelEndSelect = document.getElementById('booking-fuel-end');
const bookingRevenueInput = document.getElementById('booking-revenue');

// Vehicle Form new inputs
const vehicleKmInput = document.getElementById('vehicle-km');
const vehicleFuelSelect = document.getElementById('vehicle-fuel');

// Report Modal selectors
const reportBtn = document.getElementById('report-btn');
const reportModal = document.getElementById('report-modal');
const closeReportModalBtn = document.getElementById('close-report-modal-btn');
const closeReportBtn = document.getElementById('close-report-btn');
const reportMonthInput = document.getElementById('report-month');
const reportVehicleSelect = document.getElementById('report-vehicle');
const reportTableBody = document.getElementById('report-table-body');
const statCount = document.getElementById('stat-count');
const statKm = document.getElementById('stat-km');
const statRevenue = document.getElementById('stat-revenue');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Base API URL (Relative to hosted domain)
const API_BASE = '/api';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    applyTheme(localStorage.getItem('veloce_theme') || 'dark');
    setupEventListeners();
    await fetchDataFromServer(true); // Initial fetch with seed filters
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        themeIconMoon.style.display = 'none';
        themeIconSun.style.display = 'block';
    } else {
        document.body.classList.remove('light-theme');
        themeIconMoon.style.display = 'block';
        themeIconSun.style.display = 'none';
    }
    localStorage.setItem('veloce_theme', theme);
}

function toggleTheme() {
    const isLight = document.body.classList.contains('light-theme');
    applyTheme(isLight ? 'dark' : 'light');
}

// --- BACKEND API INTERACTIONS ---
async function fetchDataFromServer(setInitialFilters = false) {
    try {
        const response = await fetch(`${API_BASE}/data`);
        if (!response.ok) throw new Error('Impossibile scaricare i dati.');
        
        const data = await response.json();
        vehicles = data.vehicles;
        bookings = data.bookings;

        if (setInitialFilters) {
            activeFilters = vehicles.map(v => v.id);
        }

        updateVehicleSelectOptions();
        renderVehicleList();
        renderActiveView();
    } catch (error) {
        console.error("Fetch Error:", error);
        showToast('Errore di Connessione', 'Impossibile connettersi al database server.', 'error');
    }
}

// --- NOTIFICATION SYSTEM (TOAST) ---
function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === 'warning') {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    }

    toast.innerHTML = `
        ${iconSvg}
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    toastContainer.appendChild(toast);
    
    // Trigger slide in
    setTimeout(() => toast.classList.add('active'), 50);

    // Remove toast after 4s
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- CUSTOM CONFIRM MODAL SYSTEM ---
function showConfirmModal(title, message, callback) {
    confirmTitle.textContent = title;
    confirmMessage.innerHTML = message.replace(/\n/g, '<br>');
    confirmCallback = callback;
    confirmModal.classList.add('active');
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    confirmCallback = null;
}

// --- DATE HELPERS ---
function formatMonthYear(date) {
    return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
               .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
}

function formatDateItalian(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getMondayOfDate(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

// --- EVENT LISTENERS SETUP ---
function setupEventListeners() {
    // Sidebar toggle (Mobile/Responsive)
    sidebarToggleBtn.addEventListener('click', () => {
        sidebar.classList.add('mobile-active');
    });
    closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('mobile-active');
    });

    // Theme toggle (dark / light)
    themeToggleBtn.addEventListener('click', toggleTheme);


    // Navigation Controls
    todayBtn.addEventListener('click', () => {
        currentDate = new Date();
        renderActiveView();
    });
    
    prevBtn.addEventListener('click', () => {
        navigateDate(-1);
    });

    nextBtn.addEventListener('click', () => {
        navigateDate(1);
    });

    // Manual database refresh
    refreshBtn.addEventListener('click', async () => {
        refreshIcon.classList.add('spinning');
        
        // Ensure a satisfying minimum spinning duration of 600ms
        const startTime = Date.now();
        await fetchDataFromServer();
        const elapsedTime = Date.now() - startTime;
        const delay = Math.max(0, 600 - elapsedTime);
        
        setTimeout(() => {
            refreshIcon.classList.remove('spinning');
            showToast('Dati Sincronizzati', 'Stato flotta caricato dal server.', 'success');
        }, delay);
    });

    // View Selector
    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            viewButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentView = e.target.getAttribute('data-view');
            renderActiveView();
        });
    });

    // Modals visibility triggers
    newBookingSidebarBtn.addEventListener('click', () => {
        openBookingModal();
    });

    addVehicleBtn.addEventListener('click', () => {
        openVehicleModal();
    });

    // Close Modals
    closeBookingModalBtn.addEventListener('click', closeBookingModal);
    cancelBookingBtn.addEventListener('click', closeBookingModal);
    
    closeVehicleModalBtn.addEventListener('click', closeVehicleModal);
    cancelVehicleBtn.addEventListener('click', closeVehicleModal);

    // Custom confirm buttons events
    confirmOkBtn.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirmModal();
    });
    confirmCancelBtn.addEventListener('click', closeConfirmModal);
    closeConfirmModalBtn.addEventListener('click', closeConfirmModal);

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === bookingModal) closeBookingModal();
        if (e.target === vehicleModal) closeVehicleModal();
        if (e.target === confirmModal) closeConfirmModal();
        if (e.target === reportModal) closeReportModal();
    });

    // Forms Submission
    bookingForm.addEventListener('submit', handleBookingSubmit);
    vehicleForm.addEventListener('submit', handleVehicleSubmit);

    // Delete Booking
    deleteBookingBtn.addEventListener('click', handleBookingDelete);

    // Report listeners
    reportBtn.addEventListener('click', openReportModal);
    closeReportModalBtn.addEventListener('click', closeReportModal);
    closeReportBtn.addEventListener('click', closeReportModal);
    reportMonthInput.addEventListener('change', renderReportData);
    reportVehicleSelect.addEventListener('change', renderReportData);
    exportCsvBtn.addEventListener('click', exportReportToCSV);

    // Prefill booking start values based on selected vehicle
    bookingVehicleSelect.addEventListener('change', () => {
        const vehicleId = bookingVehicleSelect.value;
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (vehicle && !selectedBooking) {
            if (vehicle.km !== undefined && vehicle.km !== null && !bookingKmStartInput.value) {
                bookingKmStartInput.value = vehicle.km;
            }
            if (vehicle.fuel && !bookingFuelStartSelect.value) {
                bookingFuelStartSelect.value = vehicle.fuel;
            }
        }
    });
}

// Navigation math depending on active view
function navigateDate(direction) {
    if (currentView === 'month' || currentView === 'timeline') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    }
    renderActiveView();
}

// --- VEHICLE MANAGEMENT ---
function renderVehicleList() {
    vehicleListEl.innerHTML = '';
    
    if (vehicles.length === 0) {
        vehicleListEl.innerHTML = `
            <li style="padding: 16px; text-align: center; font-size: 12px; color: var(--text-muted);">
                Nessuna vettura in flotta
            </li>
        `;
        return;
    }

    vehicles.forEach(vehicle => {
        const isChecked = activeFilters.includes(vehicle.id);
        const li = document.createElement('li');
        li.className = 'vehicle-item';
        
        // Inline css variable for checkbox styling
        li.style.setProperty('--checkbox-color', vehicle.color);

        const statusLabel = vehicle.status === 'available' ? 'Attiva' : 'Manutenzione';
        const statusClass = vehicle.status === 'available' ? 'status-available' : 'status-maintenance';
        
        const kmLabel = vehicle.km !== undefined && vehicle.km !== null && vehicle.km !== '' ? `${vehicle.km} km` : 'N/D';
        const fuelLabel = vehicle.fuel || 'N/D';

        li.innerHTML = `
            <div class="vehicle-item-left" onclick="toggleVehicleFilter('${vehicle.id}')">
                <span class="vehicle-checkbox ${isChecked ? 'checked' : ''}"></span>
                <div class="vehicle-info">
                    <span class="vehicle-name" style="border-left: 3px solid ${vehicle.color}; padding-left: 8px;">
                        ${vehicle.brandModel}
                    </span>
                    <div class="vehicle-details">
                        <span class="vehicle-plate">${vehicle.plate}</span>
                        <span class="vehicle-status-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="vehicle-metrics">
                        <span class="vehicle-metric-item" title="Chilometri attuali">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 10px; height: 10px; vertical-align: middle; margin-right: 2px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${kmLabel}
                        </span>
                        <span class="vehicle-metric-item" title="Carburante attuale">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 10px; height: 10px; vertical-align: middle; margin-right: 2px;"><path d="M3 22V2h10l7 7v13H3z"/></svg>${fuelLabel}
                        </span>
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:4px;">
                <button class="btn-delete-vehicle" onclick="openEditVehicle('${vehicle.id}')" title="Modifica vettura" style="color: var(--text-secondary);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-delete-vehicle" onclick="confirmDeleteVehicle('${vehicle.id}')" title="Elimina vettura">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                </button>
            </div>
        `;
        vehicleListEl.appendChild(li);
    });
}

function toggleVehicleFilter(vehicleId) {
    if (activeFilters.includes(vehicleId)) {
        activeFilters = activeFilters.filter(id => id !== vehicleId);
    } else {
        activeFilters.push(vehicleId);
    }
    renderVehicleList();
    renderActiveView();
}

function updateVehicleSelectOptions() {
    // Populate select inside booking modal
    bookingVehicleSelect.innerHTML = '<option value="" disabled selected>Scegli una vettura...</option>';
    vehicles.forEach(vehicle => {
        const statusLabel = vehicle.status === 'maintenance' ? ' (In manutenzione)' : '';
        const option = document.createElement('option');
        option.value = vehicle.id;
        option.textContent = `${vehicle.brandModel} - ${vehicle.plate}${statusLabel}`;
        
        if (vehicle.status === 'maintenance') {
            option.style.color = 'var(--warning)';
        }
        bookingVehicleSelect.appendChild(option);
    });
}

// Window globally scoped function for onclick triggers
window.toggleVehicleFilter = toggleVehicleFilter;

window.openEditVehicle = function(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) openVehicleModal(vehicle);
};

window.confirmDeleteVehicle = function(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const countBookings = bookings.filter(b => b.vehicleId === vehicleId).length;
    let confirmMsg = `Sei sicuro di voler eliminare la vettura <strong>${vehicle.brandModel}</strong> (${vehicle.plate})?`;
    
    if (countBookings > 0) {
        confirmMsg += `<br><br><span style="color: var(--danger); font-weight: bold;">ATTENZIONE:</span> Ci sono <strong>${countBookings}</strong> prenotazioni collegate che verranno rimosse permanentemente!`;
    }

    // Call custom confirmation modal
    showConfirmModal(
        'Elimina Vettura',
        confirmMsg,
        async () => {
            try {
                const response = await fetch(`${API_BASE}/vehicles/${vehicleId}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Errore durante la cancellazione.');

                await fetchDataFromServer();
                showToast('Vettura Rimossa', `La vettura ${vehicle.brandModel} è stata eliminata.`, 'warning');
            } catch (error) {
                showToast('Errore', 'Impossibile eliminare la vettura dal server.', 'error');
            }
        }
    );
};

    const km = vehicleKmInput.value ? parseInt(vehicleKmInput.value, 10) : null;
    const fuel = vehicleFuelSelect.value || '';

    const vehiclePayload = { brandModel: model, plate, color, status, notes, km, fuel };

    try {
        let response;
        if (id) {
            // EDIT existing vehicle
            response = await fetch(`${API_BASE}/vehicles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehiclePayload)
            });
        } else {
            // ADD new vehicle
            response = await fetch(`${API_BASE}/vehicles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehiclePayload)
            });
            if (response.ok) {
                const savedVeh = await response.json();
                activeFilters.push(savedVeh.id); // Show immediately on calendar
            }
        }

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Errore durante il salvataggio.');
        }

        await fetchDataFromServer();
        closeVehicleModal();
        const actionLabel = id ? 'aggiornata' : 'inserita';
        showToast(id ? 'Vettura Aggiornata' : 'Vettura Aggiunta', `${model} ${actionLabel} correttamente.`, 'success');
    } catch (error) {
        showToast('Errore', error.message, 'error');
    }
}

// --- BOOKING MANAGEMENT ---
async function handleBookingSubmit(e) {
    e.preventDefault();

    const id = bookingIdInput.value;
    const clientName = bookingClientInput.value.trim();
    const vehicleId = bookingVehicleSelect.value;
    
    const startDate = bookingStartDateInput.value;
    const startTime = bookingStartTimeInput.value;
    const endDate = bookingEndDateInput.value;
    const endTime = bookingEndTimeInput.value;
    const status = bookingStatusSelect.value;
    const notes = bookingNotesInput.value.trim();

    const kmStart = bookingKmStartInput.value ? parseInt(bookingKmStartInput.value, 10) : null;
    const kmEnd = bookingKmEndInput.value ? parseInt(bookingKmEndInput.value, 10) : null;
    const fuelStart = bookingFuelStartSelect.value || '';
    const fuelEnd = bookingFuelEndSelect.value || '';
    const revenue = bookingRevenueInput.value ? parseFloat(bookingRevenueInput.value) : null;

    const bookingPayload = {
        id: id || undefined, // Send undefined if new, to let server generate it
        vehicleId,
        clientName,
        startDate: `${startDate}T${startTime}`,
        endDate: `${endDate}T${endTime}`,
        status,
        notes,
        kmStart,
        kmEnd,
        fuelStart,
        fuelEnd,
        revenue
    };

    try {
        const response = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingPayload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Errore durante il salvataggio.');
        }

        // Automatic synchronization: update vehicle's current km and fuel if kmEnd or fuelEnd are set
        if (kmEnd || fuelEnd) {
            const veh = vehicles.find(v => v.id === vehicleId);
            if (veh) {
                const updatedVeh = { ...veh };
                if (kmEnd && (!veh.km || kmEnd > veh.km)) {
                    updatedVeh.km = kmEnd;
                }
                if (fuelEnd) {
                    updatedVeh.fuel = fuelEnd;
                }
                if (updatedVeh.km !== veh.km || updatedVeh.fuel !== veh.fuel) {
                    await fetch(`${API_BASE}/vehicles/${vehicleId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedVeh)
                    });
                }
            }
        }

        await fetchDataFromServer();
        closeBookingModal();
        
        const actLabel = id ? 'modificata' : 'creata';
        showToast('Prenotazione Salvata', `La prenotazione di ${clientName} è stata ${actLabel}.`, 'success');
    } catch (error) {
        showToast('Conflitto / Errore', error.message, 'error');
    }
}

function handleBookingDelete() {
    const id = bookingIdInput.value;
    if (!id) return;

    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    showConfirmModal(
        'Elimina Prenotazione',
        `Sei sicuro di voler eliminare la prenotazione di <strong>${booking.clientName}</strong>?`,
        async () => {
            try {
                const response = await fetch(`${API_BASE}/bookings/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Errore durante la cancellazione.');

                await fetchDataFromServer();
                closeBookingModal();
                showToast('Prenotazione Eliminata', `La prenotazione di ${booking.clientName} è stata cancellata.`, 'warning');
            } catch (error) {
                showToast('Errore', 'Impossibile cancellare la prenotazione.', 'error');
            }
        }
    );
}

// --- VIEW RENDERING ENGINE ---
function renderActiveView() {
    // Clear content
    calendarViewport.innerHTML = '';

    // Set navbar month/week indicator
    if (currentView === 'month' || currentView === 'timeline') {
        currentDateLabel.textContent = formatMonthYear(currentDate);
    } else if (currentView === 'week') {
        const monday = getMondayOfDate(currentDate);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        let startText = monday.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
        let endText = sunday.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
        currentDateLabel.textContent = `${startText} - ${endText}`;
    }

    // Direct to rendering methods
    if (currentView === 'month') {
        renderMonthView();
    } else if (currentView === 'week') {
        renderWeekView();
    } else if (currentView === 'timeline') {
        renderTimelineView();
    }
}

// --- MONTH VIEW RENDERING ---
function renderMonthView() {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1...
    let startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Make Mon first

    const daysInMonth = getDaysInMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const monthViewContainer = document.createElement('div');
    monthViewContainer.className = 'month-view';

    // RENDER DAYS OF WEEK HEADER
    const weekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const weekdaysHeader = document.createElement('div');
    weekdaysHeader.className = 'weekdays-header';
    weekdays.forEach(day => {
        const d = document.createElement('div');
        d.textContent = day;
        weekdaysHeader.appendChild(d);
    });
    monthViewContainer.appendChild(weekdaysHeader);

    // RENDER GRID
    const grid = document.createElement('div');
    grid.className = 'month-grid';

    const totalCells = 42;
    const today = new Date();

    for (let i = 0; i < totalCells; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'month-day';

        let dayNumber;
        let isCurrentMonth = true;
        let targetDate = new Date(year, month, 1);

        if (i < startOffset) {
            dayNumber = prevMonthDays - startOffset + i + 1;
            dayCell.classList.add('other-month');
            isCurrentMonth = false;
            targetDate = new Date(year, month - 1, dayNumber);
        } else if (i >= startOffset + daysInMonth) {
            dayNumber = i - (startOffset + daysInMonth) + 1;
            dayCell.classList.add('other-month');
            isCurrentMonth = false;
            targetDate = new Date(year, month + 1, dayNumber);
        } else {
            dayNumber = i - startOffset + 1;
            targetDate = new Date(year, month, dayNumber);
            
            if (today.getDate() === dayNumber && today.getMonth() === month && today.getFullYear() === year) {
                dayCell.classList.add('is-today');
            }
        }

        const header = document.createElement('div');
        header.className = 'day-header';
        const num = document.createElement('span');
        num.className = 'day-number';
        num.textContent = dayNumber;
        header.appendChild(num);
        dayCell.appendChild(header);

        // Fetch bookings for this day
        const dayBookingsContainer = document.createElement('div');
        dayBookingsContainer.className = 'month-day-bookings';
        
        const cellStart = new Date(targetDate);
        cellStart.setHours(0,0,0,0);
        const cellEnd = new Date(targetDate);
        cellEnd.setHours(23,59,59,999);

        // Filter bookings
        const dayBookings = bookings.filter(b => {
            if (!activeFilters.includes(b.vehicleId)) return false;
            
            const bStart = new Date(b.startDate);
            const bEnd = new Date(b.endDate);
            return bStart <= cellEnd && bEnd >= cellStart;
        }).sort((a,b) => new Date(a.startDate) - new Date(b.startDate));

        dayBookings.forEach(booking => {
            const vehicle = vehicles.find(v => v.id === booking.vehicleId);
            if (!vehicle) return;

            const pill = document.createElement('div');
            pill.className = 'booking-pill';
            if (booking.status === 'pending') {
                pill.classList.add('is-pending');
            }
            pill.style.backgroundColor = vehicle.color;
            
            const statusLabel = booking.status === 'pending' ? ' [Opzione]' : '';
            pill.title = `${booking.clientName} (${vehicle.brandModel})${statusLabel}`;
            pill.textContent = `${booking.clientName} | ${vehicle.brandModel}`;
            
            pill.addEventListener('click', (e) => {
                e.stopPropagation();
                openBookingModal(booking);
            });

            dayBookingsContainer.appendChild(pill);
        });

        dayCell.appendChild(dayBookingsContainer);

        dayCell.addEventListener('click', () => {
            const formattedDate = targetDate.toISOString().substring(0, 10);
            openBookingModal(null, formattedDate);
        });

        grid.appendChild(dayCell);
    }

    monthViewContainer.appendChild(grid);
    calendarViewport.appendChild(monthViewContainer);
}

// --- WEEK VIEW RENDERING ---
function renderWeekView() {
    const monday = getMondayOfDate(currentDate);
    const today = new Date();

    const weekViewContainer = document.createElement('div');
    weekViewContainer.className = 'week-view';

    // RENDER HEADER ROW
    const header = document.createElement('div');
    header.className = 'week-grid-header';
    
    const emptyCell = document.createElement('div');
    emptyCell.className = 'week-grid-header-cell time-col-header';
    emptyCell.textContent = 'Orari';
    header.appendChild(emptyCell);

    const weekDays = [];
    const weekdayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDays.push(d);

        const hCell = document.createElement('div');
        hCell.className = 'week-grid-header-cell';
        
        const isCurrentDay = today.getDate() === d.getDate() && today.getMonth() === d.getMonth() && today.getFullYear() === d.getFullYear();
        if (isCurrentDay) {
            hCell.classList.add('week-header-cell-today');
        }

        hCell.innerHTML = `${weekdayNames[i]} <span class="week-header-day-num">${d.getDate()}</span>`;
        header.appendChild(hCell);
    }
    weekViewContainer.appendChild(header);

    // GRID BODY
    const body = document.createElement('div');
    body.className = 'week-grid-body';

    const startHour = 8;
    const endHour = 20;

    for (let hour = startHour; hour <= endHour; hour++) {
        const timeLabel = document.createElement('div');
        timeLabel.className = 'week-time-label';
        timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
        body.appendChild(timeLabel);

        for (let dIdx = 0; dIdx < 7; dIdx++) {
            const dayDate = weekDays[dIdx];
            const cell = document.createElement('div');
            cell.className = 'week-day-column';
            
            cell.addEventListener('click', () => {
                const dayStr = dayDate.toISOString().substring(0, 10);
                const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                openBookingModal(null, dayStr, hourStr);
            });

            body.appendChild(cell);
        }
    }

    const weekStartLimit = new Date(monday);
    weekStartLimit.setHours(startHour, 0, 0, 0);
    const weekEndLimit = new Date(weekDays[6]);
    weekEndLimit.setHours(endHour, 0, 0, 0);

    const weekBookings = bookings.filter(b => {
        if (!activeFilters.includes(b.vehicleId)) return false;
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        return bStart < weekEndLimit && bEnd > weekStartLimit;
    });

    weekBookings.forEach(booking => {
        const vehicle = vehicles.find(v => v.id === booking.vehicleId);
        if (!vehicle) return;

        const bStart = new Date(booking.startDate);
        const bEnd = new Date(booking.endDate);

        for (let dIdx = 0; dIdx < 7; dIdx++) {
            const currentDay = weekDays[dIdx];
            const dayStart = new Date(currentDay);
            dayStart.setHours(startHour, 0, 0, 0);
            const dayEnd = new Date(currentDay);
            dayEnd.setHours(endHour, 0, 0, 0);

            if (bStart < dayEnd && bEnd > dayStart) {
                const activeStart = bStart < dayStart ? dayStart : bStart;
                const activeEnd = bEnd > dayEnd ? dayEnd : bEnd;

                const durationHours = (activeEnd - activeStart) / (1000 * 60 * 60);
                if (durationHours <= 0) continue;

                const startDiffHours = (activeStart - dayStart) / (1000 * 60 * 60);

                const topPx = startDiffHours * 60;
                const heightPx = durationHours * 60;
                const colIdx = dIdx + 2;

                const bookingCard = document.createElement('div');
                bookingCard.className = 'week-booking-card';
                if (booking.status === 'pending') {
                    bookingCard.classList.add('is-pending');
                }
                bookingCard.style.backgroundColor = vehicle.color;
                bookingCard.style.top = `${topPx}px`;
                bookingCard.style.height = `${heightPx}px`;
                bookingCard.style.gridColumn = colIdx;

                const timeText = `${activeStart.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})} - ${activeEnd.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}`;
                const label = booking.status === 'pending' ? ' (Opz.)' : '';
                bookingCard.innerHTML = `
                    <div class="week-booking-title" title="${booking.clientName} (${vehicle.brandModel})">${booking.clientName}${label}</div>
                    <div class="week-booking-time">${vehicle.brandModel}<br>${timeText}</div>
                `;

                bookingCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openBookingModal(booking);
                });

                body.appendChild(bookingCard);
            }
        }
    });

    weekViewContainer.appendChild(body);
    calendarViewport.appendChild(weekViewContainer);
}

// --- TIMELINE (SCHEDULER) VIEW RENDERING ---
function renderTimelineView() {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysInMonth = getDaysInMonth(year, month);
    const today = new Date();

    const timelineView = document.createElement('div');
    timelineView.className = 'timeline-view';

    const container = document.createElement('div');
    container.className = 'timeline-container';

    // 1. RENDER HEADER ROW
    const headerRow = document.createElement('div');
    headerRow.className = 'timeline-header-row';

    const vehHeader = document.createElement('div');
    vehHeader.className = 'timeline-vehicle-header';
    vehHeader.textContent = 'Veicoli / Giorni';
    headerRow.appendChild(vehHeader);

    const daysScroll = document.createElement('div');
    daysScroll.className = 'timeline-days-scroll';

    const weekdayNames = ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'];

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);
        const cell = document.createElement('div');
        cell.className = 'timeline-day-header-cell';
        
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        if (isToday) cell.classList.add('is-today');

        cell.innerHTML = `
            <span class="timeline-day-name">${weekdayNames[cellDate.getDay()]}</span>
            <span class="timeline-day-num">${day}</span>
        `;
        daysScroll.appendChild(cell);
    }
    headerRow.appendChild(daysScroll);
    container.appendChild(headerRow);

    // 2. RENDER ROWS
    const activeVehicles = vehicles.filter(v => activeFilters.includes(v.id));

    if (activeVehicles.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
            <p>Seleziona o aggiungi almeno una vettura nella barra laterale per visualizzare la timeline.</p>
        `;
        container.appendChild(empty);
        timelineView.appendChild(container);
        calendarViewport.appendChild(timelineView);
        return;
    }

    activeVehicles.forEach(vehicle => {
        const row = document.createElement('div');
        row.className = 'timeline-row';

        const vehCell = document.createElement('div');
        vehCell.className = 'timeline-vehicle-cell';
        vehCell.style.borderLeft = `4px solid ${vehicle.color}`;
        vehCell.innerHTML = `
            <span class="timeline-row-veh-name">${vehicle.brandModel}</span>
            <span class="timeline-row-veh-plate">${vehicle.plate}</span>
        `;
        row.appendChild(vehCell);

        const cellsContainer = document.createElement('div');
        cellsContainer.className = 'timeline-cells-container';

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'timeline-grid-cell';
            
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            if (isToday) cell.classList.add('is-today');

            cell.addEventListener('click', () => {
                const dayStr = `${year}-${(month+1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                openBookingModal(null, dayStr, '09:00', vehicle.id);
            });

            cellsContainer.appendChild(cell);
        }

        const monthStart = new Date(year, month, 1, 0, 0, 0);
        const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59);

        const vehicleBookings = bookings.filter(b => b.vehicleId === vehicle.id && new Date(b.startDate) <= monthEnd && new Date(b.endDate) >= monthStart);

        vehicleBookings.forEach(booking => {
            const bStart = new Date(booking.startDate);
            const bEnd = new Date(booking.endDate);

            const drawStart = bStart < monthStart ? monthStart : bStart;
            const drawEnd = bEnd > monthEnd ? monthEnd : bEnd;

            const dayMs = 24 * 60 * 60 * 1000;
            const startOffsetDays = (drawStart - monthStart) / dayMs;
            const durationDays = (drawEnd - drawStart) / dayMs;

            if (durationDays <= 0) return;

            const leftPx = startOffsetDays * 50;
            const widthPx = durationDays * 50;

            const bar = document.createElement('div');
            bar.className = 'timeline-booking-bar';
            if (booking.status === 'pending') {
                bar.classList.add('is-pending');
            }
            bar.style.backgroundColor = vehicle.color;
            bar.style.left = `${leftPx}px`;
            bar.style.width = `${widthPx}px`;

            const label = booking.status === 'pending' ? ' [Opz.]' : '';
            bar.innerHTML = `
                <span class="timeline-booking-bar-text" title="${booking.clientName}${label}">
                    ${booking.clientName}${label}
                </span>
            `;

            bar.addEventListener('click', (e) => {
                e.stopPropagation();
                openBookingModal(booking);
            });

            cellsContainer.appendChild(bar);
        });

        row.appendChild(cellsContainer);
        container.appendChild(row);
    });

    timelineView.appendChild(container);
    calendarViewport.appendChild(timelineView);
}

// --- MODAL UTILITIES ---

// Booking Modal
function openBookingModal(booking = null, prefilledDate = null, prefilledTime = null, vehicleId = null) {
    bookingForm.reset();
    
    if (booking) {
        selectedBooking = booking;
        bookingModalTitle.textContent = 'Modifica Prenotazione';
        bookingIdInput.value = booking.id;
        bookingClientInput.value = booking.clientName;
        bookingVehicleSelect.value = booking.vehicleId;
        bookingStatusSelect.value = booking.status || 'confirmed';
        
        const [sDate, sTime] = booking.startDate.split('T');
        const [eDate, eTime] = booking.endDate.split('T');
        
        bookingStartDateInput.value = sDate;
        bookingStartTimeInput.value = sTime;
        bookingEndDateInput.value = eDate;
        bookingEndTimeInput.value = eTime;
        
        bookingNotesInput.value = booking.notes || '';

        bookingKmStartInput.value = booking.kmStart !== undefined && booking.kmStart !== null ? booking.kmStart : '';
        bookingKmEndInput.value = booking.kmEnd !== undefined && booking.kmEnd !== null ? booking.kmEnd : '';
        bookingFuelStartSelect.value = booking.fuelStart || '';
        bookingFuelEndSelect.value = booking.fuelEnd || '';
        bookingRevenueInput.value = booking.revenue !== undefined && booking.revenue !== null ? booking.revenue : '';
        
        deleteBookingBtn.style.display = 'block';
    } else {
        selectedBooking = null;
        bookingModalTitle.textContent = 'Nuova Prenotazione';
        bookingIdInput.value = '';
        
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const defaultStartDate = prefilledDate || today.toISOString().substring(0, 10);
        const defaultEndDate = prefilledDate || tomorrow.toISOString().substring(0, 10);
        
        bookingStartDateInput.value = defaultStartDate;
        bookingStartTimeInput.value = prefilledTime || '09:00';
        bookingEndDateInput.value = defaultEndDate;
        bookingEndTimeInput.value = prefilledTime ? addHoursToTimeString(prefilledTime, 8) : '18:00';
        bookingStatusSelect.value = 'confirmed';

        bookingKmStartInput.value = '';
        bookingKmEndInput.value = '';
        bookingFuelStartSelect.value = '';
        bookingFuelEndSelect.value = '';
        bookingRevenueInput.value = '';

        if (vehicleId) {
            bookingVehicleSelect.value = vehicleId;
            // Trigger pre-fill from vehicle
            const vehicle = vehicles.find(v => v.id === vehicleId);
            if (vehicle) {
                bookingKmStartInput.value = vehicle.km !== undefined && vehicle.km !== null ? vehicle.km : '';
                bookingFuelStartSelect.value = vehicle.fuel || '';
            }
        }

        deleteBookingBtn.style.display = 'none';
    }

    bookingModal.classList.add('active');
}

function closeBookingModal() {
    bookingModal.classList.remove('active');
}

// Vehicle Modal
function openVehicleModal(vehicle = null) {
    vehicleForm.reset();
    const vehicleIdInput = document.getElementById('vehicle-id');
    const vehicleModalTitle = document.getElementById('vehicle-modal-title');
    const vehicleSubmitBtn = document.getElementById('vehicle-submit-btn');

    if (vehicle) {
        // EDIT MODE — pre-fill form with existing vehicle data
        vehicleIdInput.value = vehicle.id;
        document.getElementById('vehicle-model').value = vehicle.brandModel;
        document.getElementById('vehicle-plate').value = vehicle.plate;
        document.getElementById('vehicle-color').value = vehicle.color;
        document.getElementById('vehicle-status').value = vehicle.status;
        document.getElementById('vehicle-notes').value = vehicle.notes || '';
        vehicleKmInput.value = vehicle.km !== undefined && vehicle.km !== null ? vehicle.km : '';
        vehicleFuelSelect.value = vehicle.fuel || '';
        vehicleModalTitle.textContent = 'Modifica Vettura';
        vehicleSubmitBtn.textContent = 'Salva Modifiche';
    } else {
        // ADD MODE — assign random color
        vehicleIdInput.value = '';
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#06b6d4'];
        document.getElementById('vehicle-color').value = colors[Math.floor(Math.random() * colors.length)];
        vehicleKmInput.value = '';
        vehicleFuelSelect.value = '';
        vehicleModalTitle.textContent = 'Aggiungi Nuova Vettura';
        vehicleSubmitBtn.textContent = 'Aggiungi';
    }

    vehicleModal.classList.add('active');
}

function closeVehicleModal() {
    vehicleModal.classList.remove('active');
}

// Time calculation helper
function addHoursToTimeString(timeStr, hoursToAdd) {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h + hoursToAdd);
    date.setMinutes(m);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// --- RENDICONTO MENSILE LOGIC ---
function openReportModal() {
    // Populate month select default (current month/year in navigator)
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    reportMonthInput.value = `${year}-${month}`;

    // Populate vehicles dropdown in report
    reportVehicleSelect.innerHTML = '<option value="">Tutte le vetture</option>';
    vehicles.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle.id;
        option.textContent = `${vehicle.brandModel} (${vehicle.plate})`;
        reportVehicleSelect.appendChild(option);
    });

    renderReportData();
    reportModal.classList.add('active');
}

function closeReportModal() {
    reportModal.classList.remove('active');
}

function renderReportData() {
    if (!reportMonthInput.value) return;
    const [selectedYear, selectedMonth] = reportMonthInput.value.split('-').map(Number);
    const filterVehicleId = reportVehicleSelect.value;

    reportTableBody.innerHTML = '';

    // Filter bookings that belong to the selected month and matches vehicle
    const filteredBookings = bookings.filter(b => {
        const bDate = new Date(b.startDate);
        const isSameMonth = bDate.getFullYear() === selectedYear && (bDate.getMonth() + 1) === selectedMonth;
        const matchesVehicle = !filterVehicleId || b.vehicleId === filterVehicleId;
        return isSameMonth && matchesVehicle;
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    let totalCount = filteredBookings.length;
    let totalKm = 0;
    let totalRevenue = 0;

    if (totalCount === 0) {
        reportTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">
                    Nessun noleggio registrato per questo periodo
                </td>
            </tr>
        `;
        statCount.textContent = '0';
        statKm.textContent = '0 km';
        statRevenue.textContent = '0.00 €';
        return;
    }

    filteredBookings.forEach(b => {
        const vehicle = vehicles.find(v => v.id === b.vehicleId);
        const vehicleName = vehicle ? `${vehicle.brandModel} (${vehicle.plate})` : 'Sconosciuto';

        const kmStart = b.kmStart !== undefined && b.kmStart !== null && b.kmStart !== '' ? parseInt(b.kmStart, 10) : null;
        const kmEnd = b.kmEnd !== undefined && b.kmEnd !== null && b.kmEnd !== '' ? parseInt(b.kmEnd, 10) : null;
        let deltaKm = '';
        if (kmStart !== null && kmEnd !== null) {
            const diff = kmEnd - kmStart;
            deltaKm = `${diff} km`;
            totalKm += diff;
        }

        const fuelStart = b.fuelStart || '-';
        const fuelEnd = b.fuelEnd || '-';
        const fuelText = fuelStart !== '-' || fuelEnd !== '-' ? `${fuelStart} → ${fuelEnd}` : '-';

        const revenue = b.revenue !== undefined && b.revenue !== null && b.revenue !== '' ? parseFloat(b.revenue) : 0;
        totalRevenue += revenue;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 12px 16px;"><strong>${b.clientName}</strong></td>
            <td style="padding: 12px 16px;">${vehicleName}</td>
            <td style="padding: 12px 16px;">${formatDateItalian(b.startDate)}</td>
            <td style="padding: 12px 16px;">${formatDateItalian(b.endDate)}</td>
            <td style="padding: 12px 16px; text-align: right;">${kmStart !== null ? kmStart : '-'}</td>
            <td style="padding: 12px 16px; text-align: right;">${kmEnd !== null ? kmEnd : '-'}</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: 600;">${deltaKm || '-'}</td>
            <td style="padding: 12px 16px; text-align: center;">${fuelText}</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: var(--success);">${revenue.toFixed(2)} €</td>
        `;
        reportTableBody.appendChild(tr);
    });

    statCount.textContent = totalCount;
    statKm.textContent = `${totalKm} km`;
    statRevenue.textContent = `${totalRevenue.toFixed(2)} €`;
}

function exportReportToCSV() {
    if (!reportMonthInput.value) return;
    const [selectedYear, selectedMonth] = reportMonthInput.value.split('-').map(Number);
    const filterVehicleId = reportVehicleSelect.value;

    const filteredBookings = bookings.filter(b => {
        const bDate = new Date(b.startDate);
        const isSameMonth = bDate.getFullYear() === selectedYear && (bDate.getMonth() + 1) === selectedMonth;
        const matchesVehicle = !filterVehicleId || b.vehicleId === filterVehicleId;
        return isSameMonth && matchesVehicle;
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    if (filteredBookings.length === 0) {
        showToast('Esportazione Annullata', 'Nessun dato da esportare.', 'warning');
        return;
    }

    // Costruisci il CSV
    let csvContent = "\uFEFF"; // BOM per supportare caratteri speciali in Excel
    csvContent += "Cliente;Veicolo;Inizio;Fine;Km Partenza;Km Rientro;Delta Km;Carburante Partenza;Carburante Rientro;Rendimento (EUR)\r\n";

    filteredBookings.forEach(b => {
        const vehicle = vehicles.find(v => v.id === b.vehicleId);
        const vehicleName = vehicle ? `${vehicle.brandModel} (${vehicle.plate})` : 'Sconosciuto';
        const kmStart = b.kmStart !== undefined && b.kmStart !== null && b.kmStart !== '' ? b.kmStart : '';
        const kmEnd = b.kmEnd !== undefined && b.kmEnd !== null && b.kmEnd !== '' ? b.kmEnd : '';
        const deltaKm = kmStart !== '' && kmEnd !== '' ? (kmEnd - kmStart) : '';
        const fuelStart = b.fuelStart || '';
        const fuelEnd = b.fuelEnd || '';
        const revenue = b.revenue !== undefined && b.revenue !== null && b.revenue !== '' ? b.revenue.toFixed(2) : '0.00';

        const row = [
            b.clientName,
            vehicleName,
            formatDateItalian(b.startDate),
            formatDateItalian(b.endDate),
            kmStart,
            kmEnd,
            deltaKm,
            fuelStart,
            fuelEnd,
            revenue
        ].map(val => `"${val.toString().replace(/"/g, '""')}"`).join(';');
        csvContent += row + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const vehicleNamePart = filterVehicleId ? `_${vehicles.find(v => v.id === filterVehicleId).plate}` : '';
    link.setAttribute("download", `rendiconto_${selectedYear}_${selectedMonth}${vehicleNamePart}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV Esportato', 'Il rendiconto è stato scaricato correttamente.', 'success');
}
