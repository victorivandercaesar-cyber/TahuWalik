/**
 * ============================================
 * Website Pemesanan Makanan - JavaScript
 * Menggunakan Supabase sebagai database
 * ============================================
 */

// ============================================
// KONFIGURASI SUPABASE
// ============================================

const SUPABASE_URL = 'https://lyvnldssbwuqmfdorfei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5dm5sZHNzYnd1cW1mZG9yZmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjU3MDQsImV4cCI6MjA4NzQwMTcwNH0.EYoxdsKjggZPwZmv84bihTyi4yPYqd7VRSSKDzmVyMo';

let supabaseClient = null;
let orderOpen = true;
let pangsitItemCount = 1;
let tahuItemCount = 1;

// Menu settings from admin
let menuSettings = {
    enable_tahu_walik: true,
    enable_pangsit_goreng: true
};

function getSupabaseClient() {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        if (SUPABASE_URL.includes('xxxxx') || SUPABASE_ANON_KEY.includes('...')) {
            console.warn('⚠️ Harap ganti credentials Supabase di script.js');
            return null;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// ============================================
// ORDER OPEN/CLOSE SYSTEM (Supabase)
// ============================================

async function checkOrderStatus() {
    try {
        const client = getSupabaseClient();
        
        if (!client) {
            orderOpen = true;
            updateOrderStatusDisplay();
            return;
        }

        // Read from 'system_status' table
        const { data, error } = await client
            .from('system_status')
            .select('order_status')
            .eq('id', 1)
            .single();

        console.log('System status data:', data);
        console.log('System status error:', error);

        if (error || !data) {
            // If no settings exist, default to open
            orderOpen = true;
            // Create default settings
            await client
                .from('system_status')
                .insert([{ id: 1, order_status: 'open' }]);
            console.log('Created default settings with order_status = open');
        } else {
            orderOpen = data.order_status === 'open';
            console.log('Order status from DB:', data.order_status, '-> orderOpen:', orderOpen);
        }

        updateOrderStatusDisplay();

    } catch (error) {
        console.error('Error checking order status:', error);
        orderOpen = true;
        updateOrderStatusDisplay();
    }
}

// ============================================
// MENU SETTINGS (Fetch from Supabase)
// ============================================

async function fetchMenuSettings() {
    try {
        const client = getSupabaseClient();
        
        if (!client) {
            // Use localStorage as fallback
            const localSettings = localStorage.getItem('menu_settings');
            if (localSettings) {
                menuSettings = JSON.parse(localSettings);
            }
            applyMenuSettings();
            return;
        }

        const { data, error } = await client
            .from('menu_settings')
            .select('*')
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            menuSettings.enable_tahu_walik = data[0].enable_tahu_walik;
            menuSettings.enable_pangsit_goreng = data[0].enable_pangsit_goreng;
        }

        applyMenuSettings();

    } catch (error) {
        console.error('Error fetching menu settings:', error);
        applyMenuSettings();
    }
}

function applyMenuSettings() {
    const tahuOption = document.querySelector('input[name="menu"][value="tahu-walik"]');
    const pangsitOption = document.querySelector('input[name="menu"][value="pangsit-goreng"]');
    const tahuCard = tahuOption?.closest('.menu-option');
    const pangsitCard = pangsitOption?.closest('.menu-option');
    
    if (tahuCard) {
        tahuCard.style.display = menuSettings.enable_tahu_walik ? 'block' : 'none';
    }
    if (pangsitCard) {
        pangsitCard.style.display = menuSettings.enable_pangsit_goreng ? 'block' : 'none';
    }
    
    // If currently selected menu is disabled, reset selection
    const selectedMenu = document.querySelector('input[name="menu"]:checked');
    if (selectedMenu) {
        if (selectedMenu.value === 'tahu-walik' && !menuSettings.enable_tahu_walik) {
            selectedMenu.checked = false;
            showMenuOptions();
        } else if (selectedMenu.value === 'pangsit-goreng' && !menuSettings.enable_pangsit_goreng) {
            selectedMenu.checked = false;
            showMenuOptions();
        }
    }
}

function updateOrderStatusDisplay() {
    const overlay = document.getElementById('order-closed-overlay');
    const banner = document.getElementById('order-closed-banner');
    const form = document.getElementById('order-form');
    const submitBtn = document.getElementById('submit-btn');
    
    if (!orderOpen) {
        // Redirect ke halaman order-closed.html
        window.location.href = 'order-closed.html';
    } else {
        if (overlay) overlay.style.display = 'none';
        if (banner) banner.style.display = 'none';
        if (form) form.classList.remove('form-disabled');
    }
}

// ============================================
// MULTI-ITEM ORDER SYSTEM
// ============================================

// Tampilkan opsi menu berdasarkan pilihan
function showMenuOptions() {
    const selectedMenu = document.querySelector('input[name="menu"]:checked');
    const pangsitOptions = document.getElementById('pangsit-options');
    const tahuOptions = document.getElementById('tahu-options');
    const summarySection = document.getElementById('summary-section');
    
    // Reset
    pangsitOptions.style.display = 'none';
    tahuOptions.style.display = 'none';
    summarySection.style.display = 'none';
    
    // Reset item counts
    pangsitItemCount = 1;
    tahuItemCount = 1;
    
    // Reset pangsit items (keep only first)
    const pangsitContainer = pangsitOptions;
    const pangsitItems = pangsitContainer.querySelectorAll('.order-item');
    pangsitItems.forEach((item, index) => {
        if (index > 0) item.remove();
    });
    // Reset select values
    pangsitContainer.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Reset tahu items
    const tahuContainer = tahuOptions;
    const tahuItems = tahuContainer.querySelectorAll('.order-item');
    tahuItems.forEach((item, index) => {
        if (index > 0) item.remove();
    });
    tahuContainer.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
    });

    if (selectedMenu) {
        if (selectedMenu.value === 'pangsit-goreng') {
            pangsitOptions.style.display = 'block';
        } else if (selectedMenu.value === 'tahu-walik') {
            tahuOptions.style.display = 'block';
        }
    }
    
    calculateTotal();
}

// Tambah item Pangsit
function addPangsitItem() {
    if (pangsitItemCount >= 5) {
        showToast('Maksimal 5 item!', 'error');
        return;
    }
    
    pangsitItemCount++;
    
    const container = document.getElementById('pangsit-options');
    const newItem = document.createElement('div');
    newItem.className = 'order-item';
    newItem.id = `pangsit-item-${pangsitItemCount}`;
    newItem.innerHTML = `
        <div class="order-item-header">
            <span class="order-item-number">Item ${pangsitItemCount}</span>
            <button type="button" class="remove-item-btn" onclick="removePangsitItem(${pangsitItemCount})">✕</button>
        </div>
        <div class="order-item-fields">
            <div class="input-group">
                <label>Jumlah Porsi</label>
                <select class="pangsit-porsi" onchange="calculateTotal()">
                    <option value="1">1 Porsi</option>
                    <option value="2">2 Porsi</option>
                    <option value="3">3 Porsi</option>
                    <option value="4">4 Porsi</option>
                    <option value="5">5 Porsi</option>
                </select>
            </div>
            <div class="input-group">
                <label>Isi per Porsi</label>
                <select class="pangsit-jumlah" onchange="calculateTotal()">
                    <option value="5" data-price="10000">5 biji - Rp10.000</option>
                    <option value="8" data-price="15000">8 biji - Rp15.000</option>
                </select>
            </div>
        </div>
        <div class="order-item-options">
            <label class="cabe-option">
                <input type="checkbox" class="pangsit-cabe" onchange="calculateTotal()">
                <span class="cabe-icon">🌶️</span>
                <span class="cabe-text">Tambah Cabe</span>
            </label>
        </div>
    `;
    
    container.appendChild(newItem);
    calculateTotal();
}

// Hapus item Pangsit
function removePangsitItem(itemId) {
    const item = document.getElementById(`pangsit-item-${itemId}`);
    if (item) {
        item.remove();
        // Re-number items
        const items = document.querySelectorAll('#pangsit-options .order-item');
        items.forEach((item, index) => {
            item.querySelector('.order-item-number').textContent = `Item ${index + 1}`;
            item.id = `pangsit-item-${index + 1}`;
            item.querySelector('.remove-item-btn').setAttribute('onclick', `removePangsitItem(${index + 1})`);
        });
        pangsitItemCount = items.length;
        calculateTotal();
    }
}

// Tambah item Tahu
function addTahuItem() {
    if (tahuItemCount >= 5) {
        showToast('Maksimal 5 item!', 'error');
        return;
    }
    
    tahuItemCount++;
    
    const container = document.getElementById('tahu-options');
    const newItem = document.createElement('div');
    newItem.className = 'order-item';
    newItem.id = `tahu-item-${tahuItemCount}`;
    newItem.innerHTML = `
        <div class="order-item-header">
            <span class="order-item-number">Item ${tahuItemCount}</span>
            <button type="button" class="remove-item-btn" onclick="removeTahuItem(${tahuItemCount})">✕</button>
        </div>
        <div class="order-item-fields">
            <div class="input-group">
                <label>Jumlah Porsi</label>
                <select class="tahu-porsi" onchange="calculateTotal()">
                    <option value="1">1 Porsi</option>
                    <option value="2">2 Porsi</option>
                    <option value="3">3 Porsi</option>
                    <option value="4">4 Porsi</option>
                    <option value="5">5 Porsi</option>
                </select>
            </div>
            <div class="input-group">
                <label>Isi per Porsi</label>
                <select class="tahu-jumlah" onchange="calculateTotal()">
                    <option value="3" data-price="10000">3 biji - Rp10.000</option>
                    <option value="5" data-price="15000">5 biji - Rp15.000</option>
                </select>
            </div>
        </div>
        <div class="order-item-options">
            <label class="cabe-option">
                <input type="checkbox" class="tahu-cabe" onchange="calculateTotal()">
                <span class="cabe-icon">🌶️</span>
                <span class="cabe-text">Tambah Cabe</span>
            </label>
        </div>
    `;
    
    container.appendChild(newItem);
    calculateTotal();
}

// Hapus item Tahu
function removeTahuItem(itemId) {
    const item = document.getElementById(`tahu-item-${itemId}`);
    if (item) {
        item.remove();
        const items = document.querySelectorAll('#tahu-options .order-item');
        items.forEach((item, index) => {
            item.querySelector('.order-item-number').textContent = `Item ${index + 1}`;
            item.id = `tahu-item-${index + 1}`;
            item.querySelector('.remove-item-btn').setAttribute('onclick', `removeTahuItem(${index + 1})`);
        });
        tahuItemCount = items.length;
        calculateTotal();
    }
}

// Hitung total harga
function calculateTotal() {
    let totalPrice = 0;
    let selectedItems = [];
    
    const selectedMenu = document.querySelector('input[name="menu"]:checked');
    if (!selectedMenu) {
        updateSummary([], 0);
        validateForm();
        return;
    }
    
    if (selectedMenu.value === 'pangsit-goreng') {
        const items = document.querySelectorAll('#pangsit-options .order-item');
        items.forEach(item => {
            const porsi = parseInt(item.querySelector('.pangsit-porsi').value) || 1;
            const select = item.querySelector('.pangsit-jumlah');
            const option = select.options[select.selectedIndex];
            const pricePerPorsi = parseInt(option.dataset.price) || 0;
            const jumlahPerPorsi = parseInt(select.value);
            const subtotal = pricePerPorsi * porsi;
            const cabe = item.querySelector('.pangsit-cabe') ? item.querySelector('.pangsit-cabe').checked : false;
            
            totalPrice += subtotal;
            selectedItems.push({
                menu: 'pangsit-goreng',
                nama: 'Pangsit Goreng',
                porsi: porsi,
                jumlahPerPorsi: jumlahPerPorsi,
                jumlah: jumlahPerPorsi * porsi,
                harga: pricePerPorsi,
                subtotal: subtotal,
                cabe: cabe
            });
        });
    } else if (selectedMenu.value === 'tahu-walik') {
        const items = document.querySelectorAll('#tahu-options .order-item');
        items.forEach(item => {
            const porsi = parseInt(item.querySelector('.tahu-porsi').value) || 1;
            const select = item.querySelector('.tahu-jumlah');
            const option = select.options[select.selectedIndex];
            const pricePerPorsi = parseInt(option.dataset.price) || 0;
            const jumlahPerPorsi = parseInt(select.value);
            const subtotal = pricePerPorsi * porsi;
            const cabe = item.querySelector('.tahu-cabe') ? item.querySelector('.tahu-cabe').checked : false;
            
            totalPrice += subtotal;
            selectedItems.push({
                menu: 'tahu-walik',
                nama: 'Tahu Walik',
                porsi: porsi,
                jumlahPerPorsi: jumlahPerPorsi,
                jumlah: jumlahPerPorsi * porsi,
                harga: pricePerPorsi,
                subtotal: subtotal,
                cabe: cabe
            });
        });
    }
    
    // Update display
    const totalElement = document.getElementById('total-price');
    const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(totalPrice);
    totalElement.textContent = formattedPrice;
    
    updateSummary(selectedItems, totalPrice);
    validateForm();
}

// Update ringkasan pesanan
function updateSummary(items, total) {
    const summarySection = document.getElementById('summary-section');
    const summaryDiv = document.getElementById('order-summary');
    
    if (items.length === 0) {
        summarySection.style.display = 'none';
        return;
    }
    
    summarySection.style.display = 'block';
    
    let html = '<div class="order-summary-list">';
    items.forEach((item, index) => {
        html += `
            <div class="summary-item">
                <div class="summary-item-name">${item.nama} - Item ${index + 1}</div>
                <div class="summary-item-detail">
                    ${item.jumlahPerPorsi} biji × ${item.porsi} porsi = ${item.jumlah} biji
                </div>
                <div class="summary-item-price">${formatRupiah(item.subtotal)}</div>
            </div>
        `;
    });
    html += '</div>';
    
    summaryDiv.innerHTML = html;
}

// Generate unique customer ID
function generateCustomerId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TW-';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Format Rupiah
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Validasi form
function validateForm() {
    const name = document.getElementById('customer-name').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const selectedMenu = document.querySelector('input[name="menu"]:checked');
    
    let hasValidItems = false;
    
    if (selectedMenu) {
        if (selectedMenu.value === 'pangsit-goreng') {
            const items = document.querySelectorAll('#pangsit-options .order-item');
            hasValidItems = items.length > 0;
        } else if (selectedMenu.value === 'tahu-walik') {
            const items = document.querySelectorAll('#tahu-options .order-item');
            hasValidItems = items.length > 0;
        }
    }
    
    const hasCustomerData = name !== '' && whatsapp !== '';
    const isValid = hasCustomerData && hasValidItems;
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = !isValid;
    
    return isValid;
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    checkOrderStatus();
    fetchMenuSettings();
    initOrderForm();
    initCustomerMemory();
});

function initOrderForm() {
    const orderForm = document.getElementById('order-form');
    if (!orderForm) return;

    const nameInput = document.getElementById('customer-name');
    const whatsappInput = document.getElementById('whatsapp');

    if (nameInput) {
        nameInput.addEventListener('input', () => {
            nameInput.dataset.autofilled = 'false';
            validateForm();
        });
    }
    if (whatsappInput) {
        whatsappInput.addEventListener('input', () => {
            whatsappInput.dataset.autofilled = 'false';
            validateForm();
        });
    }

    orderForm.addEventListener('submit', handleFormSubmit);
}

// ============================================
// FITUR "MEMORY" PELANGGAN (Auto-Fill)
// ============================================

function initCustomerMemory() {
    const nameInput = document.getElementById('customer-name');
    const whatsappInput = document.getElementById('whatsapp');

    if (whatsappInput) {
        whatsappInput.addEventListener('blur', async () => {
            const phone = whatsappInput.value.trim();
            if (phone.length >= 10) {
                await lookupCustomerByPhone(phone);
            }
        });
    }

    if (nameInput) {
        nameInput.addEventListener('blur', async () => {
            const name = nameInput.value.trim();
            if (name.length >= 3) {
                await lookupCustomerByName(name);
            }
        });
    }
}

function showAutofillNotification(message) {
    const statusEl = document.getElementById('autofill-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    setTimeout(() => {
        if (statusEl) statusEl.style.display = 'none';
    }, 4500);
}

async function lookupCustomerByPhone(phone) {
    const nameInput = document.getElementById('customer-name');
    if (!nameInput) return;
    if (nameInput.value.trim() !== '' && nameInput.dataset.autofilled !== 'true') {
        return; // Pengguna sudah mengisi nama manual, jangan timpa
    }

    try {
        const client = getSupabaseClient();
        let foundName = null;

        if (client) {
            // 1. Cek tabel customers
            try {
                const { data, error } = await client
                    .from('customers')
                    .select('nama')
                    .eq('whatsapp', phone)
                    .limit(1);
                if (!error && data && data.length > 0 && data[0].nama) {
                    foundName = data[0].nama;
                }
            } catch (err) {
                console.log('Query customers by phone error, trying orders fallback:', err);
            }

            // 2. Fallback: cek riwayat pesanan (orders)
            if (!foundName) {
                try {
                    const { data: orderData, error: orderErr } = await client
                        .from('orders')
                        .select('nama')
                        .eq('whatsapp', phone)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    if (!orderErr && orderData && orderData.length > 0 && orderData[0].nama) {
                        foundName = orderData[0].nama;
                    }
                } catch (e) {}
            }
        }

        // 3. Fallback: cek riwayat localStorage
        if (!foundName) {
            const localCustomers = JSON.parse(localStorage.getItem('customers') || '{}');
            if (localCustomers[phone]) {
                foundName = localCustomers[phone];
            } else {
                const orders = JSON.parse(localStorage.getItem('orders') || '[]');
                const match = orders.find(o => o.whatsapp === phone);
                if (match && match.nama) foundName = match.nama;
            }
        }

        if (foundName) {
            nameInput.value = foundName;
            nameInput.dataset.autofilled = 'true';
            showAutofillNotification(`✨ Halo kembali, ${foundName}! Nama terisi otomatis.`);
            validateForm();
        }
    } catch (error) {
        console.error('Error looking up customer by phone:', error);
    }
}

async function lookupCustomerByName(name) {
    const whatsappInput = document.getElementById('whatsapp');
    if (!whatsappInput) return;
    if (whatsappInput.value.trim() !== '' && whatsappInput.dataset.autofilled !== 'true') {
        return; // Pengguna sudah mengisi nomor manual, jangan timpa
    }

    try {
        const client = getSupabaseClient();
        let foundPhone = null;

        if (client) {
            // 1. Cek tabel customers
            try {
                const { data, error } = await client
                    .from('customers')
                    .select('whatsapp')
                    .ilike('nama', name)
                    .limit(1);
                if (!error && data && data.length > 0 && data[0].whatsapp) {
                    foundPhone = data[0].whatsapp;
                }
            } catch (err) {
                console.log('Query customers by name error, trying orders fallback:', err);
            }

            // 2. Fallback: cek riwayat pesanan (orders)
            if (!foundPhone) {
                try {
                    const { data: orderData, error: orderErr } = await client
                        .from('orders')
                        .select('whatsapp')
                        .ilike('nama', name)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    if (!orderErr && orderData && orderData.length > 0 && orderData[0].whatsapp) {
                        foundPhone = orderData[0].whatsapp;
                    }
                } catch (e) {}
            }
        }

        // 3. Fallback: cek riwayat localStorage
        if (!foundPhone) {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const match = orders.find(o => o.nama && o.nama.toLowerCase() === name.toLowerCase());
            if (match && match.whatsapp) foundPhone = match.whatsapp;
        }

        if (foundPhone) {
            whatsappInput.value = foundPhone;
            whatsappInput.dataset.autofilled = 'true';
            showAutofillNotification(`✨ Nomor WhatsApp terisi otomatis: ${foundPhone}`);
            validateForm();
        }
    } catch (error) {
        console.error('Error looking up customer by name:', error);
    }
}

async function saveCustomerData(nama, whatsapp) {
    if (!nama || !whatsapp) return;
    try {
        const client = getSupabaseClient();
        if (client) {
            try {
                await client
                    .from('customers')
                    .upsert([{ 
                        whatsapp: whatsapp, 
                        nama: nama, 
                        updated_at: new Date().toISOString() 
                    }], { onConflict: 'whatsapp' });
                console.log('✅ Data pelanggan tersimpan/diperbarui di tabel customers');
            } catch (err) {
                console.warn('Upsert to customers table warning (pastikan tabel sudah dibuat via SQL):', err);
            }
        }

        // Simpan juga di localStorage
        const localCustomers = JSON.parse(localStorage.getItem('customers') || '{}');
        localCustomers[whatsapp] = nama;
        localStorage.setItem('customers', JSON.stringify(localCustomers));
    } catch (e) {
        console.error('Error saving customer data:', e);
    }
}

// ============================================
// SUBMIT ORDER
// ============================================

async function handleFormSubmit(event) {
    event.preventDefault();

    if (!orderOpen) {
        showToast('Maaf, pemesanan sedang ditutup.', 'error');
        return;
    }

    if (!validateForm()) {
        showToast('Mohon lengkapi semua data dengan benar', 'error');
        return;
    }

    const nama = document.getElementById('customer-name').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const selectedMenu = document.querySelector('input[name="menu"]:checked');

    let orderItems = [];
    let totalHarga = 0;
    let totalJumlah = 0;
    let menuDisplay = [];

    if (selectedMenu.value === 'pangsit-goreng') {
        const items = document.querySelectorAll('#pangsit-options .order-item');
        items.forEach((item, index) => {
            const porsi = parseInt(item.querySelector('.pangsit-porsi').value);
            const select = item.querySelector('.pangsit-jumlah');
            const option = select.options[select.selectedIndex];
            const pricePerPorsi = parseInt(option.dataset.price);
            const jumlahPerPorsi = parseInt(select.value);
            const subtotal = pricePerPorsi * porsi;
            
            const cabe = item.querySelector('.pangsit-cabe') ? item.querySelector('.pangsit-cabe').checked : false;
            
            orderItems.push({
                menu: 'pangsit-goreng',
                item: index + 1,
                porsi: porsi,
                jumlahPerPorsi: jumlahPerPorsi,
                hargaPerPorsi: pricePerPorsi,
                subtotal: subtotal,
                cabe: cabe
            });
            
            totalHarga += subtotal;
            totalJumlah += jumlahPerPorsi * porsi;
            const cabeText = cabe ? '+Cabe' : '';
            menuDisplay.push(`Pangsit Goreng Item${index + 1}(${jumlahPerPorsi}×${porsi})${cabeText}`);
        });
    } else if (selectedMenu.value === 'tahu-walik') {
        const items = document.querySelectorAll('#tahu-options .order-item');
        items.forEach((item, index) => {
            const porsi = parseInt(item.querySelector('.tahu-porsi').value);
            const select = item.querySelector('.tahu-jumlah');
            const option = select.options[select.selectedIndex];
            const pricePerPorsi = parseInt(option.dataset.price);
            const jumlahPerPorsi = parseInt(select.value);
            const subtotal = pricePerPorsi * porsi;
            const cabe = item.querySelector('.tahu-cabe') ? item.querySelector('.tahu-cabe').checked : false;
            
            orderItems.push({
                menu: 'tahu-walik',
                item: index + 1,
                porsi: porsi,
                jumlahPerPorsi: jumlahPerPorsi,
                hargaPerPorsi: pricePerPorsi,
                subtotal: subtotal,
                cabe: cabe
            });
            
            totalHarga += subtotal;
            totalJumlah += jumlahPerPorsi * porsi;
            const cabeText = cabe ? '+Cabe' : '';
            menuDisplay.push(`Tahu Walik Item${index + 1}(${jumlahPerPorsi}×${porsi})${cabeText}`);
        });
    }

    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;

    try {
        const client = getSupabaseClient();
        
        // Check if any item has cabe
        const hasCabe = orderItems.some(item => item.cabe === true);
        
        // Prepare order data
        const orderData = {
            customer_id: generateCustomerId(),
            nama: nama,
            whatsapp: whatsapp,
            menu: menuDisplay.join(', '),
            jumlah: totalJumlah,
            harga: totalHarga,
            cabe: hasCabe ? 'pake cabe' : 'tidak pake cabe',
            detail: JSON.stringify(orderItems),
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        let supabaseSuccess = false;
        
        // Debug: Check if Supabase client is available
        console.log('=== SUPABASE DEBUG ===');
        console.log('Client available:', !!client);
        console.log('Order data:', orderData);
        
        // Try to insert to Supabase FIRST
        if (client) {
            try {
                console.log('Attempting to insert to Supabase...');
                const { data, error } = await client
                    .from('orders')
                    .insert([orderData])
                    .select();
                
                if (error) {
                    console.error('❌ Supabase insert error:', error);
                    console.error('Error details:', JSON.stringify(error));
                    alert('Supabase Error: ' + error.message);
                } else {
                    console.log('✅ Pesanan berhasil disimpan ke Supabase:', data);
                    supabaseSuccess = true;
                    
                    // Also save to localStorage as backup
                    const orderWithId = { ...orderData, id: data[0]?.id || 'ORD-' + Date.now() };
                    const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
                    existingOrders.push(orderWithId);
                    localStorage.setItem('orders', JSON.stringify(existingOrders));
                    
                    // Simpan data customer ke tabel customers (Memory Pelanggan)
                    await saveCustomerData(nama, whatsapp);
                }
            } catch (supabaseError) {
                console.error('❌ Supabase connection error:', supabaseError);
                alert('Connection Error: ' + supabaseError.message);
            }
        } else {
            console.log('⚠️ Supabase client not available');
            alert('Supabase client tidak tersedia. Cek console untuk detail.');
        }
        console.log('=== END DEBUG ===');
        
        // If Supabase not available or failed, use localStorage
        if (!supabaseSuccess) {
            const orderWithId = { ...orderData, id: 'ORD-' + Date.now() };
            const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            existingOrders.push(orderWithId);
            localStorage.setItem('orders', JSON.stringify(existingOrders));
            console.log('Pesanan disimpan ke localStorage (Supabase tidak tersedia)');
            
            // Simpan data customer ke localStorage (Memory Pelanggan)
            await saveCustomerData(nama, whatsapp);
        }
        
        showToast('✅ Pesanan berhasil! Kami akan menghubungi Anda via WhatsApp.', 'success');
        resetForm();

    } catch (error) {
        console.error('Error submitting order:', error);
        showToast('❌ Gagal mengirim pesanan. Silakan coba lagi.', 'error');
    } finally {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = true;
    }
}

function resetForm() {
    const form = document.getElementById('order-form');
    form.reset();

    document.getElementById('pangsit-options').style.display = 'none';
    document.getElementById('tahu-options').style.display = 'none';
    document.getElementById('summary-section').style.display = 'none';

    document.getElementById('total-price').textContent = 'Rp0';

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    
    pangsitItemCount = 1;
    tahuItemCount = 1;

    const nameInput = document.getElementById('customer-name');
    const whatsappInput = document.getElementById('whatsapp');
    if (nameInput) nameInput.dataset.autofilled = 'false';
    if (whatsappInput) whatsappInput.dataset.autofilled = 'false';
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}
