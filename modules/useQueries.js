import warning from 'warning'
import { parse, stringify } from 'query-string'
import runTransitionHook from './runTransitionHook'
import parsePath from './parsePath'
import deprecate from './deprecate'

const SEARCH_BASE_KEY = '$searchBase'

function defaultStringifyQuery(query) {
  return stringify(query).replace(/%20/g, '+')
}

const defaultParseQueryString = parse

function isNestedObject(object) {
  for (const p in object)
    if (object.hasOwnProperty(p) &&
        typeof object[p] === 'object' &&
        !Array.isArray(object[p]) &&
        object[p] !== null)
      return true

  return false
}

/**
 * Returns a new createHistory function that may be used to create
 * history objects that know how to handle URL queries.
 */
function useQueries(createHistory) {
  return function (options={}) {
    let { stringifyQuery, parseQueryString, ...historyOptions } = options
    let history = createHistory(historyOptions)

    if (typeof stringifyQuery !== 'function')
      stringifyQuery = defaultStringifyQuery

    if (typeof parseQueryString !== 'function')
      parseQueryString = defaultParseQueryString

    function addQuery(location) {
      if (location.query == null) {
        const { search } = location
        location.query = parseQueryString(search.substring(1))
        location[SEARCH_BASE_KEY] = { search, searchBase: '' }
      }

      // TODO: Instead of all the book-keeping here, this should just strip the
      // stringified query from the search.

      return location
    }

    function appendQuery(location, query) {
      let queryString
      if (!query || (queryString = stringifyQuery(query)) === '')
        return location

      warning(
        stringifyQuery !== defaultStringifyQuery || !isNestedObject(query),
        'useQueries does not stringify nested query objects by default; ' +
        'use a custom stringifyQuery function'
      )

      if (typeof location === 'string')
        location = parsePath(location)

      const searchBaseSpec = location[SEARCH_BASE_KEY]
      let searchBase
      if (searchBaseSpec && location.search === searchBaseSpec.search) {
        searchBase = searchBaseSpec.searchBase
      } else {
        searchBase = location.search || ''
      }

      const search = searchBase + (searchBase ? '&' : '?') + queryString

      return {
        ...location,
        search,
        [SEARCH_BASE_KEY]: { search, searchBase }
      }
    }

    // Override all read methods with query-aware versions.
    function listenBefore(hook) {
      return history.listenBefore(function (location, callback) {
        runTransitionHook(hook, addQuery(location), callback)
      })
    }

    function listen(listener) {
      return history.listen(function (location) {
        listener(addQuery(location))
      })
    }

    // Override all write methods with query-aware versions.
    function push(location) {
      history.push(appendQuery(location, location.query))
    }

    function replace(location) {
      history.replace(appendQuery(location, location.query))
    }

    function createPath(path, query) {
      return history.createPath(appendQuery(path, query))
    }

    function createHref(path, query) {
      return history.createHref(appendQuery(path, query))
    }

    function createLocation() {
      return addQuery(history.createLocation.apply(history, arguments))
    }

    // deprecated
    function pushState(state, path, query) {
      if (typeof path === 'string')
        path = parsePath(path)

      push({ state, ...path, query })
    }

    // deprecated
    function replaceState(state, path, query) {
      if (typeof path === 'string')
        path = parsePath(path)

      replace({ state, ...path, query })
    }

    return {
      ...history,
      listenBefore,
      listen,
      push,
      replace,
      createPath,
      createHref,
      createLocation,

      pushState: deprecate(
        pushState,
        'pushState is deprecated; use push instead'
      ),
      replaceState: deprecate(
        replaceState,
        'replaceState is deprecated; use replace instead'
      )
    }
  }
}

export default useQueries
