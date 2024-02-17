/** base type definitions <br>
 * @module
*/
/** the numbers used for relaying the status of a signal after it has been _ran_ via its {@link Signal.run | `run method`}. <br>
 * these numbers convey the following instructions to the context's topological update cycle {@link context!Context.propagateSignalUpdate}:
 * - ` 1`: this signal's value has been updated, and therefore its observers should be updated too.
 * - ` 0`: this signal's value has not changed, and therefore its observers should be _not_ be updated.
 *   do note that an observer signal will still run if some _other_ of its dependency signal did update this cycle (i.e. had a status value of `1`)
 * - `-1`: this signal has been aborted, and therefore its observers must abort execution as well.
 *   the observers will abort _even_ if they had a dependency that _did_ update (had a status value of `1`)
 *
 * to sum up, given a signal `D`, with dependencies: `A`, `B`, and `C` (all of which are mutually independent of each other).
 * then the status of `D` will be as follows in the order of highest conditional priority to lowest:
 * | status of D           |          status of D as enum          |                                   condition                                   |
 * |-----------------------|:-------------------------------------:|:-----------------------------------------------------------------------------:|
 * | `status(D) = -1`      | `ABORTED`                             | `∃X ∈ [A, B, C] such that status(X) === -1` |
 * | `status(D) = D.run()` | `CHANGED` or `UNCHANGED` or `ABORTED` | `∃X ∈ [A, B, C] such that status(X) ===  1` |
 * | `status(D) = 0`       | `UNCHANGED`                           | `∀X ∈ [A, B, C], status(X) === 0`           |
*/
export var SignalUpdateStatus;
(function (SignalUpdateStatus) {
    SignalUpdateStatus[SignalUpdateStatus["ABORTED"] = -1] = "ABORTED";
    SignalUpdateStatus[SignalUpdateStatus["UNCHANGED"] = 0] = "UNCHANGED";
    SignalUpdateStatus[SignalUpdateStatus["UPDATED"] = 1] = "UPDATED";
})(SignalUpdateStatus || (SignalUpdateStatus = {}));
