const { app, BrowserWindow, Notification, clipboard } = require('electron')
const { OEM, createWorker } = require('tesseract.js')
const Config = require('electron-config')
const { Monitor } = require('node-screenshots')

const config = new Config()

const createWindow = async () => {
  // Create the browser window.
  const opts = {
    // make window transparent
    transparent: true,
    width: 800,
    height: 600
  }
  // apply saved window bounds
  Object.assign(opts, config.get('winBounds'))
  const mainWindow = new BrowserWindow(opts)

  mainWindow.setMenu(null)

  mainWindow.on('close', () => {
    // save window bounds
    config.set('winBounds', mainWindow.getBounds())
  })

  const worker = await createWorker('eng', OEM.DEFAULT, {
    logger: (m) => {
      console.log(m.status)
      // set progress
      mainWindow.setProgressBar(m.progress)
    }
  })

  mainWindow.on('minimize', async () => {
    mainWindow.setProgressBar(0)
    // capture screen rect
    const bounds = mainWindow.getBounds()
    const monitor = Monitor.fromPoint(bounds.x, bounds.y)
    const image = await monitor.captureImage()
    const newImage = await image.crop(bounds.x, bounds.y, bounds.width, bounds.height)

    // recognize text from image
    const buffer = Buffer.from(await newImage.toPng())
    const ret = await worker.recognize(buffer)

    // save to clipboard
    clipboard.writeText(ret.data.text)
    // show notification
    new Notification({
      title: 'Recognized text',
      body: 'Saved to clipboard'
    }).show()
  })
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
