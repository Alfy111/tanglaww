import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { useEffect, useRef, useState } from "react";

pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

const BOTTOM_MARGIN_PX = 40;

export default function PdfScrollViewer({ url, onReachedBottom }) {
  const scroller = useRef(null);
  const pagesHolder = useRef(null);
  const reported = useRef(false);
  const onBottom = useRef(onReachedBottom);
  onBottom.current = onReachedBottom;
  const [status, setStatus] = useState("loading");
  const [pageInfo, setPageInfo] = useState({ rendered: 0, total: 0 });

  const checkBottom = () => {
    const el = scroller.current;
    if (!el || reported.current) return;
    if (pageInfo.total === 0 || pageInfo.rendered < pageInfo.total) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_MARGIN_PX) {
      reported.current = true;
      onBottom.current?.();
    }
  };

  useEffect(() => {
    let cancelled = false;
    let doc = null;
    const holder = pagesHolder.current;
    holder.innerHTML = "";
    reported.current = false;
    setStatus("loading");

    const render = async () => {
      try {
        doc = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) return;
        setPageInfo({ rendered: 0, total: doc.numPages });
        setStatus("ready");

        const width = Math.min(holder.clientWidth || 800, 900);
        const ratio = window.devicePixelRatio || 1;

        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelled) return;
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: width / base.width });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * ratio);
          canvas.height = Math.floor(viewport.height * ratio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 12px";
          canvas.style.boxShadow = "0 1px 6px rgba(0,0,0,0.15)";
          canvas.style.backgroundColor = "#fff";
          canvas.setAttribute("aria-label", `Page ${n}`);
          holder.appendChild(canvas);

          await page.render({
            canvasContext: canvas.getContext("2d"),
            viewport,
            transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null,
          }).promise;
          if (!cancelled) setPageInfo({ rendered: n, total: doc.numPages });
        }
      } catch (err) {
        console.warn("[pdf] could not load", err);
        if (!cancelled) setStatus("error");
      }
    };
    render();

    return () => {
      cancelled = true;
      doc?.destroy?.();
    };
  }, [url]);

  useEffect(() => {
    checkBottom();
  });

  return (
    <div
      ref={scroller}
      onScroll={checkBottom}
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        padding: "16px",
        boxSizing: "border-box",
        backgroundColor: "#e9ebef",
      }}
    >
      {status === "loading" && (
        <p style={{ textAlign: "center", color: "#666" }}>Loading document…</p>
      )}
      {status === "error" && (
        <p style={{ textAlign: "center", color: "#666" }}>
          Couldn't load this document. Try again or download it instead.
        </p>
      )}
      <div ref={pagesHolder} />
      {status === "ready" && pageInfo.rendered < pageInfo.total && (
        <p style={{ textAlign: "center", color: "#888", fontSize: "12px" }}>
          Loading page {pageInfo.rendered + 1} of {pageInfo.total}…
        </p>
      )}
    </div>
  );
}
