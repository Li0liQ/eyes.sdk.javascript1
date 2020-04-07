'use strict'
const chromedriver = require('chromedriver')
const {remote} = require('webdriverio')
const assert = require('assert')
const WDIODriver = require('../../src/wrappers/WDIODriver')
const WDIOElement = require('../../src/wrappers/WDIOElement')
const WDIOElementFinder = require('../../src/wrappers/WDIOElementFinder')
const By = require('../../src/By')
const {Logger} = require('../../index')

describe('WDIOElementFinder', function() {
  let logger, browser, driver, finder

  function elementId(element) {
    return element.ELEMENT || element['element-6066-11e4-a52e-4f735466cecf']
  }

  before(async () => {
    logger = new Logger(false)
    await chromedriver.start([], true)
    browser = remote({
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: ['disable-infobars', 'headless'],
        },
      },
      logLevel: 'error',
      port: 9515,
      path: '/',
    })
    driver = new WDIODriver(logger, browser)
  })

  beforeEach(async () => {
    await browser.init()
    await browser.url('https://applitools.github.io/demo/TestPages/FramesAndRegionsPage/')
    finder = new WDIOElementFinder(logger, driver)
  })

  afterEach(async () => {
    await browser.end()
  })

  after(async () => {
    chromedriver.stop()
  })

  it('findElement(string)', async () => {
    const {value: expectedElement} = await browser.element('#frame_main')
    const foundElement = await finder.findElement('#frame_main')
    assert.ok(foundElement instanceof WDIOElement)
    assert.deepStrictEqual(foundElement.elementId, elementId(expectedElement))
  })

  it('findElement(by)', async () => {
    const {value: expectedElement} = await browser.element('[name="frame-aside"]')
    const foundElement = await finder.findElement(By.name('frame-aside'))
    assert.ok(foundElement instanceof WDIOElement)
    assert.deepStrictEqual(foundElement.elementId, elementId(expectedElement))
  })

  it('findElements(string)', async () => {
    const {value: expectedElements} = await browser.elements('iframe')
    const foundElements = await finder.findElements('iframe')
    assert.strictEqual(foundElements.length, expectedElements.length)
    foundElements.forEach(foundElement => {
      assert.ok(foundElement instanceof WDIOElement)
    })
    foundElements.forEach((foundElement, index) => {
      assert.deepStrictEqual(foundElement.elementId, elementId(expectedElements[index]))
    })
  })

  it('findElements(by)', async () => {
    const {value: expectedElements} = await browser.elements('iframe')
    const foundElements = await finder.findElements(By.tagName('iframe'))
    assert.strictEqual(foundElements.length, expectedElements.length)
    foundElements.forEach(foundElement => {
      assert.ok(foundElement instanceof WDIOElement)
    })
    foundElements.forEach((foundElement, index) => {
      assert.deepStrictEqual(foundElement.elementId, elementId(expectedElements[index]))
    })
  })
})