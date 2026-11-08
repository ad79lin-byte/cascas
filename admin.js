// Конфигурация слотов
let slotsConfig = {
    global: {
        rtp: 96.0
    },
    slots: {
        'candy-slot': {
            name: 'Sweet Bonanza',
            rtp: 96.5,
            volatility: 'high',
            bonusFrequency: 150,
            maxMultiplier: 21000
        },
        'olympus': {
            name: 'Gates of Olympus',
            rtp: 96.0,
            volatility: 'high',
            bonusFrequency: 180,
            maxMultiplier: 5000
        },
        'crash': {
            name: 'Lucy Crash',
            rtp: 97.0,
            volatility: 'medium',
            crashPoint: 2.0,
            maxMultiplier: 1000
        },
        'nvuti': {
            name: 'Lucy Nvuti',
            rtp: 95.0,
            volatility: 'medium',
            guessChance: 48,
            maxMultiplier: 100
        }
    }
};

// Статистика
let stats = {
    totalSpins: 0,
    totalWagered: 0,
    totalWon: 0
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    initSliders();
    initNavigation();
    initButtons();
    updateStatsDisplay();
    initUsersSection();
});

// Загрузка конфигурации из localStorage
function loadConfig() {
    const savedConfig = localStorage.getItem('slotsConfig');
    if (savedConfig) {
        slotsConfig = JSON.parse(savedConfig);
        applyConfigToUI();
    }
    
    const savedStats = localStorage.getItem('slotsStats');
    if (savedStats) {
        stats = JSON.parse(savedStats);
    }
}

// Применение конфигурации к UI
function applyConfigToUI() {
    // Глобальный RTP
    const globalRTP = document.getElementById('globalRTP');
    if (globalRTP) {
        globalRTP.value = slotsConfig.global.rtp;
        document.getElementById('globalRTPValue').textContent = slotsConfig.global.rtp.toFixed(1) + '%';
    }
    
    // Настройки каждого слота
    Object.keys(slotsConfig.slots).forEach(slotId => {
        const config = slotsConfig.slots[slotId];
        const card = document.querySelector(`.slot-card[data-slot="${slotId}"]`);
        
        if (!card) return;
        
        // RTP
        const rtpSlider = card.querySelector('.rtp-slider');
        if (rtpSlider) {
            rtpSlider.value = config.rtp;
            card.querySelector('.rtp-value').textContent = config.rtp.toFixed(1) + '%';
        }
        
        // Волатильность
        const volatilitySelect = card.querySelector('.volatility-select');
        if (volatilitySelect) {
            volatilitySelect.value = config.volatility;
            updateVolatilityDescription(volatilitySelect);
        }
        
        // Специфичные настройки
        if (config.bonusFrequency) {
            const bonusSlider = card.querySelector('.bonus-freq-slider');
            if (bonusSlider) {
                bonusSlider.value = config.bonusFrequency;
                card.querySelector('.bonus-freq-value').textContent = `1 из ${config.bonusFrequency} спинов`;
            }
        }
        
        if (config.crashPoint) {
            const crashSlider = card.querySelector('.crash-point-slider');
            if (crashSlider) {
                crashSlider.value = config.crashPoint;
                card.querySelector('.crash-point-value').textContent = config.crashPoint.toFixed(1) + 'x';
            }
        }
        
        if (config.guessChance) {
            const guessSlider = card.querySelector('.guess-chance-slider');
            if (guessSlider) {
                guessSlider.value = config.guessChance;
                card.querySelector('.guess-chance-value').textContent = config.guessChance + '%';
            }
        }
        
        // Максимальный множитель
        const maxMultInput = card.querySelector('.max-multiplier-input');
        if (maxMultInput) {
            maxMultInput.value = config.maxMultiplier;
        }
    });
}

// Инициализация слайдеров
function initSliders() {
    // Глобальный RTP
    const globalRTP = document.getElementById('globalRTP');
    if (globalRTP) {
        globalRTP.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('globalRTPValue').textContent = value.toFixed(1) + '%';
            slotsConfig.global.rtp = value;
        });
    }
    
    // RTP слайдеры
    document.querySelectorAll('.rtp-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            const card = e.target.closest('.slot-card');
            card.querySelector('.rtp-value').textContent = value.toFixed(1) + '%';
        });
    });
    
    // Частота бонусов
    document.querySelectorAll('.bonus-freq-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const card = e.target.closest('.slot-card');
            card.querySelector('.bonus-freq-value').textContent = `1 из ${value} спинов`;
        });
    });
    
    // Краш-поинт
    document.querySelectorAll('.crash-point-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            const card = e.target.closest('.slot-card');
            card.querySelector('.crash-point-value').textContent = value.toFixed(1) + 'x';
        });
    });
    
    // Шанс угадывания
    document.querySelectorAll('.guess-chance-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const card = e.target.closest('.slot-card');
            card.querySelector('.guess-chance-value').textContent = value + '%';
        });
    });
    
    // Пресеты RTP
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const value = parseFloat(e.target.dataset.value);
            const card = e.target.closest('.slot-card');
            const slider = card.querySelector('.rtp-slider');
            
            slider.value = value;
            card.querySelector('.rtp-value').textContent = value.toFixed(1) + '%';
            
            // Обновляем активный пресет
            card.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // Волатильность
    document.querySelectorAll('.volatility-select').forEach(select => {
        select.addEventListener('change', (e) => {
            updateVolatilityDescription(e.target);
        });
    });
}

// Обновление описания волатильности
function updateVolatilityDescription(select) {
    const card = select.closest('.slot-card');
    const description = card.querySelector('.volatility-description');
    
    const descriptions = {
        low: 'Низкая волатильность означает частые, но небольшие выигрыши',
        medium: 'Средняя волатильность обеспечивает баланс между частотой и размером выигрышей',
        high: 'Высокая волатильность означает более редкие, но более крупные выигрыши',
        extreme: 'Экстремальная волатильность - очень редкие, но огромные выигрыши'
    };
    
    if (description) {
        description.textContent = descriptions[select.value] || '';
    }
}

// Инициализация навигации
function initNavigation() {
    const navItems = document.querySelectorAll('.admin-nav .nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const section = item.dataset.section;
            
            // Обновляем активную навигацию
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Показываем нужную секцию
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(`${section}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

// Инициализация кнопок
function initButtons() {
    // Сохранить все
    const saveAllBtn = document.getElementById('saveAllBtn');
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', saveAllSettings);
    }
    
    // Сброс настроек
    const resetAllBtn = document.getElementById('resetAllBtn');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
                resetAllSettings();
            }
        });
    }
}

// Сохранение одного слота
function saveSlot(slotId) {
    const card = document.querySelector(`.slot-card[data-slot="${slotId}"]`);
    if (!card) return;
    
    const config = slotsConfig.slots[slotId];
    
    // RTP
    const rtpSlider = card.querySelector('.rtp-slider');
    if (rtpSlider) {
        config.rtp = parseFloat(rtpSlider.value);
    }
    
    // Волатильность
    const volatilitySelect = card.querySelector('.volatility-select');
    if (volatilitySelect) {
        config.volatility = volatilitySelect.value;
    }
    
    // Частота бонусов
    const bonusSlider = card.querySelector('.bonus-freq-slider');
    if (bonusSlider) {
        config.bonusFrequency = parseInt(bonusSlider.value);
    }
    
    // Краш-поинт
    const crashSlider = card.querySelector('.crash-point-slider');
    if (crashSlider) {
        config.crashPoint = parseFloat(crashSlider.value);
    }
    
    // Шанс угадывания
    const guessSlider = card.querySelector('.guess-chance-slider');
    if (guessSlider) {
        config.guessChance = parseInt(guessSlider.value);
    }
    
    // Максимальный множитель
    const maxMultInput = card.querySelector('.max-multiplier-input');
    if (maxMultInput) {
        config.maxMultiplier = parseInt(maxMultInput.value);
    }
    
    // Сохраняем в localStorage
    localStorage.setItem('slotsConfig', JSON.stringify(slotsConfig));
    
    showNotification(`Настройки ${config.name} сохранены!`, 'success');
}

// Сохранение всех настроек
function saveAllSettings() {
    // Глобальный RTP
    const globalRTP = document.getElementById('globalRTP');
    if (globalRTP) {
        slotsConfig.global.rtp = parseFloat(globalRTP.value);
    }
    
    // Сохраняем каждый слот
    Object.keys(slotsConfig.slots).forEach(slotId => {
        const card = document.querySelector(`.slot-card[data-slot="${slotId}"]`);
        if (!card) return;
        
        const config = slotsConfig.slots[slotId];
        
        // RTP
        const rtpSlider = card.querySelector('.rtp-slider');
        if (rtpSlider) {
            config.rtp = parseFloat(rtpSlider.value);
        }
        
        // Волатильность
        const volatilitySelect = card.querySelector('.volatility-select');
        if (volatilitySelect) {
            config.volatility = volatilitySelect.value;
        }
        
        // Частота бонусов
        const bonusSlider = card.querySelector('.bonus-freq-slider');
        if (bonusSlider) {
            config.bonusFrequency = parseInt(bonusSlider.value);
        }
        
        // Краш-поинт
        const crashSlider = card.querySelector('.crash-point-slider');
        if (crashSlider) {
            config.crashPoint = parseFloat(crashSlider.value);
        }
        
        // Шанс угадывания
        const guessSlider = card.querySelector('.guess-chance-slider');
        if (guessSlider) {
            config.guessChance = parseInt(guessSlider.value);
        }
        
        // Максимальный множитель
        const maxMultInput = card.querySelector('.max-multiplier-input');
        if (maxMultInput) {
            config.maxMultiplier = parseInt(maxMultInput.value);
        }
    });
    
    // Сохраняем в localStorage
    localStorage.setItem('slotsConfig', JSON.stringify(slotsConfig));
    
    showNotification('Все настройки успешно сохранены!', 'success');
}

// Сброс всех настроек
function resetAllSettings() {
    // Устанавливаем значения по умолчанию
    slotsConfig = {
        global: {
            rtp: 96.0
        },
        slots: {
            'candy-slot': {
                name: 'Sweet Bonanza',
                rtp: 96.5,
                volatility: 'high',
                bonusFrequency: 150,
                maxMultiplier: 21000
            },
            'olympus': {
                name: 'Gates of Olympus',
                rtp: 96.0,
                volatility: 'high',
                bonusFrequency: 180,
                maxMultiplier: 5000
            },
            'crash': {
                name: 'Lucy Crash',
                rtp: 97.0,
                volatility: 'medium',
                crashPoint: 2.0,
                maxMultiplier: 1000
            },
            'nvuti': {
                name: 'Lucy Nvuti',
                rtp: 95.0,
                volatility: 'medium',
                guessChance: 48,
                maxMultiplier: 100
            }
        }
    };
    
    // Сохраняем
    localStorage.setItem('slotsConfig', JSON.stringify(slotsConfig));
    
    // Применяем к UI
    applyConfigToUI();
    
    showNotification('Настройки сброшены к значениям по умолчанию', 'info');
}

// Тестирование слота
function testSlot(slotId) {
    // Сначала сохраняем настройки
    saveSlot(slotId);
    
    // Затем открываем слот
    const urls = {
        'candy-slot': 'game.html',
        'olympus': 'olympus.html',
        'crash': 'crash.html',
        'nvuti': 'nvuti.html'
    };
    
    if (urls[slotId]) {
        showNotification('Запуск слота для тестирования...', 'info');
        setTimeout(() => {
            window.open(urls[slotId], '_blank');
        }, 500);
    }
}

// Обновление отображения статистики
function updateStatsDisplay() {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('totalSpins', stats.totalSpins.toLocaleString());
    setText('totalWagered', stats.totalWagered.toLocaleString() + '₽');
    setText('totalWon', stats.totalWon.toLocaleString() + '₽');

    const actualRTP = stats.totalWagered > 0 ? (stats.totalWon / stats.totalWagered * 100) : 0;
    setText('actualRTP', actualRTP.toFixed(2) + '%');
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Экспорт функций для использования в HTML
window.saveSlot = saveSlot;
window.testSlot = testSlot;

// Получение конфигурации (для использования в игровых файлах)
window.getSlotsConfig = function() {
    return slotsConfig;
};

// API для игровых файлов
window.getSlotConfig = function(slotId) {
    const savedConfig = localStorage.getItem('slotsConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        return config.slots[slotId] || null;
    }
    return null;
};

window.getGlobalConfig = function() {
    const savedConfig = localStorage.getItem('slotsConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        return config.global || { rtp: 96.0 };
    }
    return { rtp: 96.0 };
};

// ============= УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ =============

let currentEditingUserId = null;

// Инициализация секции пользователей
function initUsersSection() {
    loadUsers();
    
    // Модальное окно
    const modal = document.getElementById('editUserModal');
    const closeModal = document.getElementById('closeModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveUserBtn = document.getElementById('saveUserBtn');
    
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        currentEditingUserId = null;
    });
    
    cancelEditBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        currentEditingUserId = null;
    });
    
    saveUserBtn.addEventListener('click', saveUser);
    
    // Закрытие по клику вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            currentEditingUserId = null;
        }
    });
}

// Загрузка списка пользователей
function loadUsers() {
    const users = JSON.parse(localStorage.getItem('lucybliss_users') || '[]');
    const tbody = document.getElementById('usersTableBody');
    const totalUsersElement = document.getElementById('totalUsers');
    
    if (totalUsersElement) {
        totalUsersElement.textContent = users.length;
    }
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Нет пользователей</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        const createdDate = new Date(user.createdAt).toLocaleDateString('ru-RU');
        const lastLoginDate = new Date(user.lastLogin).toLocaleDateString('ru-RU');
        const withdrawalStatus = user.withdrawalBlocked ? 
            '<span style="color: #ff4757;">Заблокирован</span>' : 
            '<span style="color: #38ef7d;">Активен</span>';
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>₽${user.balance.toFixed(2)}</td>
            <td>${createdDate}</td>
            <td>${lastLoginDate}</td>
            <td>${withdrawalStatus}</td>
            <td>
                <button class="btn btn-edit" onclick="editUser(${user.id})">
                    ✏️ Изменить
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Редактирование пользователя
function editUser(userId) {
    const users = JSON.parse(localStorage.getItem('lucybliss_users') || '[]');
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        showNotification('Пользователь не найден', 'error');
        return;
    }
    
    currentEditingUserId = userId;
    
    // Заполняем форму
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.username;
    document.getElementById('editUserBalance').value = user.balance.toFixed(2);
    document.getElementById('editWithdrawalBlocked').checked = user.withdrawalBlocked;
    
    // Показываем модальное окно
    document.getElementById('editUserModal').style.display = 'flex';
}

// Сохранение изменений пользователя
function saveUser() {
    if (!currentEditingUserId) return;
    
    const newBalance = parseFloat(document.getElementById('editUserBalance').value);
    const withdrawalBlocked = document.getElementById('editWithdrawalBlocked').checked;
    
    if (isNaN(newBalance) || newBalance < 0) {
        showNotification('Некорректное значение баланса', 'error');
        return;
    }
    
    // Загружаем всех пользователей
    const users = JSON.parse(localStorage.getItem('lucybliss_users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentEditingUserId);
    
    if (userIndex === -1) {
        showNotification('Пользователь не найден', 'error');
        return;
    }
    
    // Обновляем данные
    users[userIndex].balance = newBalance;
    users[userIndex].withdrawalBlocked = withdrawalBlocked;
    
    // Сохраняем
    localStorage.setItem('lucybliss_users', JSON.stringify(users));
    
    // Если это текущий пользователь - обновляем его тоже
    const currentUser = localStorage.getItem('lucybliss_current_user');
    if (currentUser) {
        const current = JSON.parse(currentUser);
        if (current.id === currentEditingUserId) {
            current.balance = newBalance;
            current.withdrawalBlocked = withdrawalBlocked;
            localStorage.setItem('lucybliss_current_user', JSON.stringify(current));
        }
    }
    
    // Закрываем модальное окно
    document.getElementById('editUserModal').style.display = 'none';
    currentEditingUserId = null;
    
    // Обновляем таблицу
    loadUsers();
    
    showNotification('Данные пользователя обновлены!', 'success');
}

// Экспортируем функции для использования в HTML
window.editUser = editUser;
