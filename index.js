const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Discord Bot Instance (Only to keep bot active if needed)
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
    res.send('Verification Server is Running!');
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

        // Step 4: Webhook Logging (Optional)
        if (process.env.WEBHOOK_URL) {
            await axios.post(process.env.WEBHOOK_URL, {
                embeds: [{
                    title: "User Verified",
                    color: 3066993,
                    thumbnail: { url: avatarUrl },
                    fields: [
                        { name: "User", value: `${userData.username} (${userData.id})`, inline: true },
                        { name: "Status", value: "Verified Successfully", inline: true }
                    ],
                    timestamp: new Date()
                }]
            }).catch(() => {});
        }

        // Step 5: Render Beautiful Success UI
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verification Successful</title>
                <style>
                    body {
                        background-color: #0f172a;
                        color: #ffffff;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .card {
                        background: #1e293b;
                        padding: 40px;
                        border-radius: 16px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                        text-align: center;
                        max-width: 400px;
                        width: 90%;
                        border: 1px solid #334155;
                    }
                    .avatar {
                        width: 96px;
                        height: 96px;
                        border-radius: 50%;
                        border: 4px solid #22c55e;
                        margin-bottom: 20px;
                    }
                    .username {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 5px;
                        color: #f8fafc;
                    }
                    .userid {
                        font-size: 14px;
                        color: #94a3b8;
                        margin-bottom: 20px;
                    }
                    .status-badge {
                        background-color: rgba(34, 197, 94, 0.2);
                        color: #22c55e;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-weight: 600;
                        display: inline-block;
                        margin-bottom: 15px;
                    }
                    p {
                        color: #cbd5e1;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <img class="avatar" src="${avatarUrl}" alt="User Avatar">
                    <div class="username">${userData.username}</div>
                    <div class="userid">ID: ${userData.id}</div>
                    <div class="status-badge">✔ Verification Successful</div>
                    <p>You have been successfully verified! You can close this tab and go back to Discord.</p>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        const errorData = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("Detailed Error:", errorData);

        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { background-color: #0f172a; color: #ffffff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .error-card { background: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #ef4444; max-width: 500px; width: 90%; text-align: center; }
                    h2 { color: #ef4444; margin-top: 0; }
                    .code-box { background: #0f172a; color: #f87171; padding: 15px; border-radius: 8px; text-align: left; font-family: monospace; word-break: break-all; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="error-card">
                    <h2>Verification Failed!</h2>
                    <p>Discord returned the following error detail:</p>
                    <div class="code-box">${errorData}</div>
                </div>
            </body>
            </html>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
