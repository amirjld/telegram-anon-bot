# ربات پیام ناشناس تلگرام (Serverless بر روی Vercel)

یک ربات تلگرام پیام ناشناس تک‌کاربره، بسیار سبک، بدون نیاز به هیچ دیتابیس خارجی، پیاده‌سازی شده با فریم‌ورک مدرن **grammY** و آماده برای استقرار رایگان روی **Vercel Serverless Functions**.

---

## 📋 ویژگی‌ها
- **کاملاً رایگان و Serverless:** بدون نیاز به روشن نگه داشتن سرور شخصی یا پرداخت هزینه سرور (اجرا از طریق Webhook).
- **بدون نیاز به دیتابیس:** سیستم با استفاده از قابلیت Reply و Message ID تلگرام کار می‌کند و هیچ دیتابیسی نیاز ندارد.
- **پشتیبانی از تمام فرمت‌های پیام:** متن، عکس، وویس، ویدیو، استیکر، گیف و فایل.
- **حفظ حریم خصوصی فرستنده:** اطلاعات حساب فرستنده به ادمین نمایش داده نمی‌شود؛ پاسخ‌دهی با کد تصادفی و رمزگذاری‌شده انجام می‌شود. محتوایی که کاربر خودش ارسال می‌کند (مانند نام در متن، شماره تماس یا موقعیت مکانی) بدون حذف محتوا کپی می‌شود.
- **امکان تست محلی:** دارای اسکریپت Long-polling برای تست ربات روی سیستم خودتان پیش از استقرار.

---

## 🚀 مراحل راه‌اندازی

### مرحله ۱: دریافت پیش‌نیازها از تلگرام
1. **ساخت ربات و دریافت توکن:**
   - در تلگرام وارد ربات [@BotFather](https://t.me/BotFather) شوید.
   - دستور `/newbot` را بفرستید، یک نام و یک یوزرنیم برای ربات خود انتخاب کنید.
   - توکنی که دریافت می‌کنید را در جایی امن کپی کنید (`BOT_TOKEN`).

2. **دریافت شناسه عددی اکانت خودتان (`ADMIN_ID`):**
   - وارد ربات [@userinfobot](https://t.me/userinfobot) شوید یا دستور `/start` را بزنید.
   - عدد `Id` که ربات به شما می‌دهد، همان `ADMIN_ID` شماست.

---

### مرحله ۲: تست محلی روی سیستم (اختیاری)
1. در پوشه پروژه، پکیج‌ها را نصب کنید:
   ```bash
   npm install
   ```
2. یک فایل به نام `.env` در کنار فایل‌ها بسازید و مقادیر را وارد کنید:
   ```env
   BOT_TOKEN=توکن_ربات_شما
   ADMIN_ID=شناسه_عددی_اکانت_شما
   ```
3. ربات را اجرا کنید:
   ```bash
   npm start
   ```
4. وارد ربات در تلگرام شوید، دستور `/start` را بزنید و پیام بفرستید تا تست کنید!

---

### مرحله ۳: استقرار روی Vercel (سرورلس)
1. یک مخزن (Repository) جدید در گیت‌هاب ایجاد کرده و فایل‌های این پروژه را درون آن Push کنید.
2. وارد پنل [Vercel.com](https://vercel.com) شوید و روی **Add New > Project** کلیک کنید.
3. مخزن گیت‌هاب خود را انتخاب و Import کنید.
4. در بخش **Environment Variables**، دو متغیر زیر را اضافه کنید:
   - نام: `BOT_TOKEN` | مقدار: `توکن ربات تلگرام`
   - نام: `ADMIN_ID` | مقدار: `شناسه عددی اکانت شما`
5. دکمه **Deploy** را بزنید.
6. پس از اتمام دیپلوی، ورسل به شما یک آدرس دامنه اختصاصی می‌دهد (مثلاً: `https://my-anon-bot.vercel.app`).

---

### مرحله ۴: فعال‌سازی وب‌هوک (Webhook) تلگرام
برای اینکه تلگرام پیام‌ها را به آدرس سرورلس ورسل شما بفرستد، کافیست لینک زیر را در مرورگر خود باز کنید (مقادیر `<BOT_TOKEN>` و `<VERCEL_URL>` را جایگزین کنید):

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<VERCEL_URL>/api/bot
```

**مثال واقعی:**
```text
https://api.telegram.org/bot123456789:ABCdefGhIJKlmNo/setWebhook?url=https://my-anon-bot.vercel.app/api/bot
```

اگر در خروجی مرورگر پیام زیر را مشاهده کردید، ربات با موفقیت فعال شده است:
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

---

## 🎯 نحوه کار با ربات
1. **لینک ربات خود را به اشتراک بگذارید:**
   لینک ربات خود (مثلاً `t.me/YourBotName`) را در بیو تلگرام، کانال، یا استوری قرار دهید.
2. **دریافت پیام ناشناس:**
   پیام کاربر بدون هدر فوروارد کپی می‌شود و یک پیام جداگانه با کد رمزگذاری‌شده به فرمت `#REPLY_...` برای پاسخ‌دهی دریافت می‌کنید.
3. **پاسخ دادن:**
   روی پیام ربات حاوی کد `#REPLY_...` ریپلای (Reply) کنید. ربات کد را بررسی و رمزگشایی کرده و پاسخ را به همان کاربر ارسال می‌کند. کدهای قدیمی `#ID_...` دیگر پذیرفته نمی‌شوند.

## Privacy branch / no deployment

Automatic Vercel Git deployments are disabled for `privacy/hide-sender-details`
in `vercel.json`. This branch is for review; do not merge to the production branch
until deployment is intended.

Reply codes use randomized AES-256-GCM encryption with a key derived from
`BOT_TOKEN`; no new database or environment variable is needed. Rotating the bot
token invalidates existing reply codes. This hides account metadata from messages
shown to admins, not from the bot operator with access to the token and runtime.
Previously delivered identity cards are not deleted by this change.

Run `npm test` for offline privacy and reply-routing checks. Tests use a fake bot
token and intercept all Telegram API calls; they do not send real messages.
