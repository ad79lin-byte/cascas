// Загрузка настроек из админ-панели
let slotConfig = {
    rtp: 95.0,
    volatility: 'medium',
    guessChance: 48,
    maxMultiplier: 100
};

// Загружаем конфигурацию
function loadSlotConfig() {
    if (typeof window.getSlotConfig === 'function') {
        const config = window.getSlotConfig('nvuti');
        if (config) {
            slotConfig = config;
            console.log('✅ Загружена конфигурация слота:', slotConfig);
        }
    }
}

// Загружаем при старте
loadSlotConfig();

// ============= СИСТЕМА АВТОРИЗАЦИИ =============

// Проверка авторизации
function checkAuth() {
    const currentUser = localStorage.getItem('lucybliss_current_user');
    
    if (!currentUser) {
        window.location.href = 'auth.html';
        return false;
    }
    
    const user = JSON.parse(currentUser);
    updateUserProfile(user);
    
    // Загружаем баланс из аккаунта пользователя
    balance = user.balance || 0;
    
    return true;
}

// Обновление профиля пользователя в интерфейсе
function updateUserProfile(user) {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userId = document.getElementById('userId');
    
    if (userAvatar && userName && userId) {
        const initials = user.username.substring(0, 2).toUpperCase();
        userAvatar.textContent = initials;
        userName.textContent = user.username;
        userId.textContent = `ID ${user.id}`;
    }
}

// Сохранение баланса пользователя
function saveUserBalance(newBalance) {
    balance = newBalance;
    
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
    
    // Также обновляем старый ключ для совместимости
    localStorage.setItem('userBalance', newBalance.toString());
}

// Аудио контекст для звуков
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Звук выигрыша
function playWinSound() {
    initAudio();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // До
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // Ми
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // Соль
    
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Звук проигрыша
function playLoseSound() {
    initAudio();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
    
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Игровые настройки
let balance = parseFloat(localStorage.getItem('userBalance')) || 100000;
let betAmount = 50;
let chancePercent = 70;
let isRolling = false;
let gameHistory = [];

// Элементы DOM
const betAmountInput = document.getElementById('betAmount');
const chanceInput = document.getElementById('chanceInput');
const resultNumber = document.getElementById('resultNumber');
const gameHash = document.getElementById('gameHash');
const historyTableBody = document.getElementById('historyTableBody');
const historyCount = document.getElementById('historyCount');
const balanceElement = document.getElementById('headerBalance');

// Инициализация
function init() {
    // Проверяем авторизацию
    if (!checkAuth()) return;
    
    updateBalance();
    updateRTPIndicator();
    updatePotentialWin();
    generateHash();
    
    // Кнопки ставки
    document.getElementById('doubleBet').addEventListener('click', () => {
        betAmount = Math.min(balance, betAmount * 2);
        betAmountInput.value = betAmount;
        updatePotentialWin();
    });
    
    document.getElementById('halfBet').addEventListener('click', () => {
        betAmount = Math.max(1, Math.floor(betAmount / 2));
        betAmountInput.value = betAmount;
        updatePotentialWin();
    });
    
    document.getElementById('maxBet').addEventListener('click', () => {
        betAmount = balance;
        betAmountInput.value = betAmount;
        updatePotentialWin();
    });
    
    document.getElementById('minBet').addEventListener('click', () => {
        betAmount = 1;
        betAmountInput.value = betAmount;
        updatePotentialWin();
    });
    
    // Кнопки шанса
    document.getElementById('doubleChance').addEventListener('click', () => {
        chancePercent = Math.min(98, chancePercent + 10);
        chanceInput.value = chancePercent;
        updatePotentialWin();
    });
    
    document.getElementById('halfChance').addEventListener('click', () => {
        chancePercent = Math.max(1, chancePercent - 10);
        chanceInput.value = chancePercent;
        updatePotentialWin();
    });
    
    document.getElementById('maxChance').addEventListener('click', () => {
        chancePercent = 98;
        chanceInput.value = chancePercent;
        updatePotentialWin();
    });
    
    document.getElementById('minChance').addEventListener('click', () => {
        chancePercent = 1;
        chanceInput.value = chancePercent;
        updatePotentialWin();
    });
    
    betAmountInput.addEventListener('input', () => {
        betAmount = parseInt(betAmountInput.value) || 1;
        updatePotentialWin();
    });
    
    chanceInput.addEventListener('input', () => {
        chancePercent = Math.max(1, Math.min(98, parseInt(chanceInput.value) || 1));
        chanceInput.value = chancePercent;
        updatePotentialWin();
    });
    
    document.getElementById('btnLower').addEventListener('click', () => playGame('lower'));
    document.getElementById('btnHigher').addEventListener('click', () => playGame('higher'));
    
    // Быстрая игра через клавиши
    document.addEventListener('keydown', (e) => {
        if (isRolling) return;
        
        // Пробел или стрелка вниз = Меньше
        if (e.code === 'Space' || e.code === 'ArrowDown') {
            e.preventDefault();
            playGame('lower');
        }
        
        // Стрелка вверх = Больше
        if (e.code === 'ArrowUp') {
            e.preventDefault();
            playGame('higher');
        }
    });
    
    document.getElementById('btnBack').addEventListener('click', () => {
        saveUserBalance(balance);
        window.location.href = 'index.html';
    });
}

// Обновление потенциального выигрыша
function updatePotentialWin() {
    const multiplier = 99 / chancePercent;
    const potentialWin = (betAmount * multiplier).toFixed(2);
    resultNumber.textContent = potentialWin;
    
    // Обновляем диапазоны
    const lowerRange = Math.floor((chancePercent / 100) * 1000000);
    const higherRange = Math.floor(((100 - chancePercent) / 100) * 1000000);
    
    document.querySelector('.range-info').innerHTML = `
        <span>0 - ${lowerRange.toLocaleString()}</span>
        <span>${(1000000 - higherRange).toLocaleString()} - 999999</span>
    `;
}

// Генерация хеша игры
function generateHash() {
    const hash = Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
    gameHash.textContent = hash;
}

// Игра
async function playGame(type) {
    if (isRolling) return;
    
    if (balance < betAmount) {
        alert('Недостаточно средств!');
        return;
    }
    
    isRolling = true;
    balance -= betAmount;
    updateBalance();
    
    // Получаем кнопки
    const btnLower = document.getElementById('btnLower');
    const btnHigher = document.getElementById('btnHigher');
    
    // Генерируем результат от 0 до 999999
    const result = Math.floor(Math.random() * 1000000);
    const targetRange = Math.floor((chancePercent / 100) * 1000000);
    
    let isWin = false;
    if (type === 'lower') {
        isWin = result < targetRange;
    } else {
        isWin = result > (1000000 - targetRange);
    }
    
    // Показываем результат сразу с цветом
    resultNumber.textContent = result.toLocaleString();
    
    if (isWin) {
        const multiplier = 99 / chancePercent;
        const winAmount = betAmount * multiplier;
        balance += winAmount;
        updateBalance();
        
        // Звук выигрыша
        playWinSound();
        
        // Зелёный цвет при выигрыше
        resultNumber.style.color = '#38ef7d';
        resultNumber.style.textShadow = '0 0 20px #38ef7d';
        resultNumber.style.transform = 'scale(1.2)';
        
        // Анимация кнопки
        if (type === 'lower') {
            btnLower.classList.add('win-animation');
            setTimeout(() => btnLower.classList.remove('win-animation'), 600);
        } else {
            btnHigher.classList.add('win-animation');
            setTimeout(() => btnHigher.classList.remove('win-animation'), 600);
        }
        
        setTimeout(() => {
            resultNumber.style.color = '';
            resultNumber.style.textShadow = '';
            resultNumber.style.transform = '';
        }, 1000);
        
        addToHistory(result, type, betAmount, winAmount, true);
    } else {
        // Звук проигрыша
        playLoseSound();
        
        // Красный цвет при проигрыше
        resultNumber.style.color = '#ff4757';
        resultNumber.style.textShadow = '0 0 20px #ff4757';
        resultNumber.style.transform = 'scale(1.2)';
        
        // Анимация кнопки
        if (type === 'lower') {
            btnLower.classList.add('lose-animation');
            setTimeout(() => btnLower.classList.remove('lose-animation'), 600);
        } else {
            btnHigher.classList.add('lose-animation');
            setTimeout(() => btnHigher.classList.remove('lose-animation'), 600);
        }
        
        setTimeout(() => {
            resultNumber.style.color = '';
            resultNumber.style.textShadow = '';
            resultNumber.style.transform = '';
        }, 1000);
        
        addToHistory(result, type, betAmount, 0, false);
    }
    
    generateHash();
    updatePotentialWin();
    
    // Быстрое обновление - можно играть снова через 300мс
    setTimeout(() => {
        isRolling = false;
    }, 300);
}

// Добавление в историю
function addToHistory(result, type, bet, winAmount, isWin) {
    const emptyHistory = historyTableBody.querySelector('.empty-history');
    if (emptyHistory) {
        emptyHistory.remove();
    }
    
    const row = document.createElement('div');
    row.className = 'history-row';
    
    const typeText = type === 'lower' ? 'Меньше' : 'Больше';
    const resultColor = isWin ? '#38ef7d' : '#ff4757';
    
    row.innerHTML = `
        <span>Игрок</span>
        <span>${result.toLocaleString()}</span>
        <span>${typeText}</span>
        <span>$${bet}</span>
        <span>${chancePercent}%</span>
        <span style="color: ${resultColor}; font-weight: bold;">
            ${isWin ? `+₽${winAmount.toFixed(2)}` : `-₽${bet}`}
        </span>
    `;
    
    historyTableBody.insertBefore(row, historyTableBody.firstChild);
    
    gameHistory.unshift({ result, type, bet, winAmount, isWin });
    historyCount.textContent = `● ${gameHistory.length}`;
    
    // Ограничиваем историю 50 записями
    while (historyTableBody.children.length > 50) {
        historyTableBody.removeChild(historyTableBody.lastChild);
        gameHistory.pop();
    }
}

// Обновление баланса
function updateBalance() {
    balanceElement.textContent = `₽${balance.toFixed(2)}`;
    
    // Обновление баланса в хедере
    const headerBalance = document.getElementById('headerBalance');
    if (headerBalance) {
        headerBalance.textContent = `₽${balance.toFixed(2)}`;
    }
    
    saveUserBalance(balance);
}

// Обновление RTP индикатора
function updateRTPIndicator() {
    const rtpIndicator = document.getElementById('rtpIndicator');
    if (rtpIndicator) {
        const rtp = slotConfig.rtp || 95.0;
        rtpIndicator.textContent = `RTP: ${rtp.toFixed(1)}%`;
        
        // Меняем цвет в зависимости от уровня RTP
        if (rtp >= 96.5) {
            rtpIndicator.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
        } else if (rtp >= 95) {
            rtpIndicator.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        } else {
            rtpIndicator.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        }
    }
}

// Вспомогательная функция задержки
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes bounceIn {
        0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.05); }
        70% { transform: translate(-50%, -50%) scale(0.9); }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    
    #resultNumber {
        transition: all 0.3s ease;
    }
    
    @keyframes winPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(56, 239, 125, 0.7); }
        50% { box-shadow: 0 0 0 20px rgba(56, 239, 125, 0); }
    }
    
    @keyframes losePulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
        50% { box-shadow: 0 0 0 20px rgba(255, 71, 87, 0); }
    }
    
    .win-animation {
        animation: winPulse 0.6s ease-out;
    }
    
    .lose-animation {
        animation: losePulse 0.6s ease-out;
    }
`;
document.head.appendChild(style);

// Запуск
init();
