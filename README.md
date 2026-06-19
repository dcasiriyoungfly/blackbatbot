# Blackbat

Blackbat is a small WhatsApp bot that can lock your computer and wake the lock screen again from WhatsApp.

It works on Windows and Linux. The first time you run it, it shows a WhatsApp QR code in the terminal. Scan that QR code with WhatsApp to connect the bot.

## What You Need

- A Windows or Linux computer
- Internet access
- WhatsApp on your phone
- Permission to install software on the computer

You do not need to install npm packages manually. Blackbat installs its own missing Node.js packages automatically.

The start scripts also try to install Node.js automatically if Node is missing or too old.

## Quick Start

### Windows

1. Open the Blackbat folder.
2. Double-click `start.bat`.
3. If Windows asks for permission to install Node.js, allow it.
4. Wait for the WhatsApp QR code to appear.
5. Open WhatsApp on your phone.
6. Go to Linked devices.
7. Scan the QR code shown in the terminal.

### Linux

Open a terminal in the Blackbat folder and run:

```bash
./start.sh
```

If Node.js is missing, the script will try to install it. You may be asked for your Linux password because installation needs administrator permission.

After the QR code appears, open WhatsApp on your phone, go to Linked devices, and scan the QR code.

## Setup The Passwords

Blackbat uses a `.env` file for settings.

If `.env` does not exist yet, copy `.env.example` and rename the copy to `.env`.

Example `.env`:

```env
BLACKBAT_ADMIN_PIN=2000
BLACKBAT_COMPUTER_PASSWORD=your-password-here
BLACKBAT_COMMAND_TIMEOUT_MS=10000
```

### Admin PIN

The admin PIN controls who is allowed to use the bot.

Default:

```env
BLACKBAT_ADMIN_PIN=2000
```

To become admin from WhatsApp:

1. Send `hi` to the bot.
2. The bot will say you must be admin.
3. Send the admin PIN, for example `2000`.
4. If the PIN is correct, your WhatsApp chat is saved as admin.

Saved admins are stored in `blackbat_state.json`.

### Computer Password

Set the password that the admin must type in WhatsApp before using unlock/wake:

```env
BLACKBAT_COMPUTER_PASSWORD=your-password-here
```

This is a Blackbat confirmation password. It does not bypass the normal Windows or Linux login screen.

On Windows, Blackbat can wake the lock screen, but Windows still requires the normal password or PIN to fully sign in.

## How To Use The Bot

After the bot is connected and your WhatsApp chat is admin, send:

```text
backgift
```

The bot replies:

```text
1. Lock your PC
2. Unlock / wake your PC
```

Send:

```text
1
```

to lock the computer.

Send:

```text
2
```

to unlock or wake the computer. The bot will ask for `BLACKBAT_COMPUTER_PASSWORD` before sending the wake command.

## Optional: Fixed Admin Number

If you want only one specific WhatsApp number to be admin, set it in `.env`:

```env
BLACKBAT_ADMIN_NUMBER=263771234567
```

For more than one number, use commas:

```env
BLACKBAT_ADMIN_NUMBERS=263771234567,263781234567
```

If you use `BLACKBAT_ADMIN_NUMBER` or `BLACKBAT_ADMIN_NUMBERS`, those numbers are admins without entering the admin PIN.

## What Gets Saved

Blackbat creates these local folders/files:

- `auth_info/` saves the WhatsApp login session, so you do not scan the QR code every time.
- `blackbat_state.json` saves WhatsApp chats that entered the admin PIN successfully.
- `.blackbat_install.json` remembers that dependencies were installed for this computer.

Do not share these files with other people.

## Troubleshooting

### Need Help?

For help, contact support on WhatsApp:

```text
https://wa.me/+263775649488
```

### The QR code does not appear

Make sure the computer has internet access, then close the terminal and run `start.bat` or `./start.sh` again.

### WhatsApp asks me to scan again

This can happen if `auth_info/` was deleted or WhatsApp logged the device out. Start Blackbat again and scan the new QR code.

### The bot says the computer password is not set

Open `.env` and set:

```env
BLACKBAT_COMPUTER_PASSWORD=your-password-here
```

Then restart the bot.

### The bot does not respond to me

Send:

```text
hi
```

Then enter the admin PIN. After that, send:

```text
backgift
```

### Node.js install fails

Install Node.js 18 or newer manually from:

```text
https://nodejs.org/
```

Then run Blackbat again.

## OS Behavior

Windows locking uses the built-in `LockWorkStation` command.

Linux locking tries available desktop/session tools such as `loginctl`, `xdg-screensaver`, and `gnome-screensaver-command`.


 
 
