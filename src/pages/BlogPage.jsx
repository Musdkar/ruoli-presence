import { Link } from "react-router-dom";
import { posts } from "../content/posts";
import { useT } from "../i18n";

// Newest first. Sorting here (rather than relying on the order entries happen
// to sit in posts.js) means a new post only has to be appended to the file.
const publishedPosts = posts
  .filter((post) => post.published !== false)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

export default function BlogPage() {
  const T = useT();
  return (
    <div className="view page-view blog-page">
      <div className="page-mast">
        <div>
          <span className="eyebrow">{T.blogEyebrow}</span>
          <h2>
            {T.blogTitle1}
            <br />
            {T.blogTitle2}
          </h2>
        </div>
        <p>{T.blogIntro}</p>
      </div>
      <div className="page-rule" />
      {publishedPosts.length ? (
        <div className="post-list">
          {publishedPosts.map((post, index) => (
            <Link className="post-row" to={`/blog/${post.slug}`} key={post.slug}>
              <span className="post-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <div className="post-tags">
                  {post.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <time>{post.date}</time>
            </Link>
          ))}
        </div>
      ) : (
        <div className="blog-empty">
          <span>ISSUE 00</span>
          <h3>{T.noPosts}</h3>
          <p>{T.noPostsDetail}</p>
        </div>
      )}
    </div>
  );
}
