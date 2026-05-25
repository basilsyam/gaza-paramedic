(() => {
// ===== Helpers =====
const escapeHTML = str => {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
};

// ===== UI Elements =====
const $ = id => document.getElementById(id);

const cardsContainer = $('cardsContainer');
const searchInput = $('searchInput');
const clearSearchBtn = $('clearSearch');
const modal = $('detailsModal');
const modalBody = $('modalBody');
const loadingBar = $('loadingBar');
const noResults = $('noResults');
const backToTopBtn = $('backToTop');
const emergencyBtn = $('emergencyBtn');
const mapSection = $('mapSection');
const installBtn = $('installBtn');

const categoryBtns = document.querySelectorAll('.cat-btn');
const WHATSAPP_URL = 'https://wa.me/qr/BTS7PWXWB7BAP1';

// ===== State =====
let aidData = [];
let activeCategory = 'all';
let favorites = JSON.parse(localStorage.getItem('favAid')) || [];
let deferredPrompt;
let map;
let mapInitialized = false;

const criticalIds = [
    'severe-bleeding',
    'white-phosphorus',
    'crush-injuries',
    'seizures-epilepsy',
    'bone-fracture',
    'electric-shock',
    'drowning-near',
    'smoke-inhalation-fire',
    'asthma-attack',
    'gas-inhalation'
];

// ===== Hospitals =====
const hospitals = [

    // ===== مشافي ميدانية تعمل =====
    {
        name: "المستشفى الكويتي الميداني",
        lat: 31.358316,
        lng: 34.277236,
        city: "خانيونس",
        status: "active",
        type: "field"
    },
    {
        name: "مستشفى الزوايدة الميداني البلجيكي",
        lat: 31.4395,
        lng: 34.3820,
        city: "الزوايدة - قرب شارع الرشيد",
        status: "active",
        type: "field"
    },
    {
        name: "المستشفى الميداني الأردني",
        lat: 31.3480,
        lng: 34.3020,
        city: "خانيونس",
        status: "active",
        type: "field"
    },

    // ===== شمال غزة =====
    {
        name: "مستشفى العودة",
        lat: 31.5365,
        lng: 34.5005,
        city: "شمال غزة - جباليا",
        status: "partial",
        type: "main"
    },
    {
        name: "مستشفى كمال عدوان",
        lat: 31.5456,
        lng: 34.5022,
        city: "شمال غزة - بيت لاهيا",
        status: "closed",
        type: "main"
    },
    {
        name: "المستشفى الإندونيسي",
        lat: 31.5454,
        lng: 34.5126,
        city: "شمال غزة - بيت لاهيا",
        status: "closed",
        type: "main"
    },

    // ===== مدينة غزة =====
    {
        name: "مجمع الشفاء الطبي",
        lat: 31.5247,
        lng: 34.4444,
        city: "غزة",
        status: "partial",
        type: "main"
    },
    {
        name: "مستشفى الأهلي العربي (المعمداني)",
        lat: 31.5065,
        lng: 34.4668,
        city: "غزة - الزيتون",
        status: "partial",
        type: "main"
    },
    {
        name: "مستشفى الصحابة",
        lat: 31.5107,
        lng: 34.4578,
        city: "غزة",
        status: "partial",
        type: "main"
    },
    {
        name: "مستشفى الخدمة العامة",
        lat: 31.5138,
        lng: 34.4529,
        city: "غزة",
        status: "partial",
        type: "main"
    },

    // ===== الوسطى =====
    {
        name: "مستشفى شهداء الأقصى",
        lat: 31.4170,
        lng: 34.3500,
        city: "دير البلح",
        status: "partial",
        type: "main"
    },
    {
        name: "مستشفى العودة - النصيرات",
        lat: 31.4450,
        lng: 34.3920,
        city: "النصيرات",
        status: "partial",
        type: "main"
    },

    // ===== خانيونس =====
    {
        name: "مستشفى ناصر الطبي",
        lat: 31.3475,
        lng: 34.2965,
        city: "خانيونس",
        status: "partial",
        type: "main"
    },
    {
        name: "مستشفى الأمل",
        lat: 31.3408,
        lng: 34.3060,
        city: "خانيونس",
        status: "partial",
        type: "main"
    },
    {
        name: "نقطة العودة الطبية",
        lat: 31.518185,
        lng: 34.456242,
        city: "غزة",
        status: "active",
    type: "field"
    },
    {
        name: "نقطة الهلال الأحمر الطبية",
        lat: 31.511694,
        lng: 34.449664,
        city: "غزة",
        status: "active",
        type: "field"
    },
    {
        name: "نقطة السلام الطبية",
        lat: 31.355103,
        lng: 34.282159,
        city: "خانيونس",
        status: "active",
        type: "field"
    },
    {
        name: "المستشفى البريطاني",
        lat: 31.3460387,
        lng: 34.2491252,
        city: "رفح فش فرش",
        status: "active",
        type: "main"
    },
    {
        name: "نقطة الهلال الأحمر الطبية",
        lat: 31.368645,
        lng: 34.273857,
        city: "خانيونس - الرشيد قرب الميناء",
        status: "active",
        type: "field"
    },
];

// ===== Map =====
const initMap = () => {
    if (mapInitialized) {
        setTimeout(() => map.invalidateSize(), 300);
        return;
    }

    if (typeof L === 'undefined') {
        showToast('⚠️ مكتبة الخريطة غير محملة');
        return;
    }

    map = L.map('map').setView([31.4395, 34.3820], 11);

    const tiles = L.tileLayer('tiles/{z}/{x}/{y}.png', {
        maxZoom: 18,
        maxNativeZoom: 14,
        minZoom: 11,
        attribution: '&copy; Offline Gaza Map'
    });

    tiles.addTo(map);

    tiles.on('tileerror', () => {
        console.log('Tile missing locally.');
    });

    hospitals.forEach(h => {
        const statusColor =
            h.status === 'active' ? '#10b981' :
            h.status === 'partial' ? '#f59e0b' :
            '#ef4444';

        const statusText =
            h.status === 'active' ? 'يعمل' :
            h.status === 'partial' ? 'يعمل جزئياً' :
            'مغلق';

        const marker = L.circleMarker([h.lat, h.lng], {
            radius: 9,
            fillColor: statusColor,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(map);

        marker.bindPopup(`
            <div style="direction:rtl;text-align:right;font-family:Cairo;min-width:160px">
                <b>${h.name}</b><br>
                <span>${h.city}</span><br><br>
                <span style="color:${statusColor};font-weight:bold">● ${statusText}</span>
                <hr>
                <a href="https://www.google.com/maps?q=${h.lat},${h.lng}"
                   target="_blank"
                   rel="noopener noreferrer"
                   style="text-decoration:none;color:#ff4757;font-weight:bold">
                    فتح بالملاحة
                </a>
            </div>
        `);
    });

    mapInitialized = true;

    setTimeout(() => {
        map.invalidateSize();
        map.setView([31.4395, 34.3820], 11);
    }, 500);
};

// ===== Font =====
let fontSize = parseFloat(localStorage.getItem('fontSize')) || 100;

const applyFont = () => {
    document.documentElement.style.setProperty('--font-base-size', fontSize + '%');
    localStorage.setItem('fontSize', fontSize);
};

applyFont();

$('fontIncrease').onclick = () => {
    if (fontSize < 140) {
        fontSize += 10;
        applyFont();
    }
};

$('fontDecrease').onclick = () => {
    if (fontSize > 80) {
        fontSize -= 10;
        applyFont();
    }
};

// ===== Theme =====
const applyTheme = theme => {
    const isLight = theme === 'light';

    document.body.classList.toggle('light-mode', isLight);
    document.body.classList.toggle('dark-mode', !isLight);

    $('themeToggle').innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem('theme', theme);
};

applyTheme(localStorage.getItem('theme') || 'dark');

$('themeToggle').onclick = () => {
    applyTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light');
};

// ===== Fetch Data =====
const fetchData = async () => {
    loadingBar.style.width = '40%';

    const tryFetch = async () => {
        // جرب الشبكة أو الكاش مباشرة
        try {
            const res = await fetch('data.json', { cache: 'force-cache' });
            if (res.ok) return await res.json();
        } catch (_) {}

        // Fallback: ابحث في كاش عامل الخدمة المتاح بدل الاعتماد على رقم نسخة ثابت.
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    const cache = await caches.open(cacheName);
                    const cached = await cache.match('./data.json');
                    if (cached) return await cached.json();
                }
            } catch (_) {}
        }
        return null;
    };

    try {
        const data = await tryFetch();

        if (!data) throw new Error('no data');

        aidData = data;
        loadingBar.style.width = '100%';
        setTimeout(() => { loadingBar.style.opacity = '0'; }, 400);
        updateStats();
        renderCards(aidData);

    } catch (err) {
        console.error(err);
        loadingBar.style.background = '#ff4757';
        loadingBar.style.width = '100%';
        cardsContainer.innerHTML = `
            <div style="padding:2rem;text-align:center">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;color:#ff4757;margin-bottom:.8rem"></i>
                <p style="color:#ff4757;font-weight:900">تعذّر تحميل البيانات</p>
                <p style="color:#94a3b8;font-size:.85rem;margin:.5rem 0 1rem">تأكد من فتح التطبيق عبر متصفح أو سيرفر</p>
                <button class="btn" onclick="location.reload()">إعادة المحاولة</button>
            </div>
        `;
    }
};

// ===== Stats =====
const updateStats = () => {
    const total = aidData.length;
    const gaza = aidData.filter(i => i.category === 'gaza').length;
    const nums = aidData.filter(i => i.category === 'numbers').length;

    $('totalCount').textContent = total;
    $('gazaCount').textContent = gaza;
    $('numbersCount').textContent = nums;
};

const getActiveData = () => {
    if (activeCategory === 'all') return aidData;
    if (activeCategory === 'favorites') return aidData.filter(i => favorites.includes(i.id));
    if (activeCategory === 'emergency') return aidData.filter(i => criticalIds.includes(i.id));
    if (activeCategory === 'map') return [];
    return aidData.filter(i => i.category === activeCategory);
};

// ===== Observer =====
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal');
            observer.unobserve(entry.target);
        }
    });
}, {
    rootMargin: '220px 0px',
    threshold: 0.01
});

// ===== Render Cards =====
const renderCards = data => {
    cardsContainer.innerHTML = '';

    noResults.style.display = data.length ? 'none' : 'block';
    cardsContainer.style.display = data.length ? 'grid' : 'none';

    if (!data.length) {
        $('searchTerm').textContent = searchInput.value.trim() || 'هذا التصنيف';
        return;
    }

    data.forEach((item, i) => {
        const isFav = favorites.includes(item.id);
        const isCrit = criticalIds.includes(item.id);

        const card = document.createElement('div');
        card.className = 'card';
        card.style.transitionDelay = `${Math.min(i, 6) * 20}ms`;

        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">${escapeHTML(item.title)}</span>
                <button class="fav-btn ${isFav ? 'active' : ''}">
                    ${isFav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>'}
                </button>
            </div>

            <p class="card-desc">${escapeHTML(item.desc)}</p>

            <div class="card-footer">
                <span class="card-badge ${
                    isCrit
                        ? 'badge-critical'
                        : item.category === 'gaza'
                            ? 'badge-gaza'
                            : 'badge-numbers'
                }">
                    ${
                        isCrit
                            ? 'حالة حرجة'
                            : item.category === 'gaza'
                                ? 'طارئ غزة'
                                : 'أرقام حيوية'
                    }
                </span>
            </div>
        `;

        card.onclick = e => {
            if (!e.target.closest('.fav-btn')) {
                showDetails(item);
            }
        };

        card.querySelector('.fav-btn').onclick = e => {
            e.stopPropagation();
            toggleFav(item.id, e.currentTarget);
        };

        cardsContainer.appendChild(card);
        observer.observe(card);
    });
};

// ===== Favorites =====
const toggleFav = (id, btn) => {
    const idx = favorites.indexOf(id);

    if (idx > -1) {
        favorites.splice(idx, 1);
    } else {
        favorites.push(id);
    }

    btn.classList.toggle('active');
    btn.innerHTML = favorites.includes(id) ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';

    localStorage.setItem('favAid', JSON.stringify(favorites));

    showToast(idx > -1 ? 'تمت الإزالة' : 'تمت الإضافة');

    if (activeCategory === 'favorites') {
        renderCards(aidData.filter(i => favorites.includes(i.id)));
    }
};

// ===== Modal =====
const showDetails = item => {
    const isNums = item.category === 'numbers';

    modalBody.innerHTML = `
        <h2 class="detail-title">${escapeHTML(item.title)}</h2>

        ${
            isNums
                ? `
                    <div class="phone-list">
                        ${item.steps.map(s => {
                            const [n, num] = s.split(':');
                            return `
                                <div class="phone-item">
                                    <span class="phone-name">${escapeHTML(n || '')}</span>
                                    <span class="phone-number">${escapeHTML(num || '')}</span>
                                    <a href="tel:${escapeHTML(num || '')}" class="btn"><i class="fa-solid fa-phone"></i> اتصال</a>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `
                : `
                    <ul class="detail-steps">
                        ${item.steps.map(s => `<li>${escapeHTML(s)}</li>`).join('')}
                    </ul>
                `
        }

        <div class="detail-warning">
            <h4>⚠️ تحذير طبي:</h4>
            <p>${item.warnings}</p>
        </div>

        <button id="shareBtn" class="btn share-btn"><i class="fa-solid fa-share-nodes"></i> مشاركة</button>
    `;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    $('shareBtn').onclick = () => shareItem(item);
};

$('closeModalBtn').onclick = () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.onclick = e => {
    if (e.target === modal) {
        $('closeModalBtn').onclick();
    }
};

const copyShared = text => {
    navigator.clipboard.writeText(text)
        .then(() => showToast('تم نسخ المشاركة المختصرة مع رابط التطبيق والواتساب'))
        .catch(() => showToast('لم يتم النسخ'));
};

// ===== Share =====
const shareItem = item => {
    const appUrl = window.location.origin + window.location.pathname;
    {
        const steps = Array.isArray(item.steps) ? item.steps.slice(0, 3) : [];
        const warning = item.warnings ? `\nتحذير: ${item.warnings}` : '';
        const shareText = `مُسعِف غزة | ${item.title}

${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}${warning}

افتح التطبيق:
${appUrl}

واتساب المطور:
${WHATSAPP_URL}`;

        if (navigator.share) {
            navigator.share({
                title: `مُسعِف غزة - ${item.title}`,
                text: shareText,
                url: appUrl
            }).catch(() => copyShared(shareText));
        } else {
            copyShared(shareText);
        }

        return;
    }

    const text = `
مُسعِف غزة | ${item.title}

${item.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

تحذير:
${item.warnings}

 افتح التطبيق الكامل:
${appUrl}
    تم التطوير بواسطة م.باسل عبد القادر صيام
`;

    if (navigator.share) {
        navigator.share({
            title: `مُسعِف غزة - ${item.title}`,
            text,
            url: appUrl
        }).catch(() => copy(text));
    } else {
        copy(text);
    }

};

// ===== Copy =====
const copy = text => {
    navigator.clipboard.writeText(text)
        .then(() => showToast('تم نسخ المعلومة مع رابط التطبيق'))
        .catch(() => showToast('لم يتم النسخ'));
};

// ===== Toast =====
const showToast = (msg, action) => {
    const old = $('toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.innerHTML = `
        <span>${escapeHTML(msg)}</span>
        ${action ? `<button type="button">${escapeHTML(action.label)}</button>` : ''}
    `;

    const actionBtn = toast.querySelector('button');
    if (actionBtn) actionBtn.onclick = action.onClick;

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: 'calc(var(--footer-space, 4.5rem) + 1rem)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '99999'
    });

    document.body.appendChild(toast);

    if (!action) {
        setTimeout(() => {
            toast.remove();
        }, 2500);
    }
};

// ===== Search =====
searchInput.oninput = e => {
    const t = e.target.value.toLowerCase().trim();
    const data = getActiveData();

    clearSearchBtn.style.display = t ? 'flex' : 'none';

    if (!t) {
        return renderCards(data);
    }

    const results = data.filter(i => {
        const title = (i.title || '').toLowerCase();
        const desc = (i.desc || '').toLowerCase();
        const warnings = (i.warnings || '').toLowerCase();
        const steps = Array.isArray(i.steps) ? i.steps.join(' ').toLowerCase() : '';

        return (
            title.includes(t) ||
            desc.includes(t) ||
            warnings.includes(t) ||
            steps.includes(t)
        );
    });

    renderCards(results);
};

clearSearchBtn.onclick = () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderCards(getActiveData());
    searchInput.focus();
};

// ===== Categories =====
categoryBtns.forEach(btn => {
    btn.onclick = () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

        const cat = btn.dataset.category;
        activeCategory = cat;

        mapSection.style.display = cat === 'map' ? 'block' : 'none';

        if (cat === 'map') {
            cardsContainer.style.display = 'none';
            noResults.style.display = 'none';

            setTimeout(() => {
                initMap();
            }, 300);

            return;
        }

        searchInput.value = '';
        clearSearchBtn.style.display = 'none';

        if (cat === 'all') {
            renderCards(aidData);
        } else if (cat === 'favorites') {
            renderCards(aidData.filter(i => favorites.includes(i.id)));
        } else {
            renderCards(aidData.filter(i => i.category === cat));
        }
    };
});

// ===== Emergency =====
emergencyBtn.onclick = () => {
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }

    activeCategory = 'emergency';

    renderCards(aidData.filter(i => criticalIds.includes(i.id)));

    showToast('حالات حرجة');

    categoryBtns.forEach(b => b.classList.remove('active'));

    mapSection.style.display = 'none';
    cardsContainer.style.display = 'grid';
};

// ===== Scroll =====
window.onscroll = () => {
    backToTopBtn.classList.toggle('visible', window.scrollY > 300);
};

backToTopBtn.onclick = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

// ===== Offline / Updates =====
const ensureOfflinePanel = () => {
    let panel = $('offlinePanel');
    if (panel) return panel;

    panel = document.createElement('section');
    panel.id = 'offlinePanel';
    panel.className = 'offline-panel';
    panel.innerHTML = `
        <div class="offline-panel-icon"><i class="fa-solid fa-wifi"></i></div>
        <div>
            <b>جاهز للعمل بدون إنترنت</b>
            <p>تم تجهيز التطبيق ليبقى متاحًا عند انقطاع الشبكة.</p>
        </div>
    `;

    document.querySelector('.categories').insertAdjacentElement('afterend', panel);
    return panel;
};

const setOfflinePanel = () => {
    const panel = ensureOfflinePanel();
    panel.classList.toggle('is-offline', !navigator.onLine);

    panel.querySelector('b').textContent = navigator.onLine
        ? 'جاهز للعمل بدون إنترنت'
        : 'أنت الآن بدون إنترنت';

    panel.querySelector('p').textContent = navigator.onLine
        ? 'تم تجهيز التطبيق ليبقى متاحًا عند انقطاع الشبكة.'
        : 'لا تقلق، يمكنك متابعة استخدام الدليل والخريطة من النسخة المحفوظة.';
};

const showUpdateReady = registration => {
    showToast('يتوفر تحديث جديد للتطبيق', {
        label: 'تحديث الآن',
        onClick: () => {
            if (registration.waiting) {
                sessionStorage.setItem('swUpdateRequested', '1');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        }
    });
};

// ===== Online Status =====
const updateOnlineStatus = () => {
    setOfflinePanel();

    const old = $('offlineBadge');
    if (old) old.remove();

    if (!navigator.onLine) {
        const badge = document.createElement('div');
        badge.id = 'offlineBadge';
        badge.className = 'offline-badge';
        badge.innerHTML = 'متاح أوفلاين';
        document.body.appendChild(badge);
    } else {
        // إعادة محاولة جلب البيانات في حال الفشل مسبقاً ورجوع الإنترنت
        if (aidData && aidData.length === 0) {
            fetchData();
        }
    }
};

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

updateOnlineStatus();

// ===== Install Prompt =====
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

if (!isStandalone && isIOS) {
    installBtn.style.display = 'block';

    installBtn.onclick = () => {
        $('iosInstallModal').style.display = 'block';
    };
}

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();

    deferredPrompt = e;
    installBtn.style.display = 'block';

    installBtn.onclick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            installBtn.style.display = 'none';
            showToast('تم التثبيت');
        }

        deferredPrompt = null;
    };
});

// ===== Service Worker =====
// التحديث يدوي فقط — لا تحديث تلقائي
if ('serviceWorker' in navigator) {
    let refreshing = false;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW Registered');

                if (registration.waiting && navigator.serviceWorker.controller) {
                    showUpdateReady(registration);
                }

                registration.addEventListener('updatefound', () => {
                    const worker = registration.installing;
                    if (!worker) return;

                    worker.addEventListener('statechange', () => {
                        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateReady(registration);
                        }
                    });
                });
            })
            .catch(err => console.error(err));
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        const updateRequested = sessionStorage.getItem('swUpdateRequested') === '1';

        if (updateRequested && !refreshing) {
            refreshing = true;
            sessionStorage.removeItem('swUpdateRequested');
            window.location.reload();
        }
    });
}

// ===== Start =====
ensureOfflinePanel();
fetchData();
})();
