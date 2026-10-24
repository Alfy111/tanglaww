import { ArrowDown, ArrowLeft, ArrowUp, Image, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { addSlide, deleteSlide, getSlides, swapSlides } from "../../lib/carousel";

export default function AdminCarousel() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadSlides = useCallback(async () => {
    setError("");
    try {
      setSlides(await getSlides());
    } catch (loadError) {
      setError(`Could not load dashboard photos: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlides();
  }, [loadSlides]);

  const handleAdd = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError("");
    try {
      const position = slides.length
        ? Math.max(...slides.map((slide) => slide.position)) + 1
        : 0;
      await addSlide(file, position);
      await loadSlides();
    } catch (uploadError) {
      setError(`Could not add the photo: ${uploadError.message}`);
    } finally {
      setBusy(false);
    }
  };

  const moveSlide = async (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= slides.length) return;

    setBusy(true);
    setError("");
    try {
      await swapSlides(slides[index], slides[nextIndex]);
      await loadSlides();
    } catch (moveError) {
      setError(`Could not reorder the photos: ${moveError.message}`);
    } finally {
      setBusy(false);
    }
  };

  const removeSlide = async (slide, index) => {
    if (!window.confirm(`Remove photo ${index + 1} from the dashboard?`)) return;

    setBusy(true);
    setError("");
    try {
      await deleteSlide(slide);
      await loadSlides();
    } catch (deleteError) {
      setError(`Could not delete the photo: ${deleteError.message}`);
      await loadSlides();
    } finally {
      setBusy(false);
    }
  };

  const buttonStyle = (disabled) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    border: "1px solid #d9dce8",
    borderRadius: "8px",
    padding: "9px 12px",
    background: "#fff",
    color: "#1a1a6e",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "Poppins, sans-serif",
    fontWeight: 600,
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Poppins, sans-serif", backgroundColor: "#f5f6fa" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1, minWidth: 0 }}>
        <AdminTopbar title="Dashboard Photos" />
        <main style={{ padding: "32px 40px", maxWidth: "1100px" }}>
          <button type="button" onClick={() => navigate("/admin/dashboard")} style={{ ...buttonStyle(false), marginBottom: "20px" }}>
            <ArrowLeft size={16} /> Back to dashboard
          </button>

          <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
              <Image size={34} color="#f5a623" />
              <div>
                <h2 style={{ color: "#1a1a6e", margin: 0, fontSize: "20px" }}>Carousel Photos</h2>
                <p style={{ color: "#666", margin: "5px 0 0", fontSize: "13px" }}>
                  These database-synced photos appear on student and admin dashboards. Wide 16:9 images work best; photos are centered without cropping.
                </p>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAdd}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              style={{ ...buttonStyle(busy), backgroundColor: "#1a1a6e", color: "#fff", border: "none", padding: "12px 18px" }}
            >
              <Plus size={18} /> {busy ? "Working..." : "Add Photo"}
            </button>
          </section>

          <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ color: "#1a1a6e", fontSize: "16px", margin: "0 0 16px" }}>Current Photos ({slides.length})</h3>
            {error && <p role="alert" style={{ color: "#c0392b", background: "#fff5f5", padding: "12px", borderRadius: "8px" }}>{error}</p>}
            {loading ? (
              <p style={{ color: "#888" }}>Loading photos...</p>
            ) : slides.length === 0 ? (
              <div style={{ textAlign: "center", padding: "36px 12px", color: "#888" }}>
                <Image size={36} color="#bbb" />
                <p>No photos yet. Add one to replace the dashboard fallback.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {slides.map((slide, index) => (
                  <article key={slide.slide_id} style={{ display: "flex", alignItems: "center", gap: "16px", borderBottom: "1px solid #eee", paddingBottom: "12px" }}>
                    <div style={{ width: "180px", aspectRatio: "16 / 9", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#f2f4f7", borderRadius: "8px" }}>
                      <img src={slide.image_url} alt={`Slide ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center" }} />
                    </div>
                    <strong style={{ color: "#1a1a2e", flex: 1 }}>Photo {index + 1}</strong>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button type="button" aria-label={`Move photo ${index + 1} up`} onClick={() => moveSlide(index, -1)} disabled={busy || index === 0} style={buttonStyle(busy || index === 0)}>
                        <ArrowUp size={17} />
                      </button>
                      <button type="button" aria-label={`Move photo ${index + 1} down`} onClick={() => moveSlide(index, 1)} disabled={busy || index === slides.length - 1} style={buttonStyle(busy || index === slides.length - 1)}>
                        <ArrowDown size={17} />
                      </button>
                      <button type="button" aria-label={`Delete photo ${index + 1}`} onClick={() => removeSlide(slide, index)} disabled={busy} style={{ ...buttonStyle(busy), color: "#c0392b" }}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
