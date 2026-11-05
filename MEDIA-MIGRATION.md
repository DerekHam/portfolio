# Media migration inventory

Generated from `data/media.json` by `python3 Scripts/build-media-inventory.py`.

**Nothing here has been uploaded to Cloudflare.** This file is a checklist only.

| Count | Kind | Status |
|---:|---|---|
| 70 | Images with an R2 object key | pending R2 upload |
| 4 | Videos | pending Stream migration |
| 74 | WebP thumbnails/posters | already committed to GitHub |

## Configuration values to fill in

| Value | File | Current state |
|---|---|---|
| R2 media base URL | `assets/js/media-config.js` (`MEDIA_BASE_URL`) | see file |
| Stream customer code | `assets/js/media-config.js` (`STREAM_CUSTOMER_CODE`) | empty until Stream is set up |
| Cloudflare account ID / API token | not in the repository | provide them only to your upload tool |

Never commit API tokens. The frontend only needs the public base URL and customer code.

## R2 image objects

The manifest key is what the website uses; the local preview is the source file. Run `python3 Scripts/prepare-r2-previews.py` to create 2560px WebP files in a staging folder using the exact keys below, then upload that folder to the R2 bucket root. No upload happens automatically.

| ID | Category | R2 object key | Local preview | GitHub thumbnail |
|---|---|---|---|---|
| `calico-full-view` | Engineering | `engineering/calico-full-view.webp` | `assets/hi/calico/full-view.jpeg` | `assets/thumbnails/engineering/calico-full-view.webp` |
| `calico-intake-view` | Engineering | `engineering/calico-intake-view.webp` | `assets/hi/calico/intake-view.jpeg` | `assets/thumbnails/engineering/calico-intake-view.webp` |
| `calico-diffuser-1` | Engineering | `engineering/calico-diffuser-1.webp` | `assets/hi/calico/diffuser-1.jpeg` | `assets/thumbnails/engineering/calico-diffuser-1.webp` |
| `calico-diffuser-2` | Engineering | `engineering/calico-diffuser-2.webp` | `assets/hi/calico/diffuser-2.jpeg` | `assets/thumbnails/engineering/calico-diffuser-2.webp` |
| `calico-frame-1` | Engineering | `engineering/calico-frame-1.webp` | `assets/hi/calico/frame-1.jpeg` | `assets/thumbnails/engineering/calico-frame-1.webp` |
| `calico-leak-test` | Engineering | `engineering/calico-leak-test.webp` | `assets/hi/calico/leak-test.jpeg` | `assets/thumbnails/engineering/calico-leak-test.webp` |
| `calico-calico-kitten-test` | Engineering | `engineering/calico-calico-kitten-test.webp` | `assets/hi/calico/calico-kitten-test.jpeg` | `assets/thumbnails/engineering/calico-calico-kitten-test.webp` |
| `calico-learning-rhino-cam` | Engineering | `engineering/calico-learning-rhino-cam.webp` | `assets/hi/calico/learning-rhino-cam.jpeg` | `assets/thumbnails/engineering/calico-learning-rhino-cam.webp` |
| `calico-approval` | Engineering | `engineering/calico-approval.webp` | `assets/hi/calico/approval.jpeg` | `assets/thumbnails/engineering/calico-approval.webp` |
| `calico-calico-1` | Engineering | `engineering/calico-calico-1.webp` | `assets/hi/calico/calico-1.jpeg` | `assets/thumbnails/engineering/calico-calico-1.webp` |
| `calico-calico-2` | Engineering | `engineering/calico-calico-2.webp` | `assets/hi/calico/calico-2.jpeg` | `assets/thumbnails/engineering/calico-calico-2.webp` |
| `catamaran-card` | Engineering | `engineering/catamaran-card.webp` | `assets/hi/catamaran/card.png` | `assets/thumbnails/engineering/catamaran-card.webp` |
| `glider-horn` | Engineering | `engineering/glider-horn.webp` | `assets/hi/glider/horn.jpeg` | `assets/thumbnails/engineering/glider-horn.webp` |
| `glider-lightweight-airframe` | Engineering | `engineering/glider-lightweight-airframe.webp` | `assets/hi/glider/lightweight-airframe.jpeg` | `assets/thumbnails/engineering/glider-lightweight-airframe.webp` |
| `glider-v1-snapped` | Engineering | `engineering/glider-v1-snapped.webp` | `assets/hi/glider/v1-snapped.jpeg` | `assets/thumbnails/engineering/glider-v1-snapped.webp` |
| `glider-card` | Engineering | `engineering/glider-card.webp` | `assets/hi/glider/card.png` | `assets/thumbnails/engineering/glider-card.webp` |
| `parsecs-card` | Projects | `projects/parsecs-card.webp` | `assets/hi/parsecs/card.png` | `assets/thumbnails/projects/parsecs-card.webp` |
| `alarm-final` | Engineering | `engineering/alarm-final.webp` | `assets/hi/alarm/final.jpeg` | `assets/thumbnails/engineering/alarm-final.webp` |
| `alarm-interface` | Engineering | `engineering/alarm-interface.webp` | `assets/hi/alarm/interface.jpeg` | `assets/thumbnails/engineering/alarm-interface.webp` |
| `alarm-print-quality-check` | Engineering | `engineering/alarm-print-quality-check.webp` | `assets/hi/alarm/print-quality-check.jpeg` | `assets/thumbnails/engineering/alarm-print-quality-check.webp` |
| `alarm-v2` | Engineering | `engineering/alarm-v2.webp` | `assets/hi/alarm/v2.jpeg` | `assets/thumbnails/engineering/alarm-v2.webp` |
| `weimar-pendulum-curtain-call` | Engineering | `engineering/weimar-pendulum-curtain-call.webp` | `assets/hi/weimar-pendulum/curtain-call.jpeg` | `assets/thumbnails/engineering/weimar-pendulum-curtain-call.webp` |
| `weimar-pendulum-group-photo` | Engineering | `engineering/weimar-pendulum-group-photo.webp` | `assets/hi/weimar-pendulum/group-photo.JPG` | `assets/thumbnails/engineering/weimar-pendulum-group-photo.webp` |
| `weimar-pendulum-with-pendulum` | Engineering | `engineering/weimar-pendulum-with-pendulum.webp` | `assets/hi/weimar-pendulum/with-pendulum.JPG` | `assets/thumbnails/engineering/weimar-pendulum-with-pendulum.webp` |
| `nanqiang-closet` | Engineering | `engineering/nanqiang-closet.webp` | `assets/hi/nanqiang/closet.jpeg` | `assets/thumbnails/engineering/nanqiang-closet.webp` |
| `nanqiang-fixing-light` | Engineering | `engineering/nanqiang-fixing-light.webp` | `assets/hi/nanqiang/fixing-light.JPG` | `assets/thumbnails/engineering/nanqiang-fixing-light.webp` |
| `nanqiang-light-fixed` | Engineering | `engineering/nanqiang-light-fixed.webp` | `assets/hi/nanqiang/light-fixed.JPG` | `assets/thumbnails/engineering/nanqiang-light-fixed.webp` |
| `3d-printer-rack-full-rack` | Engineering | `engineering/3d-printer-rack-full-rack.webp` | `assets/hi/3d-printer-rack/full-rack.jpeg` | `assets/thumbnails/engineering/3d-printer-rack-full-rack.webp` |
| `3d-printer-rack-filter` | Engineering | `engineering/3d-printer-rack-filter.webp` | `assets/hi/3d-printer-rack/filter.jpeg` | `assets/thumbnails/engineering/3d-printer-rack-filter.webp` |
| `3d-printer-rack-shelves` | Engineering | `engineering/3d-printer-rack-shelves.webp` | `assets/hi/3d-printer-rack/shelves.jpeg` | `assets/thumbnails/engineering/3d-printer-rack-shelves.webp` |
| `3d-printer-rack-laser-cutter-at-home` | Engineering | `engineering/3d-printer-rack-laser-cutter-at-home.webp` | `assets/hi/3d-printer-rack/laser-cutter-at-home.jpeg` | `assets/thumbnails/engineering/3d-printer-rack-laser-cutter-at-home.webp` |
| `human-ram-menu-bar-light` | Projects | `projects/human-ram-menu-bar-light.webp` | `assets/hi/human-ram/menu-bar-light.png` | `assets/thumbnails/projects/human-ram-menu-bar-light.webp` |
| `human-ram-capture-light` | Projects | `projects/human-ram-capture-light.webp` | `assets/hi/human-ram/capture-light.png` | `assets/thumbnails/projects/human-ram-capture-light.webp` |
| `human-ram-daily-scan-light` | Projects | `projects/human-ram-daily-scan-light.webp` | `assets/hi/human-ram/daily-scan-light.png` | `assets/thumbnails/projects/human-ram-daily-scan-light.webp` |
| `human-ram-notes-review-light` | Projects | `projects/human-ram-notes-review-light.webp` | `assets/hi/human-ram/notes-review-light.png` | `assets/thumbnails/projects/human-ram-notes-review-light.webp` |
| `human-ram-diary-light` | Projects | `projects/human-ram-diary-light.webp` | `assets/hi/human-ram/diary-light.png` | `assets/thumbnails/projects/human-ram-diary-light.webp` |
| `human-ram-settings-light` | Projects | `projects/human-ram-settings-light.webp` | `assets/hi/human-ram/settings-light.png` | `assets/thumbnails/projects/human-ram-settings-light.webp` |
| `games-masterton-river-annotated-1997` | Projects | `projects/games-masterton-river-annotated-1997.webp` | `assets/hi/games/Masterton_River_Annotated_1997.jpg` | `assets/thumbnails/projects/games-masterton-river-annotated-1997.webp` |
| `games-20260913-012401-img-3` | Projects | `projects/games-20260913-012401-img-3.webp` | `assets/hi/games/20260913_012401_img-3.jpg` | `assets/thumbnails/projects/games-20260913-012401-img-3.webp` |
| `games-20260913-012450-img-4` | Projects | `projects/games-20260913-012450-img-4.webp` | `assets/hi/games/20260913_012450_img-4.jpg` | `assets/thumbnails/projects/games-20260913-012450-img-4.webp` |
| `games-20260913-012531-img-5` | Projects | `projects/games-20260913-012531-img-5.webp` | `assets/hi/games/20260913_012531_img-5.jpg` | `assets/thumbnails/projects/games-20260913-012531-img-5.webp` |
| `games-20260913-012842-img-7` | Projects | `projects/games-20260913-012842-img-7.webp` | `assets/hi/games/20260913_012842_img-7.jpg` | `assets/thumbnails/projects/games-20260913-012842-img-7.webp` |
| `games-20260913-012952-img-8` | Projects | `projects/games-20260913-012952-img-8.webp` | `assets/hi/games/20260913_012952_img-8.jpg` | `assets/thumbnails/projects/games-20260913-012952-img-8.webp` |
| `games-20260913-013205-img-9` | Projects | `projects/games-20260913-013205-img-9.webp` | `assets/hi/games/20260913_013205_img-9.jpg` | `assets/thumbnails/projects/games-20260913-013205-img-9.webp` |
| `games-20260227-223642-img-0` | Projects | `projects/games-20260227-223642-img-0.webp` | `assets/hi/games/20260227_223642_img-0.jpg` | `assets/thumbnails/projects/games-20260227-223642-img-0.webp` |
| `games-20260227-224319-img-3` | Projects | `projects/games-20260227-224319-img-3.webp` | `assets/hi/games/20260227_224319_img-3.jpg` | `assets/thumbnails/projects/games-20260227-224319-img-3.webp` |
| `games-20260304-012355-img-4` | Projects | `projects/games-20260304-012355-img-4.webp` | `assets/hi/games/20260304_012355_img-4.jpeg` | `assets/thumbnails/projects/games-20260304-012355-img-4.webp` |
| `games-20260312-010723-img-0` | Projects | `projects/games-20260312-010723-img-0.webp` | `assets/hi/games/20260312_010723_img-0.jpg` | `assets/thumbnails/projects/games-20260312-010723-img-0.webp` |
| `games-20260320-235138-img-2` | Projects | `projects/games-20260320-235138-img-2.webp` | `assets/hi/games/20260320_235138_img-2.jpg` | `assets/thumbnails/projects/games-20260320-235138-img-2.webp` |
| `games-20260320-235215-img-4` | Projects | `projects/games-20260320-235215-img-4.webp` | `assets/hi/games/20260320_235215_img-4.jpg` | `assets/thumbnails/projects/games-20260320-235215-img-4.webp` |
| `games-20260320-235657-img-7` | Projects | `projects/games-20260320-235657-img-7.webp` | `assets/hi/games/20260320_235657_img-7.jpg` | `assets/thumbnails/projects/games-20260320-235657-img-7.webp` |
| `website-home-light` | Projects | `projects/website-home-light.webp` | `assets/hi/website/home-light.png` | `assets/thumbnails/projects/website-home-light.webp` |
| `website-projects-light` | Projects | `projects/website-projects-light.webp` | `assets/hi/website/projects-light.png` | `assets/thumbnails/projects/website-projects-light.webp` |
| `gallery-bike` | Photography | `photography/gallery-bike.webp` | `assets/hi/gallery/bike.jpeg` | `assets/thumbnails/photography/gallery-bike.webp` |
| `gallery-bluebells-yard` | Photography | `photography/gallery-bluebells-yard.webp` | `assets/hi/gallery/bluebells-yard.jpeg` | `assets/thumbnails/photography/gallery-bluebells-yard.webp` |
| `gallery-i-love-archery` | Photography | `photography/gallery-i-love-archery.webp` | `assets/hi/gallery/i-love-archery.jpeg` | `assets/thumbnails/photography/gallery-i-love-archery.webp` |
| `gallery-i-love-travelling` | Photography | `photography/gallery-i-love-travelling.webp` | `assets/hi/gallery/i-love-travelling.jpeg` | `assets/thumbnails/photography/gallery-i-love-travelling.webp` |
| `gallery-rainbow` | Photography | `photography/gallery-rainbow.webp` | `assets/hi/gallery/rainbow.jpeg` | `assets/thumbnails/photography/gallery-rainbow.webp` |
| `gallery-sunset-building-1` | Photography | `photography/gallery-sunset-building-1.webp` | `assets/hi/gallery/sunset-building-1.jpeg` | `assets/thumbnails/photography/gallery-sunset-building-1.webp` |
| `gallery-sunset-building-2` | Photography | `photography/gallery-sunset-building-2.webp` | `assets/hi/gallery/sunset-building-2.jpeg` | `assets/thumbnails/photography/gallery-sunset-building-2.webp` |
| `gallery-clouds-1` | Photography | `photography/gallery-clouds-1.webp` | `assets/hi/gallery/clouds-1.jpeg` | `assets/thumbnails/photography/gallery-clouds-1.webp` |
| `gallery-clouds-2` | Photography | `photography/gallery-clouds-2.webp` | `assets/hi/gallery/clouds-2.jpeg` | `assets/thumbnails/photography/gallery-clouds-2.webp` |
| `gallery-construction` | Photography | `photography/gallery-construction.webp` | `assets/hi/gallery/construction.jpeg` | `assets/thumbnails/photography/gallery-construction.webp` |
| `gallery-dalat-power-plant` | Photography | `photography/gallery-dalat-power-plant.webp` | `assets/hi/gallery/dalat-power-plant.JPG` | `assets/thumbnails/photography/gallery-dalat-power-plant.webp` |
| `gallery-huolong` | Photography | `photography/gallery-huolong.webp` | `assets/hi/gallery/Huolong.jpeg` | `assets/thumbnails/photography/gallery-huolong.webp` |
| `gallery-hydro-and-road` | Photography | `photography/gallery-hydro-and-road.webp` | `assets/hi/gallery/hydro-and-road.JPG` | `assets/thumbnails/photography/gallery-hydro-and-road.webp` |
| `gallery-hydro-power-dam` | Photography | `photography/gallery-hydro-power-dam.webp` | `assets/hi/gallery/hydro-power-dam.jpg` | `assets/thumbnails/photography/gallery-hydro-power-dam.webp` |
| `gallery-photo-chosen-for-yearbook` | Photography | `photography/gallery-photo-chosen-for-yearbook.webp` | `assets/hi/gallery/photo-chosen-for-yearbook.jpeg` | `assets/thumbnails/photography/gallery-photo-chosen-for-yearbook.webp` |
| `gallery-wintercore` | Photography | `photography/gallery-wintercore.webp` | `assets/hi/gallery/Wintercore.jpeg` | `assets/thumbnails/photography/gallery-wintercore.webp` |
| `gallery-xiangshawan-ropeway` | Photography | `photography/gallery-xiangshawan-ropeway.webp` | `assets/hi/gallery/xiangshawan-ropeway.JPG` | `assets/thumbnails/photography/gallery-xiangshawan-ropeway.webp` |

## Cloudflare Stream videos

Upload each video to Stream, then paste its UID into `data/media.json` (`streamId`) and set `STREAM_CUSTOMER_CODE` in `assets/js/media-config.js`. Until then the site uses the fallback player.

| ID | Title | Stream UID | Fallback | Poster |
|---|---|---|---|---|
| `video-bluebell-train` | Bluebell Railway steam train | `—` | https://youtube.com/shorts/NQBaUhBG-k4 | `assets/thumbnails/photography/video-bluebell-train.webp` |
| `video-instagram-trains` | Trains | `—` | https://www.instagram.com/reel/Dbw-yEkOBxs/ | `assets/thumbnails/photography/video-instagram-trains.webp` |
| `video-catamaran-pov` | Catamaran on Liangma River | `—` | https://youtu.be/l4PK6CLHE0c?si=Q2vhXI0AUKTswtan | `assets/thumbnails/engineering/video-catamaran-pov.webp` |
| `video-catamaran-lake` | Catamaran on Chaoyang Lake | `—` | https://youtube.com/shorts/jY1MIndGaHU?feature=share | `assets/thumbnails/engineering/video-catamaran-lake.webp` |

## Manual steps

1. Create the R2 bucket and connect `media.derekhan.link` (or change `MEDIA_BASE_URL`).
2. Run `python3 Scripts/prepare-r2-previews.py` to stage 2560px WebP previews using the keys above.
3. Upload the staging folder to the R2 bucket root (`rclone copy`/Wrangler/dashboard).
4. Make the bucket publicly readable; do not expose write credentials in this repository.
5. Upload the four videos to Cloudflare Stream.
6. Add the Stream UIDs to `data/media.json`, fill in `STREAM_CUSTOMER_CODE`, and run `python3 Scripts/validate-media.py`.
7. Test one lightbox image and one video over HTTPS, then set `LOCAL_FULL_FALLBACK: false` if you want to remove the old local tier.
8. Optional cleanup (after R2 is verified): remove `assets/hi` from the repository to shrink it. This restructuring deliberately did **not** delete any existing media.

The full-resolution originals stay outside the repository and are never deleted by these scripts.
