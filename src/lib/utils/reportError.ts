import type { LibraryErrorContext, LibraryErrorHandler } from '../types.js';

/**
 * Routes an error/warning to `handler` if supplied, falling back to the
 * console (matching the previous hardcoded behaviour) if there is no
 * handler, or if the handler itself throws.
 * @internal
 */
const reportError = (handler: LibraryErrorHandler | null | undefined, error: any, context: LibraryErrorContext): void => {
    if (handler) {
        try {
            handler(error, context);
            return;
        } catch (handlerError) {
            // The handler itself failed - fall through to console so nothing is silently lost.
            console.error(handlerError); // eslint-disable-line no-console
        }
    }

    if (context.level === 'warn') {
        console.warn(error); // eslint-disable-line no-console
    } else {
        console.error(error); // eslint-disable-line no-console
    }
};

export default reportError;
