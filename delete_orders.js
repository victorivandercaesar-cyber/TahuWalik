/**
 * Script untuk menghapus pesanan dari periode tertentu
 */

const SUPABASE_URL = 'https://lyvnldssbwuqmfdorfei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5dm5sZHNzYnd1cW1mZG9yZmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjU3MDQsImV4cCI6MjA4NzQwMTcwNH0.EYoxdsKjggZPwZmv84bihTyi4yPYqd7VRSSKDzmVyMo';

// Create Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tanggal mulai: 23 Feb 2025 00:00:00 (WIB - UTC+7)
// Tanggal selesai: 2 Maret 2025 00:00:00 (untuk menangkap semua data sampai 1 Maret 23:59:59)
const startDate = '2025-02-23T00:00:00+07:00';
const endDate = '2025-03-02T00:00:00+07:00';

async function deleteOrders() {
    console.log('Menghapus pesanan dari periode 23 Feb - 1 Mar 2025...');
    
    try {
        // First, get all orders in the date range
        const { data: orders, error: fetchError } = await supabase
            .from('orders')
            .select('id, created_at, nama, menu, whatsapp')
            .gte('created_at', startDate)
            .lt('created_at', endDate);
        
        if (fetchError) {
            console.error('Error fetching orders:', fetchError);
            alert('Error: ' + fetchError.message);
            return;
        }
        
        console.log(`Ditemukan ${orders.length} pesanan untuk dihapus:`, orders);
        
        if (orders.length === 0) {
            alert('Tidak ada pesanan di periode tersebut!');
            return;
        }
        
        // Confirm deletion
        if (!confirm(`Yakin ingin menghapus ${orders.length} pesanan dari 23 Feb - 1 Mar 2025?`)) {
            return;
        }
        
        // Delete each order
        let deletedCount = 0;
        for (const order of orders) {
            const { error: deleteError } = await supabase
                .from('orders')
                .delete()
                .eq('id', order.id);
            
            if (!deleteError) {
                deletedCount++;
                console.log(`Deleted: ${order.id} - ${order.nama} - ${order.menu}`);
            } else {
                console.error('Error deleting order:', order.id, deleteError);
            }
        }
        
        alert(`Berhasil menghapus ${deletedCount} pesanan!`);
        console.log(`Total dihapus: ${deletedCount}`);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    }
}

// Run the deletion
deleteOrders();
