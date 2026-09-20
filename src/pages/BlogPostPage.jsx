import React from "react";
import { Link, useParams } from "react-router-dom";
import { posts } from "../content/posts";
import { useT } from "../i18n";

const LazyMarkdown = React.lazy(async () => {
  const [{ default: Markdown }, { default: gfm }] = await Promise.all([
    import("react-markdown"),
    import("remark-gfm"),
  ]);
  return {
    default: function MarkdownRenderer({ children }) {
      return <Markdown remarkPlugins={[gfm]}>{children}</Markdown>;
    },
  };
});

export default function BlogPost() {
  const T = useT();
  const { slug } = useParams();
  const post = posts.find((item) => item.slug === slug && item.published !== false);
  if (!post)
    return (
      <div className="view page-view">
        <div className="blog-empty">
          <span>404</span>
          <h3>Post not found.</h3>
          <Link to="/blog">← back to blog</Link>
        </div>
      </div>
    );
  return (
    <article className="view article-view">
      <Link className="back-link" to="/blog">
        ← {T.blog}
      </Link>
      <header className="article-head">
        <time>{post.date}</time>
        <h2>{post.title}</h2>
        <p>{post.summary}</p>
      </header>
      <div className="article-body">
        <React.Suspense fallback={<p>{T.loadingArticle}</p>}>
          <LazyMarkdown>{post.body}</LazyMarkdown>
        </React.Suspense>
      </div>
    </article>
  );
}
