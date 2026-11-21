/*
Copyright (c) 2026 Orizon.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// Orizon: automatic updates for the AppImage.
// The other Linux packages (deb, rpm, pacman, Flatpak, Snap) are updated by the system, so this only runs
// when the app was started from an AppImage. The new version is described by latest-linux.yml, published
// next to the AppImage on https://4orizon.eu/dl/ (the address is written in app-update.yml at build time),
// and electron-updater checks the sha512 of the downloaded file before it replaces the AppImage.
// The update reaches the user through the same toast and settings button that Element uses on Windows and macOS.

import { app } from "electron";
import electronUpdater from "electron-updater";

const UPDATE_POLL_INTERVAL_MS = 60 * 60 * 1000;
const INITIAL_UPDATE_DELAY_MS = 30 * 1000;
// only used to tell the web app that updates are possible: the real address is in app-update.yml
const FEED_URL = "https://4orizon.eu/dl/";

interface IDownloadedUpdate {
    releaseNotes: string;
    releaseName: string;
    releaseDate: Date;
    updateURL: string;
}

let active = false;
let downloaded: IDownloadedUpdate | undefined;

function send(channel: string, arg: unknown): void {
    global.mainWindow?.webContents.send(channel, arg);
}

/** True when this process is an AppImage that keeps itself up to date. */
export function isActive(): boolean {
    return active;
}

/** Shown by the web app to decide if the "check for updates" button is useful. */
export function feedUrl(): string {
    return active ? FEED_URL : "";
}

/** Look for a new version now (also used by the button in the settings). */
export function check(): void {
    if (!active) return;
    if (downloaded) {
        // already downloaded: show the toast again instead of downloading it twice
        send("update-downloaded", downloaded);
        return;
    }
    electronUpdater.autoUpdater.checkForUpdates().catch((e) => {
        console.log("Orizon: could not check for an AppImage update", e);
    });
}

/** Replace the AppImage with the downloaded one and start it again. */
export function install(): void {
    const appImage = process.env.APPIMAGE;
    if (!active || !downloaded || !appImage) return;
    // The new AppImage is started by Electron once this process has exited, so it gets the single instance lock.
    // The variables of the current mount must not leak into it: the AppImage runtime sets them again.
    for (const key of ["APPDIR", "ARGV0", "OWD"]) delete process.env[key];
    app.relaunch({ execPath: appImage, args: process.argv.slice(1).filter((arg) => arg.startsWith("--")) });
    // like Element's installUpdate: quitAndInstall does not fire before-quit, and the window must not just hide
    global.appQuitting = true;
    electronUpdater.autoUpdater.quitAndInstall(true, false);
}

/** Starts the updates when the app runs as an AppImage. Returns false everywhere else. */
export function start(): boolean {
    if (active || process.platform !== "linux" || !process.env.APPIMAGE || !app.isPackaged) return false;
    active = true;
    const { autoUpdater } = electronUpdater;
    autoUpdater.autoDownload = true;
    // if the user quits instead of restarting, the new version is installed on quit
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;
    autoUpdater
        .on("update-available", () => send("check_updates", true))
        .on("update-not-available", () => {
            if (downloaded) send("update-downloaded", downloaded);
            else send("check_updates", false);
        })
        .on("error", (error: Error) => send("check_updates", error.message))
        .on("update-downloaded", (info) => {
            downloaded = {
                releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : "",
                releaseName: info.version,
                releaseDate: new Date(info.releaseDate),
                updateURL: "",
            };
            send("update-downloaded", downloaded);
        });
    console.log(`Orizon: AppImage ${process.env.APPIMAGE}, automatic updates on (address in app-update.yml)`);
    setTimeout(check, INITIAL_UPDATE_DELAY_MS);
    setInterval(check, UPDATE_POLL_INTERVAL_MS);
    return true;
}
