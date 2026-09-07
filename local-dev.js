import "dotenv/config";
import { bot } from "./api/bot.js";

console.log("🤖 Starting bot in local long-polling mode...");

// هنگام استفاده از پولینگ محلی، وب‌هوک احتمالی قبلی حذف می‌شود
await bot.api.deleteWebhook({ drop_pending_updates: true });

bot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot @${botInfo.username} started successfully!`);
    console.log("Press Ctrl+C to stop.");
  },
});
