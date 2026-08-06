-- Gate table cleanup. Only reached when every assert passed (a failed assert violates
-- its CHECK and rolls back the transaction before getting here).
DELETE FROM verifactu__gate;
