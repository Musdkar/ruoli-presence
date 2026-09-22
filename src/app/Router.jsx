import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { usePresence } from "../hooks/usePresence";
import Layout from "./Layout.jsx";
import PhotoPage from "../pages/PhotoPage.jsx";
import BlogPage from "../pages/BlogPage.jsx";
import BlogPostPage from "../pages/BlogPostPage.jsx";
import UsesPage from "../pages/UsesPage.jsx";
import EmailPage from "../pages/EmailPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";

// Presence is read once at the top of the tree and passed down, so every card
// renders from the same snapshot.
export default function AppRouter() {
  const presence = usePresence();
  return (
    <BrowserRouter>
      <Routes>
        {/* Outside Layout on purpose: /email is its own surface with no header,
            nav or sidebar, so it reads as a separate page. */}
        <Route path="email" element={<EmailPage />} />
        <Route element={<Layout presence={presence} />}>
          <Route index element={null} />
          <Route path="photo" element={<PhotoPage />} />
          <Route path="photos" element={<Navigate to="/photo" replace />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="uses" element={<UsesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
