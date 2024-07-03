import { OEM, createWorker } from 'tesseract.js'
import {
  QMainWindow,
  WidgetEventTypes,
  WidgetAttribute,
  WindowState,
  QApplication,
  QSettings,
  QProgressDialog
} from '@nodegui/nodegui'
import { Monitor } from 'node-screenshots'

async function scread () {
  const win = new QMainWindow()
  win.setWindowTitle('screen reader')
  const progressDialog = new QProgressDialog()
  progressDialog.setWindowTitle('recognizing text')
  progressDialog.setMinimum(0)
  progressDialog.setMaximum(100)

  const settings = new QSettings('natz', 'screader')
  if (settings.value('width').toInt()) {
    win.setGeometry(
      settings.value('left').toInt(),
      settings.value('top').toInt(),
      settings.value('width').toInt(),
      settings.value('height').toInt())
  } else {
    win.setGeometry(500, 250, 400, 400)
  }

  const worker = await createWorker('eng', OEM.DEFAULT, {
    logger: (m) => {
      console.log(m.status)
      progressDialog.setValue(Math.floor(m.progress.toFixed(2) * 100))
    }
  })

  win.setAttribute(WidgetAttribute.WA_NoSystemBackground, true)
  win.setAttribute(WidgetAttribute.WA_TranslucentBackground, true)
  win.addEventListener(WidgetEventTypes.WindowStateChange, async () => {
    if (win.windowState() === WindowState.WindowMinimized) {
      try {
        progressDialog.show()
        const monitor = Monitor.fromPoint(win.pos().x, win.pos().y)
        const image = await monitor.captureImage()
        const rect = win.geometry()
        const newImage = await image.crop(rect.left(), rect.top(), rect.width(), rect.height())
        const buffer = Buffer.from(await newImage.toPng())
        const ret = await worker.recognize(buffer)
        QApplication.clipboard().setText(ret.data.text)
        console.log('text saved to clipboard')
      } catch (err) {
        console.error(err)
      }
    }
  })

  win.addEventListener(WidgetEventTypes.Close, () => {
    const rect = win.geometry()
    settings.setValue('left', rect.left())
    settings.setValue('top', rect.top())
    settings.setValue('width', rect.width())
    settings.setValue('height', rect.height())
  })
  win.show()
  global.win = win

  process.on('uncaughtException', function (err) {
    console.error(err)
    worker.terminate()
  })
}

scread()
