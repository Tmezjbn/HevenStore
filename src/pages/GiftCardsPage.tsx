import GamesPage from './GamesPage';

// Module-level: inline arrays would be a new ref per render, refiring
// GamesPage's pagination-reset effect.
const TYPES = ['gift_card'];

/** Gift-card slice of the catalog. */
export default function GiftCardsPage() {
  return <GamesPage types={TYPES} titleAr="بطاقات الهدايا" titleEn="Gift Cards" />;
}
