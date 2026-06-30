# Flipkart SuperCoin Frontend Implementation Plan

## Goal

Integrate Flipkart SuperCoin into the Gift360 frontend in a way that is fully backed by the backend wrapper contract and does not overlap with the app's existing local wallet flow.

## Scope

This plan covers:

- Customer eligibility check
- SuperCoin balance fetch
- OTP redemption flow
- Non-OTP redemption flow
- Hold cancellation
- Optional refund and history visibility

This plan does not cover:

- Backend-only APIs such as `add`, `deduct`, or transaction status checks
- Replacing the existing app wallet implementation
- Brand browsing or onboarding flows

## Current Frontend Fit

The strongest integration point is the checkout flow in `Cart`.

Secondary fit areas:

- `Profile` for balance visibility
- `OrderDetails` for history and post-purchase visibility
- `Refund` only if a real support/refund action screen is needed later

## Phase 1: Shared API Layer

### Task

Add a dedicated SuperCoin API module under `src/api/`.

### Methods to add

- `searchUser`
- `enrolUser`
- `balance`
- `initHold`
- `authorizeHold`
- `hold`
- `redeemHold`
- `unhold`
- `refund`
- `transactions`
- `expiring`

### Rules

- Call only backend wrapper routes under `/api/v1/supercoin`
- Do not call Flipkart raw APIs directly from the frontend
- Do not expose backend-only routes in normal customer UI

## Phase 2: Shared Hooks

### Task

Add a hook layer so components do not call Axios directly.

### Suggested hook groups

- Identity hooks
  - `useSearchSuperCoinUser`
  - `useEnrolSuperCoinUser`
  - `useSuperCoinBalance`
- Redemption hooks
  - `useInitHold`
  - `useAuthorizeHold`
  - `useHold`
  - `useRedeemHold`
  - `useUnhold`
- Support hooks
  - `useSuperCoinRefund`
  - `useSuperCoinTransactions`
  - `useSuperCoinExpiring`

### Rule

Keep SuperCoin logic in a small reusable hook layer so checkout screens stay readable.

## Phase 3: Cart Checkout Integration

### File

- [src/pages/Cart.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/pages/Cart.tsx)

### Why here

`Cart` already owns:

- order creation
- wallet deduction
- coupon validation
- payment initiation

### Add SuperCoin UI

Place a new SuperCoin section near the existing wallet and coupon area.

### Flow

1. Check user with `searchUser`
2. If needed, call `enrolUser`
3. Load `balance`
4. Let the user choose redemption mode
5. Run either:
   - `balance -> initHold -> authorizeHold`
   - `balance -> hold -> redeemHold`
6. Allow `unhold` if a hold is pending

### State to keep

- SuperCoin eligibility status
- SuperCoin balance
- Selected redemption mode
- Hold or init transaction id
- OTP input and OTP submission state if needed
- Success/failure status for UI feedback

### Important rule

Do not mix SuperCoin with the existing app wallet code in `Cart`.

The current wallet feature uses the app's own backend wallet API, so SuperCoin must remain a separate flow unless product explicitly says otherwise.

## Phase 4: Profile Visibility

### File

- [src/pages/Profile.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/pages/Profile.tsx)

### Purpose

Show account-level SuperCoin visibility only.

### Good additions

- SuperCoin balance
- Enrollment/activation status
- Optional expiring coins summary later

### Rule

Keep `Profile` informational only for the first release.

## Phase 5: Order History And Post-Purchase Views

### File

- [src/pages/OrderDetails.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/pages/OrderDetails.tsx)

### Purpose

Show post-purchase visibility for users who want to inspect what happened after checkout.

### Good additions

- SuperCoin transaction history
- Redeemed transaction reference
- Refund or reversal status

### Rule

Do not move the main redemption flow into `OrderDetails`.

## Phase 6: Refund Support

### File

- [src/pages/Refund.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/pages/Refund.tsx)

### Current state

The page currently behaves as a policy page, not a real refund workflow.

### Options

- Keep it as policy only
- Convert it into a support/refund action screen
- Add a separate authenticated support flow later

### Refund contract rule

- Use a new refund `merchantTransactionId`
- Use the successful redeem `transactionId` as `referenceTransactionId`
- Keep refund behind eligibility checks

## Phase 7: Optional Brand-Level Integration

### File

- [src/components/PaymentDetailsSheet.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/components/PaymentDetailsSheet.tsx)

### Recommendation

Do not add SuperCoin here in v1 unless the product specifically wants brand-level redemption from the product sheet.

If added later, reuse the same flow as `Cart` and do not duplicate business logic.

## Phase 8: State Persistence Rules

Store only what the next SuperCoin step needs.

### Required values

- `transactionId`
- `responseId`
- `transactionState`
- `amount`
- `stampExpiry`
- `otp` only if OTP flow is enabled

### Do not store

- Raw upstream assumptions
- Duplicate wallet state
- Unused backend-only identifiers in normal user UI

## Phase 9: Error Handling

Use the existing app toast and error patterns.

### Handle these cases clearly

- User not enrolled
- User not found
- Insufficient balance
- OTP failure
- Hold expiry
- Refund ineligible
- Network or backend failure

## Phase 10: Validation Order

Test the integration in this order:

1. Eligibility and balance
2. OTP redemption
3. Non-OTP redemption
4. Hold cancellation
5. Profile visibility
6. Order history visibility
7. Refund support, if enabled

## Suggested Implementation Order

1. Add the shared SuperCoin API module
2. Add SuperCoin hooks
3. Integrate Cart checkout flow
4. Add Profile visibility
5. Add OrderDetails visibility
6. Add refund support if needed
7. Add brand-level SuperCoin support only if product requests it

## Notable Existing Frontend Files

- [src/pages/Cart.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/pages/Cart.tsx)
- [src/pages/PaymentResult.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/pages/PaymentResult.tsx)
- [src/pages/OrderDetails.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/pages/OrderDetails.tsx)
- [src/pages/Profile.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/pages/Profile.tsx)
- [src/pages/Refund.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/pages/Refund.tsx)
- [src/components/PaymentDetailsSheet.tsx](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/components/PaymentDetailsSheet.tsx)
- [src/api/walletApi.ts](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/api/walletApi.ts)
- [src/lib/valuedesignApi.ts](C:/Users/rikku/OneDrive/Desktop/gv360fk/Gift360_Mobile_View-main/src/lib/valuedesignApi.ts)

## Final Rule

If a SuperCoin behavior is not backed by the backend wrapper controller, DTOs, or YAML, do not put it into the frontend plan.
