const { screen, app, BrowserWindow, Notification, clipboard } = require('electron')
const { OEM, createWorker } = require('tesseract.js')
const Config = require('electron-config')
const { Monitor } = require('node-screenshots')

const config = new Config()

let worker
createWorker('eng', OEM.DEFAULT, {
  logger: (m) => {
    console.log(`${m.status}: ${m.progress}`)
  }
}).then(w => {
  worker = w
})

const createWindow = async () => {
  // Create the browser window.
  const opts = {
    fullscreen: false,
    fullscreenable: false,
    width: 800,
    height: 600,
    frame: true,
    transparent: true,
    movable: true,
    alwaysOnTop: true
  }
  // apply saved window bounds
  Object.assign(opts, config.get('winBounds'))
  const mainWindow = new BrowserWindow(opts)

  // don't show menu
  mainWindow.setMenu(null)
  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(true)
  }

  mainWindow.on('close', () => {
    // save window bounds
    config.set('winBounds', mainWindow.getBounds())
  })

  mainWindow.on('minimize', async () => {
    // capture screen rect
    const bounds = mainWindow.getBounds()
    const scaleFactor = screen.getPrimaryDisplay().scaleFactor
    const monitor = Monitor.fromPoint(bounds.x * scaleFactor, bounds.y * scaleFactor)
    const image = await monitor.captureImage()

    // exclude title bar
    const contentHeight = mainWindow.getContentSize()[1]
    const y = bounds.y + (bounds.height - contentHeight)

    const newImage = await image.crop(
      bounds.x * scaleFactor,
      y * scaleFactor,
      bounds.width * scaleFactor,
      contentHeight * scaleFactor)

    // recognize text from image
    const buffer = Buffer.from(await newImage.toPng())
    const ret = await worker?.recognize(buffer)

    // save to clipboard
    clipboard.writeText(ret?.data?.text)
    // show notification
    new Notification({
      title: 'Recognized text',
      body: 'Saved to clipboard'
    }).show()
  })

  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
