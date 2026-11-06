"use client";
import { useTransition } from "react";
import { toggleFollow } from "@/app/actions";

export function FollowButton({ artistId, following }: { artistId: string; following: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={`btn sm${following ? "" : " primary"}`} disabled={pending} onClick={() => start(() => toggleFollow(artistId, !following))}>
      {pending ? "…" : following ? "推し中 ✓" : "＋ 推しにする"}
    </button>
  );
}
