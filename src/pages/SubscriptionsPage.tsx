import GamesPage from './GamesPage';

// Module-level: inline arrays would be a new ref per render, refiring
// GamesPage's pagination-reset effect.
const TYPES = ['account'];

/** Accounts/subscriptions slice of the catalog. */
export default function SubscriptionsPage() {
  return <GamesPage types={TYPES} titleAr="الاشتراكات" titleEn="Subscriptions" />;
}
