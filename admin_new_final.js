/**
 * ============================================
 * Admin Page JavaScript - FULL REVISED
 * With Dashboard Recap & Kasir Feature
 * ============================================
 */

// ============================================
// KONFIGURASI SUPABASE
// ============================================

const SUPABASE_URL = 'https://lyvnldssbwuqmfdorfei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5dm5sZHNzYnd1cW1mZG9yZmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjU3MDQsImV4cCI6MjA4NzQwMTcwNH0.EYoxdsKjggZPwZmv84bihTyi4yPYqd7VRSSKDzmVyMo';

let supabaseClient = null;
let orderOpen = true;

function getSupabaseClient() {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        if (SUPABASE_URL.includes('xxxxx') || SUPABASE_ANON_KEY.includes('...')) {
            console.warn('⚠️ Harap ganti credentials Supabase di admin.js');
            return null;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// ============================================
// PROTEKSI HALAMAN ADMIN
// ============================================

function checkAdminAuth() {
    const isAdmin = localStorage.getItem('isAdmin');
    if (isAdmin !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function logoutAdmin() {
    localStorage.removeItem('isAdmin');
    window.location.href = 'login.html';
}

// ============================================
// FUNGSI UTILITAS
// ============================================

function formatDateIndonesia(dateString) {
    const date = new Date(dateString);
    const options = { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Intl.DateTimeFormat('id-ID', options).format(date);
}

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function getMenuName(menuKey) {
    const menuNames = {
        'pangsit-goreng': 'Pangsit Goreng',
        'tahu-walik': 'Tahu Walik'
    };
    return menuNames[menuKey] || menuKey;
}

function getStatusLabel(status) {
    const statusLabels = {
        'pending': 'Pending',
        'diterima': 'Diterima',
        'selesai': 'Selesai'
    };
    return statusLabels[status] || status;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function setLoading(isLoading) {
    const loading = document.getElementById('loading');
    if (!loading) return;
    if (isLoading) {
        loading.classList.add('active');
    } else {
        loading.classList.remove('active');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateCustomerId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TW-';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============================================
// ORDER OPEN/CLOSE SYSTEM
// ============================================

async function fetchOrderStatus() {
    try {
        const client = getSupabaseClient();
        
        if (!client) {
            orderOpen = true;
            updateOrderStatusDisplay();
            return;
        }

        const { data, error } = await client
            .from('system_status')
            .select('order_status')
            .eq('id', 1)
            .single();

        if (error || !data) {
            orderOpen = true;
            await client
                .from('system_status')
                .insert([{ id: 1, order_status: 'open' }]);
        } else {
            orderOpen = data.order_status === 'open';
        }

        updateOrderStatusDisplay();

    } catch (error) {
        console.error('Error fetching order status:', error);
        orderOpen = true;
        updateOrderStatusDisplay();
    }
}

function updateOrderStatusDisplay() {
    const statusElement = document.getElementById('order-status');
    const toggleBtn = document.getElementById('toggle-order-btn');
    
    if (orderOpen) {
        statusElement.innerHTML = '<span class="status-indicator status-open">✅ BUKA</span>';
        toggleBtn.textContent = '🔴 Tutup Order';
    } else {
        statusElement.innerHTML = '<span class="status-indicator status-closed">⛔ TUTUP</span>';
        toggleBtn.textContent = '🟢 Buka Order';
    }
}

async function toggleOrderStatus() {
    const newStatus = !orderOpen;
    const newStatusString = newStatus ? 'open' : 'closed';
    
    if (!confirm(newStatus ? 'Apakah Anda yakin ingin MEMBUKA pemesanan?' : 'Apakah Anda yakin ingin MENUTUP pemesanan?')) {
        return;
    }

    setLoading(true);

    try {
        const client = getSupabaseClient();
        
        if (!client) {
            orderOpen = newStatus;
            updateOrderStatusDisplay();
            showToast(newStatus ? '✅ Pemesanan dibuka!' : '⛔ Pemesanan ditutup!', 'success');
            return;
        }

        const { data: existingData } = await client
            .from('system_status')
            .select('id')
            .eq('id', 1)
            .single();

        if (existingData) {
            await client
                .from('system_status')
                .update({ order_status: newStatusString })
                .eq('id', 1);
        } else {
            await client
                .from('system_status')
                .insert([{ id: 1, order_status: newStatusString }]);
        }

        orderOpen = newStatus;
        updateOrderStatusDisplay();
        showToast(newStatus ? '✅ Pemesanan dibuka!' : '⛔ Pemesanan ditutup!', 'success');

    } catch (error) {
        console.error('Error toggling order status:', error);
        showToast('❌ Gagal mengubah status pemesanan', 'error');
    } finally {
        setLoading(false);
    }
}

// ============================================
// MENU SETTINGS (Show/Hide Menu Options)
// ============================================

let menuSettings = {
    enable_tahu_walik: true,
    enable_pangsit_goreng: true
};

async function fetchMenuSettings() {
    try {
        const client = getSupabaseClient();
        
        if (!client) {
            updateMenuSettingsDisplay();
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
        } else {
            await client
                .from('menu_settings')
                .insert([{ 
                    enable_tahu_walik: true, 
                    enable_pangsit_goreng: true 
                }]);
        }

        updateMenuSettingsDisplay();

    } catch (error) {
        console.error('Error fetching menu settings:', error);
        updateMenuSettingsDisplay();
    }
}

function updateMenuSettingsDisplay() {
    const tahuToggle = document.getElementById('toggle-tahu-walik');
    const pangsitToggle = document.getElementById('toggle-pangsit-goreng');
    
    if (tahuToggle) {
        tahuToggle.checked = menuSettings.enable_tahu_walik;
    }
    if (pangsitToggle) {
        pangsitToggle.checked = menuSettings.enable_pangsit_goreng;
    }
}

async function saveMenuSettings() {
    const tahuToggle = document.getElementById('toggle-tahu-walik');
    const pangsitToggle = document.getElementById('toggle-pangsit-goreng');
    const statusElement = document.getElementById('menu-settings-status');
    
    if (!tahuToggle || !pangsitToggle) return;
    
    statusElement.querySelector('.status-saving').style.display = 'inline';
    statusElement.querySelector('.status-saved').style.display = 'none';
    
    const newSettings = {
        enable_tahu_walik: tahuToggle.checked,
        enable_pangsit_goreng: pangsitToggle.checked,
        updated_at: new Date().toISOString()
    };
    
    try {
        const client = getSupabaseClient();
        
        if (!client) {
            localStorage.setItem('menu_settings', JSON.stringify(newSettings));
            menuSettings = newSettings;
            statusElement.querySelector('.status-saving').style.display = 'none';
            statusElement.querySelector('.status-saved').style.display = 'inline';
            showToast('✅ Pengaturan menu disimpan (local)', 'success');
            return;
        }

        const { data: existingData } = await client
            .from('menu_settings')
            .select('id')
            .limit(1);

        if (existingData && existingData.length > 0) {
            await client
                .from('menu_settings')
                .update(newSettings)
                .eq('id', existingData[0].id);
        } else {
            await client
                .from('menu_settings')
                .insert([newSettings]);
        }

        menuSettings = newSettings;
        statusElement.querySelector('.status-saving').style.display = 'none';
        statusElement.querySelector('.status-saved').style.display = 'inline';
        showToast('✅ Pengaturan menu disimpan!', 'success');

    } catch (error) {
        console.error('Error saving menu settings:', error);
        statusElement.querySelector('.status-saving').style.display = 'none';
        statusElement.querySelector('.status-saved').style.display = 'inline';
        showToast('❌ Gagal menyimpan pengaturan', 'error');
    }
}

// ============================================
// DASHBOARD REKAP PENJUALAN (PESANAN SELESAI)
// ============================================

async function fetchDashboardRecap() {
    const totalOrdersEl = document.getElementById('recap-total-orders');
    const totalRevenueEl = document.getElementById('recap-total-revenue');
    if (!totalOrdersEl || !totalRevenueEl) return;

    try {
        const client = getSupabaseClient();
        let selesaiOrders = [];

        if (client) {
            try {
                // Ambil pesanan yang berstatus persis 'selesai'
                const { data, error } = await client
                    .from('orders')
                    .select('harga, status')
                    .eq('status', 'selesai');

                if (!error && data) {
                    selesaiOrders = data;
                }
            } catch (supErr) {
                console.warn('Supabase error fetching selesai orders recap:', supErr);
            }
        }

        // Fallback ke localStorage jika Supabase kosong/offline
        if (selesaiOrders.length === 0) {
            const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            selesaiOrders = localOrders.filter(o => o.status === 'selesai');
        }

        const totalOrders = selesaiOrders.length;
        const totalRevenue = selesaiOrders.reduce((sum, o) => sum + (parseInt(o.harga) || 0), 0);

        totalOrdersEl.textContent = totalOrders.toLocaleString('id-ID');
        totalRevenueEl.textContent = formatRupiah(totalRevenue);

    } catch (error) {
        console.error('Error fetching dashboard recap:', error);
    }
}

// ============================================
// FETCH DAN TAMPILKAN DATA PESANAN
// ============================================

async function fetchOrders() {
    const tbody = document.getElementById('orders-tbody');
    const emptyState = document.getElementById('empty-state');
    
    setLoading(true);
    
    try {
        const client = getSupabaseClient();
        let orders = [];
        
        if (client) {
            try {
                const { data, error } = await client
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (!error && data && data.length > 0) {
                    orders = data;
                }
            } catch (supabaseError) {
                console.log('Supabase error, menggunakan localStorage:', supabaseError);
            }
        }
        
        if (orders.length === 0) {
            const localOrders = localStorage.getItem('orders');
            if (localOrders) {
                orders = JSON.parse(localOrders);
                orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
        }

        if (orders && orders.length > 0) {
            renderOrders(orders);
            emptyState.style.display = 'none';
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        📭 Tidak ada pesanan
                    </td>
                </tr>
            `;
            emptyState.style.display = 'block';
        }

    } catch (error) {
        console.error('Error fetching orders:', error);
        const localOrders = localStorage.getItem('orders');
        if (localOrders) {
            const orders = JSON.parse(localOrders);
            orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            if (orders.length > 0) {
                renderOrders(orders);
                emptyState.style.display = 'none';
                return;
            }
        }
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    ❌ Error memuat data: ${error.message}
                </td>
            </tr>
        `;
    } finally {
        setLoading(false);
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('orders-tbody');
    
    tbody.innerHTML = orders.map(order => {
        let statusBadge = '';
        let actionButtons = '';

        if (order.status === 'pending') {
            statusBadge = `<span class="status-badge status-pending">Pending</span>`;
            actionButtons = `<button class="action-btn accept" onclick="updateStatus('${order.id}', 'diterima')">
                ✓ Terima Pesanan
            </button>`;
        } else if (order.status === 'diterima') {
            statusBadge = `<span class="status-badge status-diterima">Diterima</span>`;
            actionButtons = `<button class="action-btn complete" onclick="updateStatus('${order.id}', 'selesai')">
                ✓ Tandai Selesai
            </button>`;
        } else if (order.status === 'selesai') {
            statusBadge = `<span class="status-badge status-selesai">Selesai</span>`;
            actionButtons = `<span class="text-success">Pesanan Selesai</span>`;
        }

        let menuDisplay = escapeHtml(order.menu);
        let jumlahDisplay = order.jumlah + ' biji';
        
        const cabeDisplay = order.cabe === 'pake cabe' ? '<span class="cabe-yes">🌶️ Pake Cabe</span>' : '<span class="cabe-no">Tidak Cabe</span>';
        
        if (order.detail) {
            try {
                const details = JSON.parse(order.detail);
                if (Array.isArray(details) && details.length > 0) {
                    let detailHtml = '<div class="order-detail-list">';
                    details.forEach(item => {
                        const namaMenu = item.menu === 'pangsit-goreng' ? 'Pangsit Goreng' : 'Tahu Walik';
                        const itemCabe = item.cabe ? ' +Cabe' : '';
                        detailHtml += `<div class="order-detail-item">${namaMenu}: ${item.jumlahPerPorsi}×${item.porsi}=${item.jumlah} biji${itemCabe}</div>`;
                    });
                    detailHtml += '</div>';
                    menuDisplay = detailHtml;
                }
            } catch (e) {}
        }

        return `
            <tr data-id="${order.id}">
                <td>${escapeHtml(order.nama)}</td>
                <td>
                    <a href="https://wa.me/${order.whatsapp}" target="_blank" class="whatsapp-link">
                        ${escapeHtml(order.whatsapp)}
                    </a>
                </td>
                <td>${menuDisplay}</td>
                <td>${jumlahDisplay}</td>
                <td>${cabeDisplay}</td>
                <td>${formatRupiah(order.harga)}</td>
                <td>${statusBadge}</td>
                <td>${formatDateIndonesia(order.created_at)}</td>
                <td>${actionButtons}</td>
            </tr>
        `;
    }).join('');
}

// ============================================
// UPDATE STATUS PESANAN (3-Stage System)
// ============================================

async function updateStatus(orderId, newStatus) {
    const confirmMessage = newStatus === 'diterima' 
        ? 'Apakah Anda yakin ingin menerima pesanan ini?' 
        : 'Apakah Anda yakin ingin menandai pesanan ini sebagai selesai?';
    
    if (!confirm(confirmMessage)) {
        return;
    }

    setLoading(true);

    try {
        const client = getSupabaseClient();
        
        if (client) {
            try {
                const { error } = await client
                    .from('orders')
                    .update({ status: newStatus })
                    .eq('id', orderId);
                
                if (!error) {
                    await fetchOrders();
                    await fetchDashboardRecap();
                    const statusText = newStatus === 'diterima' ? 'diterima' : 'selesai';
                    showToast(`✅ Pesanan berhasil ditandai sebagai ${statusText}!`, 'success');
                    return;
                }
            } catch (supabaseError) {
                console.log('Supabase update error, mencoba localStorage:', supabaseError);
            }
        }
        
        const localOrders = localStorage.getItem('orders');
        if (localOrders) {
            const orders = JSON.parse(localOrders);
            const orderIndex = orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                orders[orderIndex].status = newStatus;
                localStorage.setItem('orders', JSON.stringify(orders));
                await fetchOrders();
                await fetchDashboardRecap();
                const statusText = newStatus === 'diterima' ? 'diterima' : 'selesai';
                showToast(`✅ Pesanan berhasil ditandai sebagai ${statusText}!`, 'success');
                return;
            }
        }
        
        showToast('❌ Pesanan tidak ditemukan', 'error');

    } catch (error) {
        console.error('Error updating status:', error);
        showToast('❌ Gagal memperbarui status', 'error');
    } finally {
        setLoading(false);
    }
}

// ============================================
// TAB NAVIGATION
// ============================================

function initTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (targetTab === 'orders') {
                fetchOrders();
            } else if (targetTab === 'kasir') {
                // Focus ke kasir nama
                const nameInput = document.getElementById('kasir-customer-name');
                if (nameInput) nameInput.focus();
            } else if (targetTab === 'feedback') {
                fetchFeedback();
            } else if (targetTab === 'mailbox') {
                fetchMailbox();
            } else if (targetTab === 'analytics') {
                fetchAnalytics();
            }
        });
    });
}

// ============================================
// FITUR KASIR / BUAT PESANAN DARI ADMIN
// ============================================

let kasirPangsitItemCount = 1;
let kasirTahuItemCount = 1;

function initKasir() {
    const form = document.getElementById('kasir-order-form');
    if (!form) return;

    const nameInput = document.getElementById('kasir-customer-name');
    const waInput = document.getElementById('kasir-whatsapp');

    if (nameInput) {
        nameInput.addEventListener('input', () => {
            nameInput.dataset.autofilled = 'false';
            validateKasirForm();
        });
        nameInput.addEventListener('blur', async () => {
            const name = nameInput.value.trim();
            if (name.length >= 3) {
                await lookupKasirCustomerByName(name);
            }
        });
    }

    if (waInput) {
        waInput.addEventListener('input', () => {
            waInput.dataset.autofilled = 'false';
            validateKasirForm();
        });
        waInput.addEventListener('blur', async () => {
            const phone = waInput.value.trim();
            if (phone.length >= 10) {
                await lookupKasirCustomerByPhone(phone);
            }
        });
    }

    form.addEventListener('submit', handleKasirSubmit);
}

function showKasirAutofillNotification(msg) {
    const el = document.getElementById('kasir-autofill-status');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => {
        if (el) el.style.display = 'none';
    }, 4500);
}

async function lookupKasirCustomerByPhone(phone) {
    const nameInput = document.getElementById('kasir-customer-name');
    if (!nameInput || (nameInput.value.trim() !== '' && nameInput.dataset.autofilled !== 'true')) return;

    try {
        const client = getSupabaseClient();
        let foundName = null;
        if (client) {
            try {
                const { data } = await client.from('customers').select('nama').eq('whatsapp', phone).limit(1);
                if (data && data.length > 0 && data[0].nama) foundName = data[0].nama;
            } catch (e) {}

            if (!foundName) {
                try {
                    const { data: orderData } = await client.from('orders').select('nama').eq('whatsapp', phone).order('created_at', { ascending: false }).limit(1);
                    if (orderData && orderData.length > 0 && orderData[0].nama) foundName = orderData[0].nama;
                } catch (e) {}
            }
        }

        if (!foundName) {
            const localCust = JSON.parse(localStorage.getItem('customers') || '{}');
            if (localCust[phone]) foundName = localCust[phone];
            else {
                const orders = JSON.parse(localStorage.getItem('orders') || '[]');
                const match = orders.find(o => o.whatsapp === phone);
                if (match && match.nama) foundName = match.nama;
            }
        }

        if (foundName) {
            nameInput.value = foundName;
            nameInput.dataset.autofilled = 'true';
            showKasirAutofillNotification(`✨ Pelanggan ditemukan: ${foundName}`);
            validateKasirForm();
        }
    } catch (e) {
        console.error('Error looking up kasir customer by phone:', e);
    }
}

async function lookupKasirCustomerByName(name) {
    const waInput = document.getElementById('kasir-whatsapp');
    if (!waInput || (waInput.value.trim() !== '' && waInput.dataset.autofilled !== 'true')) return;

    try {
        const client = getSupabaseClient();
        let foundPhone = null;
        if (client) {
            try {
                const { data } = await client.from('customers').select('whatsapp').ilike('nama', name).limit(1);
                if (data && data.length > 0 && data[0].whatsapp) foundPhone = data[0].whatsapp;
            } catch (e) {}

            if (!foundPhone) {
                try {
                    const { data: orderData } = await client.from('orders').select('whatsapp').ilike('nama', name).order('created_at', { ascending: false }).limit(1);
                    if (orderData && orderData.length > 0 && orderData[0].whatsapp) foundPhone = orderData[0].whatsapp;
                } catch (e) {}
            }
        }

        if (!foundPhone) {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const match = orders.find(o => o.nama && o.nama.toLowerCase() === name.toLowerCase());
            if (match && match.whatsapp) foundPhone = match.whatsapp;
        }

        if (foundPhone) {
            waInput.value = foundPhone;
            waInput.dataset.autofilled = 'true';
            showKasirAutofillNotification(`✨ Nomor ditemukan: ${foundPhone}`);
            validateKasirForm();
        }
    } catch (e) {
        console.error('Error looking up kasir customer by name:', e);
    }
}

function showKasirMenuOptions() {
    const selectedMenu = document.querySelector('input[name="kasir-menu"]:checked');
    const pangsitOptions = document.getElementById('kasir-pangsit-options');
    const tahuOptions = document.getElementById('kasir-tahu-options');
    const summarySection = document.getElementById('kasir-summary-section');

    pangsitOptions.style.display = 'none';
    tahuOptions.style.display = 'none';
    if (summarySection) summarySection.style.display = 'none';

    kasirPangsitItemCount = 1;
    kasirTahuItemCount = 1;

    // Reset items
    const pangsitItems = pangsitOptions.querySelectorAll('.order-item');
    pangsitItems.forEach((item, index) => { if (index > 0) item.remove(); });
    pangsitOptions.querySelectorAll('select').forEach(s => s.selectedIndex = 0);

    const tahuItems = tahuOptions.querySelectorAll('.order-item');
    tahuItems.forEach((item, index) => { if (index > 0) item.remove(); });
    tahuOptions.querySelectorAll('select').forEach(s => s.selectedIndex = 0);

    if (selectedMenu) {
        if (selectedMenu.value === 'pangsit-goreng') {
            pangsitOptions.style.display = 'block';
        } else if (selectedMenu.value === 'tahu-walik') {
            tahuOptions.style.display = 'block';
        }
    }
    calculateKasirTotal();
}

function addKasirPangsitItem() {
    if (kasirPangsitItemCount >= 5) {
        showToast('Maksimal 5 item!', 'error');
        return;
    }
    kasirPangsitItemCount++;
    const container = document.getElementById('kasir-pangsit-options');
    const newItem = document.createElement('div');
    newItem.className = 'order-item';
    newItem.id = `kasir-pangsit-item-${kasirPangsitItemCount}`;
    newItem.innerHTML = `
        <div class="order-item-header">
            <span class="order-item-number">Item ${kasirPangsitItemCount}</span>
            <button type="button" class="remove-item-btn" onclick="removeKasirPangsitItem(${kasirPangsitItemCount})">✕</button>
        </div>
        <div class="order-item-fields">
            <div class="input-group">
                <label>Jumlah Porsi</label>
                <select class="kasir-pangsit-porsi" onchange="calculateKasirTotal()">
                    <option value="1">1 Porsi</option>
                    <option value="2">2 Porsi</option>
                    <option value="3">3 Porsi</option>
                    <option value="4">4 Porsi</option>
                    <option value="5">5 Porsi</option>
                </select>
            </div>
            <div class="input-group">
                <label>Isi per Porsi</label>
                <select class="kasir-pangsit-jumlah" onchange="calculateKasirTotal()">
                    <option value="5" data-price="10000">5 biji - Rp10.000</option>
                    <option value="8" data-price="15000">8 biji - Rp15.000</option>
                </select>
            </div>
        </div>
        <div class="order-item-options">
            <label class="cabe-option">
                <input type="checkbox" class="kasir-pangsit-cabe" onchange="calculateKasirTotal()">
                <span class="cabe-icon">🌶️</span>
                <span class="cabe-text">Tambah Cabe</span>
            </label>
        </div>
    `;
    const addBtn = container.querySelector('.add-item-btn');
    container.insertBefore(newItem, addBtn);
    calculateKasirTotal();
}

function removeKasirPangsitItem(itemId) {
    const item = document.getElementById(`kasir-pangsit-item-${itemId}`);
    if (item) {
        item.remove();
        const items = document.querySelectorAll('#kasir-pangsit-options .order-item');
        items.forEach((it, idx) => {
            it.querySelector('.order-item-number').textContent = `Item ${idx + 1}`;
            it.id = `kasir-pangsit-item-${idx + 1}`;
            const btn = it.querySelector('.remove-item-btn');
            if (btn) btn.setAttribute('onclick', `removeKasirPangsitItem(${idx + 1})`);
        });
        kasirPangsitItemCount = items.length;
        calculateKasirTotal();
    }
}

function addKasirTahuItem() {
    if (kasirTahuItemCount >= 5) {
        showToast('Maksimal 5 item!', 'error');
        return;
    }
    kasirTahuItemCount++;
    const container = document.getElementById('kasir-tahu-options');
    const newItem = document.createElement('div');
    newItem.className = 'order-item';
    newItem.id = `kasir-tahu-item-${kasirTahuItemCount}`;
    newItem.innerHTML = `
        <div class="order-item-header">
            <span class="order-item-number">Item ${kasirTahuItemCount}</span>
            <button type="button" class="remove-item-btn" onclick="removeKasirTahuItem(${kasirTahuItemCount})">✕</button>
        </div>
        <div class="order-item-fields">
            <div class="input-group">
                <label>Jumlah Porsi</label>
                <select class="kasir-tahu-porsi" onchange="calculateKasirTotal()">
                    <option value="1">1 Porsi</option>
                    <option value="2">2 Porsi</option>
                    <option value="3">3 Porsi</option>
                    <option value="4">4 Porsi</option>
                    <option value="5">5 Porsi</option>
                </select>
            </div>
            <div class="input-group">
                <label>Isi per Porsi</label>
                <select class="kasir-tahu-jumlah" onchange="calculateKasirTotal()">
                    <option value="3" data-price="10000">3 biji - Rp10.000</option>
                    <option value="5" data-price="15000">5 biji - Rp15.000</option>
                </select>
            </div>
        </div>
        <div class="order-item-options">
            <label class="cabe-option">
                <input type="checkbox" class="kasir-tahu-cabe" onchange="calculateKasirTotal()">
                <span class="cabe-icon">🌶️</span>
                <span class="cabe-text">Tambah Cabe</span>
            </label>
        </div>
    `;
    const addBtn = container.querySelector('.add-item-btn');
    container.insertBefore(newItem, addBtn);
    calculateKasirTotal();
}

function removeKasirTahuItem(itemId) {
    const item = document.getElementById(`kasir-tahu-item-${itemId}`);
    if (item) {
        item.remove();
        const items = document.querySelectorAll('#kasir-tahu-options .order-item');
        items.forEach((it, idx) => {
            it.querySelector('.order-item-number').textContent = `Item ${idx + 1}`;
            it.id = `kasir-tahu-item-${idx + 1}`;
            const btn = it.querySelector('.remove-item-btn');
            if (btn) btn.setAttribute('onclick', `removeKasirTahuItem(${idx + 1})`);
        });
        kasirTahuItemCount = items.length;
        calculateKasirTotal();
    }
}

function calculateKasirTotal() {
    let totalPrice = 0;
    let selectedItems = [];

    const selectedMenu = document.querySelector('input[name="kasir-menu"]:checked');
    if (!selectedMenu) {
        updateKasirSummary([], 0);
        validateKasirForm();
        return;
    }

    if (selectedMenu.value === 'pangsit-goreng') {
        const items = document.querySelectorAll('#kasir-pangsit-options .order-item');
        items.forEach(item => {
            const porsi = parseInt(item.querySelector('.kasir-pangsit-porsi').value) || 1;
            const select = item.querySelector('.kasir-pangsit-jumlah');
            const option = select.options[select.selectedIndex];
            const pricePerPorsi = parseInt(option.dataset.price) || 0;
            const jumlahPerPorsi = parseInt(select.value);
            const subtotal = pricePerPorsi * porsi;
            const cabe = item.querySelector('.kasir-pangsit-cabe') ? item.querySelector('.kasir-pangsit-cabe').checked : false;

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
        const items = document.querySelectorAll('#kasir-tahu-options .order-item');
        items.forEach(item => {
            const porsi = parseInt(item.querySelector('.kasir-tahu-porsi').value) || 1;
            const select = item.querySelector('.kasir-tahu-jumlah');
            const option = select.options[select.selectedIndex];
            const pricePerPorsi = parseInt(option.dataset.price) || 0;
            const jumlahPerPorsi = parseInt(select.value);
            const subtotal = pricePerPorsi * porsi;
            const cabe = item.querySelector('.kasir-tahu-cabe') ? item.querySelector('.kasir-tahu-cabe').checked : false;

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

    const totalEl = document.getElementById('kasir-total-price');
    if (totalEl) totalEl.textContent = formatRupiah(totalPrice);

    updateKasirSummary(selectedItems, totalPrice);
    validateKasirForm();
}

function updateKasirSummary(items, total) {
    const section = document.getElementById('kasir-summary-section');
    const summaryDiv = document.getElementById('kasir-order-summary');
    if (!section || !summaryDiv) return;

    if (items.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    let html = '<div class="order-summary-list">';
    items.forEach((item, index) => {
        html += `
            <div class="summary-item">
                <div class="summary-item-name">${item.nama} - Item ${index + 1}</div>
                <div class="summary-item-detail">
                    ${item.jumlahPerPorsi} biji × ${item.porsi} porsi = ${item.jumlah} biji ${item.cabe ? '(+Cabe)' : ''}
                </div>
                <div class="summary-item-price">${formatRupiah(item.subtotal)}</div>
            </div>
        `;
    });
    html += '</div>';
    summaryDiv.innerHTML = html;
}

function validateKasirForm() {
    const name = document.getElementById('kasir-customer-name')?.value.trim() || '';
    const wa = document.getElementById('kasir-whatsapp')?.value.trim() || '';
    const selectedMenu = document.querySelector('input[name="kasir-menu"]:checked');

    let hasValidItems = false;
    if (selectedMenu) {
        if (selectedMenu.value === 'pangsit-goreng') {
            hasValidItems = document.querySelectorAll('#kasir-pangsit-options .order-item').length > 0;
        } else if (selectedMenu.value === 'tahu-walik') {
            hasValidItems = document.querySelectorAll('#kasir-tahu-options .order-item').length > 0;
        }
    }

    const isValid = name !== '' && wa.length >= 10 && hasValidItems;
    const btn = document.getElementById('kasir-submit-btn');
    if (btn) btn.disabled = !isValid;
    return isValid;
}

function resetKasirForm() {
    const form = document.getElementById('kasir-order-form');
    if (form) form.reset();

    const pangsitOptions = document.getElementById('kasir-pangsit-options');
    const tahuOptions = document.getElementById('kasir-tahu-options');
    const summarySection = document.getElementById('kasir-summary-section');
    const totalEl = document.getElementById('kasir-total-price');

    if (pangsitOptions) pangsitOptions.style.display = 'none';
    if (tahuOptions) tahuOptions.style.display = 'none';
    if (summarySection) summarySection.style.display = 'none';
    if (totalEl) totalEl.textContent = 'Rp0';

    kasirPangsitItemCount = 1;
    kasirTahuItemCount = 1;

    const btn = document.getElementById('kasir-submit-btn');
    if (btn) btn.disabled = true;
}

async function handleKasirSubmit(event) {
    event.preventDefault();

    if (!validateKasirForm()) {
        showToast('Mohon lengkapi semua data pesanan dengan benar', 'error');
        return;
    }

    const nama = document.getElementById('kasir-customer-name').value.trim();
    const whatsapp = document.getElementById('kasir-whatsapp').value.trim();
    const selectedMenu = document.querySelector('input[name="kasir-menu"]:checked');
    const statusAwal = document.getElementById('kasir-initial-status').value || 'pending';

    let orderItems = [];
    let totalHarga = 0;
    let totalJumlah = 0;
    let menuDisplay = [];

    if (selectedMenu.value === 'pangsit-goreng') {
        const items = document.querySelectorAll('#kasir-pangsit-options .order-item');
        items.forEach((item, index) => {
            const porsi = parseInt(item.querySelector('.kasir-pangsit-porsi').value);
            const select = item.querySelector('.kasir-pangsit-jumlah');
            const option = select.options[select.selectedIndex];
            const pricePerPorsi = parseInt(option.dataset.price);
            const jumlahPerPorsi = parseInt(select.value);
            const subtotal = pricePerPorsi * porsi;
            const cabe = item.querySelector('.kasir-pangsit-cabe') ? item.querySelector('.kasir-pangsit-cabe').checked : false;

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
        const items = document.querySelectorAll('#kasir-tahu-options .order-item');
        items.forEach((item, index) => {
            const porsi = parseInt(item.querySelector('.kasir-tahu-porsi').value);
            const select = item.querySelector('.kasir-tahu-jumlah');
            const option = select.options[select.selectedIndex];
            const pricePerPorsi = parseInt(option.dataset.price);
            const jumlahPerPorsi = parseInt(select.value);
            const subtotal = pricePerPorsi * porsi;
            const cabe = item.querySelector('.kasir-tahu-cabe') ? item.querySelector('.kasir-tahu-cabe').checked : false;

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

    const submitBtn = document.getElementById('kasir-submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline';
    submitBtn.disabled = true;

    try {
        const client = getSupabaseClient();
        const hasCabe = orderItems.some(item => item.cabe === true);

        const orderData = {
            customer_id: generateCustomerId(),
            nama: nama,
            whatsapp: whatsapp,
            menu: menuDisplay.join(', '),
            jumlah: totalJumlah,
            harga: totalHarga,
            cabe: hasCabe ? 'pake cabe' : 'tidak pake cabe',
            detail: JSON.stringify(orderItems),
            status: statusAwal,
            created_at: new Date().toISOString()
        };

        let supabaseSuccess = false;

        if (client) {
            try {
                const { data, error } = await client
                    .from('orders')
                    .insert([orderData])
                    .select();

                if (!error) {
                    supabaseSuccess = true;
                    const orderWithId = { ...orderData, id: data[0]?.id || 'ORD-' + Date.now() };
                    const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
                    existingOrders.unshift(orderWithId);
                    localStorage.setItem('orders', JSON.stringify(existingOrders));

                    // Simpan customer data
                    try {
                        await client.from('customers').upsert([{ whatsapp, nama, updated_at: new Date().toISOString() }], { onConflict: 'whatsapp' });
                    } catch (ce) {}
                } else {
                    console.error('Supabase kasir insert error:', error);
                }
            } catch (err) {
                console.error('Kasir submit error:', err);
            }
        }

        if (!supabaseSuccess) {
            const orderWithId = { ...orderData, id: 'ORD-' + Date.now() };
            const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            existingOrders.unshift(orderWithId);
            localStorage.setItem('orders', JSON.stringify(existingOrders));
        }

        // Simpan customer ke localStorage
        const localCustomers = JSON.parse(localStorage.getItem('customers') || '{}');
        localCustomers[whatsapp] = nama;
        localStorage.setItem('customers', JSON.stringify(localCustomers));

        showToast(`✅ Pesanan kasir berhasil dibuat (Status: ${statusAwal})!`, 'success');
        resetKasirForm();

        // Refresh orders and recap
        await fetchOrders();
        await fetchDashboardRecap();

        // Switch to orders tab to see the newly created order
        const ordersTabBtn = document.querySelector('.tab-btn[data-tab="orders"]');
        if (ordersTabBtn) ordersTabBtn.click();

    } catch (error) {
        console.error('Error submitting kasir order:', error);
        showToast('❌ Gagal membuat pesanan kasir', 'error');
    } finally {
        if (btnText) btnText.style.display = 'inline';
        if (btnLoading) btnLoading.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
    }
}

// ============================================
// MAILBOX FUNCTIONS (PRIVATE FEEDBACK)
// ============================================

async function fetchMailbox() {
    const mailboxList = document.getElementById('mailbox-list');
    if (!mailboxList) return;
    
    setLoading(true);
    
    try {
        const client = getSupabaseClient();
        let privateFeedback = [];
        
        if (client) {
            try {
                const { data, error } = await client
                    .from('feedback')
                    .select('*')
                    .eq('visibility', 'private')
                    .order('created_at', { ascending: false });
                
                if (!error && data && data.length > 0) {
                    privateFeedback = data;
                }
            } catch (supabaseError) {
                console.log('Supabase error for private feedback, using localStorage:', supabaseError);
            }
        }
        
        if (privateFeedback.length === 0) {
            const localFeedback = localStorage.getItem('feedback');
            if (localFeedback) {
                const allFeedback = JSON.parse(localFeedback);
                privateFeedback = allFeedback.filter(f => f.visibility === 'private');
                privateFeedback.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
        }
        
        renderMailbox(privateFeedback);
        
    } catch (error) {
        console.error('Error fetching mailbox:', error);
        mailboxList.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 2rem; margin-bottom: 8px;">❌</div>
                <p>Error memuat private feedback</p>
            </div>
        `;
    } finally {
        setLoading(false);
    }
}

function renderMailbox(feedbackData) {
    const mailboxList = document.getElementById('mailbox-list');
    if (!mailboxList) return;
    
    if (!feedbackData || feedbackData.length === 0) {
        mailboxList.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 2rem; margin-bottom: 8px;">📬</div>
                <p>Tidak ada feedback private</p>
            </div>
        `;
        return;
    }
    
    const ratingStars = {
        1: '⭐',
        2: '⭐⭐', 
        3: '⭐⭐⭐',
        4: '⭐⭐⭐⭐',
        5: '⭐⭐⭐⭐⭐'
    };
    
    mailboxList.innerHTML = feedbackData.map(feedback => {
        const date = formatDateIndonesia(feedback.created_at);
        const stars = ratingStars[feedback.rating] || '';
        const whatsappLink = feedback.whatsapp ? `<a href="https://wa.me/${feedback.whatsapp}" target="_blank" class="whatsapp-link">${feedback.whatsapp}</a>` : '';
        
        return `
            <div class="feedback-item mailbox-item">
                <div class="feedback-header">
                    <div class="feedback-rating">${stars}</div>
                    <div class="feedback-date">${date}</div>
                </div>
                <div class="feedback-content">
                    <div class="feedback-name">${escapeHtml(feedback.nama || 'Anonim')}</div>
                    ${whatsappLink ? `<div class="feedback-whatsapp">${whatsappLink}</div>` : ''}
                    <div class="feedback-pesan">${escapeHtml(feedback.pesan)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// PUBLIC FEEDBACK FUNCTIONS
// ============================================

async function fetchFeedback() {
    const container = document.getElementById('feedback-admin-list');
    if (!container) return;
    
    setLoading(true);

    try {
        const client = getSupabaseClient();
        let feedbackList = [];
        
        if (client) {
            try {
                const { data, error } = await client
                    .from('feedback')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (!error && data && data.length > 0) {
                    feedbackList = data;
                }
            } catch (supabaseError) {
                console.log('Supabase error, menggunakan localStorage:', supabaseError);
            }
        }
        
        if (feedbackList.length === 0) {
            const localFeedback = localStorage.getItem('feedback');
            if (localFeedback) {
                feedbackList = JSON.parse(localFeedback);
                feedbackList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
        }

        if (feedbackList && feedbackList.length > 0) {
            renderFeedback(feedbackList);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 2rem; margin-bottom: 8px;">💬</div>
                    <p>Belum ada kritik dan saran</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error fetching feedback:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 2rem; margin-bottom: 8px;">❌</div>
                <p>Error memuat data: ${error.message}</p>
            </div>
        `;
    } finally {
        setLoading(false);
    }
}

function renderFeedback(feedbackList) {
    const container = document.getElementById('feedback-admin-list');
    if (!container) return;
    
    container.innerHTML = feedbackList.map(feedback => {
        const stars = '⭐'.repeat(feedback.rating || 0);
        const tanggal = formatDateIndonesia(feedback.created_at);
        
        let jenisBadge = '';
        if (feedback.jenis) {
            const jenisLabels = {
                'kritik': 'Kritik',
                'saran': 'Saran',
                'testimoni': 'Testimoni',
                'lainnya': 'Lainnya'
            };
            jenisBadge = `<span class="feedback-jenis">${jenisLabels[feedback.jenis] || feedback.jenis}</span>`;
        }
        
        const nama = feedback.nama ? escapeHtml(feedback.nama) : 'Anonim';
        const pesan = feedback.pesan ? escapeHtml(feedback.pesan) : '-';
        
        return `
            <div class="feedback-item">
                <div class="feedback-header">
                    <div class="feedback-rating">${stars}</div>
                    <div class="feedback-date">${tanggal}</div>
                </div>
                <div class="feedback-content">
                    <div class="feedback-name">${nama}</div>
                    ${jenisBadge}
                    <div class="feedback-pesan">${pesan}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

const MODAL_TAHU_WALIK = 1688;
const MODAL_PANGSIT_GORENG = 1000;

async function fetchAnalytics() {
    const tbody = document.getElementById('analytics-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">
                <div style="font-size: 2rem; margin-bottom: 8px;">📊</div>
                Memuat data analytics...
            </td>
        </tr>
    `;

    setLoading(true);

    try {
        const client = getSupabaseClient();
        let orders = [];
        
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        if (client) {
            try {
                const { data, error } = await client
                    .from('orders')
                    .select('*')
                    .gte('created_at', oneYearAgo.toISOString())
                    .order('created_at', { ascending: true });
                
                if (!error && data && data.length > 0) {
                    orders = data;
                }
            } catch (supabaseError) {
                console.log('Supabase error, menggunakan localStorage:', supabaseError);
            }
        }
        
        if (orders.length === 0) {
            const localOrders = localStorage.getItem('orders');
            if (localOrders) {
                orders = JSON.parse(localOrders);
                const oneYearAgoMs = oneYearAgo.getTime();
                orders = orders.filter(o => new Date(o.created_at).getTime() >= oneYearAgoMs);
                orders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }
        }

        if (orders && orders.length > 0) {
            renderAnalytics(orders);
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div style="font-size: 2rem; margin-bottom: 8px;">📊</div>
                        Tidak ada data untuk ditampilkan
                    </td>
                </tr>
            `;
        }

    } catch (error) {
        console.error('Error fetching analytics:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    ❌ Error memuat data: ${error.message}
                </td>
            </tr>
        `;
    } finally {
        setLoading(false);
    }
}

function renderAnalytics(orders) {
    const weeklyData = groupOrdersByWeek(orders);
    
    let totalOmzet = 0;
    let totalItem = 0;
    let totalKeuntungan = 0;
    let totalTransaksi = orders.length;

    Object.values(weeklyData).forEach(week => {
        totalOmzet += week.omzet;
        totalItem += week.totalItem;
        totalKeuntungan += week.keuntungan;
    });

    document.getElementById('total-omzet').textContent = formatRupiah(totalOmzet);
    document.getElementById('total-item').textContent = totalItem.toLocaleString('id-ID');
    document.getElementById('total-keuntungan').textContent = formatRupiah(totalKeuntungan);
    document.getElementById('total-transaksi').textContent = totalTransaksi.toLocaleString('id-ID');

    const tbody = document.getElementById('analytics-tbody');
    
    if (Object.keys(weeklyData).length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div style="font-size: 2rem; margin-bottom: 8px;">📊</div>
                    Tidak ada data untuk ditampilkan
                </td>
            </tr>
        `;
        return;
    }

    const sortedWeeks = Object.keys(weeklyData).sort((a, b) => new Date(a) - new Date(b));

    tbody.innerHTML = sortedWeeks.map((weekKey) => {
        const week = weeklyData[weekKey];
        const weekNumber = getWeekNumber(new Date(weekKey));
        const period = formatWeekPeriod(weekKey);
        const buyersList = [...week.buyers].join(', ');

        return `
            <tr>
                <td>${weekNumber}</td>
                <td>${period}</td>
                <td>${formatRupiah(week.omzet)}</td>
                <td>${week.totalItem}</td>
                <td class="profit-cell">${formatRupiah(week.keuntungan)}</td>
                <td>${week.transactionCount}</td>
                <td class="buyers-cell" title="${buyersList}">${week.buyers.size} buyer${week.buyers.size > 1 ? 's' : ''}</td>
                <td>
                    <button class="delete-week-btn" onclick="deleteWeeklyReport('${weekKey}')" title="Hapus laporan minggu ini">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function groupOrdersByWeek(orders) {
    const weeklyData = {};

    orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const weekStart = getWeekStart(orderDate);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
                omzet: 0,
                totalItem: 0,
                keuntungan: 0,
                transactionCount: 0,
                buyers: new Set()
            };
        }

        const harga = parseInt(order.harga) || 0;
        const jumlah = parseInt(order.jumlah) || 0;
        
        weeklyData[weekKey].omzet += harga;
        weeklyData[weekKey].totalItem += jumlah;
        weeklyData[weekKey].transactionCount += 1;

        let modal = 0;
        if (order.menu && (order.menu.includes('tahu-walik') || order.menu.includes('tahu walik') || order.menu.includes('Tahu Walik'))) {
            modal = MODAL_TAHU_WALIK;
        } else if (order.menu && (order.menu.includes('pangsit-goreng') || order.menu.includes('pangsit goreng') || order.menu.includes('Pangsit Goreng'))) {
            modal = MODAL_PANGSIT_GORENG;
        } else {
            modal = 1300;
        }
        
        const profit = jumlah > 0 ? ((harga / jumlah) - modal) * jumlah : 0;
        weeklyData[weekKey].keuntungan += profit;

        if (order.whatsapp) {
            weeklyData[weekKey].buyers.add(order.whatsapp);
        }
    });

    return weeklyData;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatWeekPeriod(weekKey) {
    const weekStart = new Date(weekKey);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const startStr = weekStart.toLocaleDateString('id-ID', options);
    const endStr = weekEnd.toLocaleDateString('id-ID', options);

    return `${startStr} - ${endStr}`;
}

// ============================================
// DELETE WEEKLY REPORT
// ============================================

async function deleteWeeklyReport(weekKey) {
    if (!confirm('Hapus semua data pesanan di minggu ini?')) return;
    
    setLoading(true);
    
    try {
        const client = getSupabaseClient();
        
        const parts = weekKey.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        
        const startDate = new Date(year, month, day, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        
        if (client) {
            const { data: allOrders, error: fetchError } = await client
                .from('orders')
                .select('id, created_at');
            
            if (fetchError) {
                showToast('Error: ' + fetchError.message, 'error');
                setLoading(false);
                return;
            }
            
            const ordersToDelete = allOrders.filter(order => {
                const orderDate = new Date(order.created_at);
                return orderDate >= startDate && orderDate < endDate;
            });
            
            let deletedCount = 0;
            for (const order of ordersToDelete) {
                const { error } = await client
                    .from('orders')
                    .delete()
                    .eq('id', order.id);
                
                if (!error) deletedCount++;
            }
            
            showToast('Berhasil hapus ' + deletedCount + ' pesanan!', 'success');
        } else {
            const localOrders = localStorage.getItem('orders');
            if (localOrders) {
                const orders = JSON.parse(localOrders);
                const beforeCount = orders.length;
                
                const filtered = orders.filter(o => {
                    const orderDate = new Date(o.created_at);
                    return !(orderDate >= startDate && orderDate < endDate);
                });
                
                const deletedCount = beforeCount - filtered.length;
                localStorage.setItem('orders', JSON.stringify(filtered));
                showToast('Berhasil hapus ' + deletedCount + ' pesanan!', 'success');
            }
        }
        
        await fetchAnalytics();
        await fetchOrders();
        await fetchDashboardRecap();
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAdminAuth()) {
        return;
    }

    fetchOrderStatus();
    fetchMenuSettings();
    fetchDashboardRecap();
    fetchOrders();
    initTabNavigation();
    initKasir();
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutAdmin);
    }
    
    // Refresh button orders
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchOrders();
            fetchDashboardRecap();
        });
    }

    // Refresh button recap
    const refreshRecapBtn = document.getElementById('refresh-recap-btn');
    if (refreshRecapBtn) {
        refreshRecapBtn.addEventListener('click', fetchDashboardRecap);
    }
    
    // Mailbox refresh button
    const refreshMailboxBtn = document.getElementById('refresh-mailbox-btn');
    if (refreshMailboxBtn) {
        refreshMailboxBtn.addEventListener('click', fetchMailbox);
    }
    
    // Feedback refresh button  
    const refreshFeedbackBtn = document.getElementById('refresh-feedback-btn');
    if (refreshFeedbackBtn) {
        refreshFeedbackBtn.addEventListener('click', fetchFeedback);
    }

    // Auto-refresh interval (30 detik)
    setInterval(() => {
        fetchOrders();
        fetchOrderStatus();
        fetchDashboardRecap();
    }, 30000);
});

// Expose globals for HTML inline events
window.updateStatus = updateStatus;
window.fetchAnalytics = fetchAnalytics;
window.deleteWeeklyReport = deleteWeeklyReport;
window.fetchFeedback = fetchFeedback;
window.fetchFeedbackAdmin = fetchFeedback;
window.fetchDashboardRecap = fetchDashboardRecap;
window.showKasirMenuOptions = showKasirMenuOptions;
window.addKasirPangsitItem = addKasirPangsitItem;
window.removeKasirPangsitItem = removeKasirPangsitItem;
window.addKasirTahuItem = addKasirTahuItem;
window.removeKasirTahuItem = removeKasirTahuItem;
window.calculateKasirTotal = calculateKasirTotal;
window.toggleOrderStatus = toggleOrderStatus;
window.saveMenuSettings = saveMenuSettings;
