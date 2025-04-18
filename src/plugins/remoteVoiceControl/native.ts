import { BrowserWindow } from "electron";
import * as http from "http"; // Or your preferred HTTP library

let mainWindow: BrowserWindow | undefined;


let status = {
    isMuted: false,
    isDeafened: false,
};



// Function to find/get the main Discord window
function getMainWindow(): BrowserWindow | undefined {
    console.log("[RemoteControl] Attempting to find main Discord window..."); // Log entry

    // Check cached window first
    if (mainWindow && !mainWindow.isDestroyed()) {
        console.log("[RemoteControl] Returning cached main window."); // Log cache hit
        return mainWindow;
    }

    const allWindows = BrowserWindow.getAllWindows();
    console.log(`[RemoteControl] Found ${allWindows.length} windows.`); // Log window count
    allWindows.forEach((win, index) => {
        try {
            // Log the URL of each window to help debug
            console.log(`[RemoteControl] Window ${index} URL: ${win.webContents.getURL()}`);
        } catch (e) {
            console.log(`[RemoteControl] Window ${index}: Could not get URL (perhaps devtools or loading).`);
        }
    });

    // Try finding the window again using a broader check
    mainWindow = allWindows.find(win => {
        try {
            const url = win.webContents.getURL();
            // Check if the URL includes discord.com and isn't just the base domain
            // This should match /app, /channels/@me, etc.
            return url.includes("discord.com/") && url.length > "https://discord.com/".length;
        } catch (e) {
            // Ignore windows where URL can't be retrieved
            return false;
        }
    });

    if (mainWindow) {
        console.log("[RemoteControl] Found new main window:", mainWindow.id); // Log success
    } else {
        console.log("[RemoteControl] Main Discord window not found this time."); // Log failure
    }

    return mainWindow;
}


export function startServer() {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const action = url.pathname.substring(1); // e.g., /mute -> mute
        console.log(`[RemoteControl] Received action: ${action}`); // Log received action

        const win = getMainWindow(); // Attempt to get the window
        if (win) {
            // Send the action to the renderer process
            if (action === "status") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(status));
                return;
            }

            win.webContents.send("VC-REMOTE-VOICE-CONTROL-ACTION", action);
            console.log(`[RemoteControl] Sent action '${action}' to renderer.`); // Log IPC send
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(`Action ${action} sent.`);
        } else {
            console.error("[RemoteControl] Failed to find Discord window to send action."); // Log error
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Could not find Discord window.");
        }
    });

    server.listen(65530, () => { // Explicitly listen on localhost
        console.log("[RemoteControl] Server listening on http://127.0.0.1:65530"); // Updated port in log
    });

    // Return a cleanup function
    return () => {
        console.log("[RemoteControl] Closing server...");
        server.close(() => {
            console.log("[RemoteControl] Server closed.");
        });
        mainWindow = undefined; // Clear cache on stop
    };
}

export function setStatus(_, newStatus: { isMuted?: boolean; isDeafened?: boolean; }) {
    if (newStatus.isMuted !== undefined) {
        status.isMuted = newStatus.isMuted;
    }
    if (newStatus.isDeafened !== undefined) {
        status.isDeafened = newStatus.isDeafened;
    }
    return status;
}


// Optional: Add a stopServer function if needed
// export function stopServer() { /* Call the cleanup function returned by startServer */ }