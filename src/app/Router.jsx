import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { config } from "../config";
import { useFastLanyard } from "../hooks/useFastLanyard";
import Layout from "./Layout.jsx";
import PhotoPage from "../pages/PhotoPage.jsx";
import BlogPage from "../pages/BlogPage.jsx";
import BlogPostPage from "../pages/BlogPostPage.jsx";
import UsesPage from "../pages/UsesPage.jsx";

export function LanyardApp() {
  const presence = useFastLanyard(config.discordId);
  return <SiteRouter presence={presence} />;
}

export function SiteRouter({ presence }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout presence={presence} />}>
          <Route index element={null} />
          <Route path="photo" element={<PhotoPage />} />
          <Route path="photos" element={<Navigate to="/photo" replace />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="uses" element={<UsesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
