'use strict';

function fetchUrl(url, fetch = window.fetch) {
  // Why return a `new Promise` like this? Because people like Atlassian do horrible things.
  // They monkey patched window.fetch, and made it so it throws a synchronous exception if the route is not well known.
  // Returning a new Promise guarantees that `fetchUrl` is the async function that it declares to be.
  return new Promise((resolve, reject) => {
    return fetch(url, {cache: 'force-cache', credentials: 'same-origin'})
      .then(resp =>
        resp.status === 200
          ? resp.arrayBuffer().then(buff => ({
              url,
              type: resp.headers.get('Content-Type'),
              value: buff,
            }))
          : Promise.reject(new Error(`bad status code ${resp.status}`)),
      )
      .then(resolve)
      .catch(err => reject(err));
  });
}

module.exports = fetchUrl;
