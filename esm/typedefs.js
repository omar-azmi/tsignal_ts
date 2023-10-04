/** base type definitions <br>
 * @module
*/
export var SignalUpdateStatus;
(function (SignalUpdateStatus) {
    SignalUpdateStatus[SignalUpdateStatus["ABORTED"] = -1] = "ABORTED";
    SignalUpdateStatus[SignalUpdateStatus["UNCHANGED"] = 0] = "UNCHANGED";
    SignalUpdateStatus[SignalUpdateStatus["UPDATED"] = 1] = "UPDATED";
})(SignalUpdateStatus || (SignalUpdateStatus = {}));
