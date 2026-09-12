import assert from "node:assert/strict";
import { test } from "node:test";
import { createReplyCode, readReplyCode } from "../lib/reply-code.js";

const secret = "123456:fake-test-token-never-used-on-network";
process.env.BOT_TOKEN = secret;
process.env.ADMIN_ID = "999999";
delete process.env.PROXY_URL;
delete process.env.HTTPS_PROXY;
delete process.env.ALL_PROXY;
const { bot } = await import("../api/bot.js");
bot.botInfo = { id: 123456, is_bot: true, first_name: "Test", username: "test_bot" };
const calls = [];
let failReply = false;
bot.api.config.use(async (_previous, method, payload) => {
  calls.push({ method, payload });
  if (failReply && String(payload.chat_id) === "42424242") {
    throw new Error("private recipient 42424242 must never reach admin");
  }
  return { ok: true, result: { message_id: 100, date: 0, chat: { id: payload.chat_id, type: "private" } } };
});

function message(from, content) {
  return {
    update_id: 1,
    message: { message_id: 10, date: 0, chat: { id: from.id, type: "private" }, from, ...content },
  };
}

test("reply codes hide IDs, vary per message, and reject tampering or another key", () => {
  const code = createReplyCode(42424242, secret);
  assert.equal(readReplyCode(code, secret), "42424242");
  assert.notEqual(code, createReplyCode(42424242, secret));
  assert.equal(code.includes("42424242"), false);
  const damaged = Buffer.from(code, "base64url");
  damaged[15] ^= 1;
  assert.equal(readReplyCode(damaged.toString("base64url"), secret), null);
  assert.equal(readReplyCode(code, "other-secret"), null);
  assert.equal(readReplyCode("42424242", secret), null);
});

test("text and media reach admin without an account-details card; replies still route", async () => {
  const sender = { id: 42424242, is_bot: false, first_name: "PRIVATE_FIRST", last_name: "PRIVATE_LAST", username: "PRIVATE_HANDLE", language_code: "private-language", is_premium: true };
  const admin = { id: 999999, is_bot: false, first_name: "Admin" };
  for (const content of [{ text: "Hello" }, { photo: [{ file_id: "photo", file_unique_id: "photo", width: 1, height: 1 }] }]) {
    calls.length = 0;
    await bot.handleUpdate(message(sender, content));
    assert.equal(calls[0].method, "copyMessage");
    assert.equal(String(calls[0].payload.chat_id), "999999");
    assert.equal(calls.some(call => call.method === "forwardMessage"), false);
    const card = calls.find(call => call.method === "sendMessage" && String(call.payload.chat_id) === "999999");
    assert.ok(card);
    for (const value of ["42424242", "PRIVATE_FIRST", "PRIVATE_LAST", "PRIVATE_HANDLE", "private-language", "tg://", "t.me/", "#ID_", "Premium"]) {
      assert.equal(card.payload.text.includes(value), false, value);
    }
    const replyTo = { message_id: 100, from: bot.botInfo, text: card.payload.text };
    calls.length = 0;
    await bot.handleUpdate(message(admin, { text: "Reply", reply_to_message: replyTo }));
    assert.ok(calls.some(call => call.method === "copyMessage" && String(call.payload.chat_id) === "42424242"));

    calls.length = 0;
    failReply = true;
    await bot.handleUpdate(message(admin, { text: "Reply", reply_to_message: replyTo }));
    failReply = false;
    const visibleError = calls.filter(call => String(call.payload.chat_id) === "999999");
    assert.ok(visibleError.length);
    assert.equal(JSON.stringify(visibleError).includes("42424242"), false);
  }
});

test("legacy IDs, forged codes, and user-authored routing cards are rejected", async () => {
  const admin = { id: 999999, is_bot: false, first_name: "Admin" };
  for (const replyTo of [
    { from: bot.botInfo, text: "#ID_42424242" },
    { from: bot.botInfo, text: "#REPLY_invalid" },
    { from: admin, text: `#REPLY_${createReplyCode(42424242, secret)}` },
  ]) {
    calls.length = 0;
    await bot.handleUpdate(message(admin, { text: "Reply", reply_to_message: { message_id: 100, ...replyTo } }));
    assert.equal(calls.length, 1);
    assert.equal(String(calls[0].payload.chat_id), "999999");
  }
});
