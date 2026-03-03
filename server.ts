import express from "express";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAPID_KEYS_FILE = path.join(__dirname, "vapid.json");

let vapidKeys: { publicKey: string; privateKey: string };

if (fs.existsSync(VAPID_KEYS_FILE)) {
  vapidKeys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, "utf-8"));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(vapidKeys));
}

webpush.setVapidDetails(
  "mailto:test@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// In-memory store for subscriptions (for demo purposes)
const subscriptions: any[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/vapidPublicKey", (req, res) => {
    res.send(vapidKeys.publicKey);
  });

  app.post("/api/subscribe", (req, res) => {
    const subscription = req.body;
    subscriptions.push(subscription);
    res.status(201).json({});
  });

  app.post("/api/sendNotification", (req, res) => {
    const notificationPayload = {
      notification: {
        title: req.body.title || "CycleGuard Update",
        body: req.body.body || "You have a new notification!",
        icon: "/vite.svg",
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1,
        },
      },
    };

    Promise.all(
      subscriptions.map((sub) =>
        webpush.sendNotification(sub, JSON.stringify(notificationPayload)).catch((err) => {
          console.error("Error sending notification", err);
        })
      )
    )
      .then(() => res.status(200).json({ message: "Notifications sent successfully." }))
      .catch((err) => {
        console.error("Error sending notification", err);
        res.sendStatus(500);
      });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
