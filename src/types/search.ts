export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  source: string;
}

export interface SearchProvider {
  search(query: string, maxResults?: number): Promise<SearchResponse>;
}
