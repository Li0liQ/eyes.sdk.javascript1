
function __runRunBeforeScript(...args) {
  var runRunBeforeScript = (function () {
  'use strict';

  /* global window */

  function getClientAPI() {
    const frameWindow = getFrameWindow();
    const api = frameWindow && frameWindow.__STORYBOOK_CLIENT_API__;
    const addons = frameWindow && frameWindow.__STORYBOOK_ADDONS;

    const v5Api = {
      getStories: () => {
        return api.raw();
      },
      selectStory: i => {
        api._storyStore.setSelection(api.raw()[i]);
      },
      version: 5,
    };

    const v4Api = {
      getStories: () => {
        if (!frameWindow.__APPLITOOLS_STORIES) {
          frameWindow.__APPLITOOLS_STORIES = Object.values(api._storyStore._data)
            .map(({stories, kind}) => Object.values(stories).map(s => ({...s, kind})))
            .flat();
        }
        return frameWindow.__APPLITOOLS_STORIES;
      },
      selectStory: i => {
        const {kind, name: story} = v4Api.getStories()[i];
        addons.channel._listeners.setCurrentStory[0]({kind, story});
      },
      version: 4,
    };

    const v5 = api && api.raw;
    const v4 =
      addons &&
      addons.channel &&
      addons.channel._listeners &&
      addons.channel._listeners.setCurrentStory &&
      addons.channel._listeners.setCurrentStory[0];
    if (v5) {
      return v5Api;
    } else if (v4) {
      return v4Api;
    }

    function getFrameWindow() {
      if (/iframe.html/.test(window.location.href)) {
        return window;
      }
      return Array.prototype.filter.call(window.frames, frame => {
        try {
          return /\/iframe.html/.test(frame.location.href);
        } catch (e) {}
      })[0];
    }
  }

  var storybookApi = getClientAPI;

  /* global document */


  function runRunBeforeScript(index) {
    const api = storybookApi();
    if (!api) {
      console.log('error cannot get client api');
      return;
    }
    const story = api.getStories()[index];
    if (!story) {
      console.log('error cannot get story', index);
      return;
    }
    return story.parameters.eyes.runBefore({rootEl: document.getElementById('root'), story});
  }

  var runRunBeforeScript_1 = runRunBeforeScript;

  return runRunBeforeScript_1;

}());

  return runRunBeforeScript.apply(this, args);
}
module.exports = __runRunBeforeScript