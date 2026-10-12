/*
 * The book's design system, built to the Beta 2.1 reference
 * (`102 Book Redesign uI.png`): the library list, the cover a story opens on,
 * and the paper book it is read in.
 *
 * Part of the reading family (Books / Story Reader) rather than the
 * ivory-and-jade one: cream paper, warm ink, ink-wash scenery, and one deep
 * teal for the things a reader acts on.
 *
 * **This file is the only place a colour literal belongs** on these screens.
 * Light-only, like the rest of the reading design: the book is paper.
 */

export const bookColors = {
  /** Behind the book — the desk it lies on. A shade deeper than the paper so the page reads as an object. */
  backdrop: '#EFE6D3',
  /** The library page — sampled from SS103's paper, which its header painting is keyed against. */
  library: '#FEFBF4',
  /** A page, and the back of a turning one. */
  paper: '#FBF6EA',
  paperBack: '#F1E9D7',
  /** The stacked edges of the pages still to come, and the hairline between them. */
  pageEdge: '#ECE3D0',
  pageEdgeLine: '#D6C9AF',

  ink: '#1F1B16',
  inkSoft: '#5B5348',
  inkFaint: '#8E8576',
  hairline: 'rgba(170,150,118,0.32)',

  /** The deep teal of the reference's buttons and active chip. */
  teal: '#1F5A54',
  tealSoft: '#DDEBE5',
  /** A word not yet in My Words — the reader's coral dots. */
  coral: '#E0705F',
  /** The narrator's place in the text. */
  spoken: '#3E9A6E',
  /** The ribbon bookmark hanging out of the foot of the book. */
  ribbon: '#B3352D',
  ribbonDark: '#8A231D',

  /** The cover screen: a dim room, cream type. */
  night: '#1B1611',
  cream: '#F6EEDD',
  creamSoft: 'rgba(246,238,221,0.78)',
  creamFaint: 'rgba(246,238,221,0.5)',
  /** The thin brass rules on the book-entry screen: the title's divider, the button's brackets. */
  brass: 'rgba(226,204,163,0.75)',
  /** The book-entry button: the mockup's jade-teal, a shade lighter than `teal` against the dark room. */
  roomButton: '#2E6A61',
  roomButtonEdge: 'rgba(176,222,206,0.5)',
  /** The side under it — the raised button's shoulder, a step darker than its face. */
  roomButtonShoulder: '#1A433D',
  /** Under the room's live type, so it reads off the photograph. */
  roomTextShadow: 'rgba(20,12,4,0.55)',

  card: '#FFFDF8',
  /** The library's chip outlines and card hairlines. */
  chipBorder: 'rgba(196,181,152,0.55)',
  cardBorder: 'rgba(214,201,178,0.55)',
  track: '#E9E2D4',

  /** The reader header's narrator disc (SS1012): deep jade face inside a thin gold rim. */
  narratorDisc: '#1E4A40',
  narratorRim: '#C9A86A',
  /** The 讀音 pill and its dropdown — warm paper with a gold hairline. */
  readingsPill: '#FCF8EE',
  readingsBorder: 'rgba(201,168,106,0.6)',
  /** The picked row in the dropdown, a wash of the page's sage. */
  readingsPicked: 'rgba(31,90,84,0.08)',
  readingsRing: '#B8B0A0',
} as const

/** Width over height of the general book cover every story wears (`StoryArt`). */
export const COVER_RATIO = 3 / 4

/**
 * The book-entry room (`book-room.jpg`, from `processLibraryArt.mjs`), in the
 * mockup's own pixels. The screen scales the room to cover its column and
 * places everything live — the opening book, the title, the button — at these
 * coordinates, so each lands on the spot the mockup's own was painted out of.
 * Re-run the script and these move with it.
 */
export const ROOM = {
  width: 941,
  height: 1672,
  /** The painted book's front cover; the live one is laid exactly over it. */
  book: { x: 279, y: 528, w: 414, h: 570 },
  /** Top of the title block, the stats line's centre, the blurb's centre, the button's centre. */
  titleTop: 112,
  stats: 1361,
  blurb: 1417,
  button: { y: 1516, w: 435, h: 92 },
} as const

/** The width every reading layout caps its column at. */
export const BOOK_CONTENT_MAX = 430

export const bookSize = {
  /** The reader's header strip, above the page. */
  header: 52,
  /** Margins round the page: a sliver of backdrop at the spine, the stacked edges on the right, the ribbon below. */
  spineGap: 8,
  edgeGap: 14,
  footGap: 26,
  /** How far each stacked page edge steps out from the one in front. */
  edgeStep: 3,
  /** Text area inset inside the paper. */
  padX: 24,
  padTop: 24,
  /** Room at the foot of the paper for the page number. */
  padBottom: 40,
  /** The middle-of-the-page arrow buttons. */
  arrow: 40,
  radius: { outer: 7, spine: 2 },
} as const

/**
 * The word cell the book draws: a 21pt character with its reading under it, no
 * box. Used to turn the page's measured text area into a character budget
 * (`budgetForArea`), so it errs wide — a reading such as "shuāng" is wider than
 * the one character above it, and an underfilled page costs nothing where an
 * overfilled one has to scroll.
 */
export const BOOK_CELL = { width: 29, height: 52 } as const

/** Height kept back on each text page for its translation, under the hairline. */
export const TRANSLATION_ALLOWANCE = 132

export const bookMotion = {
  /** A full turn, edge to edge, when nothing is dragging it. A part-turn takes its share. */
  turn: 460,
  /** The cover swinging open, then the reader fading up over it. */
  coverOpen: 760,
  readerFade: 320,
} as const
