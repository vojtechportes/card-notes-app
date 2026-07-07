import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const createMainWindow = async (): Promise<void> => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);

    return { action: 'deny' };
  });

  const frontendDevServerUrl = process.env.FRONTEND_DEV_SERVER_URL;

  if (frontendDevServerUrl) {
    await mainWindow.loadURL(frontendDevServerUrl);
    return;
  }

  await mainWindow.loadFile(path.join(dirname, '..', '..', 'frontend', 'dist', 'index.html'));
};

app.whenReady().then(() => {
  void createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
