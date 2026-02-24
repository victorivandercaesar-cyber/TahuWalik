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
// ORDER OPEN/CLOSE SYSTEM
// ============================================

async function checkOrderStatus() {
    try {
        const client = getSupabaseClient();
        if (!client) {
            orderOpen = true;
            return;
        }

        const { data, error } = await client
            .from('settings')
            .select('order_open')
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            orderOpen = data[0].order_open;
        } else {
            orderOpen = true;
        }

        updateOrderStatusDisplay();

    } catch (error) {
        console.error('Error checking order status:', error);
        orderOpen = true;
        updateOrderStatusDisplay();
    }
}

function updateOrderStatusDisplay() {
    const overlay = document.getElementById('order-closed-overlay');
    const form = document.getElementById('order-form');
    const submitBtn = document.getElementById('submit-btn');
    
    if (!orderOpen) {
        if (overlay) overlay.style.display = 'flex';
        if (form) form.classList.add('form-disabled');
        if (submitBtn) submitBtn.disabled = true;
    } else {
        if (overlay) overlay.style.display = 'none';
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
            
            totalPrice += subtotal;
            selectedItems.push({
                menu: 'pangsit-goreng',
                nama: 'Pangsit Goreng',
                porsi: porsi,
                jumlahPerPorsi: jumlahPerPorsi,
                jumlah: jumlahPerPorsi * porsi,
                harga: pricePerPorsi,
                subtotal: subtotal
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
            
            totalPrice += subtotal;
            selectedItems.push({
                menu: 'tahu-walik',
                nama: 'Tahu Walik',
                porsi: porsi,
                jumlahPerPorsi: jumlahPerPorsi,
                jumlah: jumlahPerPorsi * porsi,
                harga: pricePerPorsi,
                subtotal: subtotal
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
    initOrderForm();
});

function initOrderForm() {
    const orderForm = document.getElementById('order-form');
    if (!orderForm) return;

    const nameInput = document.getElementById('customer-name');
    const whatsappInput = document.getElementById('whatsapp');

    if (nameInput) {
        nameInput.addEventListener('input', validateForm);
    }
    if (whatsappInput) {
        whatsappInput.addEventListener('input', validateForm);
    }

    orderForm.addEventListener('submit', handleFormSubmit);
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
            
            orderItems.push({
                menu: 'pangsit-goreng',
                item: index + 1,
                porsi: porsi,
                jumlahPerPorsi: jumlahPerPorsi,
                hargaPerPorsi: pricePerPorsi,
                subtotal: subtotal
            });
            
            totalHarga += subtotal;
            totalJumlah += jumlahPerPorsi * porsi;
            menuDisplay.push(`Pangsit Goreng Item${index + 1}(${jumlahPerPorsi}×${porsi})`);
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
            
            orderItems.push({
                menu: 'tahu-walik',
                item: index + 1,
                porsi: porsi,
                jumlahPerPorsi: jumlahPerPorsi,
                hargaPerPorsi: pricePerPorsi,
                subtotal: subtotal
            });
            
            totalHarga += subtotal;
            totalJumlah += jumlahPerPorsi * porsi;
            menuDisplay.push(`Tahu Walik Item${index + 1}(${jumlahPerPorsi}×${porsi})`);
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
        
        // Always use localStorage as fallback/primary storage
        // Simpan pesanan ke localStorage sebagai primary storage
        const orderData = {
            id: 'ORD-' + Date.now(),
            customer_id: generateCustomerId(),
            nama: nama,
            whatsapp: whatsapp,
            menu: menuDisplay.join(', '),
            jumlah: totalJumlah,
            harga: totalHarga,
            detail: JSON.stringify(orderItems),
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        // Simpan ke localStorage
        const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        existingOrders.push(orderData);
        localStorage.setItem('orders', JSON.stringify(existingOrders));
        
        console.log('Pesanan disimpan:', orderData);
        
        showToast('✅ Pesanan berhasil! Kami akan menghubungi Anda via WhatsApp.', 'success');
        resetForm();
        
        // Optional: Coba kirim ke Supabase di background
        if (client) {
            try {
                await client
                    .from('orders')
                    .insert([orderData]);
                console.log('Pesanan juga dikirim ke Supabase');
            } catch (supabaseError) {
                console.log('Pesanan disimpan di localStorage (Supabase error):', supabaseError);
            }
        }
        
        return;

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
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}
