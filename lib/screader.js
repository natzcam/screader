const chokidar = require('chokidar')
const Conf = require('conf')
const { input } = require('@inquirer/prompts')
const { createWorker } = require('tesseract.js')
const clipboard = require('clipboardy')

const config = new Conf({ projectName: 'screader' })

async function watch ({ reset = false }) {
  if (reset) {
    config.reset()
  }

  if (!config.has('ssDirectory')) {
    config.set('ssDirectory', await input({ message: 'Enter the screenshot directory:' }))
  }
  const worker = await createWorker('eng')

  console.log(`watching ${config.get('ssDirectory')}`)
  chokidar.watch(config.get('ssDirectory'), { ignoreInitial: true }).on('add', async (path) => {
    console.log(`new screenshot on ${path}:`)
    try {
      const ret = await worker.recognize(path)
      clipboard.writeSync(ret.data.text)
      console.log('text saved to clipboard')
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

module.exports = {
  watch
}
