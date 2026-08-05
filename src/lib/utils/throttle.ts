/** @internal */
interface ThrottleOptions {
    leading?: boolean;
    trailing?: boolean;
}

/** @internal */
interface Throttled<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T> | undefined;
    cancel: () => void;
    isScheduled: () => boolean;
}

/** @internal */
const throttle = <T extends (...args: any[]) => any>(func: T, wait: number, options: ThrottleOptions = {}): Throttled<T> => {
    let timeout: ReturnType<typeof setTimeout> | null | undefined;
    let context: any;
    let args: IArguments | null | undefined;
    let result: ReturnType<T> | undefined;
    let previous = 0;

    const later = () => {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args as any);
        if (!timeout) context = args = null;
    };

    const throttled = function (this: any) {
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
            result = func.apply(context, args as any);
            if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    } as unknown as Throttled<T>;

    throttled.cancel = () => {
        clearTimeout(timeout as any);
        previous = 0;
        timeout = context = args = null;
    };

    throttled.isScheduled = () => {
        return !!timeout;
    };

    return throttled;
};

export default throttle;
export type { Throttled, ThrottleOptions };
