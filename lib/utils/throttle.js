const throttle = (func, wait, options) => {
    let timeout, context, args, result;
    let previous = 0;
    if (!options) options = {};

    const later = () => {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
    };

    const throttled = function () {
        const now = Date.now();
        if (!previous && options.leading === false)
            previous = now;

        const remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };

    throttled.cancel = () => {
        clearTimeout(timeout);
        previous = 0;
        timeout = context = args = null;
    };

    throttled.isScheduled = () => {
        return !!timeout;
    };

    return throttled;
};

export default throttle;
