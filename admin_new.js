/**
 * ============================================
 * Admin Page JavaScript - WITH MAILBOX
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
// ORDER OPEN/CLOSE SYSTEM (Supabase)
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

        if (error) {
            console.log('Error fetching order status:', error);
            await client
                .from('system_status')
                .insert([{ id: 1, order_status: 'open' }]);
            orderOpen = true;
        } else {
            orderOpen = (data.order_status === 'open');
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
        toggleBtn.textContent = '🔴 Close Order';
    } else {
        statusElement.innerHTML = '<span class="status-indicator status-closed">⛔ TUTUP</span>';
        toggleBtn.textContent = '🟢 Open Order';
    }
}

async function toggleOrderStatus() {
    const newStatus = !orderOpen;
    let confirmMessage;
    
    if (newStatus) {
        confirmMessage = 'Apakah Anda yakin ingin MEMBUKA pemesanan?';
    } else {
        confirmMessage = 'Apakah Anda yakin ingin MENUTUP pemesanan?';
    }
    
    if (!confirm(confirmMessage)) {
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

        const { error } = await client
            .from('system_status')
            .update({ 
                order_status: newStatus ? 'open' : 'closed',
                updated_at: new Date().toISOString()
            })
            .eq('id', 1);

        if (error) {
            await client
                .from('system_status')
                .insert([{ 
                    id: 1, 
                    order_status: newStatus ? 'open' : 'closed' 
                }]);
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
        
        let cabeDisplay = '';
        if (order.cabe === 'pake cabe') {
            cabeDisplay = '<span class="cabe-yes">🌶️ Pake Cabe</span>';
        } else if (order.cabe === 'tidak pake cabe' || !order.cabe) {
            cabeDisplay = '<span class="cabe-no">Tidak Cabe</span>';
        } else {
            cabeDisplay = '<span class="cabe-no">-</span>';
        }
        
        if (order.detail) {
            try {
                const details = JSON.parse(order.detail);
                if (Array.isArray(details) && details.length > 0) {
                    let detailHtml = '<div class="order-detail-list">';
                    details.forEach(item => {
                        const namaMenu = item.menu === 'pangsit-goreng' ? 'Pangsit Goreng' : 'Tahu Walik';
                        const itemCabe = item.cabe ? ' +🌶️Cabe' : '';
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

            if (targetTab === 'analytics') {
                fetchAnalytics();
            }
            if (targetTab === 'feedback') {
                fetchFeedback();
            }
            if (targetTab === 'mailbox') {
                fetchMailbox();
            }
        });
    });
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

function formatDateTimeIndonesia(dateString) {
    const date = new Date(dateString);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Intl.DateTimeFormat('id-ID', options).format(date);
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
                console.error('Fetch error:', fetchError);
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
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// ============================================
// FEEDBACK FUNCTIONS (PUBLIC ONLY)
// ============================================

async function fetchFeedback() {
    const container = document.getElementById('feedback-admin-list');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <div style="font-size: 2rem; margin-bottom: 8px;">💬</div>
            <p>Memuat kritik dan saran...</p>
        </div>
    `;

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

        // Filter only PUBLIC feedback for admin panel
        feedbackList = feedbackList.filter(f => f.visibility !== 'private');

        if (feedbackList && feedbackList.length > 0) {
            renderFeedback(feedbackList);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 2rem; margin-bottom: 8px;">💬</div>
                    <p>Belum ada kritik dan saran public</p>
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
// MAILBOX FUNCTIONS (PRIVATE FEEDBACK)
// ============================================

async function fetchMailbox() {
    const container = document.getElementById('mailbox-list');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <div style="font-size: 2rem; margin-bottom: 8px;">📬</div>
            <p>Memuat mailbox...</p>
        </div>
    `;

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

        // Filter only PRIVATE feedback for mailbox
        feedbackList = feedbackList.filter(f => f.visibility === 'private');

        if (feedbackList && feedbackList.length > 0) {
            renderMailbox(feedbackList);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 2rem; margin-bottom: 8px;">📭</div>
                    <p>Mailbox kosong - belum ada kritik/saran private</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error fetching mailbox:', error);
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

function renderMailbox(feedbackList) {
    const container = document.getElementById('mailbox-list');
    
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
            <div class="mailbox-item">
                <div class="mailbox-header">
                    <div class="mailbox-icon">🔒</div>
                    <div class="mailbox-rating">${stars}</div>
                    <div class="mailbox-date">${tanggal}</div>
                </div>
                <div class="mailbox-content">
                    <div class="mailbox-name">${nama}</div>
                    ${jenisBadge}
                    <div class="mailbox-pesan">${pesan}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// INISIALISASI SAAT DOM READY
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAdminAuth()) {
        return;
    }

    initTabNavigation();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutAdmin);
    }

    const toggleOrderBtn = document.getElementById('toggle-order-btn');
    if (toggleOrderBtn) {
        toggleOrderBtn.addEventListener('click', toggleOrderStatus);
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchOrders);
    }

    const refreshAnalyticsBtn = document.getElementById('refresh-analytics-btn');
    if (refreshAnalyticsBtn) {
        refreshAnalyticsBtn.addEventListener('click', fetchAnalytics);
    }

    const refreshFeedbackBtn = document.getElementById('refresh-feedback-btn');
    if (refreshFeedbackBtn) {
        refreshFeedbackBtn.addEventListener('click', fetchFeedback);
    }

    const refreshMailboxBtn = document.getElementById('refresh-mailbox-btn');
    if (refreshMailboxBtn) {
        refreshMailboxBtn.addEventListener('click', fetchMailbox);
    }

    fetchOrderStatus();
    fetchOrders();

    setInterval(() => {
        fetchOrders();
        fetchOrderStatus();
    }, 30000);
});

window.updateStatus = updateStatus;
window.fetchAnalytics = fetchAnalytics;
window.deleteWeeklyReport = deleteWeeklyReport;
window.fetchFeedback = fetchFeedback;
window.fetchMailbox = fetchMailbox;
