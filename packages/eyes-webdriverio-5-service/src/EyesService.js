'use strict'

const {ConsoleLogHandler, Eyes, Target, VisualGridRunner} = require('@applitools/eyes-webdriverio')
const VERSION = require('../package.json').version

const DEFAULT_VIEWPORT = {
  width: 800,
  height: 600,
}

class EyesService {
  constructor(config) {
    const runner =
      config && config.eyes && config.eyes.useVisualGrid
        ? new VisualGridRunner(config.eyes.concurrency)
        : undefined
    this._eyes = new Eyes(runner)
    this._eyes.getBaseAgentId = () =>
      runner
        ? `eyes-webdriverio-service-visualgrid/${VERSION}`
        : `eyes-webdriverio-service/${VERSION}`
    this._scrollRootElement = undefined

    if (!runner) {
      this._eyes.setHideScrollbars(true)
    }
    this._appName = null
  }

  /**
   * Gets executed just before initialising the webdriver session and test framework.
   * It allows you to manipulate configurations depending on the capability or spec.
   *
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that are to be run
   */
  // eslint-disable-next-line
  beforeSession(config, capabilities, specs) {
    this._eyesConfig = config.eyes
    if (this._eyesConfig) {
      this._eyes.setConfiguration(this._eyesConfig)
      this._appName = this._eyes.getConfiguration().getAppName()
    }
    if (config.enableEyesLogs) {
      this._eyes.setLogHandler(new ConsoleLogHandler(true))
    }
  }

  /**
   * Gets executed before test execution begins. At this point you can access to all global variables like `browser`.
   * It is the perfect place to define custom commands.
   *
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that are to be run
   */
  // eslint-disable-next-line
  before(capabilities, specs) {
    global.browser.addCommand(
      'eyesCheck',
      async (title, checkSettings = Target.window().fully()) => {
        await this._eyesOpen()

        const matchResult = await this._eyes.check(title, checkSettings)
        if (this._eyesConfig.throwErrorIfNotAsExpected && !matchResult.getAsExpected()) {
          throw new Error('Eyes detected visual mismatch!')
        }
        return matchResult
      },
    )

    // deprecated, alias of eyesCheck
    global.browser.addCommand('eyesCheckWindow', async (title, checkSettings) => {
      return global.browser.eyesCheck(title, checkSettings)
    })

    global.browser.addCommand('eyesSetScrollRootElement', element => {
      this._scrollRootElement = element
    })

    global.browser.addCommand('eyesAddProperty', (key, value) => {
      return this._eyes.addProperty(key, value)
    })

    global.browser.addCommand('eyesClearProperties', () => {
      return this._eyes.clearProperties()
    })

    global.browser.addCommand('eyesGetTestResults', async () => {
      // because `afterTest` executes after `afterEach`, this is the way to get results in `afterEach` or `it`
      await this._eyesClose()
      return this._testResults
    })

    global.browser.addCommand('eyesSetConfiguration', configuration => {
      return this._eyes.setConfiguration(configuration)
    })

    global.browser.addCommand('eyesGetIsOpen', () => {
      return this._eyes.getIsOpen()
    })

    global.browser.addCommand('eyesGetConfiguration', () => {
      return this._eyes.getConfiguration()
    })

    global.browser.addCommand('eyesGetAllTestResults', async () => {
      return this._eyes.getRunner().getAllTestResults()
    })
  }

  /**
   * Function to be executed before a test (in Mocha/Jasmine) or a step (in Cucumber) starts.
   *
   * @param {Object} test test details
   */
  beforeTest(test) {
    const configuration = this._eyes.getConfiguration()
    configuration.setTestName(test.title)

    if (!this._appName) {
      configuration.setAppName(test.parent)
    }

    if (!configuration.getViewportSize()) {
      configuration.setViewportSize(DEFAULT_VIEWPORT)
    }
    this._eyes.setConfiguration(configuration)
  }

  /**
   * Function to be executed after a test (in Mocha/Jasmine) or a step (in Cucumber) ends.
   * This function will be executed after `afterEach` (in Mocha).
   *
   * @param {Object} test test details
   */
  // eslint-disable-next-line
  afterTest(test) {
    // the next line is required because if we set an element in one test, then the following test
    // will say that the element is not attached to the page (because different browsers are used)
    this._eyes._scrollRootElement = undefined
    global.browser.call(() => this._eyesClose())
  }

  /**
   * Gets executed after all tests are done. You still have access to all global variables from the test.
   *
   * @param {Number} result 0 - test pass, 1 - test fail
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that ran
   */
  // eslint-disable-next-line
  after(result, capabilities, specs) {
    global.browser.call(() => this._eyes.abort())
  }

  async _eyesOpen() {
    if (!this._eyes.getIsOpen()) {
      this._testResults = null
      await this._eyes.open(global.browser)
    }

    if (this._scrollRootElement) {
      await this._eyes.setScrollRootElement(this._scrollRootElement)
      this._scrollRootElement = undefined
    }
  }

  async _eyesClose() {
    if (this._eyes.getIsOpen()) {
      this._testResults = await this._eyes.close(false)
    }
  }
}

exports.EyesService = EyesService
