import { SearchProvider, SearchResponse } from '../../types/search';

export abstract class BaseSearchProvider implements SearchProvider {
  abstract readonly name: string;
  abstract search(query: string, maxResults?: number): Promise<SearchResponse>;
}
