// Shared display for About, Help & Support and Terms & Policies (student + admin).
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    FileText,
    HelpCircle,
    Lightbulb,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import logo from "../assets/logo.png";
import { formatUpdated, withHttps } from "../lib/siteContent";

export const NAVY = "#0D2A94";
const FONT = "Poppins, sans-serif";

const isHeading = (block) =>
  !block.includes("\n") &&
  block.length <= 40 &&
  !/[.!?:"”]$/.test(block.trim());

/** Admin-written text: blank line = paragraph, "- " = bullet, short line alone = small heading. */
export function ContentText({ text }) {
  const blocks = (text ?? "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0)
    return (
      <p
        style={{
          color: "#999",
          fontStyle: "italic",
          fontSize: "14px",
          margin: 0,
        }}
      >
        No content yet.
      </p>
    );
  return blocks.map((block, i) => {
    if (isHeading(block)) {
      return (
        <h3
          key={i}
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: NAVY,
            margin: "6px 0 6px",
          }}
        >
          {block}
        </h3>
      );
    }
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const bullets = lines.every((l) => /^[-•]\s+/.test(l));
    if (bullets) {
      return (
        <ul
          key={i}
          style={{
            margin: "0 0 12px",
            paddingLeft: "20px",
            color: "#555",
            fontSize: "14px",
            lineHeight: 1.65,
          }}
        >
          {lines.map((l, j) => (
            <li key={j}>{l.replace(/^[-•]\s+/, "")}</li>
          ))}
        </ul>
      );
    }
    return (
      <p
        key={i}
        style={{
          margin: "0 0 12px",
          color: "#555",
          fontSize: "14px",
          lineHeight: 1.7,
          whiteSpace: "pre-line",
        }}
      >
        {lines.join("\n")}
      </p>
    );
  });
}

export function Section({ icon: Icon, title, children }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "20px",
          fontWeight: 700,
          color: NAVY,
          margin: "0 0 12px",
        }}
      >
        <Icon size={24} color={NAVY} /> {title}
      </h2>
      {children}
    </section>
  );
}

export function Updated({ at }) {
  return at ? (
    <p
      style={{
        fontSize: "12px",
        color: "#999",
        textAlign: "center",
        margin: "4px 0 0",
      }}
    >
      {formatUpdated(at)}
    </p>
  ) : null;
}

export function PageCard({ children }) {
  return (
    <div
      style={{
        maxWidth: "860px",
        margin: "0 auto",
        backgroundColor: "#fff",
        borderRadius: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        padding: "32px",
        boxSizing: "border-box",
        fontFamily: FONT,
      }}
    >
      {children}
    </div>
  );
}

export function AboutView({ content }) {
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <img
          src={logo}
          alt=""
          style={{ width: "84px", height: "84px", borderRadius: "50%" }}
        />
        <div
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: NAVY,
            marginTop: "6px",
          }}
        >
          Tanglaw
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "#777",
            fontStyle: "italic",
            marginTop: "2px",
          }}
        >
          "Where a Dreamer Becomes an Achiever"
        </div>
      </div>
      <Section icon={Lightbulb} title="About Tanglaw">
        <ContentText text={content.about_tanglaw} />
      </Section>
      <Section icon={BookOpen} title="About TARC">
        <ContentText text={content.about_tarc} />
      </Section>
      <Updated at={content.updatedAt} />
    </>
  );
}

export function PoliciesView({ content }) {
  return (
    <>
      <Section icon={ShieldCheck} title="Privacy Policy">
        <ContentText text={content.privacy_policy} />
      </Section>
      <Section icon={FileText} title="Terms of Use">
        <ContentText text={content.terms_of_use} />
      </Section>
      <Updated at={content.updatedAt} />
    </>
  );
}

export function HelpView({ faqs, contact }) {
  const [openId, setOpenId] = useState(null);
  const rows = [
    contact.contact_phone && {
      icon: Phone,
      label: "Phone",
      value: contact.contact_phone,
      href: `tel:${contact.contact_phone}`,
    },
    contact.contact_email && {
      icon: Mail,
      label: "Email",
      value: contact.contact_email,
      href: `mailto:${contact.contact_email}`,
    },
    contact.contact_facebook_link && {
      icon: MessageCircle,
      label: "Facebook",
      value: contact.contact_facebook_name || "Message us on Facebook",
      href: withHttps(contact.contact_facebook_link),
      external: true,
    },
    contact.contact_office && {
      icon: MapPin,
      label: "Office",
      value: contact.contact_office,
    },
  ].filter(Boolean);

  return (
    <>
      <Section icon={HelpCircle} title="FAQs">
        {faqs.length === 0 ? (
          <p
            style={{
              color: "#999",
              fontStyle: "italic",
              fontSize: "14px",
              margin: 0,
            }}
          >
            No FAQs yet.
          </p>
        ) : (
          faqs.map((f) => {
            const open = openId === f.faq_id;
            return (
              <div
                key={f.faq_id}
                style={{
                  border: `1px solid ${open ? NAVY : "#E0E4EF"}`,
                  borderRadius: "10px",
                  marginBottom: "10px",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : f.faq_id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 16px",
                    border: 0,
                    background: "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: FONT,
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1A1A2E",
                  }}
                >
                  <span style={{ flex: 1 }}>{f.question}</span>
                  {open ? (
                    <ChevronUp size={18} color={NAVY} />
                  ) : (
                    <ChevronDown size={18} color={NAVY} />
                  )}
                </button>
                {open && (
                  <p
                    style={{
                      margin: 0,
                      padding: "0 16px 14px",
                      fontSize: "14px",
                      color: "#555",
                      lineHeight: 1.65,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {f.answer}
                  </p>
                )}
              </div>
            );
          })
        )}
      </Section>
      <Section icon={Phone} title="Contact Us">
        {rows.length === 0 ? (
          <p
            style={{
              color: "#999",
              fontStyle: "italic",
              fontSize: "14px",
              margin: 0,
            }}
          >
            No contact details yet.
          </p>
        ) : (
          rows.map(({ icon: Icon, label, value, href, external }) => {
            const inner = (
              <>
                <span
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#EEF1FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} color={NAVY} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      color: "#95A5A6",
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "14px",
                      color: "#1A1A2E",
                      fontWeight: 600,
                      wordBreak: "break-word",
                    }}
                  >
                    {value}
                  </span>
                </span>
                {href && <ChevronRight size={16} color="#BDC3C7" />}
              </>
            );
            const rowStyle = {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 0",
              borderBottom: "1px solid #F2F2F2",
              textDecoration: "none",
            };
            return href ? (
              <a
                key={label}
                href={href}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                style={rowStyle}
              >
                {inner}
              </a>
            ) : (
              <div key={label} style={rowStyle}>
                {inner}
              </div>
            );
          })
        )}
      </Section>
    </>
  );
}
