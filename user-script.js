// ==UserScript==
// @name         Leprosorium User Comment Toggle with Persistence
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Добавляет компактную надпись для сворачивания/разворачивания комментариев пользователя с сохранением состояния на страницах постов leprosorium.ru
// @author       zergzorg
// @match        *://*.leprosorium.ru/comments/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Настраиваемый цвет текста для ссылки "свернуть/развернуть"
    const toggleTextColor = '#007bff'; // Измените цвет по вашему желанию

    // Проверяем, что скрипт запущен только на страницах постов (URL должен содержать "comments/")
    if (!window.location.href.includes('/comments/')) {
        return;
    }

    // Функция для получения состояния свёрнутых комментариев из localStorage
    function getHiddenComments() {
        const hiddenComments = localStorage.getItem('hiddenComments');
        return hiddenComments ? JSON.parse(hiddenComments) : {};
    }

    // Функция для сохранения состояния свёрнутых комментариев в localStorage
    function saveHiddenComments(hiddenComments) {
        localStorage.setItem('hiddenComments', JSON.stringify(hiddenComments));
    }

    // Функция для сворачивания/разворачивания комментариев пользователя
    function toggleUserComments(userId, toggleLink) {
        const hiddenComments = getHiddenComments();
        const comments = document.querySelectorAll(`.comment[data-user_id="${userId}"]`);
        let isHidden = false;

        comments.forEach(comment => {
            const content = comment.querySelector('.c_body');
            if (content) {
                content.style.display = content.style.display === 'none' ? '' : 'none';
                isHidden = content.style.display === 'none';
            }
        });

        // Обновляем состояние комментариев и текст ссылки
        if (isHidden) {
            hiddenComments[userId] = true;
            toggleLink.textContent = 'развернуть';
        } else {
            delete hiddenComments[userId];
            toggleLink.textContent = 'свернуть';
        }

        // Сохраняем изменения в localStorage
        saveHiddenComments(hiddenComments);
    }

    // Восстанавливаем состояние комментариев при загрузке страницы
    function restoreCommentStates() {
        const hiddenComments = getHiddenComments();

        Object.keys(hiddenComments).forEach(userId => {
            const comments = document.querySelectorAll(`.comment[data-user_id="${userId}"]`);
            comments.forEach(comment => {
                const content = comment.querySelector('.c_body');
                if (content) {
                    content.style.display = 'none';
                }
            });
        });
    }

    // Добавляем ссылку для сворачивания/разворачивания рядом с именем пользователя
    function addToggleLinks() {
        const hiddenComments = getHiddenComments();
        const userLinks = document.querySelectorAll('.c_user');

        userLinks.forEach(link => {
            const userId = link.getAttribute('data-user_id');
            const toggleLink = document.createElement('span');
            toggleLink.textContent = hiddenComments[userId] ? 'развернуть' : 'свернуть';
            toggleLink.style.marginLeft = '5px';
            toggleLink.style.cursor = 'pointer';
            toggleLink.style.color = toggleTextColor;
            toggleLink.style.fontSize = '10px';

            toggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                toggleUserComments(userId, toggleLink);
            });

            link.parentNode.insertBefore(toggleLink, link.nextSibling);
        });
    }

    // Восстанавливаем состояние комментариев и добавляем ссылки
    restoreCommentStates();
    addToggleLinks();
})();
