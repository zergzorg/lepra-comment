// ==UserScript==
// @name         Leprosorium User Comment Toggle with Persistence
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Добавляет компактную кнопку для сворачивания/разворачивания комментариев пользователя с сохранением состояния на страницах постов leprosorium.ru
// @author       zergzorg with ChatGpt 4o
// @match        *://*.leprosorium.ru/comments/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
    function toggleUserComments(userId, button) {
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

        // Обновляем состояние комментариев и текст кнопки
        if (isHidden) {
            hiddenComments[userId] = true;
            button.textContent = 'развернуть';
        } else {
            delete hiddenComments[userId];
            button.textContent = 'свернуть';
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

    // Добавляем кнопку рядом с именем пользователя
    function addToggleButtons() {
        const hiddenComments = getHiddenComments();
        const userLinks = document.querySelectorAll('.c_user');

        userLinks.forEach(link => {
            const userId = link.getAttribute('data-user_id');
            const button = document.createElement('button');
            button.textContent = hiddenComments[userId] ? 'развернуть' : 'свернуть';
            button.style.marginLeft = '5px';
            button.style.cursor = 'pointer';
            button.style.padding = '2px 5px';
            button.style.fontSize = '10px';

            button.addEventListener('click', (e) => {
                e.preventDefault();
                toggleUserComments(userId, button);
            });

            link.parentNode.insertBefore(button, link.nextSibling);
        });
    }

    // Восстанавливаем состояние комментариев и добавляем кнопки
    restoreCommentStates();
    addToggleButtons();
})();