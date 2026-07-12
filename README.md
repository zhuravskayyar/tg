# Telegram Mini App

Мінімальний Telegram Mini App з адмін-панеллю для перегляду імені користувача та часу останнього заходу.

## Деплой на Vercel

У Vercel імпортуй GitHub-репозиторій і вкажи:

```text
Root Directory: mini-app
Framework Preset: Other
Build Command: залишити пустим
Output Directory: залишити пустим
```

Після деплою вкажи HTTPS-адресу Vercel у BotFather через `/newapp`.

## Змінні середовища

Для роботи відстеження потрібні змінні у Vercel Project Settings -> Environment Variables:

```text
BOT_TOKEN=1234567890:your_bot_token
ADMIN_PASSWORD=your_admin_password
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

Також підтримуються назви Vercel KV:

```text
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

`BOT_TOKEN` потрібен, щоб API перевіряв справжність Telegram `initData`. `ADMIN_PASSWORD` потрібен для входу в адмін-панель. Redis потрібен для збереження останнього заходу користувача.

## Адмін-панель

Після деплою адмінка буде доступна за адресою:

```text
https://your-vercel-app.vercel.app/admin.html
```

Вона показує тільки:

- імʼя користувача
- час останнього заходу

Також з адмінки можна відправити повідомлення всім користувачам, які вже заходили в Mini App. Для цього використовується `BOT_TOKEN` і Telegram Bot API `sendMessage`.

## Кнопка Mini App у боті

Створи локальний файл `.env` по прикладу `.env.example`:

```text
BOT_TOKEN=1234567890:your_bot_token
WEB_APP_URL=https://your-vercel-app.vercel.app
MENU_TEXT=Open Mini App
```

Файл `.env` уже доданий у `.gitignore`, його не потрібно комітити.

Після цього запусти:

```bash
node scripts/set-menu-button.mjs
```

Скрипт перевірить бота через `getMe` і встановить кнопку меню через `setChatMenuButton`.
