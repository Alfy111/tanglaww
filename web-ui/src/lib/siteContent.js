// About, Help & Support and Terms & Policies content
// (about_content, policy_content, faq, contact_info tables; shared with the mobile app).
import { supabase } from "./supabase";

export const CONTACT_KEYS = [
  "contact_email",
  "contact_phone",
  "contact_facebook_name",
  "contact_facebook_link",
  "contact_office",
];

// Where each piece of text lives (tables used by the web and mobile apps)
const SECTION_KEYS = {
  about_tanglaw: ["about_content", "Tanglaw"],
  about_tarc: ["about_content", "TARC"],
  privacy_policy: ["policy_content", "Privacy"],
  terms_of_use: ["policy_content", "Terms"],
};
const CONTACT_COLUMNS = {
  contact_email: "email",
  contact_phone: "phone",
  contact_office: "office",
  contact_facebook_name: "facebook_name",
  contact_facebook_link: "facebook_link",
};
const newer = (a, b) => (!a || (b && b > a) ? b : a);

/** Loads the given keys. updatedAt = newest change among them. */
export async function getSiteContent(keys) {
  const out = { updatedAt: null };
  for (const table of ["about_content", "policy_content"]) {
    const wanted = keys.filter((k) => SECTION_KEYS[k]?.[0] === table);
    if (!wanted.length) continue;
    const { data, error } = await supabase
      .from(table)
      .select("section, content, updated_at")
      .in(
        "section",
        wanted.map((k) => SECTION_KEYS[k][1]),
      );
    if (error) throw new Error(error.message);
    for (const k of wanted) {
      const row = (data ?? []).find((r) => r.section === SECTION_KEYS[k][1]);
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
    for (const k of keys)
      if (CONTACT_COLUMNS[k]) out[k] = data?.[CONTACT_COLUMNS[k]] ?? "";
    out.updatedAt = newer(out.updatedAt, data?.updated_at);
  }
  return out;
}

export async function saveSiteContent(values) {
  for (const table of ["about_content", "policy_content"]) {
    const rows = Object.entries(values)
      .filter(([k]) => SECTION_KEYS[k]?.[0] === table)
      .map(([k, v]) => ({
        section: SECTION_KEYS[k][1],
        content: (v ?? "").trim(),
      }));
    if (!rows.length) continue;
    const { error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: "section" });
    if (error) throw new Error(error.message);
  }
  const contact = {};
  for (const [k, v] of Object.entries(values))
    if (CONTACT_COLUMNS[k])
      contact[CONTACT_COLUMNS[k]] = (v ?? "").trim() || null;
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

// FAQs: the screens use { faq_id, question, answer, sort_order }
export async function getFaqs() {
  const { data, error } = await supabase
    .from("faq")
    .select("id, question, answer, display_order")
    .order("display_order")
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    faq_id: r.id,
    question: r.question ?? "",
    answer: r.answer ?? "",
    sort_order: r.display_order,
  }));
}

/** Saves the list as shown: updates kept rows, adds new ones, deletes removed ones. */
export async function saveFaqs(list, originalIds) {
  const clean = list
    .map((f, i) => ({
      id: f.faq_id,
      question: f.question.trim(),
      answer: f.answer.trim(),
      display_order: i + 1,
    }))
    .filter((f) => f.question && f.answer);
  const keptIds = clean.filter((f) => f.id).map((f) => f.id);
  const removed = originalIds.filter((id) => !keptIds.includes(id));
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
      .eq("id", f.id);
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

export const formatUpdated = (iso) =>
  iso
    ? `Last updated ${new Date(iso).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}`
    : "";

export const withHttps = (v) => {
  const t = (v || "").trim();
  return !t || /^https?:\/\//i.test(t) ? t : `https://${t}`;
};
