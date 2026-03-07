/**
 * ============================================
 * Tracking Page JavaScript
 * Lacak, Edit, dan Cancel Pesanan
 * ============================================
 */

// Global variables
let currentOrder = null;
let editPangsitCount = 1;
let editTahuCount = 1;

// ============================================
// SEARCH ORDER
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const trackForm = document.getElementById('track-form');
    if (trackForm) {
        trackForm.addEventListener('submit', handleTrackSubmit);
    }
    
    const editForm = document.getElementById('edit-order-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
});

async function handleTrackSubmit(event) {
    event.preventDefault();
    
    const searchInput = document.getElementById('search-input').value.trim();
    if (!searchInput) {
        showToast('Masukkan ID pesanan atau nomor WhatsApp', 'error');
        return;
    }

    setLoading(true);

    try {
        // Search by order_id (customer_id) or whatsapp
        const order = await searchOrder(searchInput);
        
        if (order) {
            currentOrder = order;
            displayOrderDetail(order);
        } else {
            showEmptyState('Pesanan tidak ditemukan. Pastikan ID pesanan atau nomor WhatsApp benar.');
        }

    } catch (error) {
        console.error('Error searching order:', error);
        showEmptyState('Terjadi kesalahan saat mencari pesanan.');
    } finally {
        setLoading(false);
    }
}

async function searchOrder(searchTerm) {
    // Try to find in localStorage first
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    // Search by customer_id (TW-XXXXX) or whatsapp
    let order = localOrders.find(o => 
        (o.customer_id && o.customer_id.toUpperCase() === searchTerm.toUpperCase()) ||
        (o.whatsapp && o.whatsapp.includes(searchTerm))
    );
    
    if (order) return order;
    
    // Try Supabase
    const client = getSupabaseClient();
    if (client) {
        try {
            // Search by customer_id
            const { data: dataById, error: errorById } = await client
                .from('orders')
                .select('*')
                .ilike('customer_id', `%${searchTerm}%`)
                .limit(1);
            
            if (!errorById && dataById && dataById.length > 0) {
                return dataById[0];
            }
            
            // Search by whatsapp
            const { data: dataByWa, error: errorByWa } = await client
                .from('orders')
                .select('*')
                .ilike('whatsapp', `%${searchTerm}%`)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (!errorByWa && dataByWa && dataByWa.length > 0) {
                return dataByWa[0];
            }
        } catch (supabaseError) {
            console.log('Supabase search error:', supabaseError);
        }
    }
    
    return null;
}

// ============================================
// DISPLAY ORDER DETAIL
// ============================================

function displayOrderDetail(order) {
    const detailCard = document.getElementById('order-detail-card');
    const emptyState = document.getElementById('track-empty-state');
    const editCard = document.getElementById('edit-form-card');
    
    // Hide empty state and edit form
    emptyState.style.display = 'none';
    editCard.style.display = 'none';
    
    // Display order details
    document.getElementById('display-order-id').textContent = order.customer_id || order.id;
    document.getElementById('display-customer-name').textContent = order.nama || '-';
    document.getElementById('display-whatsapp').textContent = order.whatsapp || '-';
    document.getElementById('display-menu').textContent = formatMenuDisplay(order.menu);
    document.getElementById('display-jumlah').textContent = (order.jumlah || 0) + ' biji';
    document.getElementById('display-harga').textContent = formatRupiah(order.harga || 0);
    document.getElementById('display-created').textContent = formatDateIndonesia(order.created_at);
    
    // Display status badge
    const statusBadge = document.getElementById('display-order-status');
    statusBadge.className = 'order-status-badge status-' + order.status;
    statusBadge.textContent = getStatusLabel(order.status);
    
    // Show/hide action buttons based on status
    const actionsDiv = document.getElementById('order-actions');
    const editBtn = document.getElementById('edit-order-btn');
    const cancelBtn = document.getElementById('cancel-order-btn');
    
    // Edit and cancel allowed for: pending, diterima
    if (order.status === 'pending' || order.status === 'diterima') {
        actionsDiv.style.display = 'flex';
        editBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';
    } else if (order.status === 'selesai') {
        // Completed - show but disable edit/cancel
        actionsDiv.style.display = 'flex';
        editBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
    } else {
        // Cancelled or other - hide actions
        actionsDiv.style.display = 'none';
    }
    
    // Show detail card
    detailCard.style.display = 'block';
}

function showEmptyState(message) {
    const detailCard = document.getElementById('order-detail-card');
    const emptyState = document.getElementById('track-empty-state');
    const editCard = document.getElementById('edit-form-card');
    
    detailCard.style.display = 'none';
    editCard.style.display = 'none';
    
    document.getElementById('track-empty-message').textContent = message;
    emptyState.style.display = 'block';
}

function formatMenuDisplay(menuStr) {
    if (!menuStr) return '-';
    return menuStr.replace(/,/g, ', ');
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'Menunggu',
        'diterima': 'Diterima',
        'selesai': 'Selesai',
        'cancelled': 'Dibatalkan'
    };
    return labels[status] || status;
}

// ============================================
// CANCEL ORDER
// ============================================

async function cancelOrder() {
    if (!currentOrder) return;
    
    if (!confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) {
        return;
    }
    
    setLoading(true);
    
    try {
        const client = getSupabaseClient();
        
        // Update status to cancelled in localStorage
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        const orderIndex = localOrders.findIndex(o => 
            o.id === currentOrder.id || 
            (o.customer_id && o.customer_id === currentOrder.customer_id)
        );
        
        if (orderIndex !== -1) {
            localOrders[orderIndex].status = 'cancelled';
            localOrders[orderIndex].cancelled_at = new Date().toISOString();
            localStorage.setItem('orders', JSON.stringify(localOrders));
        }
        
        // Update in Supabase if available
        if (client) {
            try {
                await client
                    .from('orders')
                    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
                    .eq('id', currentOrder.id);
            } catch (supabaseError) {
                console.log('Supabase update error:', supabaseError);
            }
        }
        
        // Update current order and refresh display
        currentOrder.status = 'cancelled';
        displayOrderDetail(currentOrder);
        
        showToast('✅ Pesanan berhasil dibatalkan', 'success');
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast('❌ Gagal membatalkan pesanan', 'error');
    } finally {
        setLoading(false);
    }
}

// ============================================
// EDIT ORDER
// ============================================

function showEditForm() {
    if (!currentOrder) return;
    
    const detailCard = document.getElementById('order-detail-card');
    const editCard = document.getElementById('edit-form-card');
    
    // Hide detail card, show edit card
    detailCard.style.display = 'none';
    editCard.style.display = 'block';
    
    // Populate form with current order data
    document.getElementById('edit-name').value = currentOrder.nama || '';
    document.getElementById('edit-whatsapp').value = currentOrder.whatsapp || '';
    
    // Parse menu and details
    const menuValue = currentOrder.menu;
    if (menuValue && menuValue.includes('pangsit')) {
        document.getElementById('edit-menu').value = 'pangsit-goreng';
        showEditMenuOptions();
        populateEditPangsit(currentOrder);
    } else if (menuValue && menuValue.includes('tahu')) {
        document.getElementById('edit-menu').value = 'tahu-walik';
        showEditMenuOptions();
        populateEditTahu(currentOrder);
    }
    
    // Scroll to edit form
    editCard.scrollIntoView({ behavior: 'smooth' });
}

function showEditMenuOptions() {
    const selectedMenu = document.getElementById('edit-menu').value;
    const pangsitOptions = document.getElementById('edit-pangsit-options');
    const tahuOptions = document.getElementById('edit-tahu-options');
    
    pangsitOptions.style.display = 'none';
    tahuOptions.style.display = 'none';
    
    editPangsitCount = 1;
    editTahuCount = 1;
    
    if (selectedMenu === 'pangsit-goreng') {
        pangsitOptions.style.display = 'block';
        // Reset to single item
        document.getElementById('edit-pangsit-items').innerHTML = '';
        addEditPangsitItem();
    } else if (selectedMenu === 'tahu-walik') {
        tahuOptions.style.display = 'block';
        document.getElementById('edit-tahu-items').innerHTML = '';
        addEditTahuItem();
    }
    
    calculateEditTotal();
}

function populateEditPangsit(order) {
    const container = document.getElementById('edit-pangsit-items');
    container.innerHTML = '';
    editPangsitCount = 0;
    
    try {
        const details = JSON.parse(order.detail || '[]');
        details.forEach((item, index) => {
            if (item.menu === 'pangsit-goreng') {
                editPangsitCount++;
                const itemDiv = document.createElement('div');
                itemDiv.className = 'order-item';
                itemDiv.id = `edit-pangsit-item-${editPangsitCount}`;
                itemDiv.innerHTML = `
                    <div class="order-item-header">
                        <span class="order-item-number">Item ${editPangsitCount}</span>
                        ${editPangsitCount > 1 ? `<button type="button" class="remove-item-btn" onclick="removeEditPangsitItem(${editPangsitCount})">✕</button>` : ''}
                    </div>
                    <div class="order-item-fields">
                        <div class="input-group">
                            <label>Jumlah Porsi</label>
                            <select class="edit-pangsit-porsi" onchange="calculateEditTotal()">
                                <option value="1" ${item.porsi === 1 ? 'selected' : ''}>1 Porsi</option>
                                <option value="2" ${item.porsi === 2 ? 'selected' : ''}>2 Porsi</option>
                                <option value="3" ${item.porsi === 3 ? 'selected' : ''}>3 Porsi</option>
                                <option value="4" ${item.porsi === 4 ? 'selected' : ''}>4 Porsi</option>
                                <option value="5" ${item.porsi === 5 ? 'selected' : ''}>5 Porsi</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>Isi per Porsi</label>
                            <select class="edit-pangsit-jumlah" onchange="calculateEditTotal()">
                                <option value="5" data-price="10000" ${item.jumlahPerPorsi === 5 ? 'selected' : ''}>5 biji - Rp10.000</option>
                                <option value="8" data-price="15000" ${item.jumlahPerPorsi === 8 ? 'selected' : ''}>8 biji - Rp15.000</option>
                            </select>
                        </div>
                    </div>
                `;
                container.appendChild(itemDiv);
            }
        });
        
        if (editPangsitCount === 0) {
            addEditPangsitItem();
        }
    } catch (e) {
        addEditPangsitItem();
    }
}

function populateEditTahu(order) {
    const container = document.getElementById('edit-tahu-items');
    container.innerHTML = '';
    editTahuCount = 0;
    
    try {
        const details = JSON.parse(order.detail || '[]');
        details.forEach((item, index) => {
            if (item.menu === 'tahu-walik') {
                editTahuCount++;
                const itemDiv = document.createElement('div');
                itemDiv.className = 'order-item';
                itemDiv.id = `edit-tahu-item-${editTahuCount}`;
                itemDiv.innerHTML = `
                    <div class="order-item-header">
                        <span class="order-item-number">Item ${editTahuCount}</span>
                        ${editTahuCount > 1 ? `<button type="button" class="remove-item-btn" onclick="removeEditTahuItem(${editTahuCount})">✕</button>` : ''}
                    </div>
                    <div class="order-item-fields">
                        <div class="input-group">
                            <label>Jumlah Porsi</label>
                            <select class="edit-tahu-porsi" onchange="calculateEditTotal()">
                                <option value="1" ${item.porsi === 1 ? 'selected' : ''}>1 Porsi</option>
                                <option value="2" ${item.porsi === 2 ? 'selected' : ''}>2 Porsi</option>
                                <option value="3" ${item.porsi === 3 ? 'selected' : ''}>3 Porsi</option>
                                <option value="4" ${item.porsi === 4 ? 'selected' : ''}>4 Porsi</option>
                                <option value="5" ${item.porsi === 5 ? 'selected' : ''}>5 Porsi</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>Isi per Porsi</label>
                            <select class="edit-tahu-jumlah" onchange="calculateEditTotal()">
                                <option value="3" data-price="10000" ${item.jumlahPerPorsi === 3 ? 'selected' : ''}>3 biji - Rp10.000</option>
                                <option value="5" data-price="15000" ${item.jumlahPerPorsi === 5 ? 'selected' : ''}>5 biji - Rp15.000</option>
                            </select>
                        </div>
                    </div>
                `;
                container.appendChild(itemDiv);
            }
        });
        
        if (editTahuCount === 0) {
            addEditTahuItem();
        }
    } catch (e) {
        addEditTahuItem();
    }
}

function addEditPangsitItem() {
    if (editPangsitCount >= 5) {
        showToast('Maksimal 5 item!', 'error');
        return;
    }
    
    editPangsitCount++;
    
    const container = document.getElementById('edit-pangsit-items');
    const newItem = document.createElement('div');
    newItem.className = 'order-item';
    newItem.id = `edit-pangsit-item-${editPangsitCount}`;
    newItem.innerHTML = `
        <div class="order-item-header">
            <span class="order-item-number">Item ${editPangsitCount}</span>
            <button type="button" class="remove-item-btn" onclick="removeEditPangsitItem(${editPangsitCount})">✕</button>
        </div>
        <div class="order-item-fields">
            <div class="input-group">
                <label>Jumlah Porsi</label>
                <select class="edit-pangsit-porsi" onchange="calculateEditTotal()">
                    <option value="1">1 Porsi</option>
                    <option value="2">2 Porsi</option>
                    <option value="3">3 Porsi</option>
                    <option value="4">4 Porsi</option>
                    <option value="5">5 Porsi</option>
                </select>
            </div>
            <div class="input-group">
                <label>Isi per Porsi</label>
                <select class="edit-pangsit-jumlah" onchange="calculateEditTotal()">
                    <option value="5" data-price="10000">5 biji - Rp10.000</option>
                    <option value="8" data-price="15000">8 biji - Rp15.000</option>
                </select>
            </div>
        </div>
    `;
    
    container.appendChild(newItem);
    calculateEditTotal();
}

function removeEditPangsitItem(itemId) {
    const item = document.getElementById(`edit-pangsit-item-${itemId}`);
    if (item) {
        item.remove();
        // Re-number items
        const items = document.querySelectorAll('#edit-pangsit-items .order-item');
        items.forEach((item, index) => {
            item.querySelector('.order-item-number').textContent = `Item ${index + 1}`;
            item.id = `edit-pangsit-item-${index + 1}`;
            item.querySelector('.remove-item-btn').setAttribute('onclick', `removeEditPangsitItem(${index + 1})`);
        });
        editPangsitCount = items.length;
        calculateEditTotal();
    }
}

function addEditTahuItem() {
    if (editTahuCount >= 5) {
        showToast('Maksimal 5 item!', 'error');
        return;
    }
    
    editTahuCount++;
    
    const container = document.getElementById('edit-tahu-items');
    const newItem = document.createElement('div');
    newItem.className = 'order-item';
    newItem.id = `edit-tahu-item-${editTahuCount}`;
    newItem.innerHTML = `
        <div class="order-item-header">
            <span class="order-item-number">Item ${editTahuCount}</span>
            <button type="button" class="remove-item-btn" onclick="removeEditTahuItem(${editTahuCount})">✕</button>
        </div>
        <div class="order-item-fields">
            <div class="input-group">
                <label>Jumlah Porsi</label>
                <select class="edit-tahu-porsi" onchange="calculateEditTotal()">
                    <option value="1">1 Porsi</option>
                    <option value="2">2 Porsi</option>
                    <option value="3">3 Porsi</option>
                    <option value="4">4 Porsi</option>
                    <option value="5">5 Porsi</option>
                </select>
            </div>
            <div class="input-group">
                <label>Isi per Porsi</label>
                <select class="edit-tahu-jumlah" onchange="calculateEditTotal()">
                    <option value="3" data-price="10000">3 biji - Rp10.000</option>
                    <option value="5" data-price="15000">5 biji - Rp15.000</option>
                </select>
            </div>
        </div>
    `;
    
    container.appendChild(newItem);
    calculateEditTotal();
}

function removeEditTahuItem(itemId) {
    const item = document.getElementById(`edit-tahu-item-${itemId}`);
    if (item) {
        item.remove();
        const items = document.querySelectorAll('#edit-tahu-items .order-item');
        items.forEach((item, index) => {
            item.querySelector('.order-item-number').textContent = `Item ${index + 1}`;
            item.id = `edit-tahu-item-${index + 1}`;
            item.querySelector('.remove-item-btn').setAttribute('onclick', `removeEditTahuItem(${index + 1})`);
        });
        editTahuCount = items.length;
        calculateEditTotal();
    }
}

function calculateEditTotal() {
    let totalPrice = 0;
    let totalJumlah = 0;
    
    const selectedMenu = document.getElementById('edit-menu').value;
    
    if (selectedMenu === 'pangsit-goreng') {
        const items = document.querySelectorAll('#edit-pangsit-items .order-item');
        items.forEach(item => {
            const porsi = parseInt(item.querySelector('.edit-pangsit-porsi').value) || 1;
            const select = item.querySelector('.edit-pangsit-jumlah');
            const option = select.options[select.selectedIndex];
            const pricePerPorsi = parseInt(option.dataset.price) || 0;
            const jumlahPerPorsi = parseInt(select.value);
            
            totalPrice += pricePerPorsi * porsi;
            totalJumlah += jumlahPerPorsi * porsi;
        });
    } else if (selectedMenu === 'tahu-walik') {
        const items = document.querySelectorAll('#edit-tahu-items .order-item');
        items.forEach(item => {
            const porsi = parseInt(item.querySelector('.edit-tahu-porsi').value) || 1;
            const select = item.querySelector('.edit-tahu-jumlah');
            const option = select.options[select.selectedIndex];
            const pricePerPorsi = parseInt(option.dataset.price) || 0;
            const jumlahPerPorsi = parseInt(select.value);
            
            totalPrice += pricePerPorsi * porsi;
            totalJumlah += jumlahPerPorsi * porsi;
        });
    }
    
    document.getElementById('edit-total-price').textContent = formatRupiah(totalPrice);
}

function cancelEdit() {
    const detailCard = document.getElementById('order-detail-card');
    const editCard = document.getElementById('edit-form-card');
    
    editCard.style.display = 'none';
    detailCard.style.display = 'block';
}

async function handleEditSubmit(event) {
    event.preventDefault();
    
    if (!currentOrder) return;
    
    const nama = document.getElementById('edit-name').value.trim();
    const whatsapp = document.getElementById('edit-whatsapp').value.trim();
    const selectedMenu = document.getElementById('edit-menu').value;
    
    if (!nama || !whatsapp || !selectedMenu) {
        showToast('Mohon lengkapi semua data', 'error');
        return;
    }
    
    let orderItems = [];
    let totalHarga = 0;
    let totalJumlah = 0;
    let menuDisplay = [];
    
    if (selectedMenu === 'pangsit-goreng') {
        const items = document.querySelectorAll('#edit-pangsit-items .order-item');
        items.forEach((item, index) => {
            const porsi = parseInt(item.querySelector('.edit-pangsit-porsi').value);
            const select = item.querySelector('.edit-pangsit-jumlah');
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
    } else if (selectedMenu === 'tahu-walik') {
        const items = document.querySelectorAll('#edit-tahu-items .order-item');
        items.forEach((item, index) => {
            const porsi = parseInt(item.querySelector('.edit-tahu-porsi').value);
            const select = item.querySelector('.edit-tahu-jumlah');
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
    
    setLoading(true);
    
    try {
        const client = getSupabaseClient();
        const updatedData = {
            nama: nama,
            whatsapp: whatsapp,
            menu: menuDisplay.join(', '),
            jumlah: totalJumlah,
            harga: totalHarga,
            detail: JSON.stringify(orderItems),
            updated_at: new Date().toISOString()
        };
        
        // Update in localStorage
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        const orderIndex = localOrders.findIndex(o => 
            o.id === currentOrder.id || 
            (o.customer_id && o.customer_id === currentOrder.customer_id)
        );
        
        if (orderIndex !== -1) {
            localOrders[orderIndex] = { ...localOrders[orderIndex], ...updatedData };
            localStorage.setItem('orders', JSON.stringify(localOrders));
        }
        
        // Update in Supabase
        if (client) {
            try {
                await client
                    .from('orders')
                    .update(updatedData)
                    .eq('id', currentOrder.id);
            } catch (supabaseError) {
                console.log('Supabase update error:', supabaseError);
            }
        }
        
        // Update current order
        currentOrder = { ...currentOrder, ...updatedData };
        
        // Show success and go back to detail
        showToast('✅ Pesanan berhasil diperbarui!', 'success');
        
        const editCard = document.getElementById('edit-form-card');
        const detailCard = document.getElementById('order-detail-card');
        
        editCard.style.display = 'none';
        displayOrderDetail(currentOrder);
        
    } catch (error) {
        console.error('Error updating order:', error);
        showToast('❌ Gagal memperbarui pesanan', 'error');
    } finally {
        setLoading(false);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function setLoading(isLoading) {
    const loading = document.getElementById('loading');
    if (loading) {
        if (isLoading) {
            loading.classList.add('active');
        } else {
            loading.classList.remove('active');
        }
    }
}

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

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

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// Get Supabase client (same as in script.js)
function getSupabaseClient() {
    if (typeof window.supabase !== 'undefined') {
        return window.supabase.createClient(
            'https://lyvnldssbwuqmfdorfei.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5dm5sZHNzYnd1cW1mZG9yZmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjU3MDQsImV4cCI6MjA4NzQwMTcwNH0.EYoxdsKjggZPwZmv84bihTyi4yPYqd7VRSSKDzmVyMo'
        );
    }
    return null;
}
