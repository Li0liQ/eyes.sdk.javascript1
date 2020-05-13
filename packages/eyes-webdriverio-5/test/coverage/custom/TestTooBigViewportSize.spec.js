'use strict'

const assert = require('assert')
const chromedriver = require('chromedriver')
const {remote} = require('webdriverio')
const {Eyes, Target, By} = require('../../../index')

describe('TestTooBigViewportSize', () => {
  let browser, eyes
  before(async () => {
    await chromedriver.start(['--silent'], true)
  })

  beforeEach(async () => {
    browser = await remote({
      port: 9515,
      path: '/',
      logLevel: 'error',
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          // should be onscreen to face an issue
          args: ['--disable-infobars'],
        },
      },
    })
    eyes = new Eyes()
  })

  afterEach(async () => {
    await browser.deleteSession()
    await eyes.abort()
  })

  after(async () => {
    chromedriver.stop()
  })

  it('TestTooBigViewportSize', async function() {
    await eyes.open(browser, this.test.parent.title, this.test.title, {width: 5000, height: 5000})

    const actualViewportSize = await eyes.getDriver().getDefaultContentViewportSize()
    const cachedViewportSize = await eyes.getViewportSize()
    assert.deepStrictEqual(cachedViewportSize, actualViewportSize)

    return eyes.close(false)
  })

  it.only('TestTooBigViewportSize', async function() {
    await browser.url('https://applitools.github.io/demo/TestPages/FramesTestPage')
    await eyes.open(browser, this.test.parent.title, this.test.title, {width: 5000, height: 5000})

    await eyes.check('input', Target.region(By.css('input')))

    return eyes.close(false)
  })
})
