/**
 * ============================================
 * Admin Page JavaScript - WITH DELETE FUNCTION
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
            // Default settings if no Supabase
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
            // Insert default settings
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
    
    // Show saving indicator
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
            // Save to localStorage as fallback
            localStorage.setItem('menu_settings', JSON.stringify(newSettings));
            menuSettings = newSettings;
            statusElement.querySelector('.status-saving').style.display = 'none';
            statusElement.querySelector('.status-saved').style.display = 'inline';
            showToast('✅ Pengaturan menu disimpan (local)', 'success');
            return;
        }

        // Check if settings exist
        const { data: existingData } = await client
            .from('menu_settings')
            .select('id')
            .limit(1);

        if (existingData && existingData.length > 0) {
            // Update existing
            await client
                .from('menu_settings')
                .update(newSettings)
                .eq('id', existingData[0].id);
        } else {
            // Insert new
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
                    <td colspan="8" class="empty-state">
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
                <td colspan="8" class="empty-state">
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
        
        // Get cabe info
        const cabeDisplay = order.cabe === 'pake cabe' ? '<span style="color: #e53935; font-weight: bold;">🌶️ Pake Cabe</span>' : '<span style="color: #888;">Tidak Cabe</span>';
        
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
            document.getElementById(`${targetTab}-tab`).classList.add('active');

            if (targetTab === 'orders') {
                fetchOrders();
            } else if (targetTab === 'feedback') {
                fetchFeedbackAdmin ? fetchFeedbackAdmin() : fetchOrders(); // Fallback if function missing
            } else if (targetTab === 'mailbox') {
                fetchMailbox();
            } else if (targetTab === 'analytics') {
                fetchAnalytics();
            }
        });
    });
}

// ============================================
// MAILBOX FUNCTIONS (PRIVATE FEEDBACK)
// ============================================

async function fetchMailbox() {
    const mailboxList = document.getElementById('mailbox-list');
    
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
        
        // Fallback to localStorage
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
// ANALYTICS FUNCTIONS
// ============================================

const MODAL_TAHU_WALIK = 1688;
const MODAL_PANGSIT_GORENG = 1000;

async function fetchAnalytics() {
    const tbody = document.getElementById('analytics-tbody');
    
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
        if (order.menu === 'tahu-walik' || order.menu === 'tahu walik') {
            modal = MODAL_TAHU_WALIK;
        } else if (order.menu === 'pangsit-goreng' || order.menu === 'pangsit goreng') {
            modal = MODAL_PANGSIT_GORENG;
        }
        
        const profit = ((harga / jumlah) - modal) * jumlah;
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
    if (!confirm('Apakah Anda yakin ingin menghapus laporan minggu ini?')) {
        return;
    }
    
    showToast('🗑️ Fitur hapus laporan belum tersedia', 'error');
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    fetchOrderStatus();
    fetchMenuSettings();
    fetchOrders();
    initTabNavigation();
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutAdmin);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchOrders);
    }
    
    // Mailbox refresh button
    const refreshMailboxBtn = document.getElementById('refresh-mailbox-btn');
    if (refreshMailboxBtn) {
        refreshMailboxBtn.addEventListener('click', fetchMailbox);
    }
    
    // Feedback refresh button  
    const refreshFeedbackBtn = document.getElementById('refresh-feedback-btn');
    if (refreshFeedbackBtn) {
        refreshFeedbackBtn.addEventListener('click', fetchFeedbackAdmin);
    }
});
