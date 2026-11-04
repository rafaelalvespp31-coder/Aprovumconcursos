import "server-only";
import { createUserClient } from "../supabase";
import type { Testimonial } from "@/domain/testimonials";

/** Depoimentos ativos (a RLS já limita a alunos logados). */
export async function listTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await (await createUserClient()).from("testimonials").select("id, name, headline, video_url").eq("active", true).order("sort").order("created_at", { ascending: false }).limit(60);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id as string, name: r.name as string, headline: (r.headline as string | null) ?? null, videoUrl: r.video_url as string }));
}
