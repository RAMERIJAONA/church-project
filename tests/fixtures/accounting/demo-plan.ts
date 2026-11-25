/**
 * Plan comptable de DÉMONSTRATION (fictif, en français), pour tester l'application à la main :
 * `npm run seed:accounting` puis `npm run dev:seed`. Montants générés par
 * `tests/factories/accounting.demo-seed.ts`. Aucune donnée personnelle.
 *
 * Couvre exprès : les 4 niveaux, plusieurs rubriques sur une même lettre (A1, A2, E1, E2),
 * groupes et rubriques à montants à chaque niveau, une rubrique principale sans
 * sous-rubrique (K1), de très grands montants (L1), des descriptions longues, une section
 * supprimée (renumérotation) et des rubriques laissées vides.
 *
 * Une feuille est une chaîne ; un groupe est `{ d, c }`.
 */

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
    prefix: 'A',
    d: 'Ancienne rubrique à supprimer',
    deleted: true,
    c: ['Ligne supprimée avec sa rubrique']
  },
  {
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
    prefix: 'B',
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
    prefix: 'D',
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
    prefix: 'E',
    d: 'École du dimanche',
    c: [
      'Matériel pédagogique',
      'Goûters des enfants',
      'Fête de fin d’année des enfants',
      { d: 'Moniteurs', c: ['Formation des moniteurs', 'Tenues des moniteurs'] }
    ]
  },
  {
    prefix: 'E',
    d: 'Jeunesse',
    c: [
      { d: 'Camp de jeunes', c: ['Transport', 'Hébergement', 'Repas'] },
      'Rencontres mensuelles',
      { d: 'Équipe de sport', empty: true }
    ]
  },
  {
    prefix: 'F',
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
    prefix: 'G',
    d: 'Œuvres sociales',
    c: [
      'Aide aux familles en difficulté',
      'Soins médicaux des membres âgés',
      { d: 'Bourses scolaires', c: ['Primaire', 'Collège', 'Lycée et université'] },
      'Secours en cas de catastrophe naturelle : cyclones, inondations, sécheresse dans le Sud et reconstruction des maisons des familles sinistrées'
    ]
  },
  {
    prefix: 'H',
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
    prefix: 'I',
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
    prefix: 'J',
    d: 'Cérémonies et fêtes',
    c: [
      'Fête de Pâques',
      'Fête de Noël',
      'Anniversaire de la paroisse',
      'Mariages et baptêmes collectifs'
    ]
  },
  // Rubrique principale sans sous-rubrique : porte directement ses montants
  { prefix: 'K', d: 'Réserve de trésorerie', scale: 15_000_000 },
  // Très grands montants (11 à 12 chiffres) : aucun montant ne doit être tronqué
  { prefix: 'L', d: 'Fonds de construction à long terme', scale: 98_765_432_100 },
  {
    prefix: 'M',
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
