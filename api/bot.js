import { Bot, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN?.trim().replace(/['"]/g, "");
const adminId = process.env.ADMIN_ID?.trim().replace(/['"]/g, "");
const proxyUrl = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.ALL_PROXY;

let clientOptions = {};
if (proxyUrl) {
  try {
    if (proxyUrl.startsWith("socks")) {
      const { SocksProxyAgent } = await import("socks-proxy-agent");
      clientOptions = {
        baseFetchConfig: { agent: new SocksProxyAgent(proxyUrl), compress: true },
      };
    } else {
      const { HttpsProxyAgent } = await import("https-proxy-agent");
      clientOptions = {
        baseFetchConfig: { agent: new HttpsProxyAgent(proxyUrl), compress: true },
      };
    }
  } catch (err) {
    console.warn("⚠️ Could not load proxy agent:", err.message);
  }
}

// ساخت نمونه بات (تنها در صورت وجود توکن تا در صورت نبودن متغیر محیطی، ورسل کرش نکند)
export const bot = token ? new Bot(token, { client: clientOptions }) : null;

// توابع کمکی برای فرار کاراکترهای HTML
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// تابع تشخیص نوع پیام
function getMessageType(msg) {
  if (msg.text) return "📝 متن";
  if (msg.voice) return "🎤 پیام صوتی (Voice)";
  if (msg.photo) return "📷 عکس";
  if (msg.video) return "🎥 ویدیو";
  if (msg.video_note) return "🔘 ویدیو مسیج (دایره‌ای)";
  if (msg.sticker) return "🎭 استیکر";
  if (msg.animation) return "🎞 گیف (GIF)";
  if (msg.audio) return "🎵 موزیک / صوت";
  if (msg.document) return "📁 فایل / سند";
  if (msg.contact) return "📞 شماره تماس";
  if (msg.location) return "📍 موقعیت مکانی";
  return "📦 پیام ناشناس";
}

// دریافت زمان دقیق به وقت ایران (تهران)
function getTehranTime() {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString();
  }
}

if (bot) {
  // هندلر دستور /start
  bot.command("start", async (ctx) => {
    const isOwner = adminId && ctx.from?.id.toString() === adminId.toString();

    if (isOwner) {
      await ctx.reply(
        "👋 <b>سلام ادمین عزیز!</b>\n\n" +
          "ربات آماده دریافت پیام‌های ناشناس است.\n" +
          "هنگامی که کاربری پیام دهد، اطلاعات کامل او (نام، یوزرنیم، پرمیوم، ساعت و...) <b>فقط برای شما</b> نمایش داده می‌شود.\n" +
          "برای پاسخ دادن، کافیست روی همان پیام Reply کنید (هویت شما برای کاربر کاملاً مخفی می‌ماند).",
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(
        "سلام! 👋 به بات پیام ناشناس خوش آمدید.\n\n" +
          "هر پیامی دارید (متن، عکس، وویس، ویدیو، استیکر و...) همینجا بفرستید تا به دست من برسد."
      );
    }
  });

  // هندلر دریافت کلیه پیام‌ها (متن، مدیا، استیکر و ...)
  bot.on("message", async (ctx) => {
    const senderId = ctx.from?.id;
    const isOwner = adminId && senderId.toString() === adminId.toString();

    // در صورتی که پیام از طرف ادمین باشد (پاسخ ناشناس به کاربر)
    if (isOwner) {
      const replyTo = ctx.message.reply_to_message;

      if (!replyTo) {
        await ctx.reply(
          "ℹ️ شما ادمین هستید.\n" +
            "برای ارسال پاسخ ناشناس به کاربر، لطفاً روی پیامی که حاوی تگ شناسه (<code>#ID_...</code>) است Reply کنید.",
          { parse_mode: "HTML" }
        );
        return;
      }

      // جستجوی شناسه کاربر هدف از متن یا کپشن پیام ریپلای‌شده
      const replyText = replyTo.text || replyTo.caption || "";
      const match = replyText.match(/#ID_(\d+)/);

      if (!match) {
        await ctx.reply(
          "⚠️ شناسه کاربری در این پیام پیدا نشد.\n" +
            "لطفاً حتماً روی پیامی که دارای کد پیگیری به فرمت <code>#ID_...</code> است ریپلای کنید.",
          { parse_mode: "HTML" }
        );
        return;
      }

      const targetUserId = match[1];

      try {
        // ارسال پیام بدون فاش کردن هویت ادمین
        await ctx.api.sendMessage(
          targetUserId,
          "💌 <b>یک پاسخ جدید برای پیام ناشناس شما دریافت شد:</b>",
          { parse_mode: "HTML" }
        );

        // کپی کردن محتوای پاسخ ادمین (متن، وویس، عکس و...) برای کاربر بدون هدر فوروارد
        await ctx.copyMessage(targetUserId);

        await ctx.reply("✅ پاسخ شما با موفقیت و به صورت کاملاً ناشناس برای کاربر ارسال شد.", {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      } catch (error) {
        console.error("Error delivering reply:", error);
        const errorDesc = error?.description || error?.message || "خطای نامشخص";
        await ctx.reply(
          `❌ ارسال پیام ناموفق بود.\nعلت: <code>${errorDesc}</code>`,
          { parse_mode: "HTML" }
        );
      }
      return;
    }

    // در صورتی که پیام از طرف کاربر ناشناس باشد
    if (!adminId) {
      console.error("ADMIN_ID environment variable is not configured!");
      await ctx.reply("⚠️ خطای سرور: هنوز شناسه ادمین (ADMIN_ID) در ربات تنظیم نشده است.");
      return;
    }

    try {
      // 1. کپی پیام فرستنده برای ادمین
      const copiedMessage = await ctx.copyMessage(adminId);

      // استخراج اطلاعات دقیق فرستنده
      const firstName = escapeHtml(ctx.from?.first_name || "");
      const lastName = escapeHtml(ctx.from?.last_name || "");
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || "بدون نام";
      const username = ctx.from?.username;
      const usernameText = username
        ? `@${escapeHtml(username)} (<a href="https://t.me/${username}">پروفایل</a>)`
        : "ندارد";
      const userMention = `<a href="tg://user?id=${senderId}">${fullName}</a>`;
      const isPremium = ctx.from?.is_premium ? "⭐️ دارد (Telegram Premium)" : "خیر";
      const langCode = ctx.from?.language_code ? `<code>${escapeHtml(ctx.from.language_code)}</code>` : "نامشخص";
      const timeStr = getTehranTime();
      const msgType = getMessageType(ctx.message);

      // 2. ارسال کارت جزئیات کامل فرستنده (فقط برای ادمین)
      await ctx.api.sendMessage(
        adminId,
        `📩 <b>پیام ناشناس جدید دریافت شد!</b>\n\n` +
          `👤 <b>اطلاعات فرستنده (فقط برای شما):</b>\n` +
          `• <b>نام:</b> ${userMention}\n` +
          `• <b>یوزرنیم:</b> ${usernameText}\n` +
          `• <b>شناسه عددی (User ID):</b> <code>${senderId}</code>\n` +
          `• <b>پرمیوم تلگرام:</b> ${isPremium}\n` +
          `• <b>زبان تلگرام:</b> ${langCode}\n` +
          `• <b>نوع پیام:</b> ${msgType}\n` +
          `• <b>زمان ارسال:</b> <code>${timeStr}</code>\n` +
          `• <b>کد پیگیری:</b> <code>#ID_${senderId}</code>\n\n` +
          `👇 <b>برای ارسال پاسخ به این شخص، مستقیماً روی همین پیام Reply کنید:</b>`,
        {
          parse_mode: "HTML",
          reply_parameters: { message_id: copiedMessage.message_id },
        }
      );

      // تاییدیه به فرستنده (کاربر فقط این را می‌بیند)
      await ctx.reply("✅ پیام شما با موفقیت ارسال شد!");
    } catch (error) {
      console.error("Error forwarding anonymous message:", error);
      const errorDesc = error?.description || error?.message || "خطای ناشناخته";
      await ctx.reply(
        `❌ متاسفانه در ارسال پیام خطایی رخ داد:\n<code>${errorDesc}</code>\n\n` +
          `💡 <i>نکته: اگر خطا مربوط به chat not found است، مطمئن شوید ادمین یک‌بار ربات را /start کرده است.</i>`,
        { parse_mode: "HTML" }
      );
    }
  });

  // مدیریت خطاهای عمومی
  bot.catch((err) => {
    console.error("Bot encountered an unhandled error:", err);
  });
}

// هندلر سازگار با Vercel Serverless Function
let handleUpdate;

export default async function handler(req, res) {
  // ۱. بررسی وجود توکن
  if (!token) {
    return res.status(500).json({
      ok: false,
      error: "BOT_TOKEN environment variable is not defined in Vercel!",
      hint: "Go to Vercel Dashboard -> Settings -> Environment Variables, add BOT_TOKEN and ADMIN_ID, then click Deployments -> Redeploy."
    });
  }

  // ۲. پاسخ ساده GET جهت بررسی وضعیت وب‌سایت در مرورگر
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      status: "Telegram Anonymous Bot webhook endpoint is up and running! 🚀",
      hasAdminConfigured: Boolean(adminId)
    });
  }

  // ۳. ایجاد و اجرای وبهوک
  if (!handleUpdate && bot) {
    handleUpdate = webhookCallback(bot, "http");
  }

  return handleUpdate(req, res);
}
