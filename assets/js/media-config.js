/* ==========================================================================
   Public media configuration
   --------------------------------------------------------------------------
   Everything here is safe to publish. Never put API tokens, secret keys, or
   account credentials in this file.

   MEDIA_BASE_URL         Public base URL for the Cloudflare R2 bucket/domain.
                          Object keys in data/media.json are appended to it.
   STREAM_CUSTOMER_CODE   Cloudflare Stream customer code (the part after
                          "customer-" in the player domain). Leave empty until
                          the Stream videos are uploaded; the site will fall
                          back to the legacy YouTube/Instagram player.
   ========================================================================== */

window.SITE_MEDIA_CONFIG = {
  MEDIA_BASE_URL: "https://media.derekhan.link/",
  STREAM_CUSTOMER_CODE: "",
  MEDIA_MANIFEST: "data/media.json",

  /* When an R2 preview fails, try the existing assets/hi copy. Set to false
     once the R2 migration is complete and assets/hi is no longer deployed. */
  LOCAL_FULL_FALLBACK: true
};
