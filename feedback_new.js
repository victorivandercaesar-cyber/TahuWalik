/**
 * ============================================
 * Feedback Page JavaScript
 * Kritik, Saran, dan Rating
 * ============================================
 */

// ============================================
// KONFIGURASI SUPABASE
// ============================================

const SUPABASE_URL = 'https://lyvnldssbwuqmfdorfei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5dm5sZHNzYnd1cW1mZG9yZmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjU3MDQsImV4cCI6MjA4NzQwMTcwNH0.EYoxdsKjggZPwZmv84bihTyi4yPYqd7VRSSKDzmVyMo';

let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        if (SUPABASE_URL.includes('xxxxx') || SUPABASE_ANON_KEY.includes('...')) {
            console.warn('⚠️ Harap ganti credentials Supabase di feedback.js');
            return null;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// ============================================
// RATING SYSTEM
// ============================================

function initRatingSystem() {
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('rating-value');
    const ratingText = document.getElementById('rating-text');
    
    const ratingLabels = {
        1: 'Sangat Buruk',
        2: 'Buruk',
        3: 'Cukup',
        4: 'Bagus',
        5: 'Sangat Bagus'
    };
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.dataset.value);
            ratingInput.value = value;
            updateStarDisplay(stars, value);
            ratingText.textContent = ratingLabels[value];
            ratingText.className = 'rating-text rating-' + value;
        });
        
        star.addEventListener('mouseover', () => {
            const value = parseInt(star.dataset.value);
            updateStarDisplay(stars, value);
        });
        
        star.addEventListener('mouseout', () => {
            const currentValue = parseInt(ratingInput.value) || 0;
            updateStarDisplay(stars, currentValue);
        });
    });
}

function updateStarDisplay(stars, value) {
    stars.forEach((star, index) => {
        if (index < value) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// ============================================
// FORM SUBMISSION
// ============================================

function initFeedbackForm() {
    const form = document.getElementById('feedback-form');
    if (!form) return;
    
    form.addEventListener('submit', handleFeedbackSubmit);
}

async function handleFeedbackSubmit(event) {
    event.preventDefault();
    
    const rating = document.getElementById('rating-value').value;
    const pesan = document.getElementById('feedback-message').value.trim();
    const nama = document.getElementById('feedback-name').value.trim();
    
    const jenisCheckboxes = document.querySelectorAll('input[name="jenis"]:checked');
    const jenis = Array.from(jenisCheckboxes).map(cb => cb.value).join(', ');
    
    // Get visibility option (public or private)
    const visibilityRadios = document.querySelectorAll('input[name="visibility"]');
    let visibility = 'public';
    visibilityRadios.forEach(radio => {
        if (radio.checked) {
            visibility = radio.value;
        }
    });
    
    if (!rating || rating === '0') {
        showToast('Mohon pilih rating terlebih dahulu', 'error');
        return;
    }
    
    if (!pesan) {
        showToast('Mohon isi pesan Anda', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;
    
    try {
        const feedbackData = {
            rating: parseInt(rating),
            pesan: pesan,
            nama: nama || 'Anonim',
            jenis: jenis || 'lainnya',
            visibility: visibility,
            created_at: new Date().toISOString()
        };
        
        const client = getSupabaseClient();
        
        if (client) {
            try {
                await client
                    .from('feedback')
                    .insert([feedbackData]);
                console.log('Feedback dikirim ke Supabase');
            } catch (supabaseError) {
                console.log('Supabase error, menyimpan ke localStorage:', supabaseError);
            }
        }
        
        const existingFeedback = JSON.parse(localStorage.getItem('feedback') || '[]');
        existingFeedback.push(feedbackData);
        localStorage.setItem('feedback', JSON.stringify(existingFeedback));
        
        console.log('Feedback disimpan:', feedbackData);
        
        // Show appropriate success message based on visibility
        if (visibility === 'private') {
            showSuccessMessage();
            showToast('Terima kasih! Masukan private Anda telah dikirim ke mailbox admin.', 'success');
        } else {
            showSuccessMessage();
            showToast('Terima kasih! Masukan Anda sangat berarti.', 'success');
        }
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showToast('Gagal mengirim masukan. Silakan coba lagi.', 'error');
    } finally {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function showSuccessMessage() {
    const form = document.getElementById('feedback-form');
    const successMsg = document.getElementById('success-message');
    
    form.style.display = 'none';
    successMsg.style.display = 'block';
}

function resetFeedbackForm() {
    const form = document.getElementById('feedback-form');
    const successMsg = document.getElementById('success-message');
    const ratingInput = document.getElementById('rating-value');
    const ratingText = document.getElementById('rating-text');
    const stars = document.querySelectorAll('.star');
    
    form.reset();
    form.style.display = 'block';
    successMsg.style.display = 'none';
    
    ratingInput.value = 0;
    ratingText.textContent = 'Pilih rating';
    ratingText.className = 'rating-text';
    stars.forEach(star => star.classList.remove('active'));
}

// ============================================
// FETCH FEEDBACK LIST (PUBLIC ONLY)
// ============================================

async function fetchFeedbackList() {
    const feedbackList = document.getElementById('feedback-list');
    
    setLoading(true);
    
    try {
        const client = getSupabaseClient();
        let feedbackData = [];
        
        if (client) {
            try {
                const { data, error } = await client
                    .from('feedback')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20);
                
                if (!error && data && data.length > 0) {
                    feedbackData = data;
                }
            } catch (supabaseError) {
                console.log('Supabase error, menggunakan localStorage:', supabaseError);
            }
        }
        
        if (feedbackData.length === 0) {
            const localFeedback = localStorage.getItem('feedback');
            if (localFeedback) {
                feedbackData = JSON.parse(localFeedback);
                feedbackData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
        }
        
        // Filter only PUBLIC feedback for display on feedback page
        feedbackData = feedbackData.filter(f => f.visibility !== 'private');
        
        if (feedbackData.length > 0) {
            renderFeedbackList(feedbackData);
        } else {
            feedbackList.innerHTML = '<div class="empty-state"><div style="font-size: 2rem; margin-bottom: 8px;">💬</div><p>Belum ada masukan</p></div>';
        }
        
    } catch (error) {
        console.error('Error fetching feedback:', error);
        feedbackList.innerHTML = '<div class="empty-state"><div style="font-size: 2rem; margin-bottom: 8px;">❌</div><p>Error memuat data</p></div>';
    } finally {
        setLoading(false);
    }
}

function renderFeedbackList(feedbackData) {
    const feedbackList = document.getElementById('feedback-list');
    
    const ratingStars = {
        1: '⭐',
        2: '⭐⭐',
        3: '⭐⭐⭐',
        4: '⭐⭐⭐⭐',
        5: '⭐⭐⭐⭐⭐'
    };
    
    let html = '';
    feedbackData.forEach(feedback => {
        const date = formatDateIndonesia(feedback.created_at);
        const stars = ratingStars[feedback.rating] || '';
        
        let jenisHtml = '';
        if (feedback.jenis) {
            jenisHtml = '<div class="feedback-jenis">' + escapeHtml(feedback.jenis) + '</div>';
        }
        
        html += '<div class="feedback-item">' +
            '<div class="feedback-header">' +
                '<div class="feedback-rating">' + stars + '</div>' +
                '<div class="feedback-date">' + date + '</div>' +
            '</div>' +
            '<div class="feedback-content">' +
                '<div class="feedback-name">' + escapeHtml(feedback.nama || 'Anonim') + '</div>' +
                jenisHtml +
                '<div class="feedback-pesan">' + escapeHtml(feedback.pesan) + '</div>' +
            '</div>' +
        '</div>';
    });
    
    feedbackList.innerHTML = html;
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

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

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initRatingSystem();
    initFeedbackForm();
    fetchFeedbackList();
    
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchFeedbackList);
    }
});
