/** @internal */
const escapeRegex = (value: string): string => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

export default escapeRegex;
