-- Une lettre par rubrique principale (règle du porteur, 2026-11-25) : sorties A1, B1, D1… et
-- entrées A2, B2, D2…, jamais D2 dans les sorties ni A3 dans les entrées.
-- Reprise écrite à la main : les rubriques de niveau 1 actives reçoivent, par comptabilité,
-- les lettres A, B, D… sans doublon ni trou, dans l'ordre lettre puis position (comme
-- `reletterRoots`). Ex. sorties A1, D1, D2 → A1, B1, D1. Ordre « longueur puis texte » = ordre
-- de l'alphabet malgache (A … Z, puis AA, AB…), lettres jusqu'à deux caractères (462 rubriques).
WITH `letters` (`i`, `ch`) AS (
  VALUES (0, 'A'), (1, 'B'), (2, 'D'), (3, 'E'), (4, 'F'), (5, 'G'), (6, 'H'), (7, 'I'),
    (8, 'J'), (9, 'K'), (10, 'L'), (11, 'M'), (12, 'N'), (13, 'O'), (14, 'P'), (15, 'R'),
    (16, 'S'), (17, 'T'), (18, 'V'), (19, 'Y'), (20, 'Z')
),
`ranked` AS (
  SELECT `id`, `prefix`,
    ROW_NUMBER() OVER (
      PARTITION BY `ledger` ORDER BY length(`prefix`), `prefix`, `position`, `id`
    ) - 1 AS `r`
  FROM `accounting_items`
  WHERE `parent_id` IS NULL AND `deleted_at` IS NULL
),
`target` AS (
  SELECT `id`,
    CASE
      WHEN `r` < 21 THEN (SELECT `ch` FROM `letters` WHERE `i` = `r`)
      WHEN `r` < 462 THEN (SELECT `ch` FROM `letters` WHERE `i` = (`r` - 21) / 21)
        || (SELECT `ch` FROM `letters` WHERE `i` = (`r` - 21) % 21)
      ELSE `prefix`
    END AS `prefix`
  FROM `ranked`
)
UPDATE `accounting_items`
SET `prefix` = `target`.`prefix`, `updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM `target`
WHERE `accounting_items`.`id` = `target`.`id` AND `accounting_items`.`prefix` <> `target`.`prefix`;--> statement-breakpoint
CREATE UNIQUE INDEX `accounting_items_root_letter_idx` ON `accounting_items` (`ledger`,`prefix`) WHERE "accounting_items"."parent_id" IS NULL AND "accounting_items"."deleted_at" IS NULL;
