// Баланс пользователя
let userBalance = 1000; // Демо-баланс по умолчанию
let isDemoMode = true;

// Загрузка auth.js для доступа к UserManager
const authScript = document.createElement('script');
authScript.src = 'auth.js';
authScript.onerror = function() {
    console.error('Ошибка загрузки auth.js');
};
authScript.onload = function() {
    console.log('auth.js загружен успешно');
};
document.head.appendChild(authScript);

// Проверка авторизации и загрузка пользователя
function checkAuth() {
    const currentUser = localStorage.getItem('lucybliss_current_user');
    
    if (!currentUser) {
        // Пользователь не авторизован - показываем в демо режиме
        isDemoMode = true;
        userBalance = 1000;
        updateDemoProfile();
        return false;
    }
    
    // Пользователь авторизован
    const user = JSON.parse(currentUser);
    isDemoMode = false;
    updateUserProfile(user);
    userBalance = user.balance || 0;
    
    return true;
}

// Обновление профиля для демо-режима
function updateDemoProfile() {
    const profileContent = document.getElementById('profileContent');
    const userInfoBlock = document.getElementById('userInfoBlock');
    const balanceMode = document.getElementById('balanceMode');
    const headerActions = document.getElementById('headerActions');
    const userProfileSection = document.getElementById('userProfileSection');
    
    if (profileContent) profileContent.style.display = 'flex';
    if (userInfoBlock) userInfoBlock.style.display = 'none';
    if (balanceMode) balanceMode.style.display = 'inline';
    if (headerActions) headerActions.style.display = 'none'; // Скрываем баланс и уведомления
    if (userProfileSection) {
        userProfileSection.style.cursor = 'pointer';
    }
}

// Обновление профиля пользователя
function updateUserProfile(user) {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userId = document.getElementById('userId');
    const profileContent = document.getElementById('profileContent');
    const userInfoBlock = document.getElementById('userInfoBlock');
    const balanceMode = document.getElementById('balanceMode');
    const headerActions = document.getElementById('headerActions');
    const userProfileSection = document.getElementById('userProfileSection');
    
    if (userAvatar && userName && userId && userInfoBlock) {
        // Создаём инициалы из имени
        const initials = user.username.substring(0, 2).toUpperCase();
        userAvatar.textContent = initials;
        userName.textContent = user.username;
        userId.textContent = `ID ${user.id}`;
        
        if (profileContent) profileContent.style.display = 'none';
        userInfoBlock.style.display = 'flex';
        if (balanceMode) balanceMode.style.display = 'none';
        if (headerActions) headerActions.style.display = 'flex'; // Показываем баланс и уведомления
        if (userProfileSection) {
            userProfileSection.style.cursor = 'default'; // Убираем курсор pointer для авторизованных
        }
    }
}

// Обновление RTP бейджей
function updateRTPBadges() {
    const badges = document.querySelectorAll('.rtp-badge');
    badges.forEach(badge => {
        const slotId = badge.dataset.slot;
        if (slotId && typeof window.getSlotConfig === 'function') {
            const config = window.getSlotConfig(slotId);
            if (config && config.rtp) {
                badge.textContent = `RTP: ${config.rtp.toFixed(1)}%`;
            }
        }
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем авторизацию (но не редиректим)
    checkAuth();
    
    updateBalance();
    initGameCards();
    initCategories();
    initSearch();
    initAuthModal();
    initProviderButton();
    
    // Кнопка выхода
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите выйти?')) {
                localStorage.removeItem('lucybliss_current_user');
                location.reload(); // Перезагружаем страницу для перехода в демо режим
            }
        });
    }
    
    // Клик по балансу для пополнения
    const balanceDisplay = document.getElementById('balanceDisplay');
    if (balanceDisplay) {
        balanceDisplay.addEventListener('click', () => {
            if (isDemoMode) {
                showAuthModal('login');
                showNotification('Войдите для пополнения баланса', 'info');
            } else {
                showDepositModal();
            }
        });
    }
    
    // Инициализация модального окна пополнения
    initDepositModal();
    
    // Обновляем RTP бейджи после загрузки админ скрипта
    setTimeout(updateRTPBadges, 100);
    
    // Инициализация баннера
    initBanner();
    
    // Инициализация кнопки уведомлений
    initNotificationButton();
    
    // Инициализация модального окна провайдеров
    initProvidersModal();
});

// Обновление баланса
function updateBalance() {
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        // Синхронизируем баланс с текущим пользователем
        if (!isDemoMode) {
            const currentUser = localStorage.getItem('lucybliss_current_user');
            if (currentUser) {
                const user = JSON.parse(currentUser);
                userBalance = user.balance || 0;
            }
        }
        
        balanceElement.textContent = userBalance.toFixed(2);
    }
}

// Сохранение баланса пользователя
function saveUserBalance(newBalance) {
    userBalance = newBalance;
    
    // Обновляем текущего пользователя
    const currentUser = localStorage.getItem('lucybliss_current_user');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        user.balance = newBalance;
        localStorage.setItem('lucybliss_current_user', JSON.stringify(user));
        
        // Обновляем в общей базе пользователей
        const users = JSON.parse(localStorage.getItem('lucybliss_users') || '[]');
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex].balance = newBalance;
            localStorage.setItem('lucybliss_users', JSON.stringify(users));
        }
    }
    
    updateBalance();
}

// Инициализация карточек игр
function initGameCards() {
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        const playBtn = card.querySelector('.btn-play');
        const demoBtn = card.querySelector('.btn-demo');
        const gameType = card.dataset.game;
        
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (gameType) {
                    playGame(gameType, false);
                } else {
                    showNotification('Эта игра скоро будет доступна', 'info');
                }
            });
        }
        
        if (demoBtn) {
            demoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (gameType) {
                    playGame(gameType, true);
                } else {
                    showNotification('Эта игра скоро будет доступна', 'info');
                }
            });
        }
        
        // Клик по карточке - открывает демо
        card.addEventListener('click', () => {
            if (gameType) {
                playGame(gameType, true);
            } else {
                showNotification('Эта игра скоро будет доступна', 'info');
            }
        });
    });
}

// Запуск игры
function playGame(gameType, forceDemoMode) {
    // Если пользователь не авторизован - всегда демо режим
    const finalIsDemo = isDemoMode ? true : forceDemoMode;
    
    // Если пытаются играть на реальные деньги в демо-режиме
    if (!forceDemoMode && isDemoMode) {
        showNotification('Войдите, чтобы играть на реальные деньги', 'info');
        setTimeout(() => showAuthModal('login'), 500);
        return;
    }
    
    // Сохраняем баланс пользователя
    if (!isDemoMode && !forceDemoMode) {
        const currentUser = localStorage.getItem('lucybliss_current_user');
        if (currentUser) {
            const user = JSON.parse(currentUser);
            localStorage.setItem('userBalance', user.balance.toString());
        }
    } else {
        localStorage.setItem('userBalance', '1000');
    }
    
    localStorage.setItem('isDemo', finalIsDemo.toString());
    
    // Открываем игру
    if (gameType === 'candy-slot') {
        window.location.href = 'game.html';
    } else if (gameType === 'olympus') {
        window.location.href = 'olympus.html';
    } else if (gameType === 'crash') {
        window.location.href = 'crash.html';
    } else if (gameType === 'nvuti') {
        window.location.href = 'nvuti.html';
    } else {
        showNotification('Эта игра пока недоступна', 'info');
    }
}

// Инициализация категорий
function initCategories() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    const gamesGrid = document.querySelectorAll('.games-grid');
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем активный класс у всех
            categoryBtns.forEach(b => b.classList.remove('active'));
            
            // Добавляем активный класс текущей
            btn.classList.add('active');
            
            const category = btn.dataset.category;
            filterGamesByCategory(category);
        });
    });
}

// Фильтрация игр по категории
function filterGamesByCategory(category) {
    const allCards = document.querySelectorAll('.game-card');
    
    if (category === 'all') {
        // Показываем все игры
        allCards.forEach(card => card.style.display = 'block');
        return;
    }
    
    if (category === 'history') {
        // Показываем историю игр (можно показать последние игры из localStorage)
        showNotification('История игр пуста', 'info');
        return;
    }
    
    if (category === 'popular') {
        // Показываем популярные игры
        allCards.forEach(card => {
            const gameName = card.dataset.game;
            if (['candy-slot', 'olympus', 'crash'].includes(gameName)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        return;
    }
    
    if (category === 'mell' || category === 'tables') {
        // Lucy Originals
        allCards.forEach(card => {
            const provider = card.querySelector('.game-provider')?.textContent;
            if (provider && provider.includes('LUCY')) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        return;
    }
    
    if (category === 'slots') {
        // Слоты (все кроме Lucy Originals)
        allCards.forEach(card => {
            const provider = card.querySelector('.game-provider')?.textContent;
            const gameName = card.dataset.game;
            if (gameName === 'crash' || gameName === 'nvuti') {
                card.style.display = 'none';
            } else if (provider && !provider.includes('LUCY')) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        return;
    }
    
    if (category === 'rtp') {
        // Игры с высоким RTP
        allCards.forEach(card => {
            const rtpBadge = card.querySelector('.rtp-badge');
            if (rtpBadge) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        return;
    }
    
    if (category === 'new') {
        // Новые игры
        allCards.forEach(card => {
            const gameName = card.dataset.game;
            if (['nvuti', 'crash'].includes(gameName)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        return;
    }
    
    // По умолчанию показываем все
    allCards.forEach(card => card.style.display = 'block');
}

// Инициализация поиска
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            searchGames(query);
        });
        
        // Очистка поиска при нажатии Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchGames('');
            }
        });
    }
}

// Поиск игр
function searchGames(query) {
    const gameCards = document.querySelectorAll('.game-card');
    let foundCount = 0;
    
    if (!query) {
        // Если поиск пустой - показываем все игры
        gameCards.forEach(card => card.style.display = 'block');
        return;
    }
    
    gameCards.forEach(card => {
        const gameName = card.querySelector('.game-name')?.textContent.toLowerCase() || '';
        const gameProvider = card.querySelector('.game-provider')?.textContent.toLowerCase() || '';
        const previewTitle = card.querySelector('.preview-title')?.textContent.toLowerCase() || '';
        
        if (gameName.includes(query) || gameProvider.includes(query) || previewTitle.includes(query)) {
            card.style.display = 'block';
            foundCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    if (foundCount === 0) {
        showNotification(`Игры по запросу "${query}" не найдены`, 'info');
    }
}

// Уведомления
let notificationQueue = [];
let isShowingNotification = false;

function showNotification(message, type = 'info') {
    // Добавляем в очередь
    notificationQueue.push({ message, type });
    
    // Если не показываем уведомление - начинаем показ
    if (!isShowingNotification) {
        showNextNotification();
    }
}

function showNextNotification() {
    if (notificationQueue.length === 0) {
        isShowingNotification = false;
        return;
    }
    
    isShowingNotification = true;
    const { message, type } = notificationQueue.shift();
    
    const notification = document.createElement('div');
    
    let bgColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    if (type === 'success') {
        bgColor = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
    } else if (type === 'error') {
        bgColor = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
        max-width: 350px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
            // Показываем следующее уведомление
            setTimeout(showNextNotification, 200);
        }, 300);
    }, 3000);
}

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Навигация по меню
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        const itemText = item.textContent.trim();
        const itemHref = item.getAttribute('href');
        
        // Если это админ-панель или есть href со ссылкой на страницу - пропускаем (разрешаем переход)
        if (item.classList.contains('admin-link') || (itemHref && itemHref !== '#' && itemHref.includes('.html'))) {
            return; // Разрешаем переход по ссылке
        }
        
        // Предотвращаем переход по умолчанию только для # ссылок
        if (!itemHref || itemHref === '#') {
            e.preventDefault();
        }
        
        // Убираем активный класс у всех
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // Добавляем активный класс текущей
        item.classList.add('active');
        
        // Обрабатываем клики по разделам без href
        if (!itemHref || itemHref === '#') {
            if (itemText.includes('Казино') && !itemText.includes('Live')) {
                // Если мы уже на главной - показываем все игры
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    showAllGames();
                    showNotification('🎰 Добро пожаловать в казино!', 'success');
                }
            } 
            else if (itemText.includes('Live')) {
                showNotification('🎥 Live казино скоро будет доступно', 'info');
            } 
            else if (itemText.includes('Спорт')) {
                showNotification('⚽ Раздел Спорт находится в разработке', 'info');
            } 
            else if (itemText.includes('Начальная')) {
                // Переход на главную страницу происходит автоматически по href
            } 
            else if (itemText.includes('Бонусы')) {
                // Обрабатываем только если мы НЕ на странице бонусов
                if (!window.location.pathname.includes('bonuses.html')) {
                    if (isDemoMode) {
                        showNotification('🎁 Войдите, чтобы получить бонусы!', 'info');
                        setTimeout(() => showAuthModal('login'), 1000);
                        e.preventDefault();
                    }
                    // Если авторизован - позволяем переход по href
                }
            } 
            else if (itemText.includes('Акции')) {
                // Обрабатываем только если мы НЕ на странице акций
                if (!window.location.pathname.includes('promotions.html')) {
                    if (isDemoMode) {
                        showNotification('🏆 Войдите, чтобы участвовать в акциях!', 'info');
                        setTimeout(() => showAuthModal('login'), 1000);
                        e.preventDefault();
                    }
                    // Если авторизован - позволяем переход по href
                }
            } 
            else if (itemText.includes('Слоты') && !itemText.includes('Mine')) {
                filterGamesByCategory('slots');
                document.querySelector('[data-category="slots"]')?.classList.add('active');
                showNotification('🎰 Слоты отфильтрованы', 'info');
            } 
            else if (itemText.includes('Bonus Buy')) {
                showNotification('🎲 Игры с Bonus Buy скоро появятся', 'info');
            } 
            else if (itemText.includes('Новые')) {
                filterGamesByCategory('new');
                document.querySelector('[data-category="new"]')?.classList.add('active');
                showNotification('✨ Новые игры', 'info');
            }
        }
    });
});

// Показать все игры
function showAllGames() {
    document.querySelectorAll('.game-card').forEach(card => card.style.display = 'block');
    const allBtn = document.querySelector('[data-category="all"]');
    if (allBtn) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        allBtn.classList.add('active');
    }
}

// Показать раздел бонусов
function showBonusesSection() {
    if (isDemoMode) {
        showNotification('🎁 Войдите, чтобы получить бонусы!', 'info');
        setTimeout(() => showAuthModal('login'), 1000);
    } else {
        window.location.href = 'bonuses.html';
    }
}

// Показать раздел акций
function showPromotionsSection() {
    if (isDemoMode) {
        showNotification('🏆 Войдите, чтобы участвовать в акциях!', 'info');
        setTimeout(() => showAuthModal('login'), 1000);
    } else {
        window.location.href = 'promotions.html';
    }
}

// Инициализация кнопки провайдеров
function initProviderButton() {
    const btnProviders = document.querySelector('.btn-providers');
    if (btnProviders) {
        btnProviders.addEventListener('click', () => {
            showProvidersInfo();
        });
    }
}

// Показать информацию о провайдерах
function showProvidersInfo() {
    const modal = document.getElementById('providersModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Инициализация баннера
function initBanner() {
    const bannerBtn = document.querySelector('.banner-btn');
    if (bannerBtn) {
        bannerBtn.addEventListener('click', () => {
            if (isDemoMode) {
                showNotification('Войдите, чтобы получить VIP-бонусы!', 'info');
                setTimeout(() => showAuthModal('login'), 500);
            } else {
                showNotification('🎁 VIP Адвент календарь открыт!', 'success');
            }
        });
    }
}

// Инициализация кнопки уведомлений
function initNotificationButton() {
    const btnNotifications = document.querySelector('.btn-notifications');
    if (btnNotifications) {
        btnNotifications.addEventListener('click', () => {
            if (isDemoMode) {
                showNotification('Войдите, чтобы видеть уведомления', 'info');
            } else {
                showNotification('У вас нет новых уведомлений', 'info');
            }
        });
    }
}

// ========== МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ ==========

function initAuthModal() {
    console.log('initAuthModal вызвана');
    const modal = document.getElementById('authModal');
    const closeBtn = document.getElementById('closeAuthModal');
    const btnShowLogin = document.getElementById('btnShowLogin');
    
    const modalLoginForm = document.getElementById('modalLoginForm');
    const modalRegisterForm = document.getElementById('modalRegisterForm');
    const modalShowRegisterBtn = document.getElementById('modalShowRegister');
    const modalShowLoginBtn = document.getElementById('modalShowLogin');
    const profileSection = document.getElementById('profileContent');
    const userProfileSection = document.querySelector('.user-profile-section');
    
    console.log('userProfileSection найден:', !!userProfileSection);
    console.log('profileSection найден:', !!profileSection);
    console.log('isDemoMode:', isDemoMode);
    
    // Клик на всю секцию профиля
    if (userProfileSection) {
        console.log('Добавляем обработчик на userProfileSection');
        userProfileSection.addEventListener('click', (e) => {
            console.log('Клик на userProfileSection, isDemoMode:', isDemoMode);
            if (isDemoMode) {
                e.preventDefault();
                e.stopPropagation();
                showAuthModal('login');
            }
            // Если авторизован - ничего не делаем (позже будет статистика)
        });
    }
    
    // Клик на profileContent (резервный)
    if (profileSection) {
        console.log('Добавляем обработчик на profileSection');
        profileSection.addEventListener('click', (e) => {
            console.log('Клик на profileContent, isDemoMode:', isDemoMode);
            e.preventDefault();
            e.stopPropagation();
            showAuthModal('login');
        });
    }
    
    // Закрытие модального окна
    if (closeBtn) {
        closeBtn.addEventListener('click', hideAuthModal);
    }
    
    // Закрытие при клике вне модального окна
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideAuthModal();
            }
        });
    }
    
    // Переключение между формами внутри модального окна
    if (modalShowRegisterBtn) {
        modalShowRegisterBtn.addEventListener('click', () => {
            modalLoginForm.classList.remove('active');
            modalRegisterForm.classList.add('active');
        });
    }
    
    if (modalShowLoginBtn) {
        modalShowLoginBtn.addEventListener('click', () => {
            modalRegisterForm.classList.remove('active');
            modalLoginForm.classList.add('active');
        });
    }
    
    // Обработка входа
    const btnModalLogin = document.getElementById('btnModalLogin');
    if (btnModalLogin) {
        btnModalLogin.addEventListener('click', handleModalLogin);
    }
    
    const modalLoginPassword = document.getElementById('modalLoginPassword');
    if (modalLoginPassword) {
        modalLoginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleModalLogin();
        });
    }
    
    // Обработка регистрации
    const btnModalRegister = document.getElementById('btnModalRegister');
    if (btnModalRegister) {
        btnModalRegister.addEventListener('click', handleModalRegister);
    }
    
    const modalRegPasswordConfirm = document.getElementById('modalRegPasswordConfirm');
    if (modalRegPasswordConfirm) {
        modalRegPasswordConfirm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleModalRegister();
        });
    }
}

function showAuthModal(formType = 'login') {
    const modal = document.getElementById('authModal');
    const modalLoginForm = document.getElementById('modalLoginForm');
    const modalRegisterForm = document.getElementById('modalRegisterForm');
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Показываем нужную форму
        if (formType === 'register') {
            modalLoginForm.classList.remove('active');
            modalRegisterForm.classList.add('active');
        } else {
            modalRegisterForm.classList.remove('active');
            modalLoginForm.classList.add('active');
        }
    }
}

function hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Очищаем поля
        document.getElementById('modalLoginUsername').value = '';
        document.getElementById('modalLoginPassword').value = '';
        document.getElementById('modalRegUsername').value = '';
        document.getElementById('modalRegPassword').value = '';
        document.getElementById('modalRegPasswordConfirm').value = '';
    }
}

function handleModalLogin() {
    const username = document.getElementById('modalLoginUsername').value.trim();
    const password = document.getElementById('modalLoginPassword').value;
    
    if (!username || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    // Ждём загрузки auth.js
    if (typeof window.userManager === 'undefined') {
        showNotification('Загрузка системы авторизации...', 'info');
        setTimeout(handleModalLogin, 500);
        return;
    }
    
    const result = window.userManager.login(username, password);
    
    if (result.success) {
        showNotification(result.message, 'success');
        hideAuthModal();
        setTimeout(() => {
            location.reload();
        }, 1000);
    } else {
        showNotification(result.message, 'error');
    }
}

function handleModalRegister() {
    const username = document.getElementById('modalRegUsername').value.trim();
    const password = document.getElementById('modalRegPassword').value;
    const passwordConfirm = document.getElementById('modalRegPasswordConfirm').value;
    
    // Валидация
    if (!username || !password || !passwordConfirm) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (username.length < 3) {
        showNotification('Имя пользователя должно быть минимум 3 символа', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Пароль должен быть минимум 6 символов', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    // Ждём загрузки auth.js
    if (typeof window.userManager === 'undefined') {
        showNotification('Загрузка системы авторизации...', 'info');
        setTimeout(handleModalRegister, 500);
        return;
    }
    
    const result = window.userManager.register(username, password);
    
    if (result.success) {
        showNotification(result.message, 'success');
        window.userManager.saveCurrentUser(result.user);
        hideAuthModal();
        setTimeout(() => {
            location.reload();
        }, 1000);
    } else {
        showNotification(result.message, 'error');
    }
}


// ========== МОДАЛЬНОЕ ОКНО ПОПОЛНЕНИЯ ==========

function initDepositModal() {
    const modal = document.getElementById('depositModal');
    const closeBtn = document.getElementById('closeDepositModal');
    const countrySelect = document.getElementById('depositCountry');
    const russiaBlock = document.getElementById('russiaBlock');
    const otherCountryBlock = document.getElementById('otherCountryBlock');
    const amountBlock = document.getElementById('amountBlock');
    const btnConfirm = document.getElementById('btnDepositConfirm');
    const amountInput = document.getElementById('depositAmount');
    
    let selectedPaymentMethod = null;
    
    // Закрытие модального окна
    if (closeBtn) {
        closeBtn.addEventListener('click', hideDepositModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideDepositModal();
            }
        });
    }
    
    // Выбор страны
    if (countrySelect) {
        countrySelect.addEventListener('change', (e) => {
            const country = e.target.value;
            
            // Скрываем все блоки
            russiaBlock.style.display = 'none';
            otherCountryBlock.style.display = 'none';
            amountBlock.style.display = 'none';
            btnConfirm.style.display = 'none';
            selectedPaymentMethod = null;
            
            // Показываем нужный блок
            if (country === 'russia') {
                russiaBlock.style.display = 'block';
            } else if (country) {
                otherCountryBlock.style.display = 'block';
            }
        });
    }
    
    // Выбор платёжной системы
    document.querySelectorAll('.payment-card').forEach(card => {
        card.addEventListener('click', () => {
            // Убираем выделение со всех карточек
            document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
            
            // Выделяем выбранную
            card.classList.add('selected');
            selectedPaymentMethod = card.dataset.method;
            
            // Показываем блок с суммой
            amountBlock.style.display = 'block';
            btnConfirm.style.display = 'block';
        });
    });
    
    // Быстрый выбор суммы
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.dataset.amount;
            amountInput.value = amount;
            
            // Убираем выделение со всех кнопок
            document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
            
            // Выделяем выбранную
            btn.classList.add('active');
        });
    });
    
    // Подтверждение пополнения
    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            const country = countrySelect.value;
            const amount = parseFloat(amountInput.value);
            
            if (!country) {
                showNotification('Выберите страну', 'error');
                return;
            }
            
            if (country === 'russia') {
                const city = document.getElementById('depositCity').value;
                if (!city) {
                    showNotification('Выберите город', 'error');
                    return;
                }
            }
            
            if (!selectedPaymentMethod) {
                showNotification('Выберите платёжную систему', 'error');
                return;
            }
            
            if (!amount || amount < 100) {
                showNotification('Минимальная сумма пополнения: 100 ₽', 'error');
                return;
            }
            
            // Имитация успешного пополнения
            processDeposit(amount, selectedPaymentMethod);
        });
    }
}

function showDepositModal() {
    const modal = document.getElementById('depositModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideDepositModal() {
    const modal = document.getElementById('depositModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Сбрасываем форму
        document.getElementById('depositCountry').value = '';
        document.getElementById('depositCity').value = '';
        document.getElementById('depositAmount').value = '';
        document.getElementById('russiaBlock').style.display = 'none';
        document.getElementById('otherCountryBlock').style.display = 'none';
        document.getElementById('amountBlock').style.display = 'none';
        document.getElementById('btnDepositConfirm').style.display = 'none';
        
        document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    }
}

function processDeposit(amount, method) {
    showNotification('Обработка платежа...', 'info');
    
    // Имитация обработки платежа
    setTimeout(() => {
        // Обновляем баланс
        const newBalance = userBalance + amount;
        saveUserBalance(newBalance);
        
        showNotification(`Баланс успешно пополнен на ${amount} ₽`, 'success');
        hideDepositModal();
    }, 1500);
}


// ========== МОДАЛЬНОЕ ОКНО ПРОВАЙДЕРОВ ==========

function initProvidersModal() {
    const modal = document.getElementById('providersModal');
    const closeBtn = document.getElementById('closeProvidersModal');
    const providerCards = document.querySelectorAll('.provider-card');
    
    // Закрытие модального окна
    if (closeBtn) {
        closeBtn.addEventListener('click', hideProvidersModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideProvidersModal();
            }
        });
    }
    
    // Выбор провайдера
    providerCards.forEach(card => {
        card.addEventListener('click', () => {
            const provider = card.dataset.provider;
            filterByProvider(provider);
            hideProvidersModal();
            
            // Показываем уведомление
            const providerName = card.querySelector('.provider-name').textContent;
            if (provider === 'all') {
                showNotification('Показаны все игры', 'info');
            } else {
                showNotification(`Фильтр: ${providerName}`, 'info');
            }
        });
    });
}

function hideProvidersModal() {
    const modal = document.getElementById('providersModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function filterByProvider(provider) {
    const allCards = document.querySelectorAll('.game-card');
    
    if (provider === 'all') {
        // Показываем все игры
        allCards.forEach(card => card.style.display = 'block');
        return;
    }
    
    allCards.forEach(card => {
        const gameProvider = card.querySelector('.game-provider')?.textContent.toUpperCase() || '';
        
        let shouldShow = false;
        
        switch(provider) {
            case 'pragmatic':
                shouldShow = gameProvider.includes('PRAGMATIC');
                break;
            case 'hacksaw':
                shouldShow = gameProvider.includes('HACKSAW');
                break;
            case 'bgaming':
                shouldShow = gameProvider.includes('BGAMING');
                break;
            case '5oaks':
                shouldShow = gameProvider.includes('5 OAKS');
                break;
            case 'relax':
                shouldShow = gameProvider.includes('RELAX');
                break;
            case 'lucy':
                shouldShow = gameProvider.includes('LUCY');
                break;
        }
        
        card.style.display = shouldShow ? 'block' : 'none';
    });
}


// ========== МОДАЛЬНОЕ ОКНО БОНУСОВ ==========

function initBonusesModal() {
    const modal = document.getElementById('bonusesModal');
    const closeBtn = document.getElementById('closeBonusesModal');
    const bonusBtns = document.querySelectorAll('.bonus-btn');
    
    // Закрытие
    if (closeBtn) {
        closeBtn.addEventListener('click', hideBonusesModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideBonusesModal();
            }
        });
    }
    
    // Кнопки получения бонусов
    bonusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const bonusCard = btn.closest('.bonus-card');
            const bonusTitle = bonusCard.querySelector('.bonus-title').textContent;
            showNotification(`✅ ${bonusTitle} активирован!`, 'success');
            hideBonusesModal();
        });
    });
}

function showBonusesModal() {
    const modal = document.getElementById('bonusesModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideBonusesModal() {
    const modal = document.getElementById('bonusesModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ========== МОДАЛЬНОЕ ОКНО АКЦИЙ ==========

function initPromotionsModal() {
    const modal = document.getElementById('promotionsModal');
    const closeBtn = document.getElementById('closePromotionsModal');
    const promoBtns = document.querySelectorAll('.promo-btn:not(.disabled)');
    
    // Закрытие
    if (closeBtn) {
        closeBtn.addEventListener('click', hidePromotionsModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hidePromotionsModal();
            }
        });
    }
    
    // Кнопки участия в акциях
    promoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const promoCard = btn.closest('.promo-card');
            const promoTitle = promoCard.querySelector('.promo-title').textContent;
            showNotification(`✅ Вы участвуете в "${promoTitle}"!`, 'success');
            hidePromotionsModal();
        });
    });
}

function showPromotionsModal() {
    const modal = document.getElementById('promotionsModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hidePromotionsModal() {
    const modal = document.getElementById('promotionsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}
