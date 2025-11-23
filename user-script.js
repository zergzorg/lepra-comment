// ==UserScript==
// @name         Leprosorium Comment Toggle
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Сворачивание комментариев (скрывает только текст, оставляя кнопку)
// @author       zergzorg
// @match        *://*.leprosorium.ru/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[LEPRA SCRIPT] v1.4 Запущен');

    const CONFIG = {
        color: '#007bff',      // Цвет кнопки
        textHide: '[–]',       // Текст свернуть
        textShow: '[+]',       // Текст развернуть
        storageKey: 'lepro_hidden_v4'
    };

    // --- 1. СТИЛИ (Исправлено) ---
    const style = document.createElement('style');
    style.innerHTML = `
        .lepra-toggle-btn {
            cursor: pointer;
            color: ${CONFIG.color};
            font-size: 11px;
            margin-left: 8px;
            font-weight: bold;
            user-select: none;
        }
        .lepra-toggle-btn:hover { text-decoration: underline; }

        /* ГЛАВНОЕ ИСПРАВЛЕНИЕ: Скрываем только ТЕЛО комментария */
        .comment.is-force-hidden .c_body {
            display: none !important;
        }
        
        /* Сам блок делаем полупрозрачным, но кнопку и имя оставляем */
        .comment.is-force-hidden {
            opacity: 0.6;
        }
    `;
    document.head.appendChild(style);

    // --- 2. ХРАНИЛИЩЕ ---
    function getHiddenData() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || {};
        } catch (e) { return {}; }
    }
    
    function setHiddenData(data) {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
    }

    // --- 3. ПЕРЕКЛЮЧЕНИЕ ---
    function toggleUser(userId) {
        const data = getHiddenData();
        const isHidden = !data[userId]; // Инвертируем

        if (isHidden) data[userId] = true;
        else delete data[userId];

        setHiddenData(data);
        applyStyles(); // Обновляем вид
    }

    // --- 4. ПОИСК И ДОБАВЛЕНИЕ КНОПОК ---
    function checkAndAddButtons() {
        const hiddenData = getHiddenData();
        
        // Ищем ссылки на юзеров, у которых еще нет нашей кнопки
        const userLinks = document.querySelectorAll('.comment .c_user:not(.has-lepra-toggle)');

        userLinks.forEach(link => {
            const userId = link.getAttribute('data-user_id');
            if (!userId) return;

            // Помечаем, что обработали
            link.classList.add('has-lepra-toggle');

            // Создаем кнопку
            const btn = document.createElement('span');
            btn.className = 'lepra-toggle-btn';
            btn.textContent = hiddenData[userId] ? CONFIG.textShow : CONFIG.textHide;
            
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleUser(userId);
            };

            // Вставляем кнопку ПОСЛЕ имени
            link.parentNode.insertBefore(btn, link.nextSibling);
        });

        // Всегда обновляем состояния (на случай новых элементов)
        if (userLinks.length > 0) {
            applyStyles();
        }
    }

    // --- 5. ПРИМЕНЕНИЕ ВИДА ---
    function applyStyles() {
        const hiddenData = getHiddenData();
        
        document.querySelectorAll('.comment').forEach(comment => {
            const userId = comment.getAttribute('data-user_id');
            if (!userId) return;
            
            const shouldHide = !!hiddenData[userId];
            const btn = comment.querySelector('.lepra-toggle-btn');

            if (shouldHide) {
                // Добавляем класс скрытия
                comment.classList.add('is-force-hidden');
                // Меняем текст кнопки на [+]
                if (btn) btn.textContent = CONFIG.textShow;
            } else {
                // Убираем класс скрытия
                comment.classList.remove('is-force-hidden');
                // Меняем текст кнопки на [–]
                if (btn) btn.textContent = CONFIG.textHide;
            }
        });
    }

    // --- ЗАПУСК ---
    // Проверяем периодически (таймер), чтобы поймать отрисовку браузера
    setInterval(checkAndAddButtons, 2000); // Каждые 2 секунды
    
    // И быстрый старт
    setTimeout(checkAndAddButtons, 500);
    setTimeout(checkAndAddButtons, 1000);
})();
