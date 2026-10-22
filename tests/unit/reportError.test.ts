import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import reportError from '../../src/lib/utils/reportError';

// Backs the public `onError` option: errors thrown by user render callbacks
// must reach the consumer's handler, and must never be silently swallowed.
describe('reportError', () => {
    let consoleError: ReturnType<typeof vi.spyOn>;
    let consoleWarn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => vi.restoreAllMocks());

    it('routes the error and its context to the handler instead of the console', () => {
        const handler = vi.fn();
        const error = new Error('boom');
        const context = { source: 'renderItem', index: 3 };

        reportError(handler, error, context);

        expect(handler).toHaveBeenCalledWith(error, context);
        expect(consoleError).not.toHaveBeenCalled();
        expect(consoleWarn).not.toHaveBeenCalled();
    });

    it.each([
        { level: 'error' as const, channel: () => consoleError },
        { level: undefined, channel: () => consoleError },
        { level: 'warn' as const, channel: () => consoleWarn },
    ])('without a handler, logs level=$level to the matching console channel', ({ level, channel }) => {
        const error = new Error('boom');

        reportError(undefined, error, { source: 'x', level });

        expect(channel()).toHaveBeenCalledWith(error);
    });

    it('falls back to the console, and logs the handler failure, when the handler throws', () => {
        const handlerError = new Error('handler failed');
        const error = new Error('original');

        reportError(() => { throw handlerError; }, error, { source: 'x' });

        expect(consoleError).toHaveBeenCalledWith(handlerError);
        expect(consoleError).toHaveBeenCalledWith(error);
    });
});
