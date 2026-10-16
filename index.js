const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Discord Bot Instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

if (process.env.BOT_TOKEN) {
    client.login(process.env.BOT_TOKEN).catch(err => {
        console.error("Discord Login Error:", err.message);
    });
}

app.get('/', (req, res) => {
    res.send('NEXORA CORPORATION Verification Portal is Active!');
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send('No authorization code provided.');
    }

    try {
        // Step 1: Exchange Code for Access Token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: `https://${req.get('host')}/callback`
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        // Step 2: Fetch User Info
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userData = userResponse.data;
        const avatarUrl = userData.avatar 
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` 
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

        // Step 3: Add Role to User
        await axios.put(
            `https://discord.com/api/guilds/${process.env.GUILD_ID}/members/${userData.id}/roles/${process.env.VERIFIED_ROLE_ID}`,
            {},
            { headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }
        );

        // Step 4: Private Webhook Logging to #bot-logs
        if (process.env.WEBHOOK_URL) {
            await axios.post(process.env.WEBHOOK_URL, {
                embeds: [{
                    title: "🔒 New User Verified",
                    color: 5763719,
                    thumbnail: { url: avatarUrl },
                    fields: [
                        { name: "User", value: `${userData.username}`, inline: true },
                        { name: "User ID", value: `${userData.id}`, inline: true },
                        { name: "Status", value: "Access Granted", inline: true }
                    ],
                    footer: { text: "NEXORA CORPORATION Security Gateway" },
                    timestamp: new Date()
                }]
            }).catch(() => {});
        }

        // Step 5: Premium Website UI Response
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>NEXORA CORPORATION — Access Granted</title>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { background: radial-gradient(circle at top, #1e1b4b 0%, #0f172a 60%, #020617 100%); color: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
                    header { width: 100%; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); }
                    .brand { font-size: 20px; font-weight: 800; letter-spacing: 1px; background: linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                    .nav-status { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #34d399; background: rgba(52, 211, 153, 0.1); padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(52, 211, 153, 0.2); }
                    .dot { width: 8px; height: 8px; background-color: #34d399; border-radius: 50%; box-shadow: 0 0 10px #34d399; }
                    .main-container { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px 20px; width: 100%; max-width: 600px; }
                    .card { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px; text-align: center; width: 100%; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); backdrop-filter: blur(16px); position: relative; overflow: hidden; }
                    .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #38bdf8, #818cf8, #34d399); }
                    .avatar-wrapper { position: relative; display: inline-block; margin-bottom: 20px; }
                    .avatar { width: 110px; height: 110px; border-radius: 50%; border: 4px solid #38bdf8; box-shadow: 0 0 25px rgba(56, 189, 248, 0.3); object-fit: cover; }
                    .badge-icon { position: absolute; bottom: 4px; right: 4px; background: #34d399; color: #0f172a; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid #1e293b; }
                    .username { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
                    .userid { font-size: 13px; color: #94a3b8; margin-bottom: 24px; font-family: monospace; background: rgba(15, 23, 42, 0.5); padding: 4px 12px; border-radius: 12px; display: inline-block; }
                    .success-title { font-size: 20px; font-weight: 700; color: #34d399; margin-bottom: 8px; }
                    .description { color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 30px; }
                    .grid-features { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 30px; text-align: left; }
                    .feature-box { background: rgba(15, 23, 42, 0.6); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); font-size: 12px; }
                    .feature-box span { display: block; color: #94a3b8; font-size: 11px; margin-bottom: 2px; }
                    .btn-discord { display: inline-block; width: 100%; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 15px; transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); }
                    .btn-discord:hover { opacity: 0.95; transform: translateY(-1px); }
                    footer { padding: 20px; color: #64748b; font-size: 12px; }
                </style>
            </head>
            <body>
                <header>
                    <div class="brand">NEXORA CORP</div>
                    <div class="nav-status"><span class="dot"></span> System Online</div>
                </header>
                <div class="main-container">
                    <div class="card">
                        <div class="avatar-wrapper">
                            <img class="avatar" src="${avatarUrl}" alt="User Avatar">
                            <div class="badge-icon">✓</div>
                        </div>
                        <div class="username">${userData.username}</div>
                        <div class="userid">ID: ${userData.id}</div>
                        <div class="success-title">Verification Complete!</div>
                        <p class="description">Welcome to <b>NEXORA CORPORATION</b>. Your identity has been authenticated and full server access has been granted to your account.</p>
                        <div class="grid-features">
                            <div class="feature-box"><span>ACCESS LEVEL</span><b>Verified Member</b></div>
                            <div class="feature-box"><span>SERVER STATUS</span><b>Unlocked All Channels</b></div>
                        </div>
                        <a href="discord://" class="btn-discord">Return to Discord App</a>
                    </div>
                </div>
                <footer>&copy; 2026 NEXORA CORPORATION. All rights reserved.</footer>
            </body>
            </html>
        `);

    } catch (error) {
        const errorData = error.response ? JSON.stringify(error.response.data) : error.message;
        res.status(500).send(`Verification Failed: ${errorData}`);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
