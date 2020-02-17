async function getElementLocation({driver, selector, logger}) {
  try {
    const elementCoords = await driver.getLocation(selector)
    const elementIsInTopDocument = await _isElementInTopDocument(driver, selector)
    if (elementIsInTopDocument) {
      return elementCoords
    } else {
      const frameCoords = await _getFrameCoordsToElement(driver, selector)
      return _calculateNestedElementLocation({frameCoords, elementCoords})
    }
  } catch (error) {
    logger.log(`WARNING - web-element-util.getElementLocation errored: ${error}`)
  }
}

async function _isElementInTopDocument(driver, selector) {
  const r = await driver.execute(_selector => {
    // eslint-disable-next-line
    return document.querySelector(_selector).ownerDocument === window.top.document
  }, selector)
  return r && r.value ? r.value : false
}

async function _getFrameCoordsToElement(driver, selector) {
  const r = await driver.execute(_selector => {
    const frameCoords = []
    // eslint-disable-next-line
    let targetDocument = document.querySelector(_selector).ownerDocument
    console.log(`${targetDocument.body.innerHTML}`)
    // eslint-disable-next-line
    while (targetDocument !== window.top.document) {
      console.log('get frame coords')
      const frame = targetDocument.defaultView.frameElement
      frameCoords.push(frame.getBoundingClientRect())
      targetDocument = frame.ownerDocument
    }
    return frameCoords
  }, selector)
  return r && r.value ? r.value : []
}

function _calculateNestedElementLocation({frameCoords, elementCoords}) {
  let elementLocation = {x: 8, y: 8} // for the default 8px margin of the body tag
  elementLocation.x += elementCoords.x
  elementLocation.y += elementCoords.y
  frameCoords.forEach(frameCoord => {
    elementLocation.x += Math.ceil(frameCoord.x)
    elementLocation.y += Math.ceil(frameCoord.y)
  })
  return elementLocation
}

module.exports = {
  getElementLocation,
}
