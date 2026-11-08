// Загрузка настроек из админ-панели
let slotConfig = {
    rtp: 96.0,
    volatility: 'high',
    bonusFrequency: 180,
    maxMultiplier: 5000
};

// Загружаем конфигурацию
function loadSlotConfig() {
    if (typeof window.getSlotConfig === 'function') {
        const config = window.getSlotConfig('olympus');
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

// Игровые настройки
const SYMBOLS = ['⚡', '🏛️', '👑', '🔱', '🦅', '⚔️', '🏺'];
const BONUS_SYMBOL = '💎';
const ROWS = 5;
const COLS = 6;
const BONUS_TRIGGER = 3;
const BONUS_BUY_MULTIPLIER = 100; // Цена покупки бонуса = ставка * 100

// Игровое состояние
let balance = parseFloat(localStorage.getItem('userBalance')) || 100000;
let bet = 10;
let freeSpins = 0;
let tumbleWin = 0;
let isSpinning = false;
let autoplay = false;
let isDemo = localStorage.getItem('isDemo') === 'true';
let bonusMultipliers = []; // Множители во время бонуса
let isBonusMode = false; // Режим бонуса активен
let bonusTotalWin = 0; // Общий выигрыш в бонусе
let currentBonusMultiplier = 1; // Текущий множитель в бонусе

// Аудио контекст для звуков (создаем один раз)
let audioContext = null;
let lastSoundTime = 0;
let backgroundMusic = null;
let musicAudio = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Фоновая музыка
function startBackgroundMusic() {
    if (!musicAudio) {
        musicAudio = new Audio('Slot Music (mp3cut.net).mp3');
        musicAudio.loop = true;
        musicAudio.volume = 0.3;
    }
    
    musicAudio.play().catch(err => {
        console.log('Автовоспроизведение заблокировано:', err);
    });
    backgroundMusic = true;
}

function stopBackgroundMusic() {
    if (musicAudio) {
        musicAudio.pause();
    }
    backgroundMusic = null;
}

// Вероятности выпадения символов (в процентах)
const SYMBOL_WEIGHTS = {
    '⚡': 22,
    '🏛️': 20,
    '👑': 20,
    '🔱': 18,
    '🦅': 10,
    '⚔️': 7,
    '🏺': 2,
    '💎': 1  // Бонусный символ - алмаз
};

// Таблица выплат (множители к ставке) - для кластеров
const PAYOUTS = {
    3: 0.3,
    4: 0.5,
    5: 1,
    6: 2,
    7: 3,
    8: 5,
    9: 10,
    10: 20,
    11: 50,
    12: 100
};

// Элементы DOM
const gridElement = document.getElementById('grid');
const balanceElement = document.getElementById('balance');
const betElement = document.getElementById('betAmount');
const spinBtn = document.getElementById('spinBtn');
const minusBtn = document.getElementById('minusBtn');
const plusBtn = document.getElementById('plusBtn');
const autoplayBtn = document.getElementById('autoplayBtn');
const winDisplay = document.getElementById('winDisplay');
const freeSpinsElement = document.getElementById('freeSpins');
const tumblewinElement = document.getElementById('tumblewin');
const buyBonusBtn = document.getElementById('buyBonusBtn');
const bonusPriceElement = document.getElementById('bonusPrice');
const multipliersPanel = document.getElementById('multipliersPanel');
const multipliersList = document.getElementById('multipliersList');

// Инициализация
function init() {
    // Проверяем авторизацию
    if (!checkAuth()) return;
    
    createGrid();
    updateDisplay();
    
    // Обновляем RTP индикатор
    updateRTPIndicator();
    
    // Инициализируем аудио
    initAudio();
    
    // Запускаем фоновую музыку
    startBackgroundMusic();
    
    // Скрываем free spins при загрузке (но оставляем место)
    document.querySelector('.free-spins').classList.remove('visible');
    
    // Скрываем tumblewin при загрузке (но оставляем место)
    document.querySelector('.tumblewin').classList.remove('visible');
    
    spinBtn.addEventListener('click', spin);
    minusBtn.addEventListener('click', decreaseBet);
    plusBtn.addEventListener('click', increaseBet);
    autoplayBtn.addEventListener('click', toggleAutoplay);
    buyBonusBtn.addEventListener('click', buyBonus);
    
    // Кнопка звука (без popup, тумблер всегда виден)
    const toggleMusicBtn = document.getElementById('toggleMusicBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    
    // Переключение звука по клику на кнопку
    toggleMusicBtn.addEventListener('click', () => {
        if (backgroundMusic) {
            stopBackgroundMusic();
            toggleMusicBtn.textContent = '🔇';
            volumeSlider.value = 0;
            if (musicAudio) musicAudio.volume = 0;
        } else {
            volumeSlider.value = 30;
            if (musicAudio) musicAudio.volume = 0.3;
            startBackgroundMusic();
            toggleMusicBtn.textContent = '🔊';
        }
    });
    
    // Слайдер громкости
    volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        if (musicAudio) {
            musicAudio.volume = volume;
        }
        
        // Обновляем иконку кнопки в зависимости от громкости
        if (volume === 0) {
            toggleMusicBtn.textContent = '🔇';
            backgroundMusic = false;
            if (musicAudio) musicAudio.pause();
        } else {
            toggleMusicBtn.textContent = '🔊';
            if (!backgroundMusic || (musicAudio && musicAudio.paused)) {
                startBackgroundMusic();
                backgroundMusic = true;
            }
        }
    });
    
    // Добавляем обработчик нажатия пробела
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !isSpinning) {
            e.preventDefault(); // Предотвращаем прокрутку страницы
            spin();
        }
    });
    
    // Кнопка информации
    const infoBtn = document.getElementById('infoBtn');
    infoBtn.addEventListener('click', showGameInfo);
}

// Создание сетки
function createGrid() {
    gridElement.innerHTML = '';
    for (let i = 0; i < ROWS * COLS; i++) {
        const symbol = document.createElement('div');
        symbol.className = 'symbol';
        symbol.dataset.index = i;
        gridElement.appendChild(symbol);
    }
}

// Первоначальное заполнение с красивой анимацией падения
function initialFillGrid() {
    const symbols = gridElement.querySelectorAll('.symbol');
    
    // Заполняем по колонкам сверху вниз
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
            const index = row * COLS + col;
            const symbol = symbols[index];
            const randomSymbol = getRandomSymbol();
            
            symbol.textContent = randomSymbol;
            
            // Задержка зависит от ряда (чем ниже, тем позже падает)
            symbol.style.animationDelay = `${row * 0.1}s`;
            symbol.style.animation = 'fall 0.5s ease-out';
            
            if (randomSymbol === BONUS_SYMBOL) {
                symbol.classList.add('bonus');
            } else {
                symbol.classList.remove('bonus');
            }
        }
    }
}

// Получение случайного символа с учетом весов
function getRandomSymbol() {
    const totalWeight = Object.values(SYMBOL_WEIGHTS).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (const [symbol, weight] of Object.entries(SYMBOL_WEIGHTS)) {
        random -= weight;
        if (random <= 0) {
            return symbol;
        }
    }
    
    return SYMBOLS[0];
}

// Заполнение сетки символами
function fillGrid() {
    const symbols = gridElement.querySelectorAll('.symbol');
    
    // Заполняем по колонкам, каждый символ в колонке падает по очереди
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
            const index = row * COLS + col;
            const symbol = symbols[index];
            const randomSymbol = getRandomSymbol();
            
            symbol.textContent = randomSymbol;
            
            // Скрываем символ перед падением
            symbol.style.opacity = '0';
            symbol.style.animation = 'none';
            
            // Ускоренные задержки
            const columnDelay = col * 0.4; // Быстрее между колонками
            const rowDelay = (ROWS - 1 - row) * 0.15; // Быстрее между символами
            const totalDelay = columnDelay + rowDelay;
            
            setTimeout(() => {
                symbol.style.opacity = '1';
                symbol.style.animation = `fall 0.2s ease-out`; // Быстрее падение
                
                // Звук падения
                playDropSound();
            }, totalDelay * 1000);
            
            if (randomSymbol === BONUS_SYMBOL) {
                symbol.classList.add('bonus');
            } else {
                symbol.classList.remove('bonus');
            }
        }
    }
}

// Оптимизированный звук падения
function playDropSound() {
    // Ограничиваем частоту звуков чтобы не лагало
    const now = Date.now();
    if (now - lastSoundTime < 30) return; // Минимум 30мс между звуками
    lastSoundTime = now;
    
    if (!audioContext) {
        initAudio();
    }
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 300 + Math.random() * 100; // Варьируем частоту
        oscillator.type = 'sine';
        
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.05, now); // Тише
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        oscillator.start(now);
        oscillator.stop(now + 0.05);
    } catch (e) {
        // Игнорируем ошибки звука
    }
}

// Звук выигрыша (когда появляются зеленые линии)
function playWinSound() {
    if (!audioContext) {
        initAudio();
    }
    
    try {
        // Создаем приятную мелодию выигрыша
        const notes = [523.25, 659.25, 783.99]; // До, Ми, Соль
        
        notes.forEach((freq, i) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const startTime = audioContext.currentTime + (i * 0.1);
            gainNode.gain.setValueAtTime(0.15, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        });
    } catch (e) {
        // Игнорируем ошибки звука
    }
}

// Проверка количества бонусных символов для замедления
function checkBonusSymbolsForSlowdown() {
    const symbols = Array.from(gridElement.querySelectorAll('.symbol'));
    const bonusCount = symbols.filter(s => s.textContent === BONUS_SYMBOL).length;
    return bonusCount;
}

// Заполнение с эффектом замедления при 2 подарках
async function fillGridWithAnticipation() {
    const symbols = gridElement.querySelectorAll('.symbol');
    let bonusSymbolsPlaced = 0;
    let slowdownStarted = false;
    
    // Заполняем по колонкам, каждый символ в колонке падает по очереди снизу вверх
    for (let col = 0; col < COLS; col++) {
        // Проверяем перед началом колонки - если уже 2 подарка, замедляем эту и следующие колонки
        if (bonusSymbolsPlaced === 2 && !slowdownStarted) {
            slowdownStarted = true;
        }
        
        for (let row = 0; row < ROWS; row++) {
            const index = row * COLS + col;
            const symbol = symbols[index];
            const randomSymbol = getRandomSymbol();
            
            symbol.textContent = randomSymbol;
            
            if (randomSymbol === BONUS_SYMBOL) {
                symbol.classList.add('bonus');
                bonusSymbolsPlaced++;
            } else {
                symbol.classList.remove('bonus');
            }
            
            // Скрываем символ перед падением
            symbol.style.opacity = '0';
            symbol.style.animation = 'none';
            
            // Если уже выпало 2 подарка - замедляем оставшиеся колонки
            let columnDelay, rowDelay, animDuration;
            
            if (slowdownStarted) {
                columnDelay = col * 0.6; // Медленнее
                rowDelay = (ROWS - 1 - row) * 0.25;
                animDuration = '0.3s';
                
                // Добавляем эффект свечения для бонусных символов
                if (randomSymbol === BONUS_SYMBOL) {
                    symbol.style.boxShadow = '0 0 20px #ffd700, 0 0 40px #ffd700';
                }
            } else {
                columnDelay = col * 0.4; // Быстрее
                rowDelay = (ROWS - 1 - row) * 0.15;
                animDuration = '0.2s';
            }
            
            const totalDelay = columnDelay + rowDelay;
            
            setTimeout(() => {
                symbol.style.opacity = '1';
                symbol.style.animation = `fall ${animDuration} ease-out`;
                playDropSound();
            }, totalDelay * 1000);
        }
    }
    
    // Если выпало ровно 2 подарка - показываем напряжение
    if (bonusSymbolsPlaced === 2) {
        await sleep(500);
        showAnticipationEffect();
    }
    
    return bonusSymbolsPlaced;
}

// Эффект напряжения при 2 подарках
function showAnticipationEffect() {
    const symbols = Array.from(gridElement.querySelectorAll('.symbol'));
    
    // Подсвечиваем бонусные символы только 3 раза
    symbols.forEach(symbol => {
        if (symbol.textContent === BONUS_SYMBOL) {
            symbol.style.animation = 'bonusPulse 0.8s ease-in-out 3';
        }
    });
}

// Проверка выигрышных комбинаций (кластерная система)
function checkWins() {
    const symbols = Array.from(gridElement.querySelectorAll('.symbol'));
    const grid = [];
    
    // Создаем двумерный массив
    for (let row = 0; row < ROWS; row++) {
        grid[row] = [];
        for (let col = 0; col < COLS; col++) {
            const index = row * COLS + col;
            grid[row][col] = {
                symbol: symbols[index].textContent,
                index: index,
                visited: false
            };
        }
    }
    
    const winningClusters = [];
    
    // Поиск кластеров соседних символов
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (!grid[row][col].visited && grid[row][col].symbol !== BONUS_SYMBOL) {
                const cluster = findCluster(grid, row, col, grid[row][col].symbol);
                
                if (cluster.length >= 3) {
                    winningClusters.push(cluster);
                }
            }
        }
    }
    
    // Подсчет выигрыша
    let totalWin = 0;
    const winningSymbols = new Set();
    
    winningClusters.forEach(cluster => {
        const count = cluster.length;
        const payout = PAYOUTS[count] || PAYOUTS[12];
        let win = bet * payout;
        
        // Случайный множитель для больших кластеров
        if (count >= 8 && Math.random() < 0.3) {
            const multiplier = [2, 3, 5, 10][Math.floor(Math.random() * 4)];
            win *= multiplier;
            
            const randomIndex = cluster[Math.floor(Math.random() * cluster.length)];
            showMultiplier(randomIndex, multiplier);
            
            // В режиме бонуса сохраняем множители
            if (isBonusMode) {
                bonusMultipliers.push(multiplier);
                updateMultipliersDisplay();
            }
        }
        
        totalWin += win;
        cluster.forEach(index => winningSymbols.add(index));
    });
    
    return { totalWin, winningSymbols };
}

// Поиск кластера соседних одинаковых символов (рекурсивно)
function findCluster(grid, row, col, symbol) {
    // Проверка границ
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
        return [];
    }
    
    // Проверка условий
    if (grid[row][col].visited || grid[row][col].symbol !== symbol) {
        return [];
    }
    
    grid[row][col].visited = true;
    const cluster = [grid[row][col].index];
    
    // Проверяем 4 соседа (верх, низ, лево, право)
    cluster.push(...findCluster(grid, row - 1, col, symbol)); // верх
    cluster.push(...findCluster(grid, row + 1, col, symbol)); // низ
    cluster.push(...findCluster(grid, row, col - 1, symbol)); // лево
    cluster.push(...findCluster(grid, row, col + 1, symbol)); // право
    
    return cluster;
}

// Показать множитель
function showMultiplier(index, multiplier) {
    const symbol = gridElement.querySelector(`[data-index="${index}"]`);
    const multiplierEl = document.createElement('div');
    multiplierEl.className = 'multiplier';
    multiplierEl.textContent = `${multiplier}x`;
    symbol.appendChild(multiplierEl);
    
    setTimeout(() => {
        multiplierEl.remove();
    }, 2000);
}

// Проверка бонусов (только для символа 🎁)
function checkBonus() {
    const symbols = Array.from(gridElement.querySelectorAll('.symbol'));
    const bonusCount = symbols.filter(s => s.textContent === BONUS_SYMBOL).length;
    
    if (bonusCount >= BONUS_TRIGGER) {
        // Количество фриспинов всегда 10
        const bonusSpins = 10;
        
        // Подсвечиваем бонусные символы
        symbols.forEach((symbol) => {
            if (symbol.textContent === BONUS_SYMBOL) {
                symbol.style.animation = 'pulse 0.5s ease-in-out 3';
            }
        });
        
        // Показываем анимацию с кнопкой принятия
        showBonusAnimation(bonusSpins, bonusCount);
        
        return true;
    }
    
    return false;
}

// Анимация выпадения бонуса с кнопкой принятия
function showBonusAnimation(spins, bonusCount) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s;
    `;
    
    const bonusCard = document.createElement('div');
    bonusCard.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 60px 80px;
        border-radius: 30px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        border: 6px solid #ffd700;
        animation: scaleIn 0.4s ease-out;
        position: relative;
        transform-origin: center center;
    `;
    
    bonusCard.innerHTML = `
        <div style="font-size: 80px; margin-bottom: 20px; animation: rotate 2s linear infinite;">🎁</div>
        <div style="font-size: 48px; font-weight: bold; color: white; margin-bottom: 15px;">БОНУС РАУНД!</div>
        <div style="font-size: 32px; color: #ffeb3b; margin-bottom: 10px; font-weight: bold;">${spins} ФРИСПИНОВ</div>
        <div style="font-size: 20px; color: white; opacity: 0.9; margin-bottom: 30px;">Собрано ${bonusCount} подарков!</div>
        <button id="acceptBonusBtn" style="
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            border: none;
            color: white;
            padding: 20px 50px;
            border-radius: 50px;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
            transition: all 0.3s;
        ">ПРИНЯТЬ БОНУС</button>
    `;
    
    overlay.appendChild(bonusCard);
    document.body.appendChild(overlay);
    
    // Анимация кнопки
    const acceptBtn = document.getElementById('acceptBonusBtn');
    acceptBtn.addEventListener('mouseenter', () => {
        acceptBtn.style.transform = 'scale(1.1)';
    });
    acceptBtn.addEventListener('mouseleave', () => {
        acceptBtn.style.transform = 'scale(1)';
    });
    
    // Принятие бонуса
    acceptBtn.addEventListener('click', () => {
        overlay.remove();
        startBonusMode(spins);
    });
}

// Запуск режима бонуса
function startBonusMode(spins) {
    freeSpins = spins;
    isBonusMode = true;
    bonusMultipliers = [];
    bonusTotalWin = 0; // Сбрасываем счетчик выигрыша
    tumbleWin = 0; // Сбрасываем tumbleWin для нового бонуса
    currentBonusMultiplier = 1; // Начинаем с x1
    
    // Показываем панель множителей и free spins
    multipliersPanel.style.display = 'block';
    document.querySelector('.free-spins').classList.add('visible');
    updateMultipliersDisplay();
    updateDisplay();
    
    // Автоматически запускаем первый спин через 1 секунду
    setTimeout(() => {
        if (freeSpins > 0 && !isSpinning) {
            spin();
        }
    }, 1000);
}

// Обновление отображения множителей
function updateMultipliersDisplay() {
    if (!isBonusMode) {
        multipliersPanel.style.display = 'none';
        return;
    }
    
    multipliersList.innerHTML = '';
    
    // Показываем только текущий множитель с анимацией
    const currentMultItem = document.createElement('div');
    currentMultItem.className = 'multiplier-item current-multiplier';
    currentMultItem.textContent = `x${currentBonusMultiplier}`;
    multipliersList.appendChild(currentMultItem);
}

// Показать сообщение о бонусе
function showBonusMessage(spins, bonusCount) {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 50px 70px;
        border-radius: 25px;
        font-size: 42px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 15px 50px rgba(0, 0, 0, 0.6);
        animation: bounceIn 0.6s;
        text-align: center;
        border: 5px solid #ffd700;
    `;
    message.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 15px;">🎁 🎁 �</div>
        <div style="margin-bottom: 10px;">БОНУС!</div>
        <div style="font-size: 32px; color: #ffeb3b;">${spins} ФРИСПИНОВ</div>
        <div style="font-size: 20px; margin-top: 10px; opacity: 0.9;">${bonusCount} подарков собрано!</div>
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.animation = 'fadeOut 0.5s';
        setTimeout(() => message.remove(), 500);
    }, 3500);
}

// Удаление выигрышных символов и падение новых
async function cascadeWin(winningSymbols) {
    if (winningSymbols.size === 0) return 0;
    
    // Воспроизводим звук выигрыша
    playWinSound();
    
    // Подсветка выигрышных символов
    winningSymbols.forEach(index => {
        const symbol = gridElement.querySelector(`[data-index="${index}"]`);
        symbol.classList.add('winning');
    });
    
    await sleep(500);
    
    // Скрываем выигрышные символы
    winningSymbols.forEach(index => {
        const symbol = gridElement.querySelector(`[data-index="${index}"]`);
        symbol.style.opacity = '0';
        symbol.classList.remove('winning');
    });
    
    await sleep(300);
    
    const symbols = Array.from(gridElement.querySelectorAll('.symbol'));
    
    // Обрабатываем каждую колонку
    for (let col = 0; col < COLS; col++) {
        const columnDelay = col * 100;
        
        setTimeout(() => {
            // Определяем какие символы остаются и сколько рядов они падают
            const columnData = [];
            
            for (let row = 0; row < ROWS; row++) {
                const index = row * COLS + col;
                const symbol = symbols[index];
                
                if (winningSymbols.has(index)) {
                    // Этот символ выиграл - будет удален
                    columnData.push({ type: 'empty', row, index });
                } else {
                    // Этот символ остается
                    columnData.push({ type: 'keep', row, index, content: symbol.textContent });
                }
            }
            
            // Считаем сколько пустых мест внизу каждого символа
            const fallDistances = [];
            for (let row = 0; row < ROWS; row++) {
                let emptyBelow = 0;
                for (let checkRow = row + 1; checkRow < ROWS; checkRow++) {
                    if (columnData[checkRow].type === 'empty') {
                        emptyBelow++;
                    }
                }
                fallDistances[row] = emptyBelow;
            }
            
            // Количество новых символов = количество выигрышных
            const numNew = columnData.filter(d => d.type === 'empty').length;
            
            if (numNew > 0) {
                // Генерируем новые символы
                const newSymbols = [];
                for (let i = 0; i < numNew; i++) {
                    newSymbols.push(getRandomSymbol());
                }
                
                // Шаг 1: Анимируем падение существующих символов
                for (let row = 0; row < ROWS; row++) {
                    if (columnData[row].type === 'keep' && fallDistances[row] > 0) {
                        const index = columnData[row].index;
                        const symbol = symbols[index];
                        const distance = fallDistances[row];
                        
                        // Анимация падения вниз на distance рядов
                        symbol.style.transition = `transform ${0.3 + distance * 0.1}s ease-in`;
                        symbol.style.transform = `translateY(${distance * 100}%)`;
                    }
                }
                
                // Шаг 2: Ждем завершения анимации падения старых символов
                const maxFallTime = Math.max(...fallDistances.map((d, i) => 
                    columnData[i].type === 'keep' && d > 0 ? 300 + d * 100 : 0
                ));
                
                setTimeout(() => {
                    // Шаг 3: Обновляем содержимое ячеек
                    const remainingSymbols = [];
                    for (let row = 0; row < ROWS; row++) {
                        if (columnData[row].type === 'keep') {
                            remainingSymbols.push(columnData[row].content);
                        }
                    }
                    
                    const finalColumn = [...newSymbols, ...remainingSymbols];
                    
                    // Обновляем все ячейки
                    for (let row = 0; row < ROWS; row++) {
                        const index = row * COLS + col;
                        const symbol = symbols[index];
                        
                        symbol.textContent = finalColumn[row];
                        symbol.classList.remove('winning', 'bonus');
                        symbol.style.transition = 'none';
                        symbol.style.transform = 'none';
                        symbol.style.animation = 'none';
                        
                        if (finalColumn[row] === BONUS_SYMBOL) {
                            symbol.classList.add('bonus');
                        }
                        
                        // Для новых символов - делаем невидимыми
                        if (row < numNew) {
                            symbol.style.opacity = '0';
                        } else {
                            symbol.style.opacity = '1';
                        }
                    }
                    
                    // Шаг 4: Анимация падения новых символов (сверху вниз по очереди)
                    // Символы падают снизу вверх (как в начальном спине)
                    for (let row = 0; row < numNew; row++) {
                        const index = row * COLS + col;
                        const symbol = symbols[index];
                        
                        // Задержка: нижние символы падают первыми
                        const symbolDelay = (numNew - 1 - row) * 150;
                        
                        setTimeout(() => {
                            // Устанавливаем начальную позицию сверху
                            symbol.style.opacity = '1';
                            symbol.style.transform = 'translateY(-100%)';
                            symbol.style.transition = 'none';
                            
                            // Принудительный reflow
                            void symbol.offsetWidth;
                            
                            // Включаем transition и двигаем символ вниз
                            symbol.style.transition = 'transform 0.3s ease-out';
                            symbol.style.transform = 'translateY(0)';
                            playDropSound();
                        }, symbolDelay);
                    }
                }, maxFallTime);
            }
        }, columnDelay);
    }
    
    // Ждем пока все символы упадут
    // Колонки: (COLS-1)*100, падение новых: (ROWS-1)*150, анимация: 300ms
    const totalDelay = (COLS - 1) * 100 + (ROWS - 1) * 150 + 300 + 100;
    await sleep(totalDelay);
    
    // Проверка новых выигрышей
    const { totalWin, winningSymbols: newWinning } = checkWins();
    
    if (newWinning.size > 0) {
        // Применяем множитель в бонусе для каскадного выигрыша
        let cascadeWinAmount = totalWin;
        if (isBonusMode) {
            cascadeWinAmount = totalWin * currentBonusMultiplier;
            // Увеличиваем множитель при каждом каскаде
            currentBonusMultiplier++;
            bonusMultipliers.push(currentBonusMultiplier);
            updateMultipliersDisplay();
        }
        
        tumbleWin += cascadeWinAmount;
        updateDisplay();
        return cascadeWinAmount + await cascadeWin(newWinning);
    } else {
        // Если новых выигрышей нет - сбрасываем множитель в бонусе
        if (isBonusMode) {
            currentBonusMultiplier = 1;
            updateMultipliersDisplay();
        }
    }
    
    return totalWin;
}

// Основная функция спина
async function spin() {
    if (isSpinning) return;
    
    if (freeSpins === 0 && balance < bet) {
        alert('Недостаточно средств!');
        return;
    }
    
    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.classList.add('spinning');
    
    // Списание ставки
    if (freeSpins === 0) {
        balance -= bet;
        tumbleWin = 0; // Сбрасываем только если не бонус
    } else {
        freeSpins--;
        // В бонусе не сбрасываем tumbleWin, чтобы показывать накопленный выигрыш
    }
    
    updateDisplay();
    
    // Заполнение сетки с эффектом замедления
    const bonusCount = await fillGridWithAnticipation();
    
    // Ждем завершения анимации падения всех символов
    // Рассчитываем время: последняя колонка (5) * 0.4с + все символы в колонке (5) * 0.15с + анимация падения 0.2с
    const totalAnimationTime = (COLS - 1) * 0.4 + ROWS * 0.15 + 0.2;
    
    if (bonusCount === 2) {
        // При эффекте замедления ждем дольше
        await sleep(totalAnimationTime * 1000 + 1500);
    } else {
        await sleep(totalAnimationTime * 1000 + 300);
    }
    
    // Проверка бонусов
    let bonusTriggered = false;
    if (!isBonusMode) {
        // Вне бонуса - запускаем бонус
        bonusTriggered = checkBonus();
    } else {
        // В бонусе - проверяем ретриггер (добавление спинов)
        const symbols = Array.from(gridElement.querySelectorAll('.symbol'));
        const bonusCount = symbols.filter(s => s.textContent === BONUS_SYMBOL).length;
        
        if (bonusCount >= BONUS_TRIGGER) {
            // Добавляем 10 спинов
            freeSpins += 10;
            
            // Подсвечиваем бонусные символы
            symbols.forEach((symbol) => {
                if (symbol.textContent === BONUS_SYMBOL) {
                    symbol.style.animation = 'pulse 0.5s ease-in-out 3';
                }
            });
            
            // Показываем сообщение о ретриггере
            showRetriggerMessage();
            updateDisplay();
        }
    }
    
    // Если бонус НЕ выпал - продолжаем игру
    if (!bonusTriggered) {
        // Проверка выигрышей
        const { totalWin, winningSymbols } = checkWins();
        
        if (totalWin > 0) {
            // Применяем множитель бонуса
            let finalWin = totalWin;
            if (isBonusMode) {
                // Применяем ТЕКУЩИЙ множитель к первому выигрышу
                finalWin = totalWin * currentBonusMultiplier;
                // Увеличиваем множитель для следующего каскада
                currentBonusMultiplier++;
                bonusMultipliers.push(currentBonusMultiplier);
                updateMultipliersDisplay();
            }
            
            if (isBonusMode) {
                // В бонусе добавляем к накопленному
                tumbleWin += finalWin;
            } else {
                // Вне бонуса просто устанавливаем
                tumbleWin = finalWin;
            }
            updateDisplay();
            
            // Каскадные выигрыши (множитель будет увеличиваться внутри cascadeWin)
            const cascadeWins = await cascadeWin(winningSymbols);
            
            balance += tumbleWin;
            
            // Добавляем к общему выигрышу в бонусе ПОСЛЕ всех каскадов
            if (isBonusMode) {
                bonusTotalWin += tumbleWin;
                // Сбрасываем tumbleWin после добавления к общему выигрышу
                tumbleWin = 0;
                updateDisplay();
            }
            
            // Сбрасываем tumbleWin после добавления к балансу (только вне бонуса)
            if (!isBonusMode) {
                tumbleWin = 0;
                updateDisplay();
            }
        } else {
            // Если нет выигрышей вообще - сбрасываем множитель
            if (isBonusMode) {
                currentBonusMultiplier = 1;
                updateMultipliersDisplay();
            }
        }
        
        updateDisplay();
        
        spinBtn.disabled = false;
        spinBtn.classList.remove('spinning');
        isSpinning = false;
        
        // Обновляем состояние кнопки купить бонус
        updateDisplay();
        
        // Проверяем окончание бонуса ПОСЛЕ всех выигрышей
        if (freeSpins === 0 && isBonusMode) {
            await endBonusMode();
        }
        
        // Автоматически продолжаем фриспины
        if (freeSpins > 0 && isBonusMode) {
            setTimeout(spin, 1500); // Автоматический спин через 1.5 секунды
        } else if (autoplay && (balance >= bet || freeSpins > 0)) {
            setTimeout(spin, 1000);
        } else if (autoplay) {
            autoplay = false;
            autoplayBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    } else {
        // Если бонус выпал - разблокируем кнопку для следующего спина после принятия
        spinBtn.disabled = false;
        spinBtn.classList.remove('spinning');
        isSpinning = false;
        
        // Обновляем состояние кнопки купить бонус
        updateDisplay();
    }
}

// Завершение режима бонуса
async function endBonusMode() {
    isBonusMode = false;
    
    // Подсчет максимального множителя
    const maxMultiplier = bonusMultipliers.length > 0 ? Math.max(...bonusMultipliers) : 1;
    
    await sleep(500);
    
    // Показываем итоговый результат бонуса
    showBonusEndMessage(maxMultiplier, bonusTotalWin);
    
    bonusMultipliers = [];
    bonusTotalWin = 0;
    tumbleWin = 0; // Сбрасываем tumbleWin после окончания бонуса
    currentBonusMultiplier = 1; // Сбрасываем множитель
    multipliersPanel.style.display = 'none';
    document.querySelector('.free-spins').classList.remove('visible');
    updateDisplay();
}

// Показать сообщение об окончании бонуса
function showBonusEndMessage(totalMultiplier, totalWin) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s;
    `;
    
    const endCard = document.createElement('div');
    endCard.style.cssText = `
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        padding: 60px 80px;
        border-radius: 30px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        border: 6px solid #ffd700;
        animation: scaleIn 0.5s ease-out;
        position: relative;
        transform-origin: center center;
    `;
    
    endCard.innerHTML = `
        <div style="font-size: 80px; margin-bottom: 20px;">🎉</div>
        <div style="font-size: 48px; font-weight: bold; color: white; margin-bottom: 20px;">БОНУС ЗАВЕРШЕН!</div>
        <div style="font-size: 24px; color: white; opacity: 0.9; margin-bottom: 15px;">Общий выигрыш:</div>
        <div style="font-size: 56px; color: #ffeb3b; margin-bottom: 20px; font-weight: bold; text-shadow: 0 0 20px rgba(255, 235, 59, 0.5);">₽${totalWin.toFixed(2)}</div>
        ${totalMultiplier > 1 ? `<div style="font-size: 20px; color: white; opacity: 0.8; margin-bottom: 30px;">Максимальный множитель: x${totalMultiplier}</div>` : ''}
        <button id="closeBonusEndBtn" style="
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            border: none;
            color: white;
            padding: 20px 50px;
            border-radius: 50px;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
            transition: all 0.3s;
        ">ПРОДОЛЖИТЬ</button>
    `;
    
    overlay.appendChild(endCard);
    document.body.appendChild(overlay);
    
    // Анимация кнопки
    const closeBtn = document.getElementById('closeBonusEndBtn');
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.transform = 'scale(1.1)';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.transform = 'scale(1)';
    });
    
    // Закрытие окна
    closeBtn.addEventListener('click', () => {
        overlay.remove();
    });
    
    // Закрытие по клику на overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// Показать выигрыш
function showWin(amount) {
    winDisplay.textContent = `ВЫИГРЫШ ₽${amount.toFixed(2)}`;
    winDisplay.classList.add('show');
    winDisplay.style.animation = 'pulse 0.5s ease-in-out 3';
    
    setTimeout(() => {
        winDisplay.classList.remove('show');
    }, 3000);
}

// Покупка бонуса
function buyBonus() {
    if (isSpinning) return;
    
    const bonusCost = bet * BONUS_BUY_MULTIPLIER;
    
    if (balance < bonusCost) {
        showMessage('Недостаточно средств для покупки бонуса!', 'error');
        return;
    }
    
    // Показываем красивое окно подтверждения
    showBuyBonusConfirmation(bonusCost);
}

// Окно подтверждения покупки бонуса
function showBuyBonusConfirmation(bonusCost) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s;
    `;
    
    const confirmCard = document.createElement('div');
    confirmCard.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 50px 60px;
        border-radius: 25px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        border: 5px solid #ffd700;
        animation: scaleIn 0.4s ease-out;
        max-width: 500px;
        transform-origin: center center;
    `;
    
    confirmCard.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px;">🎁</div>
        <div style="font-size: 32px; font-weight: bold; color: white; margin-bottom: 15px;">КУПИТЬ БОНУС?</div>
        <div style="font-size: 20px; color: white; opacity: 0.9; margin-bottom: 10px;">Вы получите:</div>
        <div style="font-size: 28px; color: #ffeb3b; margin-bottom: 20px; font-weight: bold;">10 ФРИСПИНОВ</div>
        <div style="font-size: 24px; color: #ff6b6b; margin-bottom: 30px; font-weight: bold;">Стоимость: ₽${bonusCost.toFixed(2)}</div>
        <div style="display: flex; gap: 20px; justify-content: center;">
            <button id="confirmBuyBtn" style="
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                border: none;
                color: white;
                padding: 18px 40px;
                border-radius: 50px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
                transition: all 0.3s;
            ">✓ ДА</button>
            <button id="cancelBuyBtn" style="
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                border: none;
                color: white;
                padding: 18px 40px;
                border-radius: 50px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
                transition: all 0.3s;
            ">✗ НЕТ</button>
        </div>
    `;
    
    overlay.appendChild(confirmCard);
    document.body.appendChild(overlay);
    
    // Анимация кнопок
    const confirmBtn = document.getElementById('confirmBuyBtn');
    const cancelBtn = document.getElementById('cancelBuyBtn');
    
    confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.transform = 'scale(1.1)';
    });
    confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.transform = 'scale(1)';
    });
    
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.transform = 'scale(1.1)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.transform = 'scale(1)';
    });
    
    // Подтверждение покупки
    confirmBtn.addEventListener('click', () => {
        // Списываем деньги сразу
        balance -= bonusCost;
        updateDisplay();
        
        // Удаляем окно подтверждения
        overlay.remove();
        
        // Небольшая задержка перед показом анимации бонуса
        setTimeout(() => {
            showBonusAnimation(10, 3);
        }, 100);
    });
    
    // Отмена покупки
    cancelBtn.addEventListener('click', () => {
        overlay.remove(); // Сразу удаляем без анимации
    });
    
    // Закрытие по клику на overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove(); // Сразу удаляем без анимации
        }
    });
}

// Показать сообщение о ретриггере
function showRetriggerMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 40px 60px;
        border-radius: 25px;
        font-size: 36px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 15px 50px rgba(0, 0, 0, 0.6);
        animation: bounceIn 0.6s;
        text-align: center;
        border: 5px solid #ffd700;
    `;
    message.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 15px;">🎁 🎁 🎁</div>
        <div style="margin-bottom: 10px;">РЕТРИГГЕР!</div>
        <div style="font-size: 28px; color: #ffeb3b;">+10 ФРИСПИНОВ</div>
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.animation = 'fadeOut 0.5s';
        setTimeout(() => message.remove(), 500);
    }, 2500);
}

// Показать информацию об игре
function showGameInfo() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s;
        overflow-y: auto;
        padding: 20px;
    `;
    
    const infoCard = document.createElement('div');
    infoCard.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 25px 35px;
        border-radius: 20px;
        max-width: 550px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        border: 4px solid #ffd700;
        animation: scaleIn 0.4s ease-out;
        position: relative;
    `;
    
    infoCard.innerHTML = `
        <button id="closeInfoBtn" style="
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s;
        ">✕</button>
        
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 36px; margin-bottom: 5px;">⚡</div>
            <div style="font-size: 24px; font-weight: bold; color: white;">Gates of Olympus</div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 12px;">
                <div style="font-size: 16px; font-weight: bold; color: #ffeb3b; margin-bottom: 10px;">📋 Правила</div>
                <div style="color: white; line-height: 1.6; font-size: 12px;">
                    • Кластеры 3+ символов<br>
                    • Каскадные выигрыши<br>
                    • Пробел = спин
                </div>
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 12px;">
                <div style="font-size: 16px; font-weight: bold; color: #ffeb3b; margin-bottom: 10px;">💎 Бонус</div>
                <div style="color: white; line-height: 1.6; font-size: 12px;">
                    • 3+ 💎 = 10 спинов<br>
                    • Растущие множители<br>
                    • Купить: 100x ставка
                </div>
            </div>
        </div>
        
        <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 12px; margin-bottom: 15px;">
            <div style="font-size: 16px; font-weight: bold; color: #ffeb3b; margin-bottom: 10px;">💰 Символы</div>
            <div style="display: flex; justify-content: space-around; color: white; font-size: 11px; text-align: center;">
                <div><div style="font-size: 20px;">🏺</div>Редкий</div>
                <div><div style="font-size: 20px;">⚔️</div>Хороший</div>
                <div><div style="font-size: 20px;">🦅</div>Средний</div>
                <div><div style="font-size: 20px;">⚡👑🔱</div>Частые</div>
            </div>
        </div>
        
        <div style="background: rgba(255, 235, 59, 0.2); padding: 12px; border-radius: 10px; font-size: 11px; color: white; margin-bottom: 15px;">
            <strong>Множители:</strong> 3: x0.3 | 5: x1 | 8: x5 | 10: x20 | 12+: x100
        </div>
        
        <div style="text-align: center;">
            <button id="closeInfoBtn2" style="
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                border: none;
                color: white;
                padding: 12px 35px;
                border-radius: 50px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
                transition: all 0.3s;
            ">Понятно</button>
        </div>
    `;
    
    overlay.appendChild(infoCard);
    document.body.appendChild(overlay);
    
    // Закрытие окна
    const closeBtn1 = document.getElementById('closeInfoBtn');
    const closeBtn2 = document.getElementById('closeInfoBtn2');
    
    closeBtn1.addEventListener('mouseenter', () => {
        closeBtn1.style.background = 'rgba(255, 255, 255, 0.4)';
    });
    closeBtn1.addEventListener('mouseleave', () => {
        closeBtn1.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    
    closeBtn2.addEventListener('mouseenter', () => {
        closeBtn2.style.transform = 'scale(1.1)';
    });
    closeBtn2.addEventListener('mouseleave', () => {
        closeBtn2.style.transform = 'scale(1)';
    });
    
    closeBtn1.addEventListener('click', () => {
        overlay.remove();
    });
    
    closeBtn2.addEventListener('click', () => {
        overlay.remove();
    });
    
    // Закрытие по клику на overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// Показать сообщение
function showMessage(text, type = 'success') {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${type === 'success' ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'};
        color: white;
        padding: 30px 50px;
        border-radius: 20px;
        font-size: 24px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        animation: bounceIn 0.5s;
        text-align: center;
    `;
    message.textContent = text;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 2500);
}

// Изменение ставки
function decreaseBet() {
    if (bet > 10) {
        bet = Math.max(10, bet - 10);
        updateDisplay();
    }
}

function increaseBet() {
    if (bet < 1000) {
        bet = Math.min(1000, bet + 10);
        updateDisplay();
    }
}

// Автоплей
function toggleAutoplay() {
    autoplay = !autoplay;
    
    if (autoplay) {
        autoplayBtn.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
        if (!isSpinning) {
            spin();
        }
    } else {
        autoplayBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// Обновление дисплея
function updateDisplay() {
    balanceElement.textContent = `₽${balance.toFixed(2)}`;
    betElement.textContent = `₽${bet.toFixed(2)}`;
    freeSpinsElement.textContent = freeSpins;
    
    // Во время бонуса показываем общий выигрыш + текущий спин
    if (isBonusMode) {
        tumblewinElement.textContent = `₽${(bonusTotalWin + tumbleWin).toFixed(2)}`;
    } else {
        tumblewinElement.textContent = `₽${tumbleWin.toFixed(2)}`;
    }
    
    // Обновление баланса в хедере
    const headerBalance = document.getElementById('headerBalance');
    if (headerBalance) {
        headerBalance.textContent = `₽${balance.toFixed(2)}`;
    }
    
    // Обновление цены бонуса
    const bonusCost = bet * BONUS_BUY_MULTIPLIER;
    bonusPriceElement.textContent = `₽${bonusCost.toFixed(2)}`;
    
    // Блокировка кнопки покупки бонуса только если недостаточно средств, идет спин или активны фриспины/бонус
    if (balance < bonusCost || isSpinning || freeSpins > 0 || isBonusMode) {
        buyBonusBtn.disabled = true;
    } else {
        buyBonusBtn.disabled = false;
    }
    
    // Блокируем кнопки управления во время фриспинов
    if (freeSpins > 0 || isBonusMode) {
        spinBtn.disabled = true;
        minusBtn.disabled = true;
        plusBtn.disabled = true;
        autoplayBtn.disabled = true;
    } else if (!isSpinning) {
        spinBtn.disabled = false;
        minusBtn.disabled = false;
        plusBtn.disabled = false;
        autoplayBtn.disabled = false;
    }
    
    // Показываем выигрыш если он есть (в бонусе или обычной игре)
    const displayWin = isBonusMode ? (bonusTotalWin + tumbleWin) : tumbleWin;
    if (displayWin === 0) {
        winDisplay.classList.remove('show');
        document.querySelector('.tumblewin').classList.remove('visible');
    } else {
        document.querySelector('.tumblewin').classList.add('visible');
    }
    
    // Сохранение баланса
    saveUserBalance(balance);
}

// Обновление RTP индикатора
function updateRTPIndicator() {
    const rtpIndicator = document.getElementById('rtpIndicator');
    if (rtpIndicator) {
        const rtp = slotConfig.rtp || 96.0;
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

// Запуск игры
init();
initialFillGrid(); // Первоначальное заполнение без анимации


// Кнопка возврата в лобби
document.getElementById('btnBack')?.addEventListener('click', () => {
    // Сохраняем баланс перед выходом
    saveUserBalance(balance);
    window.location.href = 'index.html';
});

