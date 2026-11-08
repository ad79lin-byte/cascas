// Загрузка настроек из админ-панели
let slotConfig = {
    rtp: 97.0,
    volatility: 'medium',
    crashPoint: 2.0,
    maxMultiplier: 1000
};

// Загружаем конфигурацию
function loadSlotConfig() {
    if (typeof window.getSlotConfig === 'function') {
        const config = window.getSlotConfig('crash');
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
let balance = parseFloat(localStorage.getItem('userBalance')) || 100000;
let currentBet = 18.00;
let autoCashoutValue = 2.00;
let isPlaying = false;
let hasBet = false;
let currentMultiplier = 1.00;
let crashPoint = 1.00;
let gameState = 'waiting'; // waiting, running, crashed
let animationId = null;
let startTime = 0;
let history = [];
let waitingTime = 7; // Время ожидания в секундах
let waitingTimer = null;

// Аудио контекст для звуков
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Звук взлета (короткий "вжух" в начале)
function playTakeoffSound() {
    if (!audioContext) initAudio();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Быстрое увеличение частоты для эффекта "вжух"
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
    
    oscillator.type = 'sine';
    
    // Быстрое затухание
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Звук краша
function playCrashSound() {
    if (!audioContext) initAudio();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 100;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Звук выигрыша
function playWinSound() {
    if (!audioContext) initAudio();
    
    const notes = [523.25, 659.25, 783.99]; // C, E, G
    
    notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = audioContext.currentTime + index * 0.1;
        gainNode.gain.setValueAtTime(0.1, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
    });
}

// Звук кнопки
function playButtonSound() {
    if (!audioContext) initAudio();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.05;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.05);
}

// Canvas
const canvas = document.getElementById('crashCanvas');
const ctx = canvas.getContext('2d');
let points = [];
let geroyImage = new Image();
geroyImage.src = 'geroy.png';
let geroyLoaded = false;

geroyImage.onload = () => {
    geroyLoaded = true;
};

// Элементы DOM
const betInput = document.getElementById('betInput');
const autoCashoutInput = document.getElementById('autoCashout');
const placeBetBtn = document.getElementById('placeBetBtn');
const cashoutBtn = document.getElementById('cashoutBtn');
const multiplierDisplay = document.getElementById('multiplierDisplay');
const crashMessage = document.getElementById('crashMessage');
const historyItems = document.getElementById('historyItems');
const betsTable = document.getElementById('betsTable');
const balanceElement = document.getElementById('headerBalance');

// Инициализация
function init() {
    // Проверяем авторизацию
    if (!checkAuth()) return;
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    updateBalance();
    updateRTPIndicator();
    drawGraph();
    
    document.getElementById('decreaseBet').addEventListener('click', () => {
        currentBet = Math.max(0.20, currentBet - 1);
        betInput.value = currentBet.toFixed(2);
    });
    
    document.getElementById('increaseBet').addEventListener('click', () => {
        currentBet = Math.min(balance, currentBet + 1);
        betInput.value = currentBet.toFixed(2);
    });
    
    betInput.addEventListener('change', () => {
        currentBet = parseFloat(betInput.value) || 0.20;
        betInput.value = currentBet.toFixed(2);
    });
    
    autoCashoutInput.addEventListener('change', () => {
        autoCashoutValue = parseFloat(autoCashoutInput.value) || 2.00;
        autoCashoutInput.value = autoCashoutValue.toFixed(2);
    });
    
    placeBetBtn.addEventListener('click', placeBet);
    cashoutBtn.addEventListener('click', cashout);
    
    document.getElementById('btnBack').addEventListener('click', () => {
        saveUserBalance(balance);
        window.location.href = 'index.html';
    });
    
    // Запуск первой игры с задержкой
    setTimeout(startNewRound, 1000);
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 60;
    canvas.height = container.clientHeight - 60;
    drawGraph();
}

// Генерация точки краша
function generateCrashPoint() {
    // Используем настройки из админки
    const targetCrashPoint = slotConfig.crashPoint || 2.0;
    const volatility = slotConfig.volatility || 'medium';
    const maxMultiplier = slotConfig.maxMultiplier || 1000;
    const rtpMultiplier = (slotConfig.rtp || 97.0) / 97.0; // Корректировка по RTP
    
    const rand = Math.random();
    let point;
    
    // Волатильность влияет на распределение
    switch(volatility) {
        case 'low':
            // Низкая волатильность - больше предсказуемых результатов
            if (rand < 0.60) {
                point = targetCrashPoint * (0.8 + Math.random() * 0.4); // 80-120% от цели
            } else if (rand < 0.85) {
                point = targetCrashPoint * (0.5 + Math.random() * 0.5); // 50-100% от цели
            } else if (rand < 0.95) {
                point = targetCrashPoint * (1.2 + Math.random() * 0.8); // 120-200% от цели
            } else {
                point = targetCrashPoint * (2.0 + Math.random() * 3.0); // Редкие большие
            }
            break;
            
        case 'high':
            // Высокая волатильность - больше экстремумов
            if (rand < 0.40) {
                point = 1.0 + Math.random() * (targetCrashPoint - 0.5);
            } else if (rand < 0.70) {
                point = targetCrashPoint + Math.random() * targetCrashPoint * 2;
            } else if (rand < 0.90) {
                point = targetCrashPoint * (2 + Math.random() * 3);
            } else {
                point = targetCrashPoint * (5 + Math.random() * 10);
            }
            break;
            
        case 'extreme':
            // Экстремальная волатильность
            if (rand < 0.30) {
                point = 1.0 + Math.random() * 0.5; // Очень ранние краши
            } else if (rand < 0.60) {
                point = 1.5 + Math.random() * targetCrashPoint;
            } else if (rand < 0.85) {
                point = targetCrashPoint * (3 + Math.random() * 5);
            } else {
                point = targetCrashPoint * (10 + Math.random() * 40);
            }
            break;
            
        case 'medium':
        default:
            // Средняя волатильность (по умолчанию)
            if (rand < 0.50) {
                point = targetCrashPoint * (0.5 + Math.random() * 0.5); // 50-100% от цели
            } else if (rand < 0.80) {
                point = targetCrashPoint * (1.0 + Math.random() * 1.5); // 100-250% от цели
            } else if (rand < 0.95) {
                point = targetCrashPoint * (2.5 + Math.random() * 2.5); // Средние большие
            } else {
                point = targetCrashPoint * (5.0 + Math.random() * 5.0); // Редкие большие
            }
    }
    
    // Применяем RTP корректировку
    point = point * rtpMultiplier;
    
    // Ограничиваем максимальным множителем
    point = Math.min(point, maxMultiplier);
    
    // Минимум 1.01x
    point = Math.max(point, 1.01);
    
    return point;
}

// Начало нового раунда
function startNewRound() {
    gameState = 'waiting';
    crashPoint = generateCrashPoint();
    currentMultiplier = 1.00;
    points = [];
    
    crashMessage.classList.remove('show');
    crashMessage.textContent = '';
    multiplierDisplay.classList.add('waiting');
    multiplierDisplay.textContent = 'Ожидание...';
    
    placeBetBtn.disabled = false;
    placeBetBtn.textContent = 'Ставка';
    
    // Запускаем таймер ожидания
    let countdown = waitingTime;
    multiplierDisplay.textContent = `Начало через ${countdown}s`;
    
    waitingTimer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            multiplierDisplay.textContent = `Начало через ${countdown}s`;
        } else {
            clearInterval(waitingTimer);
            multiplierDisplay.classList.remove('waiting');
            startGame();
        }
    }, 1000);
}

// Запуск игры после ожидания
function startGame() {
    gameState = 'running';
    startTime = Date.now();
    
    placeBetBtn.disabled = true;
    
    if (hasBet) {
        cashoutBtn.style.display = 'block';
        placeBetBtn.style.display = 'none';
    }
    
    // Звук взлета в начале
    initAudio();
    playTakeoffSound();
    
    animate();
}

// Анимация игры
function animate() {
    if (gameState !== 'running') return;
    
    const elapsed = (Date.now() - startTime) / 1000;
    
    // Формула роста множителя
    currentMultiplier = Math.pow(1.06, elapsed);
    
    // Проверка краша
    if (currentMultiplier >= crashPoint) {
        crash();
        return;
    }
    
    // Автовывод
    if (hasBet && autoCashoutValue > 0 && currentMultiplier >= autoCashoutValue) {
        cashout();
        // Не возвращаемся, продолжаем анимацию
    }
    
    // Обновление дисплея
    multiplierDisplay.textContent = `x${currentMultiplier.toFixed(2)}`;
    
    // Обновление кнопки забрать с потенциальным выигрышем
    if (hasBet && cashoutBtn.style.display === 'block') {
        const potentialWin = currentBet * currentMultiplier;
        cashoutBtn.innerHTML = `Забрать<br><span style="font-size: 16px;">₽${potentialWin.toFixed(2)}</span>`;
    }
    
    // Обновление активной ставки в таблице
    updateActiveBet();
    
    // Добавление точки на график (всегда начинаем с 1.00)
    if (points.length === 0) {
        points.push({ x: 0, y: 1.00 });
    }
    
    points.push({
        x: elapsed,
        y: currentMultiplier
    });
    
    drawGraph();
    
    animationId = requestAnimationFrame(animate);
}

// Краш
function crash() {
    gameState = 'crashed';
    cancelAnimationFrame(animationId);
    
    // Звук краша
    playCrashSound();
    
    // Показываем сообщение о краше
    crashMessage.textContent = `CRASHED`;
    crashMessage.classList.add('show');
    multiplierDisplay.textContent = `x${crashPoint.toFixed(2)}`;
    
    // Добавляем в историю
    addToHistory(crashPoint);
    
    // Если была ставка - проигрыш
    if (hasBet) {
        addBetResult(currentBet, crashPoint, 0, false);
        hasBet = false;
    }
    
    cashoutBtn.style.display = 'none';
    placeBetBtn.style.display = 'block';
    placeBetBtn.disabled = false;
    placeBetBtn.textContent = 'Ставка';
    
    // Следующий раунд через 3 секунды
    setTimeout(() => {
        startNewRound();
    }, 3000);
}

// Размещение ставки
function placeBet() {
    if (gameState !== 'waiting') {
        alert('Дождитесь начала следующего раунда!');
        return;
    }
    
    if (balance < currentBet) {
        alert('Недостаточно средств!');
        return;
    }
    
    // Звук кнопки
    playButtonSound();
    
    balance -= currentBet;
    hasBet = true;
    updateBalance();
    
    placeBetBtn.disabled = true;
    placeBetBtn.textContent = 'Ставка принята';
    
    // Добавляем активную ставку в таблицу
    addActiveBet(currentBet);
}

// Вывод средств
function cashout() {
    if (!hasBet) return;
    
    const winAmount = currentBet * currentMultiplier;
    balance += winAmount;
    updateBalance();
    
    // Звук выигрыша
    playWinSound();
    
    addBetResult(currentBet, currentMultiplier, winAmount, true);
    
    hasBet = false;
    cashoutBtn.style.display = 'none';
    placeBetBtn.style.display = 'block';
    placeBetBtn.disabled = true; // Блокируем до следующего раунда
    placeBetBtn.textContent = 'Ставка';
    
    // Показываем сообщение о выигрыше
    showWinMessage(winAmount, currentMultiplier);
    
    // Продолжаем анимацию игры для других игроков
    if (gameState === 'running') {
        animate();
    }
}

// Отрисовка графика
function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Фон
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Сетка
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 10; i++) {
        const y = (canvas.height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    for (let i = 0; i < 10; i++) {
        const x = (canvas.width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // График
    if (points.length > 1) {
        // Добавляем отступы для героя
        const padding = 100;
        const graphWidth = canvas.width - padding;
        const graphHeight = canvas.height - padding;
        
        const maxX = Math.max(...points.map(p => p.x), 10);
        // Используем динамический масштаб, но с минимумом 10
        const currentMaxY = Math.max(...points.map(p => p.y));
        const maxY = Math.max(10, currentMaxY * 1.2);
        
        ctx.beginPath();
        ctx.strokeStyle = gameState === 'crashed' ? '#ff4757' : '#38ef7d';
        ctx.lineWidth = 5;
        
        // Фиксированная начальная точка - всегда в одном месте (80% от низа)
        const startX = 0;
        const startY = canvas.height * 0.8;
        ctx.moveTo(startX, startY);
        
        // Рисуем остальные точки относительно начальной
        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            const x = (point.x / maxX) * graphWidth;
            // Вычисляем Y относительно начальной точки с динамическим масштабом
            const relativeY = point.y - 1.00; // Разница от x1.00
            const y = startY - (relativeY / (maxY - 1.00)) * (startY - padding/2);
            ctx.lineTo(x, Math.max(y, padding/2)); // Ограничиваем сверху
        }
        
        ctx.stroke();
        
        // Заливка под графиком
        const lastPoint = points[points.length - 1];
        const lastX = ((lastPoint.x / maxX) * graphWidth);
        ctx.lineTo(lastX, canvas.height);
        ctx.lineTo(startX, canvas.height);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, gameState === 'crashed' ? 'rgba(255, 71, 87, 0.3)' : 'rgba(56, 239, 125, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Рисуем героя на конце линии
        if (geroyLoaded && gameState === 'running' && points.length > 0) {
            const lastPoint = points[points.length - 1];
            const geroyX = (lastPoint.x / maxX) * graphWidth;
            // Используем ту же логику что и для графика с фиксированным масштабом
            const relativeY = lastPoint.y - 1.00;
            const geroyY = Math.max(startY - (relativeY / (maxY - 1.00)) * (startY - padding/2), padding/2);
            
            // Рисуем героя БЕЗ поворота (всегда в одном положении)
            ctx.save();
            ctx.translate(geroyX, geroyY);
            
            const geroySize = 150;
            
            // Добавляем яркое свечение вокруг героя
            ctx.shadowColor = '#38ef7d';
            ctx.shadowBlur = 40;
            ctx.drawImage(geroyImage, -geroySize/2, -geroySize/2, geroySize, geroySize);
            
            // Рисуем второй раз для усиления яркости
            ctx.shadowBlur = 60;
            ctx.drawImage(geroyImage, -geroySize/2, -geroySize/2, geroySize, geroySize);
            
            ctx.restore();
        }
    }
}

// Добавление в историю
function addToHistory(multiplier) {
    history.unshift(multiplier);
    if (history.length > 20) history.pop();
    
    historyItems.innerHTML = '';
    history.forEach(mult => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        if (mult < 2) {
            item.classList.add('low');
        } else if (mult < 5) {
            item.classList.add('medium');
        } else {
            item.classList.add('high');
        }
        
        item.textContent = `x${mult.toFixed(2)}`;
        historyItems.appendChild(item);
    });
}

// Добавление активной ставки
function addActiveBet(amount) {
    betsTable.innerHTML = '';
    
    const betItem = document.createElement('div');
    betItem.className = 'bet-item';
    betItem.id = 'activeBet';
    
    betItem.innerHTML = `
        <div class="bet-info">
            <div class="bet-amount">₽${amount.toFixed(2)}</div>
            <div class="bet-multiplier" id="activeBetMultiplier">Ожидание...</div>
        </div>
        <div class="bet-result active" id="activeBetResult">В игре</div>
    `;
    
    betsTable.appendChild(betItem);
}

// Обновление активной ставки
function updateActiveBet() {
    const activeBetMultiplier = document.getElementById('activeBetMultiplier');
    const activeBetResult = document.getElementById('activeBetResult');
    
    if (activeBetMultiplier && activeBetResult && hasBet && gameState === 'running') {
        const potentialWin = currentBet * currentMultiplier;
        activeBetMultiplier.textContent = `x${currentMultiplier.toFixed(2)}`;
        activeBetResult.textContent = `₽${potentialWin.toFixed(2)}`;
    }
}

// Добавление результата ставки
function addBetResult(amount, multiplier, winAmount, isWin) {
    const activeBet = document.getElementById('activeBet');
    if (activeBet) {
        activeBet.remove();
    }
    
    const betItem = document.createElement('div');
    betItem.className = 'bet-item';
    
    betItem.innerHTML = `
        <div class="bet-info">
            <div class="bet-amount">₽${amount.toFixed(2)}</div>
            <div class="bet-multiplier">x${multiplier.toFixed(2)}</div>
        </div>
        <div class="bet-result ${isWin ? 'win' : 'lose'}">
            ${isWin ? `+₽${winAmount.toFixed(2)}` : `-₽${amount.toFixed(2)}`}
        </div>
    `;
    
    betsTable.insertBefore(betItem, betsTable.firstChild);
    
    // Удаляем старые записи
    while (betsTable.children.length > 10) {
        betsTable.removeChild(betsTable.lastChild);
    }
}

// Показать сообщение о выигрыше
function showWinMessage(amount, multiplier) {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: white;
        padding: 40px 60px;
        border-radius: 20px;
        font-size: 32px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: bounceIn 0.5s;
        text-align: center;
        border: 4px solid #ffd700;
    `;
    message.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
        <div style="margin-bottom: 10px;">ВЫИГРЫШ!</div>
        <div style="font-size: 40px; color: #ffeb3b;">₽${amount.toFixed(2)}</div>
        <div style="font-size: 24px; margin-top: 10px; opacity: 0.9;">x${multiplier.toFixed(2)}</div>
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
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
        const rtp = slotConfig.rtp || 97.0;
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

// Анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes bounceIn {
        0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.05); }
        70% { transform: translate(-50%, -50%) scale(0.9); }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Запуск
init();
