/**
 * Fast_cc - Backend Server
 * Node.js & Express.js with JSON database
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DATABASE_PATH || path.join(__dirname, 'database.json');


app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(__dirname));

// --- DATA ACCESS LAYER ---
function loadData() {
    if (!fs.existsSync(DB_FILE)) {
        // Seed default database structure if not exists
        const defaultData = {
            vehicles: [
                { id: 'veh-1', brandModel: 'Fiat 500 Hybrid', plate: 'GE123XX', color: '#ff5722', status: 'available', notes: 'Chiavi in bacheca A' },
                { id: 'veh-2', brandModel: 'Jeep Renegade 4xe', plate: 'AB456CD', color: '#3b82f6', status: 'available', notes: 'Presa di ricarica in dotazione' },
                { id: 'veh-3', brandModel: 'Fiat Panda Mild-Hybrid', plate: 'EF789GH', color: '#10b981', status: 'available', notes: 'Parcheggio retro' },
                { id: 'veh-4', brandModel: 'Lancia Ypsilon Tech', plate: 'JK012LM', color: '#8b5cf6', status: 'maintenance', notes: 'Tagliando programmato fino a fine mese' }
            ],
            bookings: [] // Will seed bookings relative to current date below
        };

        // Seed default bookings relative to today
        const today = new Date();
        
        const date1Start = new Date(today);
        date1Start.setDate(today.getDate() - 1);
        date1Start.setHours(9, 0, 0, 0);
        const date1End = new Date(today);
        date1End.setDate(today.getDate() + 1);
        date1End.setHours(18, 0, 0, 0);

        const date2Start = new Date(today);
        date2Start.setDate(today.getDate() + 2);
        date2Start.setHours(8, 30, 0, 0);
        const date2End = new Date(today);
        date2End.setDate(today.getDate() + 5);
        date2End.setHours(12, 30, 0, 0);

        const date3Start = new Date(today);
        date3Start.setDate(today.getDate() - 3);
        date3Start.setHours(10, 0, 0, 0);
        const date3End = new Date(today);
        date3End.setDate(today.getDate() - 1);
        date3End.setHours(17, 0, 0, 0);

        defaultData.bookings = [
            {
                id: 'book-1',
                vehicleId: 'veh-2',
                clientName: 'Mario Rossi',
                startDate: date1Start.toISOString().substring(0, 16),
                endDate: date1End.toISOString().substring(0, 16),
                status: 'confirmed',
                notes: 'Sinistro cliente. Riparazione paraurti anteriore.'
            },
            {
                id: 'book-2',
                vehicleId: 'veh-1',
                clientName: 'Luca Bianchi',
                startDate: date2Start.toISOString().substring(0, 16),
                endDate: date2End.toISOString().substring(0, 16),
                status: 'pending',
                notes: 'Richiesta vettura con cambio automatico.'
            },
            {
                id: 'book-3',
                vehicleId: 'veh-3',
                clientName: 'Elena Verdi',
                startDate: date3Start.toISOString().substring(0, 16),
                endDate: date3End.toISOString().substring(0, 16),
                status: 'confirmed',
                notes: 'Richiamo ufficiale Jeep.'
            }
        ];

        saveData(defaultData);
        return defaultData;
    }

    try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Error reading database file, using fallback empty state", error);
        return { vehicles: [], bookings: [] };
    }
}

// Atomic file write to prevent data corruption
function saveData(data) {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
}

// Helper to format date for conflict warnings
function formatDateTimeItalian(dateStr) {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return `${date} alle ore ${time}`;
}

// --- API ROUTES ---

// 1. Get full data
app.get('/api/data', (req, res) => {
    const data = loadData();
    res.json(data);
});

// 2. Add vehicle
app.post('/api/vehicles', (req, res) => {
    const data = loadData();
    const newVehicle = req.body;
    
    if (!newVehicle.brandModel || !newVehicle.plate) {
        return res.status(400).json({ error: 'invalid_data', message: 'Modello e targa sono obbligatori.' });
    }

    // Plate duplicate check
    if (data.vehicles.some(v => v.plate.toUpperCase() === newVehicle.plate.toUpperCase())) {
        return res.status(400).json({ error: 'duplicate_plate', message: 'Una vettura con questa targa è già registrata.' });
    }

    newVehicle.id = newVehicle.id || `veh-${Date.now()}`;
    newVehicle.plate = newVehicle.plate.toUpperCase();
    
    data.vehicles.push(newVehicle);
    saveData(data);
    
    res.status(201).json(newVehicle);
});

// 3. Delete vehicle (and its bookings)
app.delete('/api/vehicles/:id', (req, res) => {
    const data = loadData();
    const vehicleId = req.params.id;

    const vehicleExists = data.vehicles.some(v => v.id === vehicleId);
    if (!vehicleExists) {
        return res.status(404).json({ error: 'not_found', message: 'Vettura non trovata.' });
    }

    data.vehicles = data.vehicles.filter(v => v.id !== vehicleId);
    data.bookings = data.bookings.filter(b => b.vehicleId !== vehicleId);
    
    saveData(data);
    res.json({ message: 'Vettura ed eventuali prenotazioni eliminate correttamente.' });
});

// 3b. Edit vehicle (update details and status)
app.put('/api/vehicles/:id', (req, res) => {
    const data = loadData();
    const vehicleId = req.params.id;
    const updates = req.body;

    const index = data.vehicles.findIndex(v => v.id === vehicleId);
    if (index === -1) {
        return res.status(404).json({ error: 'not_found', message: 'Vettura non trovata.' });
    }

    // Check plate uniqueness only if plate is being changed
    if (updates.plate) {
        const plateTaken = data.vehicles.some(v =>
            v.plate.toUpperCase() === updates.plate.toUpperCase() && v.id !== vehicleId
        );
        if (plateTaken) {
            return res.status(400).json({ error: 'duplicate_plate', message: 'Una vettura con questa targa è già registrata.' });
        }
        updates.plate = updates.plate.toUpperCase();
    }

    data.vehicles[index] = { ...data.vehicles[index], ...updates };
    saveData(data);
    res.json(data.vehicles[index]);
});

// 4. Add or update booking (with server-side overlap verification)
app.post('/api/bookings', (req, res) => {
    const data = loadData();
    const booking = req.body;

    if (!booking.clientName || !booking.vehicleId || !booking.startDate || !booking.endDate) {
        return res.status(400).json({ error: 'missing_fields', message: 'Tutti i campi obbligatori devono essere compilati.' });
    }

    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    
    if (start >= end) {
        return res.status(400).json({ error: 'invalid_dates', message: 'La data di inizio deve essere precedente a quella di fine.' });
    }

    // Overlap checks
    const conflict = data.bookings.find(b => {
        if (booking.id && b.id === booking.id) return false; // Skip current booking when updating
        if (b.vehicleId !== booking.vehicleId) return false; // Different vehicle
        
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        return start < bEnd && end > bStart;
    });

    if (conflict) {
        return res.status(400).json({
            error: 'overlap',
            message: `La vettura è già occupata da ${conflict.clientName} dal ${formatDateTimeItalian(conflict.startDate)} al ${formatDateTimeItalian(conflict.endDate)}.`
        });
    }

    if (booking.id) {
        // Update existing booking
        const index = data.bookings.findIndex(b => b.id === booking.id);
        if (index === -1) {
            return res.status(404).json({ error: 'not_found', message: 'Prenotazione non trovata.' });
        }
        data.bookings[index] = {
            ...data.bookings[index],
            ...booking
        };
        saveData(data);
        res.json(data.bookings[index]);
    } else {
        // Add new booking
        booking.id = `book-${Date.now()}`;
        booking.status = booking.status || 'confirmed';
        
        data.bookings.push(booking);
        saveData(data);
        res.status(201).json(booking);
    }
});

// 5. Delete booking
app.delete('/api/bookings/:id', (req, res) => {
    const data = loadData();
    const bookingId = req.params.id;

    const bookingExists = data.bookings.some(b => b.id === bookingId);
    if (!bookingExists) {
        return res.status(404).json({ error: 'not_found', message: 'Prenotazione non trovata.' });
    }

    data.bookings = data.bookings.filter(b => b.id !== bookingId);
    saveData(data);
    
    res.json({ message: 'Prenotazione eliminata correttamente.' });
});

// --- SERVER INITIALIZATION ---
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` Fast_cc Server in esecuzione su:`);
    console.log(` http://localhost:${PORT}`);
    console.log(` ==================================================`);
});
