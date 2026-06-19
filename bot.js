require("dotenv").config();

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

const execFileAsync = promisify(execFile);
const ROOT = __dirname;
const STATE_FILE = path.join(ROOT, "blackbat_state.json");
const DIV = "━━━━━━━━━━━━━━━━━━━━━━";
const TRIGGER = "backgift";
const COMMAND_TIMEOUT_MS = Number(process.env.BLACKBAT_COMMAND_TIMEOUT_MS || 10000);
const COMPUTER_PASSWORD = String(process.env.BLACKBAT_COMPUTER_PASSWORD || "");
const ADMIN_PIN = String(process.env.BLACKBAT_ADMIN_PIN || "2000");
const configuredAdmins = String(process.env.BLACKBAT_ADMIN_NUMBERS || process.env.BLACKBAT_ADMIN_NUMBER || "")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean)
  .map(toChatId);

const sessions = new Map();

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function toChatId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.endsWith("@c.us") || raw.endsWith("@g.us")) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits ? `${digits}@c.us` : raw;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function menu() {
  return (
    `${DIV}\n*BLACKBAT*\n${DIV}\n\n` +
    `*1.* Lock your PC\n` +
    `*2.* Unlock / wake your PC\n\n` +
    `_Reply with 1 or 2._`
  );
}

function passwordPrompt() {
  return (
    `${DIV}\n*BLACKBAT*\n${DIV}\n\n` +
    `Type your computer password to confirm unlock/wake.`
  );
}

function adminPrompt() {
  return (
    `${DIV}\n*BLACKBAT*\n${DIV}\n\n` +
    `You should be admin to perform this.\n\n` +
    `Enter the admin PIN to continue.`
  );
}

function isAdmin(chatId) {
  if (configuredAdmins.length) return configuredAdmins.includes(chatId);
  const state = readJson(STATE_FILE, {});
  const admins = new Set((state.adminChatIds || []).filter(Boolean));
  return admins.has(chatId);
}

function bindAdmin(chatId) {
  if (configuredAdmins.length) return;
  const state = readJson(STATE_FILE, {});
  const admins = new Set((state.adminChatIds || []).filter(Boolean));
  admins.add(chatId);
  state.adminChatIds = [...admins];
  if (!state.boundAt) state.boundAt = new Date().toISOString();
  state.updatedAt = new Date().toISOString();
  writeJson(STATE_FILE, state);
  console.log(`Blackbat admin allowed: ${chatId}`);
}

async function run(file, args, options = {}) {
  return execFileAsync(file, args, {
    timeout: options.timeout || COMMAND_TIMEOUT_MS,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
}

async function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "which";
  try {
    await run(checker, [command], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

async function tryCommands(commands) {
  const errors = [];
  for (const command of commands) {
    if (command.check && !(await command.check())) continue;
    try {
      await run(command.file, command.args);
      return command.label;
    } catch (err) {
      errors.push(`${command.label}: ${err.message}`);
    }
  }
  throw new Error(errors.join("\n") || "No supported command is available on this system.");
}

async function lockPc() {
  if (process.platform === "win32") {
    return tryCommands([
      {
        label: "Windows LockWorkStation",
        file: "rundll32.exe",
        args: ["user32.dll,LockWorkStation"],
      },
    ]);
  }

  if (process.platform === "linux") {
    const sessionId = process.env.XDG_SESSION_ID || "";
    return tryCommands([
      {
        label: "loginctl lock-session",
        file: "loginctl",
        args: sessionId ? ["lock-session", sessionId] : ["lock-sessions"],
        check: () => commandExists("loginctl"),
      },
      {
        label: "xdg-screensaver lock",
        file: "xdg-screensaver",
        args: ["lock"],
        check: () => commandExists("xdg-screensaver"),
      },
      {
        label: "gnome-screensaver-command -l",
        file: "gnome-screensaver-command",
        args: ["-l"],
        check: () => commandExists("gnome-screensaver-command"),
      },
    ]);
  }

  throw new Error(`Lock is not configured for ${process.platform}.`);
}

async function unlockOrWakePc() {
  if (process.platform === "win32") {
    await tryCommands([
      {
        label: "Windows wake screen",
        file: "powershell.exe",
        args: [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{ESC}')",
        ],
      },
    ]);
    return "Windows wake screen. Windows still requires the normal sign-in password/PIN to fully unlock.";
  }

  if (process.platform === "linux") {
    const sessionId = process.env.XDG_SESSION_ID || "";
    return tryCommands([
      {
        label: "loginctl unlock-session",
        file: "loginctl",
        args: sessionId ? ["unlock-session", sessionId] : ["unlock-sessions"],
        check: () => commandExists("loginctl"),
      },
      {
        label: "xdg-screensaver reset",
        file: "xdg-screensaver",
        args: ["reset"],
        check: () => commandExists("xdg-screensaver"),
      },
    ]);
  }

  throw new Error(`Unlock/wake is not configured for ${process.platform}.`);
}

function chromeArgs() {
  const args = ["--no-sandbox", "--disable-setuid-sandbox"];
  if (os.platform() === "linux") args.push("--disable-dev-shm-usage");
  return args;
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(ROOT, "auth_info"), clientId: "blackbat" }),
  puppeteer: {
    headless: true,
    args: chromeArgs(),
  },
});

client.on("qr", qr => {
  console.log("\nScan this QR code with WhatsApp to start Blackbat:\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Blackbat is ready. Send 'backgift' from the admin WhatsApp chat.");
});

client.on("authenticated", () => {
  console.log("Blackbat authenticated.");
});

client.on("auth_failure", message => {
  console.error(`Blackbat authentication failed: ${message}`);
});

client.on("message", async msg => {
  if (msg.fromMe) return;
  const chatId = msg.from;
  const text = normalizeText(msg.body);
  const admin = isAdmin(chatId);

  if (!admin) {
    const session = sessions.get(chatId);

    if (session?.step === "admin_pin") {
      sessions.delete(chatId);
      if (String(msg.body || "").trim() !== ADMIN_PIN) {
        await msg.reply(`${DIV}\n*BLACKBAT*\n${DIV}\n\nAdmin PIN incorrect.`);
        return;
      }

      bindAdmin(chatId);
      sessions.set(chatId, { step: "menu" });
      await msg.reply(`${DIV}\n*BLACKBAT*\n${DIV}\n\nAdmin access allowed.\n\n${menu()}`);
      return;
    }

    if (text === "hi" || text === TRIGGER) {
      sessions.set(chatId, { step: "admin_pin" });
      await msg.reply(adminPrompt());
    }

    return;
  }

  if (text === TRIGGER) {
    sessions.set(chatId, { step: "menu" });
    await msg.reply(menu());
    return;
  }

  const session = sessions.get(chatId);
  if (!session) return;

  try {
    if (session.step === "password") {
      sessions.delete(chatId);
      if (!COMPUTER_PASSWORD) {
        await msg.reply(`${DIV}\n*BLACKBAT ERROR*\n${DIV}\n\nBLACKBAT_COMPUTER_PASSWORD is not set in .env.`);
        return;
      }

      if (String(msg.body || "") !== COMPUTER_PASSWORD) {
        await msg.reply(`${DIV}\n*BLACKBAT*\n${DIV}\n\nPassword incorrect. Unlock/wake cancelled.`);
        return;
      }

      const used = await unlockOrWakePc();
      await msg.reply(`${DIV}\n*BLACKBAT*\n${DIV}\n\nPassword accepted. Unlock/wake command sent.\n\n_Method: ${used}_`);
      return;
    }

    if (session.step !== "menu") return;

    if (["1", "lock", "lock pc"].includes(text)) {
      const used = await lockPc();
      await msg.reply(`${DIV}\n*BLACKBAT*\n${DIV}\n\nPC lock command sent.\n\n_Method: ${used}_`);
      return;
    }

    if (["2", "unlock", "wake", "unlock pc", "wake pc"].includes(text)) {
      if (!COMPUTER_PASSWORD) {
        await msg.reply(`${DIV}\n*BLACKBAT ERROR*\n${DIV}\n\nBLACKBAT_COMPUTER_PASSWORD is not set in .env.`);
        return;
      }

      sessions.set(chatId, { step: "password" });
      await msg.reply(passwordPrompt());
      return;
    }

    await msg.reply(menu());
  } catch (err) {
    await msg.reply(`${DIV}\n*BLACKBAT ERROR*\n${DIV}\n\n${err.message}`);
  }
});

client.initialize();
