import { vi } from "vitest";

export const MarkdownRenderer = {
  render: vi.fn().mockImplementation(
    async (
      markdown: string,
      el: HTMLElement,
      _sourcePath: string,
      _component: any
    ) => {
      // Simple markdown rendering - just wrap in a div.
      // Real implementation would parse markdown properly.
      const div = document.createElement("div");
      div.classList.add("markdown-rendered");

      // Basic parsing for tests.
      let html = markdown
        // Headers.
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        // Bold.
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        // Italic.
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        // Code blocks.
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        // Inline code.
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        // Links.
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Wiki links.
        .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, path, text) => {
          return `<a class="internal-link" data-href="${path}">${text || path}</a>`;
        })
        // Line breaks.
        .replace(/\n/g, "<br>");

      div.innerHTML = html;
      el.appendChild(div);
    }
  ),

  renderMarkdown: vi.fn().mockImplementation(
    async (
      markdown: string,
      el: HTMLElement,
      _sourcePath: string,
      _component: any
    ) => {
      return MarkdownRenderer.render(markdown, el, _sourcePath, _component);
    }
  ),
};
