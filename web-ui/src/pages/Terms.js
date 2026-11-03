import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { PageCard, PoliciesView } from "../components/SiteContentViews";
import UserTopbar from "../components/UserTopbar";
import { getSiteContent } from "../lib/siteContent";
import "./Dashboard.css";

export default function Terms() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSiteContent(["privacy_policy", "terms_of_use"])
      .then(setData)
      .catch((e) => setError(e.message ?? "Could not load this page."));
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <UserTopbar title="Terms & Policies" />
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
              <PoliciesView content={data} />
            )}
          </PageCard>
        </div>
      </div>
    </div>
  );
}
