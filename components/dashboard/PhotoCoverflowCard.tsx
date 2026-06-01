"use client";

import { Images, Upload } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";

interface Photo {
  id: string;
  web_view_link: string;
  thumbnail_link: string | null;
  caption: string | null;
}

// Gradient placeholders so the coverflow renders before Drive is connected.
const SAMPLE: Photo[] = [
  { id: "1", web_view_link: "#", thumbnail_link: null, caption: "첫 외출" },
  { id: "2", web_view_link: "#", thumbnail_link: null, caption: "백일 사진" },
  { id: "3", web_view_link: "#", thumbnail_link: null, caption: "첫 이유식" },
  { id: "4", web_view_link: "#", thumbnail_link: null, caption: "공원에서" },
  { id: "5", web_view_link: "#", thumbnail_link: null, caption: "낮잠" },
];

const GRADIENTS = [
  "from-accent/30 to-accent-cool/20",
  "from-indigo-400/25 to-accent/20",
  "from-sky-400/25 to-accent-soft/20",
  "from-rose-300/20 to-accent-cool/25",
  "from-emerald-300/20 to-accent/20",
];

export function PhotoCoverflowCard({ photos = SAMPLE }: { photos?: Photo[] }) {
  return (
    <GlassCard className="flex h-full flex-col">
      <CardHeader
        icon={<Images className="h-4.5 w-4.5" />}
        title="사진첩"
        hint="Google Drive 저장 · 링크만 보관"
        action={
          <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-300 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]">
            <Upload className="h-3 w-3" /> 업로드
            <input type="file" accept="image/*" className="hidden" />
          </label>
        }
      />

      <div className="flex-1">
        <Swiper
          modules={[EffectCoverflow, Navigation]}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView={1.8}
          loop
          coverflowEffect={{ rotate: 28, stretch: 0, depth: 120, modifier: 1, slideShadows: false }}
          className="h-44 w-full"
        >
          {photos.map((p, i) => (
            <SwiperSlide key={p.id} className="!w-40">
              <figure className="relative h-40 w-40 overflow-hidden rounded-2xl border border-white/10 shadow-bezel">
                {p.thumbnail_link ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnail_link} alt={p.caption ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`} />
                )}
                {p.caption && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/80 to-transparent px-3 py-2 text-xs text-zinc-100">
                    {p.caption}
                  </figcaption>
                )}
              </figure>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </GlassCard>
  );
}
