const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let webProcess;
let collabProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'PatentFlow Enterprise Launcher',
    show: false,
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    stopServices();
    app.quit();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Check if Node.js is installed
function checkNodeJs() {
  return new Promise((resolve) => {
    exec('node --version', (error, stdout) => {
      if (error) {
        resolve({ installed: false, version: null });
      } else {
        resolve({ installed: true, version: stdout.trim() });
      }
    });
  });
}

// Check if Python is installed
function checkPython() {
  return new Promise((resolve) => {
    exec('python --version', (error, stdout) => {
      if (error) {
        exec('python3 --version', (error2, stdout2) => {
          if (error2) {
            resolve({ installed: false, version: null });
          } else {
            resolve({ installed: true, version: stdout2.trim() });
          }
        });
      } else {
        resolve({ installed: true, version: stdout.trim() });
      }
    });
  });
}

// Install dependencies
function installDependencies() {
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['install'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });

    npm.stdout.on('data', (data) => {
      mainWindow.webContents.send('install-output', data.toString());
    });

    npm.stderr.on('data', (data) => {
      mainWindow.webContents.send('install-output', data.toString());
    });

    npm.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install failed with code ${code}`));
      }
    });
  });
}

// Setup database
function setupDatabase() {
  return new Promise((resolve, reject) => {
    const dbSetup = spawn('npm', ['run', 'db:push'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });

    dbSetup.stdout.on('data', (data) => {
      mainWindow.webContents.send('db-output', data.toString());
    });

    dbSetup.stderr.on('data', (data) => {
      mainWindow.webContents.send('db-output', data.toString());
    });

    dbSetup.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Database setup failed with code ${code}`));
      }
    });
  });
}

// Start services
function startServices() {
  return new Promise((resolve, reject) => {
    // Start collaboration service
    const collabPath = path.join(__dirname, '..', 'mini-services', 'collaboration-service');
    
    // Check if collaboration service dependencies are installed
    if (!fs.existsSync(path.join(collabPath, 'node_modules'))) {
      const installCollab = spawn('npm', ['install'], {
        cwd: collabPath,
        stdio: 'pipe'
      });

      installCollab.on('close', (code) => {
        if (code === 0) {
          startCollabService();
        } else {
          reject(new Error('Failed to install collaboration service dependencies'));
        }
      });
    } else {
      startCollabService();
    }

    function startCollabService() {
      collabProcess = spawn('npm', ['run', 'dev'], {
        cwd: collabPath,
        stdio: 'pipe',
        detached: true
      });

      collabProcess.stdout.on('data', (data) => {
        mainWindow.webContents.send('collab-output', data.toString());
      });

      collabProcess.stderr.on('data', (data) => {
        mainWindow.webContents.send('collab-output', data.toString());
      });

      // Start web application after collaboration service starts
      setTimeout(() => {
        webProcess = spawn('npm', ['run', 'dev'], {
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe',
          detached: true
        });

        webProcess.stdout.on('data', (data) => {
          mainWindow.webContents.send('web-output', data.toString());
        });

        webProcess.stderr.on('data', (data) => {
          mainWindow.webContents.send('web-output', data.toString());
        });

        webProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Web application failed with code ${code}`));
          }
        });

        // Wait for services to be ready
        setTimeout(() => {
          resolve();
        }, 5000);
      }, 3000);
    }
  });
}

// Stop services
function stopServices() {
  if (webProcess) {
    webProcess.kill();
  }
  if (collabProcess) {
    collabProcess.kill();
  }
}

// IPC handlers
ipcMain.handle('check-prerequisites', async () => {
  const nodeJs = await checkNodeJs();
  const python = await checkPython();
  return { nodeJs, python };
});

ipcMain.handle('install-dependencies', async () => {
  try {
    await installDependencies();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('setup-database', async () => {
  try {
    await setupDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-services', async () => {
  try {
    await startServices();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-browser', () => {
  shell.openExternal('http://localhost:3000');
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('get-app-path', () => {
  return path.join(__dirname, '..');
});