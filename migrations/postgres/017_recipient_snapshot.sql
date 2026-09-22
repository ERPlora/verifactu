-- Who the customer of the invoice is, as `Destinatarios` needs it (hub#1975).
--
-- A full invoice (F1, F3, R1-R4) has to name its customer: the AEAT rejects it with error 1189
-- otherwise. The engine used to hand the customer to the envelope built at the time of the sale
-- only, so a sale that could not leave on the spot (no road yet, the cell down) reached the drain
-- with no customer, and the hub refused its own invoice with its chain number already spent.
-- Same snapshot, and the same reason, as `substitutes_*` (005) and `rectifies_*` (014): a deferred
-- send rebuilds the XML from this row, so what is not here never reaches the AEAT.
--
-- `recipient_country` is ISO 3166 alpha-2 and `recipient_id_type` the AEAT `IDType` of the
-- customer's document (hub#1967): with them a foreign customer goes as `IDOtro`.
--
-- NOT NULL DEFAULT '' all four: "no customer" (a simplified ticket, F2) is the empty string, the
-- value the engine already reads as "no Destinatarios". Rows sealed before this migration read
-- as empty too: they left with their customer at the time of the sale, or were rejected by it.
ALTER TABLE verifactu_record ADD COLUMN IF NOT EXISTS recipient_nif TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_record ADD COLUMN IF NOT EXISTS recipient_name TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_record ADD COLUMN IF NOT EXISTS recipient_country TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_record ADD COLUMN IF NOT EXISTS recipient_id_type TEXT NOT NULL DEFAULT '';
