// Система управления пользователями
class UserManager {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = this.loadCurrentUser();
    }

    loadUsers() {
        const users = localStorage.getItem('lucybliss_users');
        return users ? JSON.parse(users) : [];
    }

    saveUsers() {
        localStorage.setItem('lucybliss_users', JSON.stringify(this.users));
    }

    loadCurrentUser() {
        const user = localStorage.getItem('lucybliss_current_user');
        return user ? JSON.parse(user) : null;
    }

    saveCurrentUser(user) {
        localStorage.setItem('lucybliss_current_user', JSON.stringify(user));
        this.currentUser = user;
    }

    generateUserId() {
        if (this.users.length === 0) {
            return 1;
        }
        const maxId = Math.max(...this.users.map(u => u.id));
        return maxId + 1;
    }

    register(username, password) {
        // Проверка существования пользователя
        if (this.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, message: 'Пользователь с таким именем уже существует' };
        }

        // Создание нового пользователя
        const newUser = {
            id: this.generateUserId(),
            username: username,
            password: password, // В реальном проекте нужно хешировать!
            balance: 1000, // Стартовый баланс
            withdrawalBlocked: false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();

        return { success: true, user: newUser, message: 'Аккаунт успешно создан!' };
    }

    login(username, password) {
        const user = this.users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.password === password
        );

        if (!user) {
            return { success: false, message: 'Неверное имя пользователя или пароль' };
        }

        // Обновляем время последнего входа
        user.lastLogin = new Date().toISOString();
        this.saveUsers();
        this.saveCurrentUser(user);

        return { success: true, user: user, message: 'Вход выполнен успешно!' };
    }

    logout() {
        localStorage.removeItem('lucybliss_current_user');
        this.currentUser = null;
    }

    updateUser(userId, updates) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            this.users[userIndex] = { ...this.users[userIndex], ...updates };
            this.saveUsers();
            
            // Если обновляется текущий пользователь
            if (this.currentUser && this.currentUser.id === userId) {
                this.saveCurrentUser(this.users[userIndex]);
            }
            
            return true;
        }
        return false;
    }

    getUser(userId) {
        return this.users.find(u => u.id === userId);
    }

    getAllUsers() {
        return this.users;
    }
}

const userManager = new UserManager();
window.userManager = userManager; // Глобальный доступ

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Проверка, что мы на странице auth.html
    if (!window.location.href.includes('auth.html')) {
        return; // Не инициализируем формы, если не на странице авторизации
    }
    
    // Проверка авторизации
    if (userManager.currentUser) {
        window.location.href = 'index.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterBtn = document.getElementById('showRegister');
    const showLoginBtn = document.getElementById('showLogin');
    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');

    // Переключение форм
    showRegisterBtn.addEventListener('click', () => {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    });

    showLoginBtn.addEventListener('click', () => {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
    });

    // Вход
    btnLogin.addEventListener('click', () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            showNotification('Заполните все поля', 'error');
            return;
        }

        const result = userManager.login(username, password);
        
        if (result.success) {
            showNotification(result.message, 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showNotification(result.message, 'error');
        }
    });

    // Регистрация
    btnRegister.addEventListener('click', () => {
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;

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

        const result = userManager.register(username, password);
        
        if (result.success) {
            showNotification(result.message, 'success');
            userManager.saveCurrentUser(result.user);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showNotification(result.message, 'error');
        }
    });

    // Enter для отправки форм
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnLogin.click();
    });

    document.getElementById('regPasswordConfirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnRegister.click();
    });
});

// Уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
