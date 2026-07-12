# Telegram Mini App

Минимальное статическое приложение для Telegram Mini Apps.

## Деплой на Vercel через GitHub

1. Создай новый репозиторий на GitHub.
2. Подключи его как remote:

```bash
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

3. В Vercel выбери `Add New...` -> `Project` -> импортируй GitHub-репозиторий.
4. В настройках проекта укажи:

```text
Root Directory: mini-app
Framework Preset: Other
Build Command: оставить пустым
Output Directory: оставить пустым
```

5. После деплоя скопируй HTTPS-адрес Vercel и укажи его в BotFather через `/newapp`.

## Локальная проверка

Можно открыть `mini-app/index.html` в браузере. Telegram API полностью сработает только внутри Telegram.

## Подключение кнопки бота

Создай локальный файл `.env` по примеру `.env.example`:

```text
BOT_TOKEN=1234567890:your_bot_token
WEB_APP_URL=https://your-vercel-app.vercel.app
MENU_TEXT=Open Mini App
```

Файл `.env` уже добавлен в `.gitignore`, его не нужно коммитить.

После этого запусти:

```bash
node scripts/set-menu-button.mjs
```

Скрипт проверит бота через `getMe` и установит кнопку меню через `setChatMenuButton`.
