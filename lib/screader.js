import chokidar from 'chokidar'
import Conf from 'conf'
import { input } from '@inquirer/prompts'
import { createWorker } from 'tesseract.js'
import clipboard from 'clipboardy'

const config = new Conf({ projectName: 'screader' })

export async function watch ({ reset = false }) {
  if (reset) {
    config.reset()
  }

  if (!config.has('ssDirectory')) {
    config.set('ssDirectory', await input({ message: 'Enter the screenshot directory:' }))
  }
  const worker = await createWorker('eng')
  chokidar.watch(config.get('ssDirectory'), { ignoreInitial: true }).on('add', async (path) => {
    console.log(`new screenshot on ${path}:`)
    try {
      const ret = await worker.recognize(path)
      console.log(ret.data.text)
      clipboard.writeSync(ret.data.text)
    } catch (err) {
      console.error(err)
    }
  })

  process.on('uncaughtException', function (err) {
    console.log(err)
    chokidar.close()
    worker.terminate()
  })
}
