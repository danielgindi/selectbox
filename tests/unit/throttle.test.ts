import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import throttle from '../../src/lib/utils/throttle';

// The throttle drives search filtering (`filterThrottleWindow`), so its
// leading/trailing semantics directly decide when the list re-filters while typing.
describe('throttle', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('runs the first call immediately and coalesces the burst into one trailing call with the latest args', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled('a');
        throttled('b');
        throttled('c');

        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenLastCalledWith('a');

        vi.advanceTimersByTime(100);

        expect(fn).toHaveBeenCalledTimes(2);
        expect(fn).toHaveBeenLastCalledWith('c');
    });

    it('with leading: false, only runs once the window has elapsed', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100, { leading: false });

        throttled('a');
        throttled('b');
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith('b');
    });

    it('with trailing: false, drops calls made inside the window', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100, { trailing: false });

        throttled('a');
        throttled('b');
        vi.advanceTimersByTime(100);

        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith('a');
    });

    it('cancel() drops the pending trailing call and resets the window', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled('a');
        throttled('b');
        expect(throttled.isScheduled()).toBe(true);

        throttled.cancel();
        expect(throttled.isScheduled()).toBe(false);

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledOnce();

        // A fresh call after cancel() is a new leading call
        throttled('c');
        expect(fn).toHaveBeenLastCalledWith('c');
    });
});
