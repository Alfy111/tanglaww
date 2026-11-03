import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { HelpView, PageCard } from "../components/SiteContentViews";
import UserTopbar from "../components/UserTopbar";
import { CONTACT_KEYS, getFaqs, getSiteContent } from "../lib/siteContent";
import "./Dashboard.css";

export default function Help() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getFaqs(), getSiteContent(CONTACT_KEYS)])
      .then(([faqs, contact]) => ({ faqs, contact }))
      .then(setData)
      .catch((e) => setError(e.message ?? "Could not load this page."));
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <UserTopbar title="Help & Support" />
        <div style={{ padding: "28px 24px", boxSizing: "border-box" }}>
          <PageCard>
            {error ? (
              <p
                role="alert"
                style={{ color: "#c0392b", fontSize: "13px", margin: 0 }}
              >
                {error}
              </p>
            ) : !data ? (
              <p style={{ color: "#999", margin: 0 }}>Loading...</p>
            ) : (
              <HelpView faqs={data.faqs} contact={data.contact} />
            )}
          </PageCard>
        </div>
      </div>
    </div>
  );
}
