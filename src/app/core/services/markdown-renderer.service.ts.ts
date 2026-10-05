import { Injectable } from '@angular/core';
import {
  DomSanitizer,
  SafeHtml
} from '@angular/platform-browser';

import { marked } from 'marked';
import hljs from 'highlight.js';

/** Languages that can be rendered live in the preview pane. */
const PREVIEWABLE_LANGUAGES = new Set(['html', 'htm', 'svg']);

const MAX_CACHE_SIZE = 300;

@Injectable({
  providedIn: 'root'
})
export class MarkdownRendererService {

  /**
   * Cache: markdown string -> SafeHtml.
   *
   * Why this matters: the template calls render() on every change
   * detection. Without a cache, Angular receives a brand new SafeHtml
   * each time and rewrites innerHTML, which would wipe the preview
   * state and the "Copied" label.
   */
  private readonly cache = new Map<string, SafeHtml>();

  constructor(
    private readonly sanitizer: DomSanitizer
  ) {
    marked.setOptions({
      gfm: true,
      breaks: true
    });
  }

  // ============================================================
  // Rendering
  // ============================================================

  render(content: string): SafeHtml {
    const source = typeof content === 'string' ? content : String(content ?? '');

    const cached = this.cache.get(source);

    if (cached) {
      return cached;
    }

    const html = marked.parse(source, {
      async: false,
      renderer: this.createRenderer()
    });

    const safe = this.sanitizer.bypassSecurityTrustHtml(html as string);

    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldest = this.cache.keys().next().value;

      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(source, safe);

    return safe;
  }

  private createRenderer(): any {
    const renderer = new marked.Renderer();

    renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      const language = lang?.trim().toLowerCase().split(/\s+/)[0];

      let highlightedCode: string;

      if (language && hljs.getLanguage(language)) {
        highlightedCode = hljs.highlight(text, { language }).value;
      } else {
        highlightedCode = hljs.highlightAuto(text).value;
      }

      const languageLabel = language || 'text';
      const previewable = this.isPreviewable(language, text);

      const previewButton = previewable
        ? `
            <button
              type="button"
              data-action="preview"
              class="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            >Preview</button>`
        : '';

      return `
        <div
          class="code-block my-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
          data-code="${this.encodeCode(text)}"
          data-lang="${this.escapeHtml(languageLabel)}"
        >
          <div class="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
            <span class="text-xs font-medium text-zinc-400">${this.escapeHtml(languageLabel)}</span>

            <div class="flex items-center gap-1">${previewButton}
              <button
                type="button"
                data-action="copy"
                class="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >Copy</button>
            </div>
          </div>

          <div class="code-block__code">
            <pre class="overflow-x-auto text-sm leading-6"><code class="hljs language-${this.escapeHtml(languageLabel)}">${highlightedCode}</code></pre>
          </div>

          <div class="code-block__preview" hidden></div>
        </div>
      `;
    };

    return renderer;
  }

  // ============================================================
  // Click handling (event delegation)
  //
  // The HTML is injected through [innerHTML], so Angular can't bind
  // (click) handlers inside it. Instead the host element listens once
  // and calls this method.
  // ============================================================

  handleClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLElement>('button[data-action]');

    if (!button) {
      return;
    }

    const block = button.closest<HTMLElement>('.code-block');

    if (!block) {
      return;
    }

    const code = decodeURIComponent(block.dataset['code'] ?? '');

    switch (button.dataset['action']) {
      case 'copy':
        void this.copy(button, code);
        break;

      case 'preview':
        this.togglePreview(block, button, code);
        break;
    }
  }

  private async copy(button: HTMLElement, code: string): Promise<void> {
    const ok = await this.copyText(code);

    const original = 'Copy';
    button.textContent = ok ? 'Copied' : 'Failed';

    window.setTimeout(() => {
      button.textContent = original;
    }, 1500);
  }

  private async copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for non-secure contexts or denied permissions.
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';

      document.body.appendChild(textarea);
      textarea.select();

      let ok = false;

      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }

      textarea.remove();

      return ok;
    }
  }

  private togglePreview(
    block: HTMLElement,
    button: HTMLElement,
    code: string
  ): void {
    const codePane = block.querySelector<HTMLElement>('.code-block__code');
    const previewPane = block.querySelector<HTMLElement>('.code-block__preview');

    if (!codePane || !previewPane) {
      return;
    }

    // Preview -> back to code
    if (!previewPane.hidden) {
      previewPane.hidden = true;
      previewPane.replaceChildren();
      codePane.hidden = false;
      button.textContent = 'Preview';
      return;
    }

    // Code -> preview.
    // Sandboxed WITHOUT allow-same-origin: the generated page can run
    // its own scripts but cannot touch the app, cookies or storage.
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('title', 'Code preview');
    iframe.srcdoc = this.buildPreviewDocument(code);

    previewPane.replaceChildren(iframe);
    previewPane.hidden = false;
    codePane.hidden = true;
    button.textContent = 'Code';
  }

  // ============================================================
  // Helpers
  // ============================================================

  private isPreviewable(language: string | undefined, code: string): boolean {
    if (language && PREVIEWABLE_LANGUAGES.has(language)) {
      return true;
    }

    // Untagged block that is clearly a full HTML page.
    if (!language) {
      return /^\s*(<!doctype html|<html[\s>])/i.test(code);
    }

    return false;
  }

  private buildPreviewDocument(code: string): string {
    // Already a full document.
    if (/<html[\s>]/i.test(code) || /^\s*<!doctype html/i.test(code)) {
      return code;
    }

    // Fragment or bare <svg>: wrap it.
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
    </style>
  </head>
  <body>${code}</body>
</html>`;
  }

  private encodeCode(code: string): string {
    return encodeURIComponent(code).replace(/'/g, '%27');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}