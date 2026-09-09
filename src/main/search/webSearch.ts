import { BaseSearchProvider } from './searchProvider';
import { SearchResponse, SearchResultItem } from '../../types/search';
import { WebSource } from '../../types/ai';

export class DuckDuckGoSearchProvider extends BaseSearchProvider {
  readonly name = 'DuckDuckGo';

  async search(query: string, maxResults: number = 5): Promise<SearchResponse> {
    try {
      // Fetch results from DuckDuckGo HTML endpoint
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
      }

      const html = await response.text();
      const results: SearchResultItem[] = [];

      // Regex matching for result links and snippets
      const resultRegex = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
        let rawUrl = match[1];
        // DuckDuckGo redirects urls e.g. //duckduckgo.com/l/?uddg=...
        if (rawUrl.includes('uddg=')) {
          const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            rawUrl = decodeURIComponent(uddgMatch[1]);
          }
        } else if (rawUrl.startsWith('//')) {
          rawUrl = 'https:' + rawUrl;
        }

        const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
        const rawSnippet = match[3].replace(/<[^>]+>/g, '').trim();

        if (rawTitle && rawSnippet) {
          results.push({
            title: rawTitle,
            url: rawUrl,
            snippet: rawSnippet,
          });
        }
      }

      // Fallback secondary regex if result__url pattern differed
      if (results.length === 0) {
        const linkRegex = /<h2 class="result__title">[\s\S]*?<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let lMatch: RegExpExecArray | null;
        while ((lMatch = linkRegex.exec(html)) !== null && results.length < maxResults) {
          let rawUrl = lMatch[1];
          if (rawUrl.includes('uddg=')) {
            const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
            if (uddgMatch) rawUrl = decodeURIComponent(uddgMatch[1]);
          }
          results.push({
            title: lMatch[2].replace(/<[^>]+>/g, '').trim(),
            url: rawUrl,
            snippet: lMatch[3].replace(/<[^>]+>/g, '').trim(),
          });
        }
      }

      return {
        query,
        results,
        source: 'DuckDuckGo Web',
      };
    } catch (err) {
      console.warn('Web search failed or was rate limited:', err);
      return {
        query,
        results: [],
        source: 'DuckDuckGo Web (Unavailable)',
      };
    }
  }

  public static formatSourcesForContext(results: SearchResultItem[]): {
    contextSnippet: string;
    sources: WebSource[];
  } {
    if (results.length === 0) {
      return { contextSnippet: '', sources: [] };
    }

    const sources: WebSource[] = results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
    }));

    const contextSnippet = `[REAL-TIME LIVE WEB SEARCH RESULTS]:
${results
  .map(
    (r, i) => `[Source ${i + 1}]: "${r.title}"
URL: ${r.url}
Snippet: ${r.snippet}`
  )
  .join('\n\n')}

INSTRUCTIONS: Synthesize the answer using the web results above when relevant. Include citations in markdown format e.g. [Source Name](URL) in your response.`;

    return { contextSnippet, sources };
  }
}
