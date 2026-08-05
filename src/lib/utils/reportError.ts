/**
 * Context describing where a library-internal error/warning originated.
 * `source` identifies the callback or code path (e.g. `'unrenderItem'`),
 * `level` distinguishes a genuine thrown error from a soft internal warning.
 * Additional free-form fields may be attached for debugging (e.g. `index`, `item`).
 */
export interface LibraryErrorContext {
    source: string;
    level?: 'warn' | 'error';
    [key: string]: any;
}

/**
 * Optional hook so consumers can intercept/redirect errors and warnings
 * that would otherwise go straight to `console.error`/`console.warn`
 * (e.g. exceptions thrown from a user-supplied `renderItem`/`unrenderItem`).
 */
export type LibraryErrorHandler = (error: any, context: LibraryErrorContext) => void;

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
