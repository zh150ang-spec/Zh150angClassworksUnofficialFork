export function debounce(fn, delay) {
  let timer = null;
  const wrapper = function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  };
  wrapper.cancel = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return wrapper;
}

export function throttle(fn, delay) {
  let timer = null;
  let last = 0;
  const wrapper = function (...args) {
    const now = Date.now();
    if (now - last < delay) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        last = now;
        fn.apply(this, args);
      }, delay);
    } else {
      last = now;
      fn.apply(this, args);
    }
  };
  wrapper.cancel = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return wrapper;
}
