// Contact address, kept Base64-encoded so it is not sitting in the page source
// as plain text. It is a normal in-app page: Layout supplies the header, rail
// and document metadata. Only the heading is shown, so the markdown renderer is
// not pulled in for a single line.
export default function EmailPage() {
  return (
    <div className="view page-view">
      <div className="article-body">
        <h2>Y29udGFjdEBrYWxpZXJpLmNvbQ==</h2>
      </div>
    </div>
  );
}
