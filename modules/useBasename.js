import { canUseDOM } from './ExecutionEnvironment'
import runTransitionHook from './runTransitionHook'
import extractPath from './extractPath'
import parsePath from './parsePath'
import deprecate from './deprecate'

function useBasename(createHistory) {
  return function (options={}) {
    let { basename, ...historyOptions } = options
    let history = createHistory(historyOptions)

    // Automatically use the value of <base href> in HTML
    // documents as basename if it's not explicitly given.
    if (basename == null && canUseDOM) {
      let base = document.getElementsByTagName('base')[0]

      if (base)
        basename = extractPath(base.href)
    }

    function addBasename(location) {
      if (basename && location.basename == null) {
        if (location.pathname.indexOf(basename) === 0) {
          location.pathname = location.pathname.substring(basename.length)
          location.basename = basename

          if (location.pathname === '')
            location.pathname = '/'
        } else {
          location.basename = ''
        }
      }

      return location
    }

    function prependBasename(location) {
      if (!basename)
        return location

      if (typeof location === 'string')
        location = parsePath(location)

      const pname = location.pathname
      const normalizedBasename = basename.slice(-1) === '/' ? basename : basename + '/'
      const normalizedPathname = pname.charAt(0) === '/' ? pname.slice(1) : pname
      const pathname = normalizedBasename + normalizedPathname

      return {
        ...location,
        pathname
      }
    }

    // Override all read methods with basename-aware versions.
    function listenBefore(hook) {
      return history.listenBefore(function (location, callback) {
        runTransitionHook(hook, addBasename(location), callback)
      })
    }

    function listen(listener) {
      return history.listen(function (location) {
        listener(addBasename(location))
      })
    }

    // Override all write methods with basename-aware versions.
    function push(location) {
      history.push(prependBasename(location))
    }

    function replace(location) {
      history.replace(prependBasename(location))
    }

    function createPath(path) {
      return history.createPath(prependBasename(path))
    }

    function createHref(path) {
      return history.createHref(prependBasename(path))
    }

    function createLocation() {
      return addBasename(history.createLocation.apply(history, arguments))
    }

    // deprecated
    function pushState(state, path) {
      if (typeof path === 'string')
        path = parsePath(path)

      push({ state, ...path })
    }

    // deprecated
    function replaceState(state, path) {
      if (typeof path === 'string')
        path = parsePath(path)

      replace({ state, ...path })
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

export default useBasename
