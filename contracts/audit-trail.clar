;; Audit Trail Contract
;; Tracks all access to sensitive health information

(define-data-var admin principal tx-sender)

;; Structure to store audit events
(define-map audit-events
  {
    event-id: uint
  }
  {
    event-type: (string-ascii 64),
    resource-id: (string-ascii 64),
    actor: principal,
    timestamp: uint,
    details: (optional (string-ascii 256))
  }
)

;; Counter for event IDs
(define-data-var event-counter uint u0)

;; Error codes
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_NOT_FOUND u3)
(define-constant ERR_INVALID_INPUT u4)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Check if caller is an authorized contract
(define-private (is-authorized-contract)
  (or
    (is-eq contract-caller .patient-identity)
    (is-eq contract-caller .provider-verification)
    (is-eq contract-caller .record-access)
  )
)

;; Log an event to the audit trail
(define-public (log-event
  (event-type (string-ascii 64))
  (resource-id (string-ascii 64))
  (actor principal)
)
  (let
    (
      (caller contract-caller)
      (current-time (unwrap-panic (get-block-info? time (- block-height u1))))
      (event-id (var-get event-counter))
    )
    ;; Only authorized contracts or admin can log events
    (asserts! (or (is-authorized-contract) (is-admin)) (err ERR_UNAUTHORIZED))
    (asserts! (> (len event-type) u0) (err ERR_INVALID_INPUT))

    ;; Increment the event counter
    (var-set event-counter (+ event-id u1))

    ;; Store the audit event
    (map-set audit-events
      { event-id: event-id }
      {
        event-type: event-type,
        resource-id: resource-id,
        actor: actor,
        timestamp: current-time,
        details: none
      }
    )

    (ok event-id)
  )
)

;; Log an event with additional details
(define-public (log-event-with-details
  (event-type (string-ascii 64))
  (resource-id (string-ascii 64))
  (actor principal)
  (details (string-ascii 256))
)
  (let
    (
      (caller contract-caller)
      (current-time (unwrap-panic (get-block-info? time (- block-height u1))))
      (event-id (var-get event-counter))
    )
    ;; Only authorized contracts or admin can log events
    (asserts! (or (is-authorized-contract) (is-admin)) (err ERR_UNAUTHORIZED))
    (asserts! (> (len event-type) u0) (err ERR_INVALID_INPUT))

    ;; Increment the event counter
    (var-set event-counter (+ event-id u1))

    ;; Store the audit event
    (map-set audit-events
      { event-id: event-id }
      {
        event-type: event-type,
        resource-id: resource-id,
        actor: actor,
        timestamp: current-time,
        details: (some details)
      }
    )

    (ok event-id)
  )
)

;; Get an audit event by ID
(define-read-only (get-audit-event (event-id uint))
  (let
    (
      (caller tx-sender)
    )
    ;; Only admin can retrieve audit events
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))

    (match (map-get? audit-events {event-id: event-id})
      event-data (ok event-data)
      (err ERR_NOT_FOUND)
    )
  )
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (var-set admin new-admin)
    (ok true)
  )
)
