/** utility typescript type and interface definitions
 * @module
*/
export const isUnitInterval = (value) => value >= 0 && value <= 1 ? true : false;
export const isUByte = (value) => value >= 0 && value <= 255 && value === (value | 0) ? true : false;
export const isDegrees = (value) => value >= 0 && value <= 360 ? true : false;
export const isRadians = (value) => value >= 0 && value <= Math.PI ? true : false;
/// STRUCTURE DEFINITIONS
