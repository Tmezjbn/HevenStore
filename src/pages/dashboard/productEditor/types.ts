import { type MediaResourceKind } from '../../../lib/videoEmbed';
import { type VideoEmbedSlotIndex, type VideoEmbedVariant } from '../../../lib/videoEmbeds';
import { Product, Profile } from '../../../types';

export type SellerPick = Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>;
export type SellerSort = 'name' | 'role';
export type LoadState = 'loading' | 'ready' | 'not-found';

export type EditorNavState = { product?: Product };

export type MediaPickTarget =
  | { kind: 'field'; field: 'thumbnail_url' | 'ad_banner_url' | 'hover_image_url' | 'hero_backdrop_url' }
  | { kind: 'video' }
  | { kind: 'videoEmbed'; slot: VideoEmbedSlotIndex; variant: VideoEmbedVariant }
  | { kind: 'gallery' };

export type ResourceSort = 'all' | MediaResourceKind;

export type MediaLibraryItem = { url: string; kind: MediaResourceKind };
