require("dotenv").config();
const { Bot, GrammyError, HttpError } = require("grammy");
const tiktok = require("tiktok-scraper-without-watermark");

// Bot

const bot = new Bot(process.env.BOT_TOKEN);

// Response

async function responseTime(ctx, next) {
  const before = Date.now();
  await next();
  const after = Date.now();
  console.log(`Response time: ${after - before} ms`);
}

bot.use(responseTime);

// Commands

bot.command("start", async (ctx) => {
  await ctx
    .reply("*Welcome!* ✨\n_Send a Tiktok link._", {
      parse_mode: "Markdown",
    })
    .then(console.log(`New user added:`, ctx.from))
    .catch((error) => console.error(error));
});

bot.command("help", async (ctx) => {
  await ctx
    .reply(
      "*@anzubo Project.*\n\n_This bot downloads videos from Tiktok.\nSend a link to try it out!_",
      { parse_mode: "Markdown" }
    )
    .then(console.log(`Help command sent to ${ctx.from.id}`))
    .catch((error) => console.error(error));
});

// Messages

bot.on("msg", async (ctx) => {
  // Logging

  const from = ctx.from;
  const name =
    from.last_name === undefined
      ? from.first_name
      : `${from.first_name} ${from.last_name}`;
  console.log(
    `From: ${name} (@${from.username}) ID: ${from.id}\nMessage: ${ctx.msg.text}`
  );

  // Logic

  if (!ctx.msg.text.includes("tiktok" && "https")) {
    await ctx.reply(`*Send a valid Tiktok link.*`, {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.msg.message_id,
    });
  } else {
    const statusMessage = await ctx.reply(`*Downloading*`, {
      parse_mode: "Markdown",
    });
    try {
      async function deleteMessageWithDelay(fromId, messageId, delayMs) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            bot.api
              .deleteMessage(fromId, messageId)
              .then(() => resolve())
              .catch((error) => reject(error));
          }, delayMs);
        });
      }
      deleteMessageWithDelay(ctx.from.id, statusMessage.message_id, 3000);

      const result = await tiktok.tiklydown(ctx.msg.text);
      await ctx.replyWithVideo(result.video.noWatermark, {
        caption: `*${result.title}*_\nBy_ [${result.author.name}](https://tiktok.com/@${result.author.unique_id}/)\n_${result.stats.likeCount} likes   ${result.stats.commentCount} comments   ${result.stats.shareCount} shares_`,
        parse_mode: "Markdown",
      });
    } catch (error) {
      if (error instanceof GrammyError) {
        console.log(`Error sending message: ${error.message}`);
        return;
      } else {
        console.log(`An error occured:\n${error}`);
        await ctx.reply(
          `*An error occurred. Are you sure you sent a valid reddit link?*\n_Error: ${error.message}_`,
          { parse_mode: "Markdown", reply_to_message_id: ctx.msg.message_id }
        );
        return;
      }
    }
  }
});

// Error

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(
    "Error while handling update",
    ctx.update.update_id,
    "\nQuery:",
    ctx.msg.text
  );
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
    if (e.description === "Forbidden: bot was blocked by the user") {
      console.log("Bot was blocked by the user");
    } else {
      ctx.reply("An error occurred");
    }
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

// Run

bot.start();
