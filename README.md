# 📲 WhatsApp Promo Manager

A complete local business tool to manage customers and send personalized WhatsApp promotional messages on festivals and special occasions.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18 or higher (https://nodejs.org)

### Installation

```bash
# 1. Extract the zip and open the folder
cd whatsapp-promo-manager

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

Open your browser at: **http://localhost:3000**

---

## 📁 Project Structure

```
whatsapp-promo-manager/
├── server.js                        # Express server entry point
├── package.json
├── .env                             # Optional environment variables
├── data/                            # SQLite database (auto-created)
│   └── business.db
├── database/
│   └── db.js                        # DB init, schema, seed data
├── backend/
│   ├── controllers/
│   │   ├── customerController.js
│   │   ├── occasionController.js
│   │   ├── templateController.js
│   │   ├── settingsController.js
│   │   └── messageController.js
│   ├── routes/
│   │   ├── customers.js
│   │   ├── occasions.js
│   │   ├── templates.js
│   │   ├── settings.js
│   │   └── messages.js
│   └── services/
│       ├── whatsappService.js       # Message building + sending logic
│       └── schedulerService.js     # Daily cron job
└── frontend/
    ├── index.html                   # Single-page app shell
    ├── css/
    │   └── main.css
    └── js/
        ├── api.js                   # Fetch wrapper
        ├── utils.js                 # Toast, modal, helpers
        ├── app.js                   # SPA router
        └── pages/
            ├── dashboard.js
            ├── customers.js
            ├── occasions.js
            ├── templates.js
            ├── compose.js
            ├── logs.js
            └── settings.js
```

---

## 📖 Feature Guide

### 1. Customers
- Add customers with name, phone (include country code like +91), email, gender, category
- Tick the **consent checkbox** — only consented customers receive WhatsApp messages
- Filter by category (general, vip, wholesale, etc.) or consent status

### 2. Occasions
- Pre-loaded with: New Year, Republic Day, Holi, Ram Navami, Independence Day, Diwali, Christmas, Eid
- Add any custom festival, sale campaign, or business event
- Date format:
  - **Yearly recurring**: `MM-DD` e.g. `08-15` for Independence Day
  - **One-time**: `YYYY-MM-DD` e.g. `2025-11-15`
- Assign a message template to each occasion

### 3. Templates
- Use placeholders: `{{name}}`, `{{occasion}}`, `{{business_name}}`, `{{discount}}`, `{{offer_expiry}}`, `{{custom_text}}`
- Click any placeholder tag to copy it
- Preview how the message looks with sample data
- Mark one template as **default** for use when no template is assigned

### 4. Sending Messages

#### Manual / Click-to-Chat (default mode)
- Go to **Send Messages** page
- Select customer + occasion → click Send
- A WhatsApp link is generated — click to open WhatsApp Web/app with the pre-filled message
- Owner clicks send manually in WhatsApp

#### API Mode (auto send)
- Go to **Settings** → set mode to **API**
- Enter your WhatsApp API credentials (UltraMsg or Twilio supported)
- Messages are sent automatically without manual intervention

### 5. Scheduler
- Runs daily at your configured time (default 9:00 AM IST)
- Detects today's occasions by matching `MM-DD` (yearly) or `YYYY-MM-DD` (one-time)
- Sends/prepares messages for all consented customers
- Prevents duplicates: same customer + same occasion on same calendar day is skipped
- You can also **Run Scheduler Now** from the Dashboard

### 6. Settings
| Setting | Description |
|---|---|
| Business Name | Used in `{{business_name}}` placeholder |
| Business Phone | Your WhatsApp number |
| Default Discount | Default for `{{discount}}` if not specified per send |
| Default Expiry | Default for `{{offer_expiry}}` |
| Send Mode | `manual` (click-to-chat) or `api` (auto-send) |
| API Provider | `ultramsg` or `twilio` |
| Scheduler Time | Daily run time in IST |

---

## 🔌 WhatsApp API Setup (Optional)

### UltraMsg
1. Sign up at https://ultramsg.com
2. Create an instance and connect your WhatsApp
3. Copy Instance ID and Token
4. In Settings: Provider = ultramsg, paste credentials

### Twilio
1. Sign up at https://twilio.com
2. Enable WhatsApp sandbox or apply for production
3. Copy Account SID and Auth Token
4. In Settings: Provider = twilio, Instance ID = Account SID, Token = Auth Token

---

## 🏗️ How It Works

### Occasion Detection
The scheduler compares today's `MM-DD` against stored `occasion_date` values for yearly occasions, and `YYYY-MM-DD` for one-time occasions. This means dates like Independence Day (08-15) automatically trigger every year without reconfiguration.

### API vs Click-to-Chat
| | API Mode | Click-to-Chat Mode |
|---|---|---|
| How it works | HTTP POST to provider | Generates wa.me link |
| Requires account? | Yes (UltraMsg/Twilio) | No |
| Owner action needed? | None | Click each link |
| Cost | Provider charges apply | Free |
| Speed | Instant bulk | Manual one-by-one |

### Duplicate Prevention
Before sending, the system checks `message_logs` for any non-failed log with the same `customer_id + occasion_id` on today's date. If found, it skips that customer.

### Limitations of Local WhatsApp Automation
1. **WhatsApp ToS**: WhatsApp officially only allows the Business API for bulk messaging. Using unofficial APIs risks account bans.
2. **No delivery receipts**: Unless your provider returns read receipts, you can only track "sent" not "read."
3. **Internet required**: API mode needs an active internet connection.
4. **Template approval**: WhatsApp Business API requires pre-approved message templates for outbound messages outside 24hr windows.
5. **Local only**: This app runs on your computer. It is not accessible from other devices unless you expose it via a local network IP.

---

## 🔒 Security Notes
- All inputs are sanitized server-side
- Phone numbers are stripped of non-numeric characters (except +)
- API tokens are stored locally in SQLite (not sent to any third party)
- No user authentication — designed for single-owner local use only

---

## 💡 Tips
- Start by adding your customers, then configure occasions and templates
- Assign a template to each occasion for best results
- Run the scheduler manually from the Dashboard to test before relying on automation
- Use the **Preview** button before bulk sending
- Keep the app running in the background (or use `pm2` for auto-start on Windows/Mac/Linux)

---

## 📦 Dependencies
| Package | Purpose |
|---|---|
| express | Web server |
| better-sqlite3 | SQLite database |
| node-cron | Daily scheduler |
| cors | Cross-origin support |
| helmet | Basic security headers |
| axios | HTTP client for API calls |
| dotenv | Environment variables |
