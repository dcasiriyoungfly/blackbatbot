const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const REQUIRED_PACKAGES = ["dotenv", "qrcode-terminal", "whatsapp-web.js"];
const INSTALL_MARKER = path.join(ROOT, ".blackbat_install.json");

function missingPackages() {
  return REQUIRED_PACKAGES.filter(pkg => {
    try {
      require.resolve(pkg, { paths: [ROOT] });
      return false;
    } catch {
      return true;
    }
  });
}

function installMissingPackages(packages) {
  const label = packages.length ? packages.join(", ") : "platform dependencies";
  console.log(`Installing missing tools: ${label}`);
  execFileSync("npm", ["install"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  fs.writeFileSync(INSTALL_MARKER, JSON.stringify({
    platform: process.platform,
    arch: process.arch,
    installedAt: new Date().toISOString(),
  }, null, 2));
}

function readInstallMarker() {
  try {
    return JSON.parse(fs.readFileSync(INSTALL_MARKER, "utf8"));
  } catch {
    return null;
  }
}

function needsPlatformInstall() {
  const marker = readInstallMarker();
  return !marker || marker.platform !== process.platform || marker.arch !== process.arch;
}

try {
  const missing = missingPackages();
  if (missing.length || needsPlatformInstall()) installMissingPackages(missing);
  require(path.join(ROOT, "bot.js"));
} catch (err) {
  console.error("Blackbat failed to start.");
  console.error(err?.stack || err?.message || err);
  process.exit(1);
}
