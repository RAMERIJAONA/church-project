-- Comptabilité des entrées (2026-11-25) : chaque élément appartient aux sorties (`expense`,
-- toutes les données existantes) ou aux entrées (`income`).
-- CHECK de colonne ajouté à la main : une contrainte de table ferait recréer accounting_items
-- (référencée par les saisies et par elle-même), ce que les clés étrangères interdisent ici.
ALTER TABLE `accounting_items` ADD `ledger` text DEFAULT 'expense' NOT NULL CHECK (`ledger` IN ('expense', 'income'));--> statement-breakpoint
CREATE INDEX `accounting_items_ledger_idx` ON `accounting_items` (`ledger`);
