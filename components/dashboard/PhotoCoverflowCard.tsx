"use client";

import { useEffect, useState } from "react";
import { Images, Loader2 } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { createClient } from "@/lib/supabase/client";
import { GlassCard, CardHeader } from "@/components/ui/GlassCard";

interface Photo {
  id: string;
  drive_file_id: string;
  caption: string | null;
  taken_on: string;
}

function thumb(id: string) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w600`;
}

export function PhotoCoverflowCard({ familyId }: { familyId?: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let on = true;
    (async () => {
      const { data } = await supabase
        .from("photos")
        .select("id, drive_file_id, caption, taken_on")
        .eq("family_id", familyId)
        .order("taken_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      if (on) {
        setPhotos((data as Photo[]) ?? []);
        setLoading(false);
      }
    })();
    // 실시간: 사진 추가/삭제 반영
    const ch = supabase
      .channel(`photos-card:${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos", filter: `family_id=eq.${familyId}` },
        async () => {
          const { data } = await supabase
            .from("photos")
            .select("id, drive_file_id, caption, taken_on")
            .eq("family_id", familyId)
            .order("taken_on", { ascending: false })
            .limit(12);
          setPhotos((data as Photo[]) ?? []);
        }
      )
      .subscribe();
    return () => {
      on = false;
      supabase.removeChannel(ch);
    };
  }, [familyId]);

  return (
    <GlassCard className="flex h-full flex-col">
      <CardHeader
        icon={<Images className="h-4.5 w-4.5" />}
        title="사진첩"
        hint={familyId ? `최근 ${photos.length}장` : "Google Drive 연동"}
      />

      <div className="flex flex-1 items-center">
        {!familyId ? (
          <div className="w-full text-center text-sm text-zinc-500">가족을 만들면 사진첩이 활성화됩니다.</div>
        ) : loading ? (
          <div className="flex w-full items-center justify-center text-sm text-zinc-600">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
          </div>
        ) : photos.length === 0 ? (
          <div className="w-full text-center text-sm text-zinc-500">
            아직 사진이 없어요.
            <br />
            <span className="text-[11px] text-zinc-600">사진 탭에서 업로드해보세요.</span>
          </div>
        ) : (
          <Swiper
            modules={[EffectCoverflow]}
            effect="coverflow"
            grabCursor
            centeredSlides
            slidesPerView={1.8}
            loop={photos.length > 3}
            coverflowEffect={{ rotate: 28, stretch: 0, depth: 120, modifier: 1, slideShadows: false }}
            className="h-44 w-full"
          >
            {photos.map((p) => (
              <SwiperSlide key={p.id} className="!w-40">
                <figure className="relative h-40 w-40 overflow-hidden rounded-2xl border border-white/10 shadow-bezel">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb(p.drive_file_id)}
                    alt={p.caption ?? ""}
                    loading="lazy"
                    draggable={false}
                    referrerPolicy="no-referrer"
                    className="h-full w-full bg-ink-700 object-cover"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/80 to-transparent px-3 py-2 text-xs text-zinc-100">
                    {p.caption || p.taken_on.slice(5).replace("-", "/")}
                  </figcaption>
                </figure>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </GlassCard>
  );
}
