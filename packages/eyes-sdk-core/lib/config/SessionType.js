'use strict'

/**
 * The type of the session.
 *
 * @readonly
 * @enum {string}
 */
const SessionType = {
  /**
   * Default type of sessions.
   */
  SEQUENTIAL: 'SEQUENTIAL',

  /**
   * A timing test session
   */
  PROGRESSION: 'PROGRESSION',
}

Object.freeze(SessionType)
exports.SessionType = SessionType
