export type GalleryMediaType = "image" | "youtube" | "vimeo";

export type EventGalleryItem = {
  id: string;
  event_id: string;
  media_type: GalleryMediaType;
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  sort_order: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GalleryActionResult = {
  success: boolean;
  error?: string;
  itemId?: string;
};
