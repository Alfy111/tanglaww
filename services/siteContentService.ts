import { supabase } from "@/lib/supabase";

export type ContentKey =
  | "about_tanglaw"
  | "about_tarc"
  | "privacy_policy"
  | "terms_of_use"
  | "contact_email"
  | "contact_phone"
  | "contact_office"
  | "contact_facebook_name"
  | "contact_facebook_link";

export type SiteContent = Partial<Record<ContentKey, string>> & {
  updatedAt?: string | null;
};

export type Faq = {
  faq_id?: number | string;
  question: string;
  answer: string;
  sort_order?: number;
};

const SECTION_KEYS: Partial<Record<ContentKey, [string, string]>> = {
  about_tanglaw: ["about_content", "Tanglaw"],
  about_tarc: ["about_content", "TARC"],
  privacy_policy: ["policy_content", "Privacy"],
  terms_of_use: ["policy_content", "Terms"],
};
const CONTACT_COLUMNS: Partial<Record<ContentKey, string>> = {
  contact_email: "email",
  contact_phone: "phone",
  contact_office: "office",
  contact_facebook_name: "facebook_name",
  contact_facebook_link: "facebook_link",
};
const newer = (a?: string | null, b?: string | null) =>
  !a || (b && b > a) ? (b ?? null) : a;

export async function getSiteContent(keys: ContentKey[]): Promise<SiteContent> {
  const out: SiteContent = { updatedAt: null };
  for (const table of ["about_content", "policy_content"]) {
    const wanted = keys.filter((k) => SECTION_KEYS[k]?.[0] === table);
    if (!wanted.length) continue;
    const { data, error } = await supabase
      .from(table)
      .select("section, content, updated_at")
      .in(
        "section",
        wanted.map((k) => SECTION_KEYS[k]![1]),
      );
    if (error) throw new Error(error.message);
    for (const k of wanted) {
      const row = (data ?? []).find(
        (r: any) => r.section === SECTION_KEYS[k]![1],
      );
      out[k] = row?.content ?? "";
      out.updatedAt = newer(out.updatedAt, row?.updated_at);
    }
  }
  if (keys.some((k) => CONTACT_COLUMNS[k])) {
    const { data, error } = await supabase
      .from("contact_info")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    for (const k of keys) {
      const col = CONTACT_COLUMNS[k];
      if (col) out[k] = (data as any)?.[col] ?? "";
    }
    out.updatedAt = newer(out.updatedAt, (data as any)?.updated_at);
  }
  return out;
}

export async function saveSiteContent(
  values: Partial<Record<ContentKey, string>>,
) {
  for (const table of ["about_content", "policy_content"]) {
    const rows = (Object.entries(values) as [ContentKey, string][])
      .filter(([k]) => SECTION_KEYS[k]?.[0] === table)
      .map(([k, v]) => ({
        section: SECTION_KEYS[k]![1],
        content: (v ?? "").trim(),
      }));
    if (!rows.length) continue;
    const { error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: "section" });
    if (error) throw new Error(error.message);
  }
  const contact: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(values) as [ContentKey, string][]) {
    const col = CONTACT_COLUMNS[k];
    if (col) contact[col] = (v ?? "").trim() || null;
  }
  if (Object.keys(contact).length) {
    const { data: existing, error: readError } = await supabase
      .from("contact_info")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    const { error } = existing
      ? await supabase
          .from("contact_info")
          .update(contact)
          .eq("id", existing.id)
      : await supabase.from("contact_info").insert(contact);
    if (error) throw new Error(error.message);
  }
}

export async function getFaqs(): Promise<Faq[]> {
  const { data, error } = await supabase
    .from("faq")
    .select("id, question, answer, display_order")
    .order("display_order")
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    faq_id: r.id,
    question: r.question ?? "",
    answer: r.answer ?? "",
    sort_order: r.display_order,
  }));
}

export async function saveFaqs(list: Faq[], originalIds: (number | string)[]) {
  const clean = list
    .map((f, i) => ({
      id: f.faq_id,
      question: f.question.trim(),
      answer: f.answer.trim(),
      display_order: i + 1,
    }))
    .filter((f) => f.question && f.answer);

  const keptIds = clean.filter((f) => f.id).map((f) => f.id!);
  const removed = originalIds.filter((id) => !keptIds.includes(id as any));
  if (removed.length) {
    const { error } = await supabase.from("faq").delete().in("id", removed);
    if (error) throw new Error(error.message);
  }
  for (const f of clean.filter((x) => x.id)) {
    const { error } = await supabase
      .from("faq")
      .update({
        question: f.question,
        answer: f.answer,
        display_order: f.display_order,
      })
      .eq("id", f.id!);
    if (error) throw new Error(error.message);
  }
  const fresh = clean
    .filter((f) => !f.id)
    .map(({ question, answer, display_order }) => ({
      question,
      answer,
      display_order,
    }));
  if (fresh.length) {
    const { error } = await supabase.from("faq").insert(fresh);
    if (error) throw new Error(error.message);
  }
}

export const formatUpdated = (iso?: string | null) =>
  iso
    ? `Last updated ${new Date(iso).toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`
    : "";

export const withHttps = (v: string) =>
  !v.trim() || /^https?:\/\//i.test(v.trim())
    ? v.trim()
    : `https://${v.trim()}`;
