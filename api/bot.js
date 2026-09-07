import { Bot, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID;
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

if (bot) {
  // هندلر دستور /start
  bot.command("start", async (ctx) => {
    const isOwner = adminId && ctx.from?.id.toString() === adminId.toString();

    if (isOwner) {
      await ctx.reply(
        "👋 سلام ادمین عزیز!\n\n" +
          "ربات آماده دریافت پیام‌های ناشناس است.\n" +
          "هر زمان کاربری پیامی ارسال کند، همراه با تگ شناسه (`#ID_...`) برای شما ارسال می‌شود.\n" +
          "برای پاسخ دادن، کافیست روی همان پیام Reply کنید.",
        { parse_mode: "Markdown" }
      );
    } else {
      await ctx.reply(
        "سلام! 👋 به بات پیام ناشناس خوش آمدید.\n\n" +
          "هر پیامی دارید (متن، عکس، وویس، ویدیو، استیکر و...) همینجا بفرستید تا به صورت کاملاً ناشناس به دست من برسد."
      );
    }
  });

  // هندلر دریافت کلیه پیام‌ها (متن، مدیا، استیکر و ...)
  bot.on("message", async (ctx) => {
    const senderId = ctx.from?.id;
    const isOwner = adminId && senderId.toString() === adminId.toString();

    // در صورتی که پیام از طرف ادمین باشد (پاسخ به پیام ناشناس)
    if (isOwner) {
      const replyTo = ctx.message.reply_to_message;

      if (!replyTo) {
        await ctx.reply(
          "ℹ️ شما ادمین هستید.\n" +
            "برای پاسخ دادن به کاربر ناشناس، لطفاً روی پیامی که حاوی تگ شناسه (#ID_...) است Reply کنید."
        );
        return;
      }

      // جستجوی شناسه کاربر هدف از متن یا کپشن پیام ریپلای‌شده
      const replyText = replyTo.text || replyTo.caption || "";
      const match = replyText.match(/#ID_(\d+)/);

      if (!match) {
        await ctx.reply(
          "⚠️ شناسه کاربری در این پیام پیدا نشد.\n" +
            "لطفاً حتماً روی پیامی که دارای کد پیگیری به فرمت `#ID_...` است ریپلای کنید."
        );
        return;
      }

      const targetUserId = match[1];

      try {
        await ctx.api.sendMessage(
          targetUserId,
          "💌 یک پاسخ ناشناس برای پیام شما دریافت شد:"
        );

        await ctx.copyMessage(targetUserId);

        await ctx.reply("✅ پاسخ شما با موفقیت برای کاربر ارسال شد.", {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      } catch (error) {
        console.error("Error delivering reply:", error);
        await ctx.reply(
          `❌ ارسال پیام ناموفق بود. ممکن است کاربر ربات را بلاک کرده باشد.\nعلت خطا: ${error.message}`
        );
      }
      return;
    }

    // در صورتی که پیام از طرف کاربر ناشناس باشد
    if (!adminId) {
      console.error("ADMIN_ID environment variable is not configured!");
      await ctx.reply("⚠️ خطای سرور: هنوز شناسه ادمین در ربات تنظیم نشده است.");
      return;
    }

    try {
      const copiedMessage = await ctx.copyMessage(adminId);

      await ctx.api.sendMessage(
        adminId,
        `📩 **پیام ناشناس جدید دریافت شد!**\n\n` +
          `👤 شناسه پیگیری: \`#ID_${senderId}\`\n\n` +
          `👇 برای ارسال پاسخ به این کاربر، **مستقیماً روی همین پیام Reply کنید:**`,
        {
          parse_mode: "Markdown",
          reply_parameters: { message_id: copiedMessage.message_id },
        }
      );

      await ctx.reply("✅ پیام شما به صورت ناشناس ارسال شد!");
    } catch (error) {
      console.error("Error forwarding anonymous message:", error);
      await ctx.reply("❌ متاسفانه در ارسال پیام خطایی رخ داد. لطفاً مجدداً تلاش کنید.");
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
