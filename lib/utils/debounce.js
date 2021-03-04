const debounce = (func, wait, immediate) => {
    let timeout, args, context, timestamp, result;

    const later = () => {
        const last = Date.now() - timestamp;

        if (last < wait && last >= 0) {
            timeout = setTimeout(later, wait - last);
        } else {
            timeout = null;
            if (!immediate) {
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            }
        }
    };

    let action = function () {
        context = this;
        args = arguments;
        timestamp = Date.now();
        const callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
            result = func.apply(context, args);
            context = args = null;
        }

        return result;
    };

    action.abort = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };

    action.isScheduled = () => {
        return !!timeout;
    };

    return action;
};

export default debounce;
