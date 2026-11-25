/* eslint-disable max-lines -- données du plan de démonstration, pas de la logique */
/**
 * Plan comptable de DÉMONSTRATION (fictif, en français), pour tester l'application à la main :
 * `npm run seed:accounting` puis `npm run dev:seed`. Montants générés par
 * `tests/factories/accounting.demo-seed.ts`. Aucune donnée personnelle.
 *
 * Deux comptabilités : ENTRÉES (numéros à partir de 2 : A2, A3, B2…) et SORTIES (A1, B1…),
 * chacune avec ses propres lettres.
 * Couvre exprès : les 4 niveaux, plusieurs rubriques sur une même lettre (entrées A2, A3 ;
 * sorties D1, D2), groupes et rubriques à montants à chaque niveau, une rubrique principale
 * sans sous-rubrique (J1), de très grands montants (K1), des descriptions longues, une
 * section supprimée (renumérotation des entrées) et des rubriques laissées vides.
 *
 * Une feuille est une chaîne ; un groupe est `{ d, c }`.
 */

import type { Ledger } from '@shared/domain/accounting/accounting.types'

export type DemoNode =
  | string
  | {
      d: string
      c?: DemoNode[]
      /** Échelle des montants (Ar) ; sinon tirée au hasard (déterministe) */
      scale?: number
      /** Aucune saisie (rubrique vide, à tester) */
      empty?: boolean
    }

export interface DemoRoot {
  /** Comptabilité : entrées (A2, B2…) ou sorties (A1, B1…) ; lettres propres à chacune */
  ledger: Ledger
  prefix: string
  d: string
  c?: DemoNode[]
  scale?: number
  /** Créée puis supprimée : vérifie la renumérotation des suivantes */
  deleted?: boolean
}

const parish = (name: string): DemoNode => ({
  d: `Paroisse ${name}`,
  c: [
    'Offrandes reçues',
    'Contribution à l’église mère',
    { d: 'Entretien de la chapelle', c: ['Toiture', 'Bancs', 'Peinture'] },
    'Visites pastorales'
  ]
})

export const DEMO_PLAN: DemoRoot[] = [
  {
    ledger: 'income',
    prefix: 'A',
    d: 'Offrandes et dons',
    c: [
      {
        d: 'Offrandes du culte du dimanche',
        c: ['Culte du matin', 'Culte de l’après-midi', 'Culte des jeunes']
      },
      'Dîmes',
      {
        d: 'Dons exceptionnels',
        c: [
          {
            d: 'Dons des familles',
            c: [
              'Familles de la paroisse nord',
              'Familles de la paroisse sud',
              'Familles de la diaspora'
            ]
          },
          'Dons d’entreprises',
          'Legs et successions'
        ]
      },
      {
        d: 'Collectes spéciales',
        c: ['Collecte de Pâques', 'Collecte de Noël', 'Collecte pour la construction']
      }
    ]
  },
  {
    ledger: 'income',
    prefix: 'A',
    d: 'Ancienne rubrique à supprimer',
    deleted: true,
    c: ['Ligne supprimée avec sa rubrique']
  },
  {
    ledger: 'income',
    prefix: 'A',
    d: 'Recettes diverses',
    c: [
      'Location de la salle polyvalente',
      'Vente de livres et de cantiques',
      'Intérêts bancaires',
      { d: 'Kermesse annuelle', c: ['Stands de nourriture', 'Tombola', 'Jeux pour enfants'] }
    ]
  },
  {
    ledger: 'income',
    prefix: 'B',
    d: 'Subventions et partenariats',
    c: [
      'Subvention de la FJKM nationale',
      { d: 'Partenaires étrangers', c: ['Église sœur en France', 'Église sœur en Suisse'] },
      'Aide de la commune'
    ]
  },
  {
    ledger: 'income',
    prefix: 'D',
    d: 'Activités génératrices de revenus',
    c: [
      {
        d: 'Rizière de l’église',
        c: [{ d: 'Récoltes', c: ['Première saison', 'Deuxième saison'] }, 'Location de parcelles']
      },
      'Atelier de couture',
      'Vente de produits artisanaux'
    ]
  },
  {
    ledger: 'expense',
    prefix: 'A',
    d: 'Personnel et ministère',
    c: [
      {
        d: 'Pasteur',
        c: [
          'Salaire du pasteur',
          'Indemnité de logement',
          'Frais de déplacement pastoral',
          'Cotisations sociales'
        ]
      },
      {
        d: 'Évangélistes',
        c: ['Évangéliste de la paroisse nord', 'Évangéliste de la paroisse sud']
      },
      { d: 'Gardien et entretien', c: ['Salaire du gardien', 'Salaire de l’agent d’entretien'] },
      {
        d: 'Formation des responsables',
        c: [
          {
            d: 'Séminaires',
            c: [
              'Séminaire des diacres',
              'Séminaire des moniteurs',
              'Séminaire des responsables de chorale'
            ]
          },
          'Livres et supports de formation'
        ]
      }
    ]
  },
  {
    ledger: 'expense',
    prefix: 'B',
    d: 'Bâtiments et entretien',
    c: [
      {
        d: 'Temple principal',
        c: [
          'Électricité',
          'Eau',
          'Réparations de la toiture',
          'Peinture intérieure et extérieure',
          { d: 'Sonorisation', c: ['Microphones', 'Haut-parleurs', 'Table de mixage'] }
        ]
      },
      { d: 'Presbytère', c: ['Entretien courant', 'Mobilier'] },
      {
        d: 'Construction de la nouvelle salle',
        c: [
          'Fondations',
          'Murs et charpente',
          { d: 'Menuiserie', c: ['Portes', 'Fenêtres', 'Bancs de la salle'] },
          'Électricité et plomberie'
        ]
      }
    ]
  },
  {
    ledger: 'expense',
    prefix: 'D',
    d: 'École du dimanche',
    c: [
      'Matériel pédagogique',
      'Goûters des enfants',
      'Fête de fin d’année des enfants',
      { d: 'Moniteurs', c: ['Formation des moniteurs', 'Tenues des moniteurs'] }
    ]
  },
  {
    ledger: 'expense',
    prefix: 'D',
    d: 'Jeunesse',
    c: [
      { d: 'Camp de jeunes', c: ['Transport', 'Hébergement', 'Repas'] },
      'Rencontres mensuelles',
      { d: 'Équipe de sport', empty: true }
    ]
  },
  {
    ledger: 'expense',
    prefix: 'E',
    d: 'Musique et chorales',
    c: [
      {
        d: 'Chorale principale',
        c: ['Uniformes', 'Partitions', 'Participation aux concours régionaux']
      },
      'Chorale des jeunes',
      {
        d: 'Instruments',
        c: ['Piano et clavier', 'Guitares et batterie', 'Accordage et réparations']
      }
    ]
  },
  {
    ledger: 'expense',
    prefix: 'F',
    d: 'Œuvres sociales',
    c: [
      'Aide aux familles en difficulté',
      'Soins médicaux des membres âgés',
      { d: 'Bourses scolaires', c: ['Primaire', 'Collège', 'Lycée et université'] },
      'Secours en cas de catastrophe naturelle : cyclones, inondations, sécheresse dans le Sud et reconstruction des maisons des familles sinistrées'
    ]
  },
  {
    ledger: 'expense',
    prefix: 'G',
    d: 'Missions et évangélisation',
    c: [
      {
        d: 'Soutien aux missionnaires',
        c: ['Mission dans la région Alaotra-Mangoro', 'Mission dans la région Atsinanana']
      },
      'Campagnes d’évangélisation',
      'Distribution de bibles'
    ]
  },
  {
    ledger: 'expense',
    prefix: 'H',
    d: 'Administration',
    c: [
      'Fournitures de bureau',
      'Téléphone et internet',
      'Frais bancaires',
      { d: 'Assurances', c: ['Assurance des bâtiments', 'Assurance des véhicules'] },
      'Contribution au synode régional',
      'Contribution à la FJKM nationale'
    ]
  },
  {
    ledger: 'expense',
    prefix: 'I',
    d: 'Cérémonies et fêtes',
    c: [
      'Fête de Pâques',
      'Fête de Noël',
      'Anniversaire de la paroisse',
      'Mariages et baptêmes collectifs'
    ]
  },
  // Rubrique principale sans sous-rubrique : porte directement ses montants
  { ledger: 'expense', prefix: 'J', d: 'Réserve de trésorerie', scale: 15_000_000 },
  // Très grands montants (11 à 12 chiffres) : aucun montant ne doit être tronqué
  {
    ledger: 'expense',
    prefix: 'K',
    d: 'Fonds de construction à long terme',
    scale: 98_765_432_100
  },
  {
    ledger: 'expense',
    prefix: 'L',
    d: 'Paroisses annexes',
    c: [
      parish('d’Ambatondrazaka centre'),
      parish('de Feramanga'),
      parish('d’Imerimandroso'),
      parish('d’Amparafaravola'),
      parish('de Manakambahiny'),
      parish('d’Andilanatoby')
    ]
  }
]
